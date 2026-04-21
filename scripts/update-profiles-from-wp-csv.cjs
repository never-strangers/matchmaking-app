#!/usr/bin/env node
/**
 * update-profiles-from-wp-csv.cjs
 *
 * Reads a WP user CSV export and updates existing Supabase profiles
 * with gender, birth_date, instagram, attracted_to, orientation, city, reason, wp_user_id.
 *
 * Usage:
 *   node scripts/update-profiles-from-wp-csv.cjs <csv-path> [--confirm]
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const DRY_RUN = !args.includes("--confirm");

if (!csvPath) {
  console.error("Usage: node scripts/update-profiles-from-wp-csv.cjs <csv-path> [--confirm]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const TARGET_EMAILS = new Set([
  "akylelee13@outlook.com","alyssajasmine2211@gmail.com","amirshamsul333@gmail.com",
  "andynwh@hotmail.com","ariessa12@gmail.com","ashereen5@gmail.com",
  "ashleyyuenpuiyern@gmail.com","azzmanariff@gmail.com","blood28demon@gmail.com",
  "blyong86@gmail.com","chewmeen@gmail.com","clewsi@icloud.com",
  "deleven5.khairil@gmail.com","delynchoong95@gmail.com","djtomcrawshaw@gmail.com",
  "estine_kim@hotmail.com","farraatiqa97@gmail.com","fionakeah@gmail.com",
  "indahkhadeeja47@gmail.com","j4redloi@gmail.com","jessica.ngan8@gmail.com",
  "jessicamurthy@gmail.com","jingbiao20@gmail.com","joyiechooi@hotmail.com",
  "kevindev1989@gmail.com","leejian1997@gmail.com","leeyingfoo@gmail.com",
  "liewzunshan@gmail.com","limkaili34@gmail.com","ljiaxi2000@gmail.com",
  "lucastnjl@gmail.com","nicholas0224@yahoo.com","nicholasjack90@gmail.com",
  "nicholasphang@yahoo.com","nicholasteoh98@gmail.com","nightmerial@gmail.com",
  "parkvisualisations@gmail.com","pingyuanlye_12@hotmail.com","poovan96@yahoo.com",
  "poovenjunior@gmail.com","priyalini1997.pv@gmail.com","r3play137@gmail.com",
  "ryanlow2896@gmail.com","samuellimjinqju@gmail.com","shannonkhoo@gmail.com",
  "shiling_823@hotmail.com","ss@humaninc.co","suannetasha15@gmail.com",
  "suzutoyo48@gmail.com","valiantneildawson@gmail.com","vermavijay15@gmail.com",
  "weeyongchun2000@gmail.com","wumingsia@gmail.com","yijun.phung@gmail.com",
  "zainabzahirah@gmail.com","zhitunglim@gmail.com","zongying28@gmail.com",
]);

// RFC 4180 CSV parser handling quoted fields with embedded commas/newlines
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\n" || (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n")) {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += ch === "\r" ? 2 : 1;
      } else if (ch === "\r") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeGender(v) {
  if (!v) return null;
  const l = String(v).toLowerCase().trim();
  if (l.includes("female") || l === "f") return "female";
  if (l.includes("male") || l === "m") return "male";
  if (l.includes("non") || l.includes("other")) return "other";
  return null;
}

function normalizeAttractedTo(v) {
  if (!v) return null;
  return String(v).toLowerCase().replace(/[;,]/g, ",").split(",")
    .map((s) => s.trim()).filter((s) => s === "men" || s === "women").join(",") || null;
}

function parseLookingFor(v) {
  if (!v) return [];
  return String(v).toLowerCase().replace(/[;,]/g, ",").split(",")
    .map((s) => s.trim())
    .map((s) => {
      if (s.includes("friend")) return "friends";
      if (s.includes("date") || s.includes("dating")) return "date";
      return null;
    }).filter(Boolean);
}

function mapCity(country) {
  const v = String(country || "").toLowerCase().trim();
  if (v.includes("singapore") || v === "sg") return "sg";
  if (v.includes("malaysia") || v.includes("kuala")) return "my";
  if (v.includes("hong kong") || v === "hk") return "hk";
  if (v.includes("thailand") || v.includes("bangkok")) return "th";
  if (v.includes("vietnam") || v.includes("ho chi")) return "vn";
  if (v.includes("indonesia") || v.includes("jakarta")) return "id";
  if (v.includes("japan") || v.includes("tokyo")) return "jp";
  if (v.includes("korea") || v.includes("seoul")) return "kr";
  if (v.includes("australia")) return "au";
  if (v.includes("united kingdom") || v === "uk") return "uk";
  if (v.includes("united states") || v === "us") return "us";
  return v ? v.slice(0, 20) : null;
}

function normalizeDob(v) {
  if (!v) return null;
  const s = String(v).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, "-");
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

function cleanInstagram(v) {
  if (!v) return null;
  let s = v.trim();
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  s = s.replace(/^@/, "");
  s = s.replace(/\/$/, "");
  return s || null;
}

// Parse PHP-serialized simple arrays like: a:1:{i:0;s:4:"Male";}
function phpUnserializeSimple(v) {
  if (!v) return null;
  const str = String(v);
  // Extract string values from serialized array
  const values = [];
  const re = /s:\d+:"([^"]*)"/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    values.push(m[1]);
  }
  return values.length > 0 ? values.join(", ") : str;
}

async function run() {
  console.log(DRY_RUN ? "🔍  DRY RUN — no writes" : "🚀  LIVE RUN — updating Supabase profiles");
  console.log(`📂  CSV: ${csvPath}`);
  console.log(`🎯  Target emails: ${TARGET_EMAILS.size}\n`);

  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(raw);
  const headers = rows[0];
  const dataRows = rows.slice(1);

  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h.trim()] = i; });

  const get = (row, key) => {
    const i = colIdx[key] ?? colIdx[`meta:${key}`];
    return i !== undefined ? (row[i] || "").trim() : "";
  };

  let matched = 0;
  let updated = 0;
  let errors = [];
  const notFound = new Set(TARGET_EMAILS);

  for (const row of dataRows) {
    const email = get(row, "user_email").toLowerCase();
    if (!TARGET_EMAILS.has(email)) continue;

    matched++;
    notFound.delete(email);

    const wpId = parseInt(get(row, "ID"), 10) || null;
    const rawGender = get(row, "meta:gender");
    const gender = normalizeGender(phpUnserializeSimple(rawGender));
    const rawAttracted = get(row, "meta:attracted");
    const attractedTo = normalizeAttractedTo(phpUnserializeSimple(rawAttracted));
    const rawLooking = get(row, "meta:Looking");
    const lookingForArr = parseLookingFor(phpUnserializeSimple(rawLooking));
    const rawCountry = get(row, "meta:country");
    const city = mapCity(rawCountry);
    const dob = normalizeDob(get(row, "meta:birth_date"));
    const instagram = cleanInstagram(get(row, "meta:instagram"));
    const reason = get(row, "meta:Why") || null;
    const firstName = get(row, "first_name");
    const lastName = get(row, "last_name");
    const displayName = get(row, "display_name");
    const fullName = get(row, "meta:full_name");

    const name = fullName || displayName || [firstName, lastName].filter(Boolean).join(" ") || null;

    const updatePayload = {};
    if (gender) updatePayload.gender = gender;
    if (attractedTo) updatePayload.attracted_to = attractedTo;
    if (lookingForArr.length > 0) updatePayload.orientation = { lookingFor: lookingForArr };
    if (dob) updatePayload.dob = dob;
    if (instagram) updatePayload.instagram = instagram;
    if (city) updatePayload.city = city;
    if (reason) updatePayload.reason = reason;
    if (wpId) updatePayload.wp_user_id = wpId;
    if (name) {
      updatePayload.name = name.slice(0, 100);
      updatePayload.display_name = name.slice(0, 100);
    }
    updatePayload.updated_at = new Date().toISOString();

    console.log(`  → ${email}`);
    console.log(`     gender=${gender || "-"} dob=${dob || "-"} city=${city || "-"} ig=${instagram || "-"} attracted=${attractedTo || "-"} looking=${lookingForArr.join(",") || "-"} wp#${wpId || "-"}`);
    if (reason) console.log(`     reason: ${reason.slice(0, 120)}${reason.length > 120 ? "…" : ""}`);

    if (DRY_RUN) {
      console.log(`     [DRY RUN] would update profile`);
      continue;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .ilike("email", email);

    if (error) {
      console.error(`     ❌  ${error.message}`);
      errors.push({ email, error: error.message });
    } else {
      console.log(`     ✅  updated`);
      updated++;
    }
  }

  console.log("\n─────────────────────────────");
  if (DRY_RUN) {
    console.log(`✅  Dry run complete. Matched ${matched}/${TARGET_EMAILS.size} emails in CSV.`);
    if (notFound.size > 0) {
      console.log(`⚠️  Not found in CSV (${notFound.size}): ${[...notFound].join(", ")}`);
    }
    console.log("Run with --confirm to execute.");
  } else {
    console.log(`✅  Done. Updated ${updated}/${matched} profiles.`);
    if (notFound.size > 0) {
      console.log(`⚠️  Not found in CSV (${notFound.size}): ${[...notFound].join(", ")}`);
    }
    if (errors.length) {
      console.log(`❌  Errors (${errors.length}):`);
      errors.forEach((e) => console.log(`   ${e.email}: ${e.error}`));
    }
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
