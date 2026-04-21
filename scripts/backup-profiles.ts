/**
 * Export all rows from public.profiles to scripts/backup-profiles-<ISO>.json
 * (gitignored via /scripts/backup-*.json). Contains PII — do not commit.
 *
 *   npx tsx scripts/backup-profiles.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const PAGE = 1000;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("profiles:", error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname);
  const outPath = path.join(outDir, `backup-profiles-${stamp}.json`);
  const payload = {
    exported_at: new Date().toISOString(),
    table: "profiles",
    count: rows.length,
    rows,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${rows.length} profile(s) → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
