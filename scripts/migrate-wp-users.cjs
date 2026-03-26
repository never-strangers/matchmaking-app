#!/usr/bin/env node
/**
 * migrate-wp-users.cjs
 *
 * Migrates users from the `wp-users` table into Supabase Auth + profiles.
 *
 * What it does per user:
 *   1. Skips if already exists in profiles (by email or wp_user_id)
 *   2. Creates a Supabase auth.user  (email_confirm=true, random tmp password)
 *   3. Inserts a profiles row with all mapped WP fields
 *   4. Writes a CSV report: scripts/.wp-migration-report.csv
 *
 * Usage:
 *   node scripts/migrate-wp-users.cjs               # migrate up to 150 users
 *   node scripts/migrate-wp-users.cjs --limit 50    # custom limit
 *   node scripts/migrate-wp-users.cjs --dry-run     # preview only, no writes
 *   node scripts/migrate-wp-users.cjs --all         # migrate ALL eligible users
 *
 * WordPress passwords are NOT migrated (phpass ≠ bcrypt).
 * After migration, send password-reset emails via:
 *   node scripts/migrate-wp-users.cjs --send-resets
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SEND_RESETS = args.includes("--send-resets");
const ALL = args.includes("--all");
const limitIdx = args.indexOf("--limit");
const LIMIT = ALL ? Infinity : (limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 150);

// ── Config ────────────────────────────────────────────────────────────────────
const BATCH_SIZE = 50;          // rows fetched per REST call
const CONCURRENCY = 3;          // parallel auth+profile writes
const REPORT_PATH = path.join(__dirname, ".wp-migration-report.csv");

// ── Supabase clients ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Random 32-char hex password – users will reset it anyway */
function randomPassword() {
  return "Ns!" + crypto.randomBytes(16).toString("hex");
}

/** Normalize gender to profiles CHECK constraint values */
function normalizeGender(v) {
  if (!v) return null;
  const l = String(v).toLowerCase().trim();
  if (l === "female" || l === "f") return "female";
  if (l === "male" || l === "m") return "male";
  if (l.includes("non") || l.includes("other") || l.includes("prefer")) return "other";
  return null;
}

/** Normalize attracted_to: "Men" / "Women" / "Men, Women" → "men" / "women" / "men,women" */
function normalizeAttractedTo(v) {
  if (!v) return null;
  return String(v)
    .toLowerCase()
    .replace(/[;,]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s === "men" || s === "women")
    .join(",") || null;
}

/** Parse "Friends; A Date" / "Friends, A Date" → ["friends","date"] */
function parseLookingFor(v) {
  if (!v) return [];
  return String(v)
    .toLowerCase()
    .replace(/[;,]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .map((s) => {
      if (s.includes("friend")) return "friends";
      if (s.includes("date") || s.includes("dating")) return "date";
      return null;
    })
    .filter(Boolean);
}

/** Map country/city string → short city code used in profiles */
function mapCity(country, billingCity) {
  const v = String(country || billingCity || "").toLowerCase().trim();
  if (v.includes("singapore") || v === "sg") return "sg";
  if (v.includes("thailand") || v.includes("bangkok") || v === "th") return "th";
  if (v.includes("vietnam") || v.includes("ho chi") || v.includes("hanoi") || v === "vn") return "vn";
  if (v.includes("hong kong") || v === "hk") return "hk";
  if (v.includes("malaysia") || v.includes("kuala") || v === "my") return "my";
  if (v.includes("indonesia") || v.includes("jakarta") || v === "id") return "id";
  if (v.includes("japan") || v.includes("tokyo") || v === "jp") return "jp";
  if (v.includes("korea") || v.includes("seoul") || v === "kr") return "kr";
  if (v.includes("australia") || v === "au") return "au";
  if (v.includes("united kingdom") || v === "uk" || v === "gb") return "uk";
  if (v.includes("united states") || v === "us") return "us";
  // Default to Singapore if unknown (most users are SG-based)
  return v ? v.slice(0, 20) : "sg";
}

/** Map WP account_status → profiles status */
function mapStatus(accountStatus) {
  const s = String(accountStatus || "").toLowerCase().trim();
  if (s === "approved") return "approved";
  if (s === "inactive" || s === "rejected" || s === "banned") return "rejected";
  return "pending_verification";
}

/** Map WP role → app role */
function mapRole(roles) {
  const r = String(roles || "").toLowerCase();
  if (r.includes("administrator")) return "admin";
  if (r.includes("host") || r.includes("editor")) return "host";
  return "user";
}

/** Normalize a DOB string to YYYY-MM-DD or null */
function normalizeDob(v) {
  if (!v) return null;
  const s = String(v).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try Date parse
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

/** Get a field from wp-user (handles "meta:fieldname" key pattern) */
function g(user, key) {
  return user[key] ?? user[`meta:${key}`] ?? null;
}

/** Map a WP user row → profiles insert object (without id, that comes from auth) */
function mapWpUserToProfile(user, authUid) {
  const firstName = String(user.first_name || g(user, "full_name")?.split(" ")[0] || user.display_name || "").trim();
  const lastName = String(user.last_name || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ")
    || user.display_name
    || user.user_nicename
    || user.user_login?.split("@")[0]
    || "User";

  const lookingForArr = parseLookingFor(g(user, "Looking") || g(user, "looking_for"));
  const attractedTo = normalizeAttractedTo(g(user, "attracted") || g(user, "attracted_to"));
  const gender = normalizeGender(g(user, "gender"));
  const dob = normalizeDob(g(user, "birth_date") || g(user, "dob"));
  const city = mapCity(g(user, "country"), user.billing_city);
  const status = mapStatus(g(user, "account_status"));
  const role = mapRole(user.roles);
  const phone = (user.billing_phone || g(user, "phone") || "").replace(/\s+/g, "").trim() || null;
  const instagram = (g(user, "instagram") || "").trim().replace(/^@/, "") || null;
  const reason = (g(user, "Why") || g(user, "reason") || "").trim() || null;
  const profilePhoto = g(user, "profile_photo") || g(user, "Photo") || g(user, "register_profile_photo") || null;

  return {
    id: authUid,
    name: fullName.slice(0, 100),
    display_name: fullName.slice(0, 100),
    full_name: fullName.slice(0, 100),
    email: user.user_email.trim().toLowerCase(),
    city,
    status,
    role,
    gender,
    attracted_to: attractedTo,
    orientation: lookingForArr.length > 0 ? { lookingFor: lookingForArr } : null,
    dob: dob || null,
    instagram,
    reason,
    phone_e164: phone,
    profile_photo_url: profilePhoto,
    // WP migration linkage
    wp_user_id: user.ID,
    wp_user_login: user.user_login,
    wp_registered_at: user.user_registered || null,
    wp_source: {
      roles: user.roles,
      display_name: user.display_name,
      account_status: g(user, "account_status"),
    },
    email_verified: true,
    created_at: user.user_registered || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function fetchWpUsersBatch(offset) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/wp-users?limit=${BATCH_SIZE}&offset=${offset}&order=ID.asc`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`wp-users fetch failed: ${await res.text()}`);
  return res.json();
}

/** Check which emails already exist as profiles */
async function getExistingEmails(emails) {
  const { data } = await supabase
    .from("profiles")
    .select("email, wp_user_id")
    .in("email", emails);
  return new Set((data || []).map((r) => r.email.toLowerCase()));
}

/** Check which wp_user_ids already migrated */
async function getExistingWpIds(wpIds) {
  const { data } = await supabase
    .from("profiles")
    .select("wp_user_id")
    .in("wp_user_id", wpIds);
  return new Set((data || []).map((r) => r.wp_user_id));
}

async function migrateUser(wpUser) {
  const email = wpUser.user_email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: "skip", reason: "invalid email", email: wpUser.user_email };
  }

  const tmpPassword = randomPassword();

  // 1. Create Supabase auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: tmpPassword,
    email_confirm: true, // bypass email confirmation
  });

  if (authErr) {
    if (authErr.message?.includes("already been registered") || authErr.message?.includes("already exists")) {
      // User already in auth – try to find their UID and upsert profile
      const { data: existingList } = await supabase.auth.admin.listUsers();
      const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === email);
      if (existing) {
        const profileRow = mapWpUserToProfile(wpUser, existing.id);
        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert(profileRow, { onConflict: "email" });
        if (upsertErr) return { status: "error", reason: `profile upsert: ${upsertErr.message}`, email };
        return { status: "upserted", email, wp_id: wpUser.ID, auth_id: existing.id };
      }
      return { status: "skip", reason: "auth exists, uid not found", email };
    }
    return { status: "error", reason: `auth: ${authErr.message}`, email };
  }

  const authUid = authData.user?.id;
  if (!authUid) return { status: "error", reason: "auth uid missing", email };

  // 2. Build + insert profile row
  const profileRow = mapWpUserToProfile(wpUser, authUid);

  const { error: profileErr } = await supabase
    .from("profiles")
    .insert(profileRow);

  if (profileErr) {
    // Roll back auth user
    await supabase.auth.admin.deleteUser(authUid).catch(() => {});
    return { status: "error", reason: `profile: ${profileErr.message}`, email };
  }

  return {
    status: "created",
    email,
    wp_id: wpUser.ID,
    auth_id: authUid,
    name: profileRow.name,
    city: profileRow.city,
    gender: profileRow.gender,
    status_val: profileRow.status,
  };
}

/** Simple concurrency pool */
async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function sendPasswordResets(emails) {
  console.log(`\n📧  Sending password reset emails to ${emails.length} users…`);
  let sent = 0;
  for (const email of emails) {
    const { error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login` },
    });
    if (error) {
      console.warn(`  ⚠️  ${email}: ${error.message}`);
    } else {
      sent++;
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`  ✅  Reset links generated for ${sent}/${emails.length} users`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       WP → Never Strangers User Migration     ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN 🔍" : "LIVE ✍️ "} | Limit: ${ALL ? "ALL" : LIMIT} | Batch: ${BATCH_SIZE}`);
  console.log();

  const stats = { created: 0, upserted: 0, skipped: 0, error: 0, total: 0 };
  const report = [["wp_id", "email", "name", "status", "result", "reason", "auth_id"]];
  const createdEmails = [];

  let offset = 0;
  let done = false;

  while (!done) {
    const batch = await fetchWpUsersBatch(offset);
    if (!batch.length) break;
    offset += batch.length;

    // Filter: must have valid email
    const eligible = batch.filter((u) => u.user_email?.includes("@"));

    if (!eligible.length) {
      if (batch.length < BATCH_SIZE) done = true;
      continue;
    }

    // Skip already-migrated
    const emails = eligible.map((u) => u.user_email.trim().toLowerCase());
    const wpIds = eligible.map((u) => u.ID);
    const [existingEmails, existingWpIds] = await Promise.all([
      getExistingEmails(emails),
      getExistingWpIds(wpIds),
    ]);

    const toMigrate = eligible.filter(
      (u) =>
        !existingEmails.has(u.user_email.trim().toLowerCase()) &&
        !existingWpIds.has(u.ID)
    );

    const alreadyDone = eligible.length - toMigrate.length;
    if (alreadyDone > 0) {
      stats.skipped += alreadyDone;
      console.log(`  ⏭️  Skipped ${alreadyDone} already-migrated users`);
    }

    if (!toMigrate.length) {
      if (batch.length < BATCH_SIZE) done = true;
      continue;
    }

    console.log(`\n📦  Batch offset=${offset - batch.length} → ${toMigrate.length} to migrate`);

    if (DRY_RUN) {
      for (const u of toMigrate) {
        const mapped = mapWpUserToProfile(u, "DRY-RUN-UID");
        console.log(`  🔍  [DRY] ${u.user_email} → city=${mapped.city} status=${mapped.status} gender=${mapped.gender}`);
        report.push([u.ID, u.user_email, mapped.name, mapped.status, "dry-run", "", ""]);
        stats.created++;
        stats.total++;
      }
    } else {
      const tasks = toMigrate.map((u) => () => migrateUser(u));
      const results = await runPool(tasks, CONCURRENCY);

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const u = toMigrate[i];
        stats.total++;

        if (r.status === "created") {
          stats.created++;
          createdEmails.push(r.email);
          console.log(`  ✅  ${r.email} (wp#${r.wp_id}) → ${r.city}/${r.gender}/${r.status_val}`);
          report.push([r.wp_id, r.email, r.name, r.status_val, "created", "", r.auth_id]);
        } else if (r.status === "upserted") {
          stats.upserted++;
          createdEmails.push(r.email);
          console.log(`  🔄  ${r.email} (wp#${r.wp_id}) → profile upserted`);
          report.push([r.wp_id, r.email, "", "", "upserted", "", r.auth_id]);
        } else if (r.status === "skip") {
          stats.skipped++;
          console.log(`  ⏭️  ${r.email} → ${r.reason}`);
          report.push([u.ID, r.email, "", "", "skip", r.reason, ""]);
        } else {
          stats.error++;
          console.error(`  ❌  ${r.email} → ${r.reason}`);
          report.push([u.ID, r.email, "", "", "error", r.reason, ""]);
        }
      }
    }

    if (stats.created + stats.upserted >= LIMIT) {
      console.log(`\n🎯  Reached limit of ${LIMIT} migrated users.`);
      done = true;
    }

    if (batch.length < BATCH_SIZE) done = true;

    // Small delay between batches
    if (!done) await new Promise((r) => setTimeout(r, 300));
  }

  // ── Write report ─────────────────────────────────────────────────────────────
  const csvContent = report.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  fs.writeFileSync(REPORT_PATH, csvContent, "utf8");

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║                   Summary                    ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  ✅  Created:   ${String(stats.created).padStart(4)} new auth + profile    ║`);
  console.log(`║  🔄  Upserted:  ${String(stats.upserted).padStart(4)} existing auth        ║`);
  console.log(`║  ⏭️   Skipped:   ${String(stats.skipped).padStart(4)} (already exist)      ║`);
  console.log(`║  ❌  Errors:    ${String(stats.error).padStart(4)}                       ║`);
  console.log(`║  📊  Total:     ${String(stats.total).padStart(4)} processed             ║`);
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n📄  Report saved → ${REPORT_PATH}`);

  if (!DRY_RUN && createdEmails.length > 0) {
    console.log(`\n💡  To send password reset emails, run:`);
    console.log(`    node scripts/migrate-wp-users.cjs --send-resets`);
  }

  // Handle --send-resets mode
  if (SEND_RESETS && !DRY_RUN) {
    // Load all migrated emails from report
    if (fs.existsSync(REPORT_PATH)) {
      const lines = fs.readFileSync(REPORT_PATH, "utf8").split("\n").slice(1);
      const emails = lines
        .map((l) => l.split(",")[1]?.replace(/"/g, "").trim())
        .filter((e) => e?.includes("@"));
      await sendPasswordResets(emails);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
