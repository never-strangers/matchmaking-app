/// <reference path="../types/pg-copy-streams.d.ts" />
/**
 * Bulk-import a WordPress user export CSV into Supabase public."wp-users".
 *
 * **Transport (auto):**
 * - If `DATABASE_URL` or `SUPABASE_DB_URL` is set → Postgres `COPY` (fastest).
 * - Otherwise → PostgREST batch `POST` using `NEXT_PUBLIC_SUPABASE_URL` +
 *   `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (no DB password needed).
 * - Force: `--via rest` | `--via postgres`
 *
 * Usage:
 *   npm run import:wp-users -- --file "/path/to/export.csv" --dry-run
 *   npm run import:wp-users -- --file "./export.csv" --yes
 *   npm run import:wp-users -- --via postgres --file "./export.csv" --yes
 *   npm run import:wp-users -- --via rest --batch-size 150 --file "./export.csv" --yes
 *
 * Dedupe: skips rows when existing "wp-users" has the same "ID" (WordPress user id)
 * or the same lower(trim(user_email)). CSV duplicate IDs keep the first row.
 */

import * as fs from "node:fs";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import { parse } from "csv-parse/sync";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const WP_TABLE = "wp-users";
const STAGING = "wp_users_import_staging";

/** CSV export column name → `public."wp-users"` column (legacy typos / meta: prefixes). */
const CSV_TO_WP_USERS_COL: Record<string, string> = {
  is_guest_user: "is_geuest_user",
  "meta:billing_first_name": "billing_first_name",
  "meta:billing_last_name": "billing_last_name",
  "meta:billing_company": "billing_company",
  "meta:billing_address_1": "billing_address_1",
  "meta:billing_address_2": "billing_address_2",
  "meta:billing_city": "billing_city",
  "meta:billing_postcode": "billing_postcode",
  "meta:billing_country": "billing_country",
  "meta:billing_state": "billing_state",
  "meta:billing_phone": "billing_phone",
  "meta:billing_email": "billing_email",
  "meta:shipping_first_name": "shipping_first_name",
  "meta:shipping_last_name": "shipping_last_name",
  "meta:shipping_company": "shipping_company",
  "meta:shipping_address_1": "shipping_address_1",
  "meta:shipping_address_2": "shipping_address_2",
  "meta:shipping_city": "shipping_city",
  "meta:shipping_postcode": "shipping_postcode",
  "meta:shipping_country": "shipping_country",
  "meta:shipping_state": "shipping_state",
  "meta:shipping_phone": "shipping_phone",
};

type ColInfo = {
  name: string;
  dataType: string;
  udtName: string;
  isGenerated: string;
};

type ImportVia = "auto" | "postgres" | "rest";

function parseArgs(argv: string[]) {
  let file: string | undefined;
  let dryRun = false;
  let yes = false;
  let via: ImportVia = "auto";
  let batchSize = 200;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" && argv[i + 1]) {
      file = argv[++i];
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--yes") {
      yes = true;
    } else if (a === "--via" && argv[i + 1]) {
      const v = argv[++i].toLowerCase();
      if (v === "postgres" || v === "rest") via = v;
      else {
        console.error('Invalid --via (use "postgres" or "rest")');
        process.exit(1);
      }
    } else if (a === "--batch-size" && argv[i + 1]) {
      batchSize = Math.max(1, parseInt(argv[++i], 10) || 200);
    }
  }
  return { file, dryRun, yes, via, batchSize };
}

function resolveImportMode(via: ImportVia): "postgres" | "rest" {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (via === "postgres") return "postgres";
  if (via === "rest") return "rest";
  return dbUrl ? "postgres" : "rest";
}

function mapCsvRowToWpUsersRest(
  csvRow: Record<string, string | undefined>,
  tableCols: Set<string>
): Record<string, string | null> {
  const obj: Record<string, string | null> = {};
  for (const [csvKey, val] of Object.entries(csvRow)) {
    const tableKey = CSV_TO_WP_USERS_COL[csvKey] ?? csvKey;
    if (!tableCols.has(tableKey)) continue;
    if (val === undefined || val === null) {
      obj[tableKey] = null;
      continue;
    }
    const s = String(val);
    obj[tableKey] = s.trim() !== "" ? s : null;
  }
  return obj;
}

function uniformizeRestRows(
  rows: Record<string, string | null>[],
  keys: string[]
): Record<string, string | null>[] {
  return rows.map((r) => {
    const o: Record<string, string | null> = {};
    for (const k of keys) o[k] = r[k] ?? null;
    return o;
  });
}

async function fetchWpUsersColumnsRest(
  baseUrl: string,
  apiHeaders: Record<string, string>
): Promise<Set<string>> {
  const url = `${baseUrl}/rest/v1/${encodeURIComponent(WP_TABLE)}?limit=1`;
  const res = await fetch(url, { headers: apiHeaders });
  if (!res.ok) throw new Error(`REST schema sample failed (${res.status}): ${await res.text()}`);
  const rows = (await res.json()) as Record<string, unknown>[];
  if (!rows.length) {
    throw new Error(
      `Table "${WP_TABLE}" has no rows — cannot infer columns via REST. Insert a sample row, or use --via postgres with DATABASE_URL.`
    );
  }
  return new Set(Object.keys(rows[0]));
}

async function fetchExistingIdEmailRest(
  baseUrl: string,
  apiHeaders: Record<string, string>
): Promise<{ ids: Set<string>; emails: Set<string> }> {
  const ids = new Set<string>();
  const emails = new Set<string>();
  let offset = 0;
  process.stdout.write("  Loading existing ID + user_email from wp-users");
  for (;;) {
    const url =
      `${baseUrl}/rest/v1/${encodeURIComponent(WP_TABLE)}?select=ID,user_email` +
      `&limit=1000&offset=${offset}&order=ID.asc`;
    const res = await fetch(url, { headers: apiHeaders });
    if (!res.ok) throw new Error(`REST fetch existing: ${await res.text()}`);
    const rows = (await res.json()) as { ID?: number | string; user_email?: string | null }[];
    if (!rows.length) break;
    for (const r of rows) {
      if (r.ID != null) ids.add(String(r.ID));
      if (r.user_email) emails.add(String(r.user_email).toLowerCase().trim());
    }
    offset += rows.length;
    process.stdout.write(".");
    if (rows.length < 1000) break;
  }
  console.log(` (${ids.size} IDs, ${emails.size} emails)`);
  return { ids, emails };
}

async function restBatchInsert(
  baseUrl: string,
  apiHeaders: Record<string, string>,
  rows: Record<string, string | null>[]
): Promise<void> {
  const res = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(WP_TABLE)}`, {
    method: "POST",
    headers: {
      ...apiHeaders,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
}

async function restTableCount(baseUrl: string, apiHeaders: Record<string, string>): Promise<number | null> {
  const res = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(WP_TABLE)}?select=ID`, {
    method: "HEAD",
    headers: { ...apiHeaders, Prefer: "count=exact" },
  });
  const cr = res.headers.get("content-range");
  if (!cr) return null;
  const p = cr.split("/")[1];
  if (!p || p === "*") return null;
  return parseInt(p, 10);
}

async function confirmOrExit(message: string, yes: boolean): Promise<void> {
  if (yes) return;
  if (!input.isTTY) {
    console.error("Not a TTY: use --yes to write, or --dry-run.");
    process.exit(1);
  }
  const rl = readline.createInterface({ input, output });
  const ans = await rl.question(message);
  await rl.close();
  if (ans.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
}

async function runRestImport(
  absFile: string,
  opts: { dryRun: boolean; yes: boolean; batchSize: number }
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    console.error(
      "REST import requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)."
    );
    process.exit(1);
  }

  const apiHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  console.log('── WP users CSV → public."wp-users" (REST) ──');
  console.log(`File: ${absFile}`);
  console.log(`Mode: ${opts.dryRun ? "DRY-RUN (no POST)" : "LIVE"}`);

  const tableCols = await fetchWpUsersColumnsRest(baseUrl, apiHeaders);
  console.log(`Table columns (from sample row): ${tableCols.size}`);

  const raw = fs.readFileSync(absFile);
  const records = parse(raw, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: false,
  }) as Record<string, string | undefined>[];

  console.log(`CSV rows: ${records.length.toLocaleString()}`);

  const { ids: existingIds, emails: existingEmails } = await fetchExistingIdEmailRest(baseUrl, apiHeaders);

  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const partialRows: Record<string, string | null>[] = [];
  let skippedExisting = 0;
  let skippedInvalid = 0;
  let skippedDupeCsv = 0;

  for (const row of records) {
    const id = row.ID?.trim();
    const email = row.user_email?.trim().toLowerCase();
    if (!id || !/^\d+$/.test(id)) {
      skippedInvalid++;
      continue;
    }
    if (!email || !email.includes("@")) {
      skippedInvalid++;
      continue;
    }
    if (existingIds.has(id) || existingEmails.has(email)) {
      skippedExisting++;
      continue;
    }
    if (seenIds.has(id) || seenEmails.has(email)) {
      skippedDupeCsv++;
      continue;
    }
    seenIds.add(id);
    seenEmails.add(email);
    partialRows.push(mapCsvRowToWpUsersRest(row, tableCols));
  }

  const keyUnion = new Set<string>();
  for (const p of partialRows) {
    for (const k of Object.keys(p)) keyUnion.add(k);
  }
  const uniformKeys = [...keyUnion].sort();
  const toInsert = uniformizeRestRows(partialRows, uniformKeys);

  console.log("\n── Summary ──");
  console.log(`  Uniform JSON keys per row: ${uniformKeys.length} (PostgREST PGRST102-safe)`);
  console.log(`  Already in table:         ${skippedExisting.toLocaleString()}`);
  console.log(`  Invalid (bad ID/email):   ${skippedInvalid.toLocaleString()}`);
  console.log(`  Duplicates in CSV:        ${skippedDupeCsv.toLocaleString()}`);
  console.log(`  To insert:                ${toInsert.length.toLocaleString()}`);

  if (opts.dryRun) {
    if (toInsert[0]) {
      console.log(`\nSample mapped keys: ${Object.keys(toInsert[0]).slice(0, 8).join(", ")}…`);
    }
    console.log("\nDRY-RUN: no rows posted.");
    return;
  }

  if (toInsert.length === 0) {
    console.log("\nNothing to insert.");
    return;
  }

  await confirmOrExit('Type "yes" to POST batches to public."wp-users": ', opts.yes);

  const countBefore = await restTableCount(baseUrl, apiHeaders);
  if (countBefore != null) console.log(`\nRow count before (HEAD): ${countBefore.toLocaleString()}`);

  let inserted = 0;
  let failed = 0;
  const { batchSize } = opts;
  const totalBatches = Math.ceil(toInsert.length / batchSize);

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    try {
      await restBatchInsert(baseUrl, apiHeaders, batch);
      inserted += batch.length;
      process.stdout.write(
        `\r  Batch ${batchNum}/${totalBatches} — inserted ${inserted.toLocaleString()}/${toInsert.length.toLocaleString()}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n  Batch ${batchNum} failed: ${msg.slice(0, 200)} — retrying row-by-row…`);
      for (const one of batch) {
        try {
          await restBatchInsert(baseUrl, apiHeaders, [one]);
          inserted++;
        } catch (e2) {
          failed++;
          if (failed <= 5) {
            const m = e2 instanceof Error ? e2.message : String(e2);
            console.error(`    Row ID=${one.ID} failed: ${m.slice(0, 200)}`);
          }
        }
      }
    }
  }

  console.log(`\n\nInserted: ${inserted.toLocaleString()}, failed: ${failed.toLocaleString()}`);
  const countAfter = await restTableCount(baseUrl, apiHeaders);
  if (countAfter != null && countBefore != null) {
    console.log(`\n── Verification ──`);
    console.log(`  Row count after (HEAD): ${countAfter.toLocaleString()}`);
    console.log(`  Delta:                  ${(countAfter - countBefore).toLocaleString()}`);
  }
}

function qi(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

function readCsvHeaders(filePath: string): string[] {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(Math.min(fs.statSync(filePath).size, 2 * 1024 * 1024));
  const n = fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const text = buf.subarray(0, n).toString("utf8");
  const records = parse(text, {
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    to: 1,
  }) as string[][];
  if (!records[0]?.length) {
    throw new Error("Could not read CSV header (empty or unparseable).");
  }
  return records[0];
}

function detectDelimiter(headerLine: string): string {
  const tab = (headerLine.match(/\t/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  if (tab > comma) return "\t";
  return ",";
}

function mapCsvHeaderToTarget(csvHeaders: string[], targetName: string): string | undefined {
  const exact = csvHeaders.find((h) => h === targetName);
  if (exact !== undefined) return exact;
  const lower = targetName.toLowerCase();
  return csvHeaders.find((h) => h.toLowerCase() === lower);
}

/** Same as mapCsvHeaderToTarget plus `CSV_TO_WP_USERS_COL` (e.g. is_guest_user → is_geuest_user). */
function csvSourceForTargetColumn(csvHeaders: string[], targetName: string): string | undefined {
  const direct = mapCsvHeaderToTarget(csvHeaders, targetName);
  if (direct !== undefined) return direct;
  for (const [csvCol, tableCol] of Object.entries(CSV_TO_WP_USERS_COL)) {
    if (tableCol === targetName && csvHeaders.includes(csvCol)) return csvCol;
  }
  return undefined;
}

function sqlCastFromStaging(stagingAlias: string, srcHeader: string, col: ColInfo): string {
  const colRef = `${stagingAlias}.${qi(srcHeader)}`;
  const trimmed = `BTRIM(${colRef})`;
  const emptyToNull = `NULLIF(${trimmed}, '')`;

  if (col.isGenerated === "ALWAYS") {
    throw new Error(`Unexpected generated column in mapping: ${col.name}`);
  }

  switch (col.dataType) {
    case "bigint":
    case "integer":
    case "smallint":
      return `CASE
        WHEN ${emptyToNull} IS NULL THEN NULL
        WHEN BTRIM(${colRef}) ~ '^[0-9]+$' OR BTRIM(${colRef}) ~ '^-[0-9]+$'
          THEN BTRIM(${colRef})::${col.dataType}
        ELSE NULL
      END`;
    case "double precision":
    case "real":
      return `CASE WHEN ${emptyToNull} IS NULL THEN NULL ELSE BTRIM(${colRef})::double precision END`;
    case "numeric":
      return `CASE WHEN ${emptyToNull} IS NULL THEN NULL ELSE BTRIM(${colRef})::numeric END`;
    case "boolean":
      return `CASE
        WHEN ${emptyToNull} IS NULL THEN NULL
        WHEN LOWER(BTRIM(${colRef})) IN ('true', 't', '1', 'yes') THEN TRUE
        WHEN LOWER(BTRIM(${colRef})) IN ('false', 'f', '0', 'no') THEN FALSE
        ELSE NULL
      END`;
    case "timestamp with time zone":
    case "timestamp without time zone":
      return `CASE WHEN ${emptyToNull} IS NULL THEN NULL ELSE BTRIM(${colRef})::timestamptz END`;
    case "date":
      return `CASE WHEN ${emptyToNull} IS NULL THEN NULL ELSE BTRIM(${colRef})::date END`;
    case "json":
    case "jsonb":
      return `CASE WHEN ${emptyToNull} IS NULL THEN NULL ELSE BTRIM(${colRef})::jsonb END`;
    case "USER-DEFINED":
      if (col.udtName === "citext") {
        return `${emptyToNull}::citext`;
      }
      return `${emptyToNull}::text`;
    default:
      return `${emptyToNull}::text`;
  }
}

async function loadTargetColumns(client: pg.PoolClient): Promise<ColInfo[]> {
  const { rows } = await client.query<{
    column_name: string;
    data_type: string;
    udt_name: string;
    is_generated: string;
  }>(
    `
    SELECT column_name, data_type, udt_name, is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [WP_TABLE]
  );
  return rows.map((r) => ({
    name: r.column_name,
    dataType: r.data_type,
    udtName: r.udt_name,
    isGenerated: r.is_generated,
  }));
}

async function listUniqueIndexes(client: pg.PoolClient): Promise<string[]> {
  const { rows } = await client.query<{ indexname: string }>(
    `
    SELECT i.relname AS indexname
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    WHERE n.nspname = 'public'
      AND t.relname = $1
      AND ix.indisunique
  `,
    [WP_TABLE]
  );
  return rows.map((r) => r.indexname);
}

async function runPostgresCopyImport(absFile: string, dryRun: boolean, yes: boolean): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "Postgres import requires DATABASE_URL or SUPABASE_DB_URL, or omit them to use REST + SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }
  const csvHeaders = readCsvHeaders(absFile);
  const fd0 = fs.openSync(absFile, "r");
  const headBuf = Buffer.alloc(65536);
  const headN = fs.readSync(fd0, headBuf, 0, headBuf.length, 0);
  fs.closeSync(fd0);
  const delimiter = detectDelimiter(headBuf.subarray(0, headN).toString("utf8"));

  console.log('── WP users CSV → public."wp-users" (Postgres COPY) ──');
  console.log(`File: ${absFile}`);
  console.log(`Delimiter: ${delimiter === "\t" ? "TAB" : "comma"}`);
  console.log(`CSV columns (${csvHeaders.length}): ${csvHeaders.slice(0, 12).join(", ")}${csvHeaders.length > 12 ? ", …" : ""}`);
  console.log(`Mode: ${dryRun ? "DRY-RUN (transaction rolled back)" : "LIVE"}`);

  const ssl =
    dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false };

  const pool = new pg.Pool({ connectionString: dbUrl, ssl });
  const client = await pool.connect();

  try {
    const targetCols = await loadTargetColumns(client);
    if (targetCols.length === 0) {
      throw new Error(`Table public."${WP_TABLE}" not found or has no columns.`);
    }

    const idHeader = mapCsvHeaderToTarget(csvHeaders, "ID");
    const emailHeader = mapCsvHeaderToTarget(csvHeaders, "user_email");
    const hasTargetId = targetCols.some((c) => c.name === "ID");
    const hasTargetEmail = targetCols.some((c) => c.name === "user_email");

    const dedupeKey =
      idHeader && hasTargetId
        ? ("wp_user_id_ID" as const)
        : emailHeader && hasTargetEmail
          ? ("email" as const)
          : null;

    if (!dedupeKey) {
      throw new Error(
        'Need CSV columns mapping to "ID" and target column "ID", or "user_email" on both sides, for dedupe.'
      );
    }
    if (!emailHeader || !hasTargetEmail) {
      console.warn("Warning: user_email not mapped — email validation in WHERE may be skipped.");
    }

    console.log(`Chosen dedupe: ${dedupeKey === "wp_user_id_ID" ? '"ID" (WordPress user id) + lower(email) guard' : "lower(user_email) only"}`);

    const uniqIndexes = await listUniqueIndexes(client);
    console.log(`Unique indexes on "${WP_TABLE}": ${uniqIndexes.length ? uniqIndexes.join(", ") : "(none reported)"}`);

    const insertPlan: { target: ColInfo; srcHeader: string }[] = [];
    for (const t of targetCols) {
      if (t.isGenerated === "ALWAYS") continue;
      const src = csvSourceForTargetColumn(csvHeaders, t.name);
      if (src) {
        insertPlan.push({ target: t, srcHeader: src });
      }
    }

    if (insertPlan.length === 0) {
      throw new Error("No overlapping columns between CSV and target table.");
    }

    console.log(`Insert column overlap: ${insertPlan.length} columns`);

    if (!dryRun) {
      await confirmOrExit('Type "yes" to insert into public."wp-users": ', yes);
    }

    const stagingColsSql = csvHeaders.map((h) => `${qi(h)} text`).join(",\n  ");
    const copyColList = csvHeaders.map(qi).join(", ");
    const delimClause = delimiter === "\t" ? "DELIMITER E'\\t'" : "DELIMITER ','";

    const partitionExpr =
      dedupeKey === "wp_user_id_ID" && idHeader
        ? `NULLIF(BTRIM(staging.${qi(idHeader)}), '')`
        : `LOWER(BTRIM(staging.${qi(emailHeader!)}))`;

    const dedupedCte = `
WITH numbered AS (
  SELECT
    staging.*,
    ROW_NUMBER() OVER (
      PARTITION BY ${partitionExpr}
      ORDER BY ctid
    ) AS _dedupe_rn
  FROM ${STAGING} AS staging
),
deduped AS (
  SELECT * FROM numbered WHERE _dedupe_rn = 1
)`;

    const idExpr =
      idHeader && hasTargetId
        ? `CASE
            WHEN BTRIM(s.${qi(idHeader)}) ~ '^[0-9]+$' OR BTRIM(s.${qi(idHeader)}) ~ '^-[0-9]+$'
              THEN BTRIM(s.${qi(idHeader)})::bigint
            ELSE NULL
          END`
        : "NULL::bigint";

    const emailExpr = emailHeader
      ? `NULLIF(BTRIM(s.${qi(emailHeader)}), '')`
      : "NULL::text";

    const whereValid =
      dedupeKey === "wp_user_id_ID"
        ? `
      ${idExpr} IS NOT NULL
      AND ${emailExpr} IS NOT NULL
      AND POSITION('@' IN LOWER(${emailExpr})) > 0
    `
        : `
      ${emailExpr} IS NOT NULL
      AND POSITION('@' IN LOWER(${emailExpr})) > 0
    `;

    const existsAlready =
      dedupeKey === "wp_user_id_ID"
        ? `(
        EXISTS (
          SELECT 1 FROM public.${qi(WP_TABLE)} w
          WHERE w.${qi("ID")} = ${idExpr}
        )
        OR EXISTS (
          SELECT 1 FROM public.${qi(WP_TABLE)} w
          WHERE w.user_email IS NOT NULL
            AND BTRIM(w.user_email::text) <> ''
            AND LOWER(BTRIM(w.user_email::text)) = LOWER(BTRIM(${emailExpr}))
        )
      )`
        : `EXISTS (
        SELECT 1 FROM public.${qi(WP_TABLE)} w
        WHERE w.user_email IS NOT NULL
          AND BTRIM(w.user_email::text) <> ''
          AND LOWER(BTRIM(w.user_email::text)) = LOWER(BTRIM(${emailExpr}))
      )`;

    const skipExisting = `AND NOT (${existsAlready})`;

    const insertColNames = insertPlan.map((p) => qi(p.target.name)).join(", ");
    const insertValues = insertPlan
      .map((p) => sqlCastFromStaging("s", p.srcHeader, p.target))
      .join(",\n  ");

    const insertSql = `
${dedupedCte}
INSERT INTO public.${qi(WP_TABLE)} (${insertColNames})
SELECT
  ${insertValues}
FROM deduped s
WHERE ${whereValid}
${skipExisting}
`;

    const countWouldSql = `
${dedupedCte}
SELECT COUNT(*)::bigint AS cnt
FROM deduped s
WHERE ${whereValid}
${skipExisting}
`;

    const countStagingSql = `SELECT COUNT(*)::bigint AS cnt FROM ${STAGING}`;
    const countInvalidSql = `
${dedupedCte}
SELECT COUNT(*)::bigint AS cnt FROM deduped s
WHERE NOT (${whereValid})
`;

    const countSkippedExistingSql = `
${dedupedCte}
SELECT COUNT(*)::bigint AS cnt FROM deduped s
WHERE (${whereValid})
  AND (${existsAlready})
`;

    await client.query("BEGIN");
    const { rows: beforeRows } = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM public.${qi(WP_TABLE)}`
    );
    const countBefore = BigInt(beforeRows[0].c);

    await client.query(`DROP TABLE IF EXISTS ${STAGING}`);
    await client.query(`CREATE UNLOGGED TABLE ${STAGING} (\n  ${stagingColsSql}\n)`);

    const copySql = `COPY ${STAGING} (${copyColList}) FROM STDIN WITH (FORMAT csv, HEADER true, ${delimClause}, QUOTE '"', ESCAPE '"', ENCODING 'UTF8')`;
    const copyStream = client.query(copyFrom(copySql));
    await pipeline(createReadStream(absFile), copyStream);

    const { rows: totStaging } = await client.query<{ cnt: string }>(countStagingSql);
    const totalStaging = BigInt(totStaging[0].cnt);

    const { rows: invalidRows } = await client.query<{ cnt: string }>(countInvalidSql);
    const invalidCount = BigInt(invalidRows[0].cnt);

    const { rows: wouldRows } = await client.query<{ cnt: string }>(countWouldSql);
    const wouldInsert = BigInt(wouldRows[0].cnt);

    const { rows: skipExistRows } = await client.query<{ cnt: string }>(countSkippedExistingSql);
    const skippedExisting = BigInt(skipExistRows[0].cnt);

    console.log("\n── Counts (staging) ──");
    console.log(`Total CSV rows loaded into staging: ${totalStaging}`);
    console.log(`Invalid / filtered (bad id or email): ${invalidCount}`);
    console.log(`Would insert (new id + email): ${wouldInsert}`);
    console.log(`Skipped (already in "${WP_TABLE}" by id or email): ${skippedExisting}`);

    let inserted = BigInt(0);
    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("\nDRY-RUN: rolled back (no changes).");
      console.log("\n── Verification (dry-run) ──");
      console.log("Skipped live duplicate checks (transaction rolled back).");
    } else {
      const ins = await client.query(insertSql);
      inserted = BigInt(ins.rowCount ?? 0);
      await client.query("COMMIT");
      console.log(`\nInserted: ${inserted}`);

      await client.query(`DROP TABLE IF EXISTS ${STAGING}`);

      const { rows: afterRows } = await client.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM public.${qi(WP_TABLE)}`
      );
      const countAfter = BigInt(afterRows[0].c);
      console.log("\n── Verification ──");
      console.log(`Row count before: ${countBefore}`);
      console.log(`Row count after:  ${countAfter}`);
      console.log(`Expected delta:   ${inserted}`);
      if (countAfter !== countBefore + inserted) {
        console.warn("Warning: post-insert count does not match before + inserted (concurrent writes?).");
      }

      const dupId = await client.query(
        `SELECT ${qi("ID")}, COUNT(*)::bigint AS n
         FROM public.${qi(WP_TABLE)}
         GROUP BY 1 HAVING COUNT(*) > 1
         LIMIT 5`
      );
      const dupEmail = await client.query(
        `SELECT LOWER(BTRIM(user_email::text)) AS em, COUNT(*)::bigint AS n
         FROM public.${qi(WP_TABLE)}
         WHERE user_email IS NOT NULL AND BTRIM(user_email::text) <> ''
         GROUP BY 1 HAVING COUNT(*) > 1
         LIMIT 5`
      );
      console.log(`Duplicate "ID" groups (sample): ${dupId.rowCount} (max 5 shown)`);
      if (dupId.rowCount && dupId.rows.length) {
        console.log(dupId.rows);
      }
      console.log(`Duplicate lower(email) groups (sample): ${dupEmail.rowCount} (max 5 shown)`);
      if (dupEmail.rowCount && dupEmail.rows.length) {
        console.log(dupEmail.rows);
      }
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const { file, dryRun, yes, via, batchSize } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Missing --file "/path/to/export.csv"');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  const absFile = path.resolve(file);
  const mode = resolveImportMode(via);

  if (mode === "rest") {
    await runRestImport(absFile, { dryRun, yes, batchSize });
    return;
  }
  await runPostgresCopyImport(absFile, dryRun, yes);
}

main();
