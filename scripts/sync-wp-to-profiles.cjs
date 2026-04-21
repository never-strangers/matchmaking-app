#!/usr/bin/env node
/**
 * Sync WP user data → Supabase profiles for the 87 Call a Cupid attendees.
 * Reads from wp-users table, updates profiles with:
 * first_name, last_name, gender, attracted_to, looking_for, dob, city, status
 *
 * Usage:
 *   node scripts/sync-wp-to-profiles.cjs --dry-run
 *   node scripts/sync-wp-to-profiles.cjs
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const DRY_RUN = process.argv.includes("--dry-run");

const emails = fs.readFileSync("/tmp/cupid-emails.txt", "utf8")
  .split("\n").map(e => e.trim().toLowerCase()).filter(e => e.includes("@"));

// ── Normalizers (same as migrate-wp-users.cjs) ────────────────────────────────
function normalizeGender(v) {
  if (!v) return null;
  const l = String(v).toLowerCase().trim();
  if (l === "female" || l === "f") return "female";
  if (l === "male" || l === "m") return "male";
  return null;
}

function normalizeAttractedTo(v) {
  if (!v) return null;
  return String(v).toLowerCase().replace(/[;,]/g, ",")
    .split(",").map(s => s.trim())
    .filter(s => s === "men" || s === "women")
    .join(",") || null;
}

function parseLookingFor(v) {
  if (!v) return [];
  return String(v).toLowerCase().replace(/[;,]/g, ",")
    .split(",").map(s => s.trim())
    .map(s => {
      if (s.includes("friend")) return "friends";
      if (s.includes("date") || s.includes("dating")) return "date";
      return null;
    }).filter(Boolean);
}

function normalizeDob(v) {
  if (!v) return null;
  const s = String(v).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or MM/DD/YYYY
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,"0")}-${parts[2].padStart(2,"0")}`;
  }
  return null;
}

function mapCity(country) {
  if (!country) return null;
  const v = String(country).toLowerCase().trim();
  if (v.includes("singapore") || v === "sg") return "sg";
  if (v.includes("hong kong") || v === "hk") return "hk";
  if (v.includes("kuala") || v.includes("malaysia") || v === "my") return "kl";
  if (v.includes("jakarta") || v.includes("indonesia") || v === "id") return "jakarta";
  if (v.includes("bangkok") || v.includes("thailand") || v === "th") return "bangkok";
  return null;
}

function mapStatus(v) {
  if (!v) return null;
  const l = String(v).toLowerCase().trim();
  if (l === "approved" || l === "active") return "approved";
  if (l === "rejected" || l === "banned") return "rejected";
  return "pending_verification";
}

async function main() {
  console.log(`\n🔄 WP → Supabase profile sync`);
  console.log(`   emails: ${emails.length}`);
  if (DRY_RUN) console.log(`   mode:   DRY RUN\n`);
  else console.log();

  // Fetch all matching wp-users rows in one query
  const emailList = emails.map(e => `"${e}"`).join(",");
  const { data: wpUsers, error: wpErr } = await supabase
    .from("wp-users")
    .select(`user_email, first_name, last_name, meta:account_status, meta:country, meta:gender, meta:attracted, meta:Looking, meta:birth_date, display_name`)
    .in("user_email", emails);

  if (wpErr) {
    console.error("❌ Failed to fetch wp-users:", wpErr.message);
    process.exit(1);
  }

  // Build lookup by email
  const wpByEmail = {};
  for (const u of wpUsers) {
    wpByEmail[u.user_email.toLowerCase()] = u;
  }

  console.log(`   wp-users found: ${wpUsers.length}/${emails.length}\n`);

  let updated = 0, skipped = 0, notFound = 0;

  for (const email of emails) {
    const wp = wpByEmail[email];
    if (!wp) {
      console.log(`❌ ${email} — not in wp-users`);
      notFound++;
      continue;
    }

    const firstName = wp.first_name || wp.display_name?.split(" ")[0] || null;
    const lastName  = wp.last_name  || (wp.display_name?.split(" ").slice(1).join(" ") || null);
    const gender    = normalizeGender(wp["meta:gender"]);
    const attractedTo = normalizeAttractedTo(wp["meta:attracted"]);
    const lookingFor  = parseLookingFor(wp["meta:Looking"]);
    const dob         = normalizeDob(wp["meta:birth_date"]);
    const city        = mapCity(wp["meta:country"]);
    const status      = mapStatus(wp["meta:account_status"]) || "approved";

    const updates = {};
    if (firstName) updates.name = `${firstName}${lastName ? " "+lastName : ""}`;
    if (gender)    updates.gender = gender;
    if (attractedTo) updates.attracted_to = attractedTo;
    if (lookingFor.length) updates.looking_for = lookingFor;
    if (dob)       updates.dob = dob;
    if (city)      updates.city = city;
    updates.status = status;

    const line = [
      `name:${updates.name||"-"}`,
      `gender:${gender||"-"}`,
      `attracted:${attractedTo||"-"}`,
      `looking:${lookingFor.join(",")||"-"}`,
      `dob:${dob||"-"}`,
      `city:${city||"-"}`,
      `status:${status}`,
    ].join(" | ");

    if (DRY_RUN) {
      console.log(`  [dry] ${email} → ${line}`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("email", email);

    if (error) {
      console.log(`❌ ${email} — update failed: ${error.message}`);
    } else {
      console.log(`✅ ${email} → ${line}`);
      updated++;
    }
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✅ updated: ${updated}`);
  if (skipped)  console.log(`⏭  skipped: ${skipped} (dry-run)`);
  if (notFound) console.log(`❌ not in wp-users: ${notFound}`);
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
