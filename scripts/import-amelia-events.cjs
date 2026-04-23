#!/usr/bin/env node
/**
 * import-amelia-events.cjs
 *
 * Imports Amelia WP events into Supabase events table.
 * Data was exported from https://thisisneverstrangers.com/wp-admin
 *
 * Usage:
 *   node scripts/import-amelia-events.cjs                          # dry-run (embedded snapshot)
 *   node scripts/import-amelia-events.cjs --from-json export.json  # dry-run from API JSON file(s)
 *   CONFIRM=true node scripts/import-amelia-events.cjs --from-json a.json b.json  # insert
 *   CONFIRM=true node scripts/import-amelia-events.cjs               # insert embedded snapshot
 *   ... --only-ids 112,130   # import only these Amelia event ids (after merging JSON files)
 *   ... --skip-if-title-exists  # skip when any non-deleted row already has the same title
 *
 * JSON shape: full API response `{ "data": { "events": [ ... ] } }`, or `{ "events": [...] }`,
 * or a bare array. Merge multiple files when the API paginates (e.g. countTotal > events.length).
 *
 * Safety: only INSERT is ever performed — no UPDATE, DELETE, or upsert on existing rows.
 * Duplicate handling: skips when title + start_at matches (see --skip-if-title-exists). --force-insert bypasses checks.
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.env.CONFIRM !== "true";
const FORCE_INSERT = process.argv.includes("--force-insert");
const SKIP_IF_TITLE_EXISTS = process.argv.includes("--skip-if-title-exists");

/** Normalize timestamps so DB vs JS ISO strings still match duplicate keys. */
function startAtKey(ts) {
  if (ts == null) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toISOString();
}

function argvOnlyAmeliaIds() {
  const i = process.argv.indexOf("--only-ids");
  if (i === -1) return null;
  const raw = process.argv[i + 1];
  if (!raw || raw.startsWith("--")) {
    throw new Error("--only-ids needs comma-separated Amelia ids, e.g. --only-ids 112");
  }
  const ids = raw.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
  if (ids.length === 0) throw new Error("--only-ids: no valid integers");
  return ids;
}

function argvJsonPaths() {
  const i = process.argv.indexOf("--from-json");
  if (i === -1) return [];
  const out = [];
  for (let j = i + 1; j < process.argv.length && !process.argv[j].startsWith("--"); j++) {
    out.push(process.argv[j]);
  }
  return out;
}

/** @returns {any[]} */
function extractEventsArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw?.data?.events && Array.isArray(raw.data.events)) return raw.data.events;
  if (raw?.events && Array.isArray(raw.events)) return raw.events;
  throw new Error(
    "Unrecognized JSON: need an array, { data: { events: [] } }, or { events: [] }"
  );
}

function inferLocationIdFromName(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("bali")) return 2;
  return null;
}

/**
 * Map one Amelia REST event object to the internal shape used by mapToRow.
 * @param {any} ev
 */
function normalizeAmeliaApiEvent(ev) {
  if (ev.type && ev.type !== "event") return null;

  const periods = ev.periods || [];
  if (!periods.length) {
    console.warn(`  ⚠️  SKIP [WP#${ev.id}] ${ev.name}: no periods`);
    return null;
  }

  if (periods.length > 1) {
    console.warn(
      `  ⚠️  [WP#${ev.id}] ${ev.name}: ${periods.length} periods — using first only`
    );
  }

  const p0 = periods[0];
  let locationId = ev.locationId;
  if (locationId == null) {
    const inferred = inferLocationIdFromName(ev.name);
    if (inferred != null) {
      locationId = inferred;
      console.warn(
        `  ℹ️  [WP#${ev.id}] ${ev.name}: locationId null → ${LOCATION_TO_CITY[inferred]} (Amelia loc #${inferred})`
      );
    } else {
      console.warn(
        `  ⚠️  [WP#${ev.id}] ${ev.name}: locationId null → default Singapore`
      );
      locationId = 1;
    }
  }

  return {
    ameliaId: ev.id,
    name: ev.name,
    description: ev.description || "",
    locationId,
    periodStart: p0.periodStart,
    periodEnd: p0.periodEnd,
    customTickets: ev.customTickets || [],
    status: ev.status,
    maxCapacity: ev.maxCapacity,
  };
}

/** @param {string[]} jsonPaths */
function loadEventsFromJsonFiles(jsonPaths) {
  const merged = [];
  for (const rel of jsonPaths) {
    const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
    if (!fs.existsSync(abs)) {
      throw new Error(
        `File not found: ${abs}\n` +
          `  cwd: ${process.cwd()}\n` +
          `  Save your Amelia API response as JSON to that path first (README examples like ` +
          `amelia-events-page1.json are placeholders, not committed files).\n` +
          `  Example: curl '…' > scripts/backups/my-amelia-events.json && ` +
          `node scripts/import-amelia-events.cjs --from-json scripts/backups/my-amelia-events.json`
      );
    }
    const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
    const arr = extractEventsArray(raw);
    for (const ev of arr) {
      const row = normalizeAmeliaApiEvent(ev);
      if (row) merged.push(row);
    }
  }
  const byId = new Map();
  for (const e of merged) {
    byId.set(e.ameliaId, e);
  }
  return [...byId.values()];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Location ID → canonical city label (matches lib/geo/cities.ts) ────────────
const LOCATION_TO_CITY = {
  1: "Singapore",
  2: "Bali",
  3: "Kuala Lumpur",
  4: "Manila",
  5: "Hong Kong",
  6: "Cebu",
  7: "Bangkok",
  8: "Ho Chi Minh City",
  9: "Jakarta",
};

// ── Category inference ────────────────────────────────────────────────────────
function inferCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("friends")) return "friends";
  if (n.includes("bali") || n.includes("getaway") || n.includes("trip")) return "friends";
  return "dating"; // dating mixer, lgbtq+, call a cupid
}

// ── Strip HTML tags ───────────────────────────────────────────────────────────
function stripHtml(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#10004;/g, "✔")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Extract venue from description HTML ──────────────────────────────────────
function extractVenue(desc) {
  if (!desc) return null;
  // Match "Location: <venue text>" from HTML (no /i — i + [strong] would swallow leading "T" in "The …")
  const m = desc.match(/Location[:\s<\/strong>]+([^<]+)/);
  if (m) return m[1].replace(/&amp;/g, "&").trim();
  return null;
}

// ── Extract whats_included ────────────────────────────────────────────────────
function extractWhatsIncluded(desc) {
  if (!desc) return null;
  const m = desc.match(/What['']s Included[:\s<\/strong>]*([\s\S]*?)(?:<p>\s*<span class="ql-size-small"|$)/i);
  if (!m) return null;
  return stripHtml(m[1]).replace(/^[-\s]+/, "").trim() || null;
}

// ── Timestamp helper: Amelia stores in WP server tz (UTC+8 Singapore) ────────
function toUtc(ameliaDateStr) {
  // "2026-04-09 20:30:00" (UTC+8) → ISO UTC string
  const d = new Date(ameliaDateStr.replace(" ", "T") + "+08:00");
  return d.toISOString();
}

// ── Lowest ticket price in cents ─────────────────────────────────────────────
function lowestPriceCents(customTickets) {
  if (!customTickets || customTickets.length === 0) return 0;
  const enabled = customTickets.filter(t => t.enabled && t.price > 0);
  if (enabled.length === 0) return 0;
  return Math.min(...enabled.map(t => t.price)) * 100;
}

// ── Embedded snapshot (2026-04-02) — used when --from-json is not passed ────
const EMBEDDED_AMELIA_EVENTS = [
  {
    ameliaId: 125,
    name: "Call a Cupid – Live Matchmaking (20s to 30s)",
    description: `<p><strong>Location:</strong> Avenue Lounge, 10 Bayfront Ave, B1-67 The Shoppes, Marina Bay Sands, Singapore 018956</p><p><br>Call A Cupid is a special event by Never Strangers, where real cupid facilitators will conduct live matchmaking, at your request.</p><p><br>Don't navigate this alone, move in pairs with someone you meet during the night or your friend. You will be matched in pairs, like a double date!</p><p><br>Designed to cut through the awkwardness — let us make the introductions for you.</p><p><br><strong>What's Included:</strong><br>- Entry to Never Strangers Dating Mixer (Heterosexual)</p><p>- Curated live matchmaking and games (Call a Cupid)</p><p>- 1 Free Drink (Alcoholic &amp; Non-Alcoholic)</p><p>- Entry to the Afterparty at Avenue Lounge</p>`,
    locationId: 1,
    periodStart: "2026-04-09 20:30:00",
    periodEnd:   "2026-04-09 22:30:00",
    customTickets: [
      { enabled: true, price: 49 }, { enabled: true, price: 49 },
      { enabled: true, price: 42 }, { enabled: true, price: 42 },
    ],
    status: "open", maxCapacity: 90,
  },
  {
    ameliaId: 124,
    name: "Friends Mixer (20s to 30s) – Ho Chi Minh City",
    description: `<p><strong>Location:</strong> A Good Bar, Tầng 1, 39 Lý Tự Trọng, Phường Sài Gòn, Ho Chi Minh City 700000 Vietnam</p><p><br><strong>What's Included:</strong></p><p>- Entry to Never Strangers Friends Mixer</p><p>- Access to Algorithm Match-Making</p><p>- 1 Complimentary Drink (Alcoholic &amp; Non-Alcoholic)</p><p>- Entry to the Afterparty at A Good Bar</p>`,
    locationId: 8,
    periodStart: "2026-04-11 19:00:00",
    periodEnd:   "2026-04-11 21:30:00",
    customTickets: [
      { enabled: true, price: 30 }, { enabled: true, price: 30 },
      { enabled: true, price: 26 }, { enabled: true, price: 26 },
    ],
    status: "open", maxCapacity: 40,
  },
  {
    ameliaId: 127,
    name: "Dating Mixer (20s to 30s) – Manila",
    description: `<p><strong>Location:</strong> Yes Please at The Palace, 38th St. Uptown, 11th Ave, Taguig, Metro Manila, Philippines</p><p><br><strong>What's Included:</strong></p><ul><li><p>Entry to Never Strangers Dating Mixer (Heterosexual)</p></li><li><p>Access to Algorithm Match-Making</p></li><li><p>1 Complimentary Drink (Alcoholic &amp; Non-Alcoholic)</p></li><li><p>Entry to the Afterparty at Yes Please</p></li></ul>`,
    locationId: 4,
    periodStart: "2026-04-11 19:30:00",
    periodEnd:   "2026-04-11 21:30:00",
    customTickets: [
      { enabled: true, price: 35 }, { enabled: true, price: 35 },
      { enabled: true, price: 31 }, { enabled: true, price: 31 },
    ],
    status: "open", maxCapacity: 50,
  },
  {
    ameliaId: 129,
    name: "Dating Mixer (20s to 30s) – Hong Kong",
    description: `<p><strong>Location:</strong> Mission, 3/F The Steps, H Code, 45 Pottinger St, Central, Hong Kong</p><p><br><strong>What's Included:</strong><br>- Entry to Never Strangers Dating Mixer (Heterosexual)<br>- Access to Algorithm Match-Making</p><p>- 1 Complimentary Drink (Alcoholic &amp; Non-Alcoholic)</p><p>- Afterparty with Mission</p>`,
    locationId: 5,
    periodStart: "2026-04-11 21:00:00",
    periodEnd:   "2026-04-11 23:00:00",
    customTickets: [
      { enabled: true, price: 39 }, { enabled: true, price: 39 },
      { enabled: true, price: 35 }, { enabled: true, price: 35 },
    ],
    status: "open", maxCapacity: 40,
  },
  {
    ameliaId: 123,
    name: "Dating Mixer (20s to 30s) – Kuala Lumpur",
    description: `<p><strong>Location:</strong> Desire Limitless, Lot 6-A &amp; 6-1A, Plaza Batai, Jalan Batai, Bukit Damansara, 50490 Kuala Lumpur, Malaysia</p><p><br><strong>What's Included:</strong></p><p>- Entry to Never Strangers Dating Mixer</p><p>- Access to Algorithm Match-Making</p><p>- 1 Complimentary Drink (Alcoholic &amp; Non-Alcoholic)</p><p>- Entry to the Afterparty at Desire Limitless</p>`,
    locationId: 3,
    periodStart: "2026-04-18 19:30:00",
    periodEnd:   "2026-04-18 21:30:00",
    customTickets: [
      { enabled: true, price: 35 }, { enabled: true, price: 35 },
      { enabled: true, price: 31 }, { enabled: true, price: 31 },
    ],
    status: "open", maxCapacity: 50,
  },
  {
    ameliaId: 128,
    name: "LGBTQ+ Dating Party (20s to 30s) – Manila",
    description: `<p><strong>Location:</strong> The Distillery, Uptown Bonifacio, 10th Avenue, Corner 38th St, Taguig, 1635 Metro Manila</p><p><br><strong>What's Included:</strong></p><p>- Entry to Never Strangers Dating Party (LGBTQ+)</p><p>- Access to Algorithm Match-Making</p><p>- 1 Free Drink (Alcoholic &amp; Non-Alcoholic)</p><p>- Entry to the Afterparty at The Distillery</p>`,
    locationId: 4,
    periodStart: "2026-04-23 19:30:00",
    periodEnd:   "2026-04-23 22:00:00",
    customTickets: [
      { enabled: true, price: 35 }, { enabled: true, price: 35 },
      { enabled: true, price: 31 }, { enabled: true, price: 31 },
    ],
    status: "open", maxCapacity: 80,
  },
  {
    ameliaId: 126,
    name: "Friends Mixer (20s to 30s) – Kuala Lumpur",
    description: `<p><strong>Location:</strong> Up &amp; Away, 141 Jalan Petaling, City Centre, 50000 Kuala Lumpur, Malaysia</p><p><br><strong>What's Included:</strong></p><p>- Entry to Never Strangers Friends Mixer</p><p>- Access to Algorithm Match-Making</p><p>- 1 Complimentary Drink (Alcoholic &amp; Non-Alcoholic)</p><p>- Entry to the Afterparty at Up &amp; Away</p>`,
    locationId: 3,
    periodStart: "2026-04-25 19:30:00",
    periodEnd:   "2026-04-25 21:30:00",
    customTickets: [
      { enabled: true, price: 35 }, { enabled: true, price: 35 },
      { enabled: true, price: 31 }, { enabled: true, price: 31 },
    ],
    status: "open", maxCapacity: 50,
  },
  {
    ameliaId: 112,
    name: "The Great Bali Getaway",
    description: `<p>✔ 2 Never Strangers Curated Activities</p><p>✔ Luxury Villa Stay with Private Pool (3 nights, private room)</p><p>✔ Bali Pub Crawl</p><p>✔ Beach Club Experience</p><p>✔ 1 Cultural Activity</p><p>✔ VIP Club Entrance + Tables + Bottles</p><p>✔ Hosted Experiences</p><p>✔ Daily Breakfast</p>`,
    locationId: 2,
    periodStart: "2026-04-27 00:00:00",
    periodEnd:   "2026-04-30 23:30:00",
    customTickets: [
      { enabled: true, price: 599 }, { enabled: true, price: 599 },
    ],
    status: "full", maxCapacity: 2,
  },
];

// ── Map to Supabase row ───────────────────────────────────────────────────────
function mapToRow(e) {
  const city      = LOCATION_TO_CITY[e.locationId] ?? "Singapore";
  const category  = inferCategory(e.name);
  const venue     = extractVenue(e.description);
  const included  = extractWhatsIncluded(e.description);
  const priceCents = lowestPriceCents(e.customTickets);

  return {
    title:            e.name,
    description:      e.description,
    location:         venue,
    whats_included:   included,
    city,
    category,
    start_at:         toUtc(e.periodStart),
    end_at:           toUtc(e.periodEnd),
    price_cents:      priceCents,
    currency:         "sgd",
    payment_required: priceCents > 0,
    status:           "live",     // open & full both stay live in our app
    // Store amelia ID in a comment for traceability (no amelia_id column)
    // We rely on title+start_at uniqueness for idempotency
    _ameliaId:        e.ameliaId, // used for logging only, not inserted
  };
}

async function main() {
  const jsonPaths = argvJsonPaths();
  let AMELIA_EVENTS =
    jsonPaths.length > 0
      ? loadEventsFromJsonFiles(jsonPaths)
      : EMBEDDED_AMELIA_EVENTS;

  const onlyIds = argvOnlyAmeliaIds();
  if (onlyIds !== null) {
    const allow = new Set(onlyIds);
    AMELIA_EVENTS = AMELIA_EVENTS.filter(e => allow.has(e.ameliaId));
    console.log(`Filter: --only-ids ${onlyIds.join(",")} → ${AMELIA_EVENTS.length} event(s)`);
  }

  if (AMELIA_EVENTS.length === 0) {
    console.error("No events to import (empty list or --only-ids matched nothing).");
    process.exit(1);
  }

  console.log(`\n🌏 Amelia → Supabase Event Import`);
  console.log(
    `Mode: ${DRY_RUN ? "DRY RUN (pass CONFIRM=true to insert)" : "LIVE INSERT"}`
  );
  if (jsonPaths.length) {
    console.log(`Source: --from-json ${jsonPaths.join(" ")} (${AMELIA_EVENTS.length} events)`);
  } else {
    console.log(`Source: embedded snapshot (${AMELIA_EVENTS.length} events)`);
  }
  if (SKIP_IF_TITLE_EXISTS) {
    console.log("Duplicate policy: skip if title already exists in DB (--skip-if-title-exists)");
  }
  console.log();

  const rows = AMELIA_EVENTS.map(mapToRow);

  // Preview table
  console.log("Events to import:");
  rows.forEach((r, i) => {
    const start = new Date(r.start_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" });
    console.log(
      `  ${i + 1}. [WP#${AMELIA_EVENTS[i].ameliaId}] ${r.title}`
    );
    console.log(
      `     ${r.city} | ${r.category} | ${start} | SGD ${(r.price_cents / 100).toFixed(0)} | ${r.location?.slice(0, 60) ?? "—"}`
    );
  });
  console.log();

  if (DRY_RUN) {
    console.log("✅ Dry run complete — no changes made.");
    console.log("   Run with CONFIRM=true to insert.\n");
    return;
  }

  const importTitles = [...new Set(rows.map(r => r.title))];

  const { data: existing } = await supabase
    .from("events")
    .select("id, title, start_at")
    .in("title", importTitles)
    .is("deleted_at", null);

  const existingKeys = new Set(
    (existing || []).map(e => `${e.title}|${startAtKey(e.start_at)}`)
  );
  const titlesSeenInDb = new Set((existing || []).map(e => e.title));

  let inserted = 0, skipped = 0;

  for (const row of rows) {
    const key = `${row.title}|${startAtKey(row.start_at)}`;
    if (!FORCE_INSERT && existingKeys.has(key)) {
      console.log(`  ⏭  SKIP  (same title + start time): ${row.title}`);
      skipped++;
      continue;
    }
    if (!FORCE_INSERT && SKIP_IF_TITLE_EXISTS && titlesSeenInDb.has(row.title)) {
      console.log(`  ⏭  SKIP  (title already in DB): ${row.title}`);
      skipped++;
      continue;
    }

    const { _ameliaId, ...insertRow } = row; // strip internal field
    const { data, error } = await supabase
      .from("events")
      .insert(insertRow)
      .select("id, title")
      .single();

    if (error) {
      console.error(`  ❌ ERROR inserting [WP#${_ameliaId}] ${row.title}:`, error.message);
    } else {
      console.log(`  ✅ INSERTED [WP#${_ameliaId}] ${row.title} → ${data.id}`);
      inserted++;
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped.\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
