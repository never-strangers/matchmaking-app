#!/usr/bin/env node
/**
 * Invite users to Never Strangers.
 *
 * For each email:
 *   1. Creates user in Supabase auth (via generate_link type=invite)
 *   2. Creates profile row with status="approved"
 *   3. Sends password-reset email as the invite (redirect → /auth/reset-password)
 *
 * Usage:
 *   node scripts/invite-users.cjs email1@example.com email2@example.com
 *   node scripts/invite-users.cjs --file emails.txt
 *   node scripts/invite-users.cjs --dry-run email1@example.com
 */

const fs   = require("fs");
const path = require("path");
const http = require("https");

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  for (const fname of [".env.local", ".env"]) {
    try {
      const lines = fs.readFileSync(path.join(__dirname, "..", fname), "utf8").split("\n");
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq < 0) continue;
        env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      }
    } catch {}
  }
  return env;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data   = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
        ...headers,
      },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Invite a single user ──────────────────────────────────────────────────────
async function inviteUser(email, env, redirectTo) {
  const supaUrl    = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey    = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Step 1: create user in auth (generate_link type=invite)
  const linkRes = await request("POST", `${supaUrl}/auth/v1/admin/generate_link`, authHeaders, {
    type: "invite",
    email,
    options: { redirect_to: redirectTo },
  });

  let userId;

  if (linkRes.status === 200) {
    const data = JSON.parse(linkRes.body);
    userId = data.id;
  } else if (linkRes.status === 422) {
    // User already exists — look them up
    const body = JSON.parse(linkRes.body || "{}");
    if (body.msg?.includes("already been registered") || body.message?.includes("already")) {
      // Find existing user
      let found = null;
      for (let page = 1; page <= 20; page++) {
        const r = await request("GET", `${supaUrl}/auth/v1/admin/users?page=${page}&per_page=100`, authHeaders);
        const users = JSON.parse(r.body).users || [];
        found = users.find(u => u.email === email);
        if (found || users.length < 100) break;
      }
      if (found) {
        userId = found.id;
      } else {
        return { ok: false, reason: "already_exists_not_found" };
      }
    } else {
      return { ok: false, reason: `generate_link_${linkRes.status}: ${linkRes.body.slice(0, 120)}` };
    }
  } else {
    return { ok: false, reason: `generate_link_${linkRes.status}: ${linkRes.body.slice(0, 120)}` };
  }

  // Step 2a: upsert profile (status=pending first to satisfy trigger)
  const profileRes = await request(
    "POST",
    `${supaUrl}/rest/v1/profiles`,
    {
      ...authHeaders,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    {
      id:           userId,
      email:        email.toLowerCase().trim(),
      name:         email.split("@")[0],      // placeholder; user fills in on profile
      display_name: email.split("@")[0],
      status:       "pending_verification",
      role:         "user",
      city:         "",
      gender:       "prefer_not_to_say",      // placeholder; user updates on first login
    }
  );

  if (profileRes.status >= 300) {
    return { ok: false, reason: `profile_${profileRes.status}: ${profileRes.body.slice(0, 120)}` };
  }

  // Step 2b: set status=approved via RPC (bypasses the status-change trigger)
  const approveRes = await request(
    "POST",
    `${supaUrl}/rest/v1/rpc/admin_set_profile_status`,
    { ...authHeaders, "Content-Type": "application/json" },
    { p_profile_id: userId, p_new_status: "approved" }
  );

  if (approveRes.status >= 300) {
    return { ok: false, reason: `approve_${approveRes.status}: ${approveRes.body.slice(0, 120)}` };
  }

  // Step 3: send the invite email (password-reset flow — works as invite for new users)
  const emailRes = await request(
    "POST",
    `${supaUrl}/auth/v1/recover`,
    { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    { email, redirect_to: redirectTo }
  );

  if (emailRes.status !== 200) {
    return { ok: false, reason: `email_${emailRes.status}: ${emailRes.body.slice(0, 120)}` };
  }

  return { ok: true, userId };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const env = loadEnv();
  const supaUrl    = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey    = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl     = env.NEXT_PUBLIC_APP_URL || "https://app.thisisneverstrangers.com";
  const redirectTo = `${appUrl}/auth/reset-password`;

  if (!supaUrl || !serviceKey || !anonKey) {
    console.error("❌  Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY)");
    process.exit(1);
  }

  const args    = process.argv.slice(2);
  const dryRun  = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");

  let emails = [];
  if (fileIdx >= 0) {
    const filePath = args[fileIdx + 1];
    if (!filePath) { console.error("❌  --file requires a path argument"); process.exit(1); }
    emails = fs.readFileSync(filePath, "utf8")
      .split("\n")
      .map(l => l.trim().toLowerCase())
      .filter(l => l && l.includes("@") && !l.startsWith("#"));
  } else {
    emails = args
      .filter(a => !a.startsWith("--"))
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes("@"));
  }

  if (emails.length === 0) {
    console.error("Usage: node scripts/invite-users.cjs [--dry-run] [--file emails.txt] [email ...]");
    process.exit(1);
  }

  console.log(`\n🎉  Never Strangers — User Invite`);
  console.log(`   emails:      ${emails.length}`);
  console.log(`   redirect_to: ${redirectTo}`);
  console.log(`   status:      approved`);
  if (dryRun) console.log(`   mode:        DRY RUN — no changes will be made`);
  console.log();

  const results = { ok: 0, skipped: 0, failed: [] };

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${emails.length}] ${email.padEnd(40)} `);

    if (dryRun) {
      console.log("(dry-run)");
      results.skipped++;
      continue;
    }

    const result = await inviteUser(email, env, redirectTo);
    if (result.ok) {
      console.log(`✅  invited  (uid: ${result.userId})`);
      results.ok++;
    } else {
      console.log(`❌  ${result.reason}`);
      results.failed.push({ email, reason: result.reason });
    }

    // 1.2 s between requests — stay under Supabase rate limits
    if (i < emails.length - 1) await sleep(1200);
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log(`✅  invited:  ${results.ok}`);
  if (results.skipped)        console.log(`⏭   skipped: ${results.skipped} (dry-run)`);
  if (results.failed.length)  console.log(`❌  failed:  ${results.failed.length}`);
  if (results.failed.length) {
    console.log("\nFailed emails:");
    results.failed.forEach(f => console.log(`  ${f.email}  →  ${f.reason}`));
  }
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
