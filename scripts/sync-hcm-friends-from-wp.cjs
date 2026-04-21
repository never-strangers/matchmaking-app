#!/usr/bin/env node
/**
 * Fetch WP profile data for HCM Friends Mixer (event cbb016f7) attendees
 * and update their Supabase profiles.
 *
 * Usage:
 *   node scripts/sync-hcm-friends-from-wp.cjs --dry-run
 *   node scripts/sync-hcm-friends-from-wp.cjs
 */

require("dotenv").config({ path: ".env.local" });
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

const EVENT_ID = "cbb016f7-3a11-4007-818d-1d1c4ffa5b07";
const DRY_RUN = process.argv.includes("--dry-run");

const COOKIES = 'amelia_page_view.locations=list; amelia_range_past_dashboard=32; amelia_range_future_dashboard=28; wordpress_sec_91868ee7e0dfe32d5df9519dba45c8d0=neverstrangers%7C1775881799%7CkL0Cm8qI5JKPuh1724rexvyD8GDF2v4aWWWHmkAq34Z%7C4f8cedd3fb8aa1ac2b7ce5ffaec80e91a242f1891038cdf41596f0be3d50ea7e; pll_language=en; wordpress_logged_in_91868ee7e0dfe32d5df9519dba45c8d0=neverstrangers%7C1775881799%7CkL0Cm8qI5JKPuh1724rexvyD8GDF2v4aWWWHmkAq34Z%7Cc5abaee755b26f3588074827c97d4a5410c9a565548bbf162943eceed4f30da2; PHPSESSID=362n1k49t3crcje2hu9lgibsfc';
const NONCE = "f2b91cb535";
const ACP_LAYOUT = "67610f8391ada";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function request(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const data = body ? Buffer.from(body) : null;
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method,
        headers: { ...(data ? { "Content-Length": data.length } : {}), ...headers } },
      res => {
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function findWpUserId(email) {
  const encoded = encodeURIComponent(email);
  const r = await request("GET",
    `https://thisisneverstrangers.com/wp-admin/users.php?s=${encoded}`,
    { Cookie: COOKIES, "User-Agent": "Mozilla/5.0", Accept: "text/html" }
  );
  const match = r.body.match(/\/wp-admin\/user-edit\.php\?user_id=(\d+)/);
  return match ? match[1] : null;
}

async function acpFetch(wpId) {
  const boundary = "----WebKitFormBoundaryeMOUy29BlHZOpIdz";
  const fields = [
    ["action", "acp_editing_request"],
    ["method", "inline-values"],
    ["ids[0]", String(wpId)],
    ["list_screen", "wp-users"],
    ["layout", ACP_LAYOUT],
    ["_ajax_nonce", NONCE],
  ];
  const body = fields.map(([n, v]) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`
  ).join("") + `--${boundary}--\r\n`;

  const r = await request("POST", "https://thisisneverstrangers.com/wp-admin/admin-ajax.php", {
    Cookie: COOKIES,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    Accept: "application/json, text/plain, */*",
    Origin: "https://thisisneverstrangers.com",
    Referer: "https://thisisneverstrangers.com/wp-admin/users.php",
  }, body);

  const parsed = JSON.parse(r.body);
  if (!parsed.success) throw new Error(`ACP error: ${r.body.slice(0, 200)}`);
  const row = {};
  for (const item of parsed.data?.editable_values || []) {
    row[item.column_name] = item.value;
  }
  return row;
}

function toArr(v) { return Array.isArray(v) ? v : v ? [String(v)] : []; }

function normalizeGender(v) {
  for (const x of toArr(v)) {
    const l = x.toLowerCase();
    if (l.includes("female")) return "female";
    if (l.includes("male")) return "male";
  }
  return null;
}

function normalizeAttracted(v) {
  const out = [];
  for (const x of toArr(v)) {
    const l = x.toLowerCase();
    if (l.includes("women")) out.push("women");
    else if (l.includes("men")) out.push("men");
  }
  return out.length ? out.join(", ") : null;
}

function normalizeDob(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m1 = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return null;
}

function normalizeCity(country) {
  if (!country) return null;
  const v = String(country).toLowerCase();
  if (v.includes("singapore") || v === "sg") return "sg";
  if (v.includes("hong kong") || v === "hk") return "hk";
  if (v.includes("kuala") || v.includes("malaysia")) return "kl";
  if (v.includes("chi minh") || v.includes("vietnam") || v.includes("hcm")) return "hcm";
  return null;
}

async function main() {
  console.log(`\n Syncing HCM Friends Mixer attendees from WP`);
  console.log(`   mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  const { data: attendees, error: attErr } = await supabase
    .from("event_attendees")
    .select("profile_id")
    .eq("event_id", EVENT_ID);
  if (attErr) { console.error("Failed to fetch attendees:", attErr.message); process.exit(1); }

  const profileIds = attendees.map(a => a.profile_id);
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, email, name, full_name, gender, dob, attracted_to, instagram, reason, city")
    .in("id", profileIds);
  if (profErr) { console.error("Failed to fetch profiles:", profErr.message); process.exit(1); }

  console.log(`Found ${profiles.length} profiles\n`);

  let updated = 0, skipped = 0, notFound = 0;

  for (const profile of profiles) {
    const email = profile.email;
    if (!email) { console.log(`  no email for ${profile.id}`); skipped++; continue; }

    process.stdout.write(`  ${email} -> `);

    let wpId;
    try {
      wpId = await findWpUserId(email);
    } catch (e) {
      console.log(`FAIL search: ${e.message}`);
      skipped++;
      await sleep(500);
      continue;
    }

    if (!wpId) {
      console.log(`not found in WP`);
      notFound++;
      await sleep(300);
      continue;
    }

    let row;
    try {
      row = await acpFetch(wpId);
    } catch (e) {
      console.log(`FAIL acp: ${e.message}`);
      skipped++;
      await sleep(500);
      continue;
    }

    const patch = { wp_user_id: Number(wpId) };

    const gender = normalizeGender(row["a293b379eb8520"]);
    if (gender && !profile.gender) patch.gender = gender;

    const attracted = normalizeAttracted(row["4e137a46ae147c"]);
    if (attracted && !profile.attracted_to) patch.attracted_to = attracted;

    const dob = normalizeDob(row["21860f28bf7cee"]);
    if (dob && !profile.dob) patch.dob = dob;

    const city = normalizeCity(row["2c5b35f4395810"]);
    if (city && !profile.city) patch.city = city;

    const igRaw = row["18454a9352b021"] ? String(row["18454a9352b021"]) : null;
    const instagram = igRaw ? igRaw.replace(/^https?:\/\/(?:www\.)?instagram\.com\/?/, "").replace(/\/$/, "").trim() : null;
    if (instagram && !profile.instagram) patch.instagram = instagram;

    const reason = row["3b52e4f9dced92"] ? String(row["3b52e4f9dced92"]).trim() : null;
    if (reason && !profile.reason) patch.reason = reason;

    const summary = Object.entries(patch)
      .map(([k, v]) => `${k}=${String(v).slice(0, 35)}`).join(" | ");

    if (DRY_RUN) {
      console.log(`[dry] wpId=${wpId}`);
      console.log(`      ${summary}`);
      updated++;
    } else {
      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (error) {
        console.log(`FAIL update: ${error.message}`);
        skipped++;
      } else {
        console.log(`OK wpId=${wpId}`);
        console.log(`   ${summary}`);
        updated++;
      }
    }

    await sleep(400);
  }

  console.log(`\n-----------------------------`);
  console.log(`updated: ${updated}`);
  console.log(`skipped: ${skipped}`);
  console.log(`not in WP: ${notFound}`);
  if (DRY_RUN) console.log("\nRemove --dry-run to apply.");
  console.log();
}

main().catch(e => { console.error(e.message); process.exit(1); });
