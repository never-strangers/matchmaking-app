/**
 * Unified cleanup CLI for seed data.
 *
 * Usage:
 *   SEED_CONFIRM=true npx tsx scripts/cleanup.ts --label <label> [--dry-run]
 *
 * Delete order (FK-safe):
 *   messages → conversations → match_* →
 *   answers (by event_id, then by seed_run_id) → event_attendees →
 *   event_ticket_types → event_questions → questions → events →
 *   profiles → auth users → seed_runs
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ── CLI Args ─────────────────────────────────────────────────────────────────

type CleanupArgs = {
  label: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CleanupArgs {
  let label = "";
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--label" && argv[i + 1]) { label = argv[++i]; }
    else if (argv[i] === "--dry-run") { dryRun = true; }
  }
  return { label, dryRun };
}

function ensureGuards(args: CleanupArgs) {
  if (!args.label) { console.error("❌ --label is required"); process.exit(1); }
  if (!args.dryRun && process.env.SEED_CONFIRM !== "true") {
    console.error("❌ Set SEED_CONFIRM=true to run destructive cleanup (or use --dry-run)");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mkClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type TableResult = { table: string; deleted: number | "skip" | "err" };

async function countAndDelete(
  table: string,
  column: string,
  ids: string[],
  dryRun: boolean
): Promise<TableResult> {
  if (!ids.length) return { table, deleted: 0 };
  const sb = mkClient();

  const countQ = sb.from(table).select("*", { count: "exact", head: true });
  const q = ids.length === 1 ? countQ.eq(column, ids[0]) : countQ.in(column, ids);
  const { count, error: ce } = await q;
  if (ce) {
    if (ce.message.includes("Could not find the table") || ce.message.includes("does not exist")) {
      return { table, deleted: "skip" };
    }
    console.warn(`  ⚠️  ${table}: count error: ${ce.message}`);
    return { table, deleted: "err" };
  }

  if (dryRun) return { table, deleted: count ?? 0 };

  const delQ = sb.from(table).delete();
  const dq = ids.length === 1 ? delQ.eq(column, ids[0]) : delQ.in(column, ids);
  const { error: de } = await dq;
  if (de) {
    console.warn(`  ⚠️  ${table}: delete error: ${de.message}`);
    return { table, deleted: "err" };
  }
  return { table, deleted: count ?? 0 };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureGuards(args);
  const { label, dryRun } = args;
  console.log(`\n🧹 Cleanup${dryRun ? " (DRY RUN)" : ""} — label: "${label}"\n`);

  // 1. Find seed_run IDs matching label
  const { data: runs, error: runsErr } = await mkClient()
    .from("seed_runs")
    .select("id, label, created_at")
    .ilike("label", `%${label}%`);

  if (runsErr) { console.error("❌ seed_runs query:", runsErr.message); process.exit(1); }
  if (!runs?.length) {
    console.log(`ℹ️  No seed_runs matching "${label}" — nothing to clean.`);
    return;
  }

  const runIds = runs.map((r: { id: string }) => r.id);
  console.log(`Found ${runIds.length} seed_run(s):`);
  runs.forEach((r: { id: string; label: string; created_at: string }) =>
    console.log(`  ${r.label} (${r.id.slice(0, 8)}…) created ${r.created_at?.slice(0, 10)}`)
  );

  // 2. Gather event IDs for these runs
  const { data: evtRows } = await mkClient()
    .from("events")
    .select("id")
    .in("seed_run_id", runIds);
  const eventIds = (evtRows ?? []).map((r: { id: string }) => r.id);

  // 3. Gather conversation IDs for messages cleanup
  let convIds: string[] = [];
  if (eventIds.length) {
    const { data: convRows } = await mkClient()
      .from("conversations")
      .select("id")
      .in("event_id", eventIds);
    convIds = (convRows ?? []).map((r: { id: string }) => r.id);
  }

  // 4. Gather auth user IDs from profiles
  const { data: profRows } = await mkClient()
    .from("profiles")
    .select("id")
    .in("seed_run_id", runIds);
  const authUserIds = (profRows ?? []).map((r: { id: string }) => r.id);

  const results: TableResult[] = [];

  // 5. Delete in FK-safe order
  if (convIds.length) {
    results.push(await countAndDelete("messages", "conversation_id", convIds, dryRun));
  } else {
    results.push({ table: "messages", deleted: 0 });
  }

  if (eventIds.length) {
    results.push(await countAndDelete("conversations", "event_id", eventIds, dryRun));
    results.push(await countAndDelete("match_results", "event_id", eventIds, dryRun));
    results.push(await countAndDelete("match_rounds", "event_id", eventIds, dryRun));
    results.push(await countAndDelete("match_runs", "event_id", eventIds, dryRun));
    results.push(await countAndDelete("match_reveals", "event_id", eventIds, dryRun));
  } else {
    results.push({ table: "conversations", deleted: 0 });
    results.push({ table: "match_results", deleted: 0 });
    results.push({ table: "match_rounds", deleted: 0 });
    results.push({ table: "match_runs", deleted: 0 });
    results.push({ table: "match_reveals", deleted: 0 });
  }

  // answers: must clear event_question_id FKs before event_questions (some rows lack seed_run_id)
  if (eventIds.length) {
    results.push(await countAndDelete("answers", "event_id", eventIds, dryRun));
  } else {
    results.push({ table: "answers (by event_id)", deleted: 0 });
  }
  results.push(await countAndDelete("answers", "seed_run_id", runIds, dryRun));
  results.push(await countAndDelete("event_attendees", "seed_run_id", runIds, dryRun));

  if (eventIds.length) {
    results.push(await countAndDelete("event_ticket_types", "event_id", eventIds, dryRun));
    results.push(await countAndDelete("event_questions", "event_id", eventIds, dryRun));
    results.push(await countAndDelete("questions", "event_id", eventIds, dryRun));
  } else {
    results.push({ table: "event_ticket_types", deleted: 0 });
    results.push({ table: "event_questions", deleted: 0 });
    results.push({ table: "questions", deleted: 0 });
  }

  results.push(await countAndDelete("events", "seed_run_id", runIds, dryRun));
  results.push(await countAndDelete("profiles", "seed_run_id", runIds, dryRun));

  // Auth users
  if (!dryRun && authUserIds.length) {
    console.log(`\n  🔑 Deleting ${authUserIds.length} auth users…`);
    let authDeleted = 0;
    for (const uid of authUserIds) {
      const { error } = await mkClient().auth.admin.deleteUser(uid);
      if (error) { console.warn(`    ⚠️  auth user ${uid.slice(0, 8)}: ${error.message}`); }
      else { authDeleted++; }
    }
    results.push({ table: "auth.users", deleted: authDeleted });
  } else {
    results.push({ table: "auth.users", deleted: dryRun ? authUserIds.length : 0 });
  }

  // seed_runs
  if (!dryRun) {
    const { error: srErr } = await mkClient().from("seed_runs").delete().in("id", runIds);
    results.push({ table: "seed_runs", deleted: srErr ? "err" : runIds.length });
  } else {
    results.push({ table: "seed_runs", deleted: runIds.length });
  }

  // 6. Print summary
  console.log(`\n${dryRun ? "📋 Would delete" : "✅ Deleted"}:\n`);
  const maxLen = Math.max(...results.map((r) => r.table.length));
  for (const r of results) {
    const pad = r.table.padEnd(maxLen + 2);
    const count = r.deleted === "skip" ? "(table not found)" : r.deleted === "err" ? "ERROR" : `${r.deleted} rows`;
    console.log(`  ${pad} ${count}`);
  }

  if (dryRun) {
    console.log("\n  (dry-run: no changes made)");
  } else {
    console.log("\n✅ Done.");
  }
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
