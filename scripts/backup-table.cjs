#!/usr/bin/env node
/**
 * Backup a Supabase table to scripts/backups/<table>-<timestamp>.json
 * before any DELETE or UPDATE operation.
 *
 * Usage:
 *   node scripts/backup-table.cjs <table>
 *   node scripts/backup-table.cjs <table> --filter "column=value"
 *
 * Examples:
 *   node scripts/backup-table.cjs email_template_overrides
 *   node scripts/backup-table.cjs profiles --filter "status=pending_verification"
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const args = process.argv.slice(2);
const table = args[0];

if (!table) {
  console.error("Usage: node scripts/backup-table.cjs <table> [--filter column=value]");
  process.exit(1);
}

// Parse optional --filter column=value
let filterCol, filterVal;
const filterIdx = args.indexOf("--filter");
if (filterIdx !== -1 && args[filterIdx + 1]) {
  const [col, ...rest] = args[filterIdx + 1].split("=");
  filterCol = col;
  filterVal = rest.join("=");
}

async function fetchAll(table, filterCol, filterVal) {
  const PAGE = 1000;
  let rows = [];
  let offset = 0;
  while (true) {
    let q = supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE - 1);
    if (filterCol) q = q.eq(filterCol, filterVal);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

(async () => {
  console.log(`Fetching all rows from "${table}"${filterCol ? ` where ${filterCol}=${filterVal}` : ""}...`);
  let rows;
  try {
    rows = await fetchAll(table, filterCol, filterVal);
  } catch (err) {
    console.error("Error fetching rows:", err.message);
    process.exit(1);
  }

  console.log(`  Found ${rows.length} rows.`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${table}-${timestamp}.json`;
  const outDir = path.join(__dirname, "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, filename);

  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
  console.log(`Backup written to: scripts/backups/${filename}`);
  console.log(`  (${rows.length} rows, ${fs.statSync(outPath).size} bytes)`);
  console.log("\nVerify the backup looks correct before proceeding with DELETE/UPDATE.");
})();
