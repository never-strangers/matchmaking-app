#!/usr/bin/env node
/**
 * import-amelia-events.cjs
 *
 * Imports Amelia WP events into Supabase events table.
 * Data was exported from https://thisisneverstrangers.com/wp-admin
 *
 * Usage:
 *   node scripts/import-amelia-events.cjs             # dry-run (safe preview)
 *   CONFIRM=true node scripts/import-amelia-events.cjs  # actually insert
 *   CONFIRM=true node scripts/import-amelia-events.cjs --upsert  # upsert on amelia_id
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.env.CONFIRM !== "true";
const UPSERT  = process.argv.includes("--upsert");

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
  // Match "Location: <venue text>" from HTML
  const m = desc.match(/Location[:\s<\/strong>]+([^<]+)/i);
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

// ── Amelia events (exported 2026-04-02) ──────────────────────────────────────
const AMELIA_EVENTS = [
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
  console.log(`\n🌏 Amelia → Supabase Event Import`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (pass CONFIRM=true to insert)" : "LIVE INSERT"}\n`);

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

  // Check for duplicates (title + start_at)
  const { data: existing } = await supabase
    .from("events")
    .select("id, title, start_at")
    .in("title", rows.map(r => r.title));

  const existingKeys = new Set(
    (existing || []).map(e => `${e.title}|${e.start_at}`)
  );

  let inserted = 0, skipped = 0;

  for (const row of rows) {
    const key = `${row.title}|${row.start_at}`;
    if (!UPSERT && existingKeys.has(key)) {
      console.log(`  ⏭  SKIP  (already exists): ${row.title}`);
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
