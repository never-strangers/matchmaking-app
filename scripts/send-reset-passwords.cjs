#!/usr/bin/env node
/**
 * Send password reset emails to a list of users.
 *
 * Usage:
 *   node scripts/send-reset-passwords.cjs email1@example.com email2@example.com
 *   node scripts/send-reset-passwords.cjs --file emails.txt
 *   node scripts/send-reset-passwords.cjs --dry-run email1@example.com
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
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
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        env[k] = v;
      }
    } catch {}
  }
  return env;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data   = JSON.stringify(body);
    const req = http.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   "POST",
      headers: { ...headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── Sleep ─────────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey     = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl      = env.NEXT_PUBLIC_APP_URL || "https://app.thisisneverstrangers.com";
  const redirectTo  = `${appUrl}/auth/reset-password`;

  if (!supabaseUrl || !anonKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const args    = process.argv.slice(2);
  const dryRun  = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");

  let emails = [];

  if (fileIdx >= 0) {
    const filePath = args[fileIdx + 1];
    if (!filePath) { console.error("❌ --file requires a path"); process.exit(1); }
    emails = fs.readFileSync(filePath, "utf8")
      .split("\n")
      .map(l => l.trim().toLowerCase())
      .filter(l => l && l.includes("@"));
  } else {
    emails = args
      .filter(a => !a.startsWith("--"))
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes("@"));
  }

  if (emails.length === 0) {
    console.error("Usage: node scripts/send-reset-passwords.cjs [--dry-run] [--file emails.txt] email1 email2 ...");
    process.exit(1);
  }

  console.log(`\n📧 Password Reset Sender`);
  console.log(`   redirect_to: ${redirectTo}`);
  console.log(`   emails:      ${emails.length}`);
  if (dryRun) console.log(`   mode:        DRY RUN (no emails sent)`);
  console.log();

  const results = { ok: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    process.stdout.write(`[${i + 1}/${emails.length}] ${email} … `);

    if (dryRun) {
      console.log("(dry-run)");
      results.skipped++;
      continue;
    }

    try {
      const res = await post(
        `${supabaseUrl}/auth/v1/recover`,
        { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        { email, redirect_to: redirectTo }
      );

      if (res.status === 200) {
        console.log("✅ sent");
        results.ok++;
      } else {
        const body = JSON.parse(res.body || "{}");
        console.log(`❌ ${res.status} ${body.message || body.msg || res.body}`);
        results.failed++;
      }
    } catch (err) {
      console.log(`❌ network error: ${err.message}`);
      results.failed++;
    }

    // Rate limit: 1 email per second
    if (i < emails.length - 1) await sleep(1100);
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✅ sent:   ${results.ok}`);
  if (results.failed)  console.log(`❌ failed: ${results.failed}`);
  if (results.skipped) console.log(`⏭  skipped: ${results.skipped} (dry-run)`);
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
