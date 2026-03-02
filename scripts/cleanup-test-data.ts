import "dotenv/config";
import fs from "fs";
import path from "path";
import { createAdminClient } from "../lib/supabase/adminClient";

type CleanupCliOptions = {
  runId?: string;
  label?: string;
  dryRun: boolean;
};

type TableCleanupResult = {
  table: string;
  deleted: number | null;
};

type CleanupSummary = {
  runIds: string[];
  byTable: TableCleanupResult[];
  dryRun: boolean;
  labelFilter?: string;
  timestamp: string;
};

function parseCliArgs(argv: string[]): CleanupCliOptions {
  let runId: string | undefined;
  let label: string | undefined;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--run-id" && i + 1 < argv.length) {
      runId = argv[++i];
    } else if (arg === "--label" && i + 1 < argv.length) {
      label = argv[++i];
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { runId, label, dryRun };
}

function ensureEnvGuards(opts: CleanupCliOptions) {
  const nodeEnv = process.env.NODE_ENV || "development";
  const seedConfirm = process.env.SEED_CONFIRM;

  if (nodeEnv === "production" && seedConfirm !== "true") {
    console.error(
      "❌ Refusing to run in production without SEED_CONFIRM=true. Aborting."
    );
    process.exit(1);
  }

  if (!opts.dryRun && seedConfirm !== "true") {
    console.error(
      "❌ SEED_CONFIRM=true is required to run cleanup-test-data (non dry-run). Use --dry-run to preview."
    );
    process.exit(1);
  }

  if (!opts.runId && !opts.label) {
    console.error(
      "❌ You must specify either --run-id <uuid> or --label <text> to select which seed_runs to clean up."
    );
    process.exit(1);
  }
}

async function resolveRunIds(opts: CleanupCliOptions): Promise<string[]> {
  const supabase = createAdminClient();

  if (opts.runId) {
    return [opts.runId];
  }

  const labelFilter = opts.label ?? "";
  const { data, error } = await supabase
    .from("seed_runs")
    .select("id, label")
    .ilike("label", `%${labelFilter}%`);

  if (error) {
    console.error("❌ Failed to query seed_runs:", error.message);
    process.exit(1);
  }

  const ids = (data ?? []).map((row) => row.id as string);
  if (!ids.length) {
    console.error(
      `❌ No seed_runs found matching label filter "${labelFilter}". Nothing to clean.`
    );
    process.exit(1);
  }

  console.log(
    `🧹 Found ${ids.length} seed_run(s) matching label "${labelFilter}": ${ids.join(
      ", "
    )}`
  );

  return ids;
}

async function deleteBySeedRunId(params: {
  table: string;
  column: string;
  runIds: string[];
  dryRun: boolean;
}): Promise<TableCleanupResult> {
  const supabase = createAdminClient();

  // Count first for reporting.
  let countQuery = supabase
    .from(params.table)
    .select("*", { count: "exact", head: true });

  if (params.runIds.length === 1) {
    countQuery = countQuery.eq(params.column, params.runIds[0]);
  } else {
    countQuery = countQuery.in(params.column, params.runIds);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    if (countError.message.includes("Could not find the table")) {
      console.log(
        `Table ${params.table} does not exist in this project, skipping.`
      );
      return { table: params.table, deleted: 0 };
    }
    console.error(
      `Error counting rows in ${params.table}:`,
      countError.message
    );
    return { table: params.table, deleted: null };
  }

  if (params.dryRun) {
    return { table: params.table, deleted: count ?? 0 };
  }

  let deleteQuery = supabase.from(params.table).delete();
  if (params.runIds.length === 1) {
    deleteQuery = deleteQuery.eq(params.column, params.runIds[0]);
  } else {
    deleteQuery = deleteQuery.in(params.column, params.runIds);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    console.error(
      `Error deleting from ${params.table}:`,
      deleteError.message
    );
    return { table: params.table, deleted: null };
  }

  return { table: params.table, deleted: count ?? 0 };
}

async function deleteEventsAndMatchData(params: {
  runIds: string[];
  dryRun: boolean;
}): Promise<TableCleanupResult[]> {
  const supabase = createAdminClient();
  const results: TableCleanupResult[] = [];

  // Get seeded event_ids first
  let eventsQuery = supabase.from("events").select("id, seed_run_id");
  if (params.runIds.length === 1) {
    eventsQuery = eventsQuery.eq("seed_run_id", params.runIds[0]);
  } else {
    eventsQuery = eventsQuery.in("seed_run_id", params.runIds);
  }
  const { data: events, error: eventsError } = await eventsQuery;
  if (eventsError) {
    console.error(
      "Error loading seeded events for cleanup:",
      eventsError.message
    );
    return results;
  }
  const eventIds = (events ?? []).map((e) => e.id as string);
  if (!eventIds.length) {
    return results;
  }

  // Helper to delete tables by event_id where seed_run_id is *not* available.
  async function deleteByEventId(
    table: string,
    column: string
  ): Promise<TableCleanupResult> {
    // Count
    let countQuery = supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(column, eventIds);
    const { count, error: countError } = await countQuery;
    if (countError) {
      if (countError.message.includes("Could not find the table")) {
        console.log(`Table ${table} does not exist, skipping.`);
        return { table, deleted: 0 };
      }
      console.error(
        `Error counting rows in ${table} by event_id:`,
        countError.message
      );
      return { table, deleted: null };
    }

    if (params.dryRun) {
      return { table, deleted: count ?? 0 };
    }

    let deleteQuery = supabase.from(table).delete().in(column, eventIds);
    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      console.error(
        `Error deleting from ${table} by event_id:`,
        deleteError.message
      );
      return { table, deleted: null };
    }

    return { table, deleted: count ?? 0 };
  }

  // match_reveal_queue
  results.push(await deleteByEventId("match_reveal_queue", "event_id"));
  // match_reveals
  results.push(await deleteByEventId("match_reveals", "event_id"));
  // match_results
  results.push(await deleteByEventId("match_results", "event_id"));
  // likes
  results.push(await deleteByEventId("likes", "event_id"));
  // match_runs
  results.push(await deleteByEventId("match_runs", "event_id"));
  // answers (only those not tagged by seed_run_id, but tied to seeded events)
  results.push(await deleteByEventId("answers", "event_id"));
  // event_attendees
  results.push(await deleteByEventId("event_attendees", "event_id"));
  // questions tied to these events
  results.push(await deleteByEventId("questions", "event_id"));
  // event_ticket_types
  results.push(await deleteByEventId("event_ticket_types", "event_id"));

  // Finally, delete events themselves (seed_run_id is on events, but we already loaded ids)
  {
    let countQuery = supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .in("id", eventIds);
    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error(
        "Error counting events for seeded runs:",
        countError.message
      );
      results.push({ table: "events", deleted: null });
    } else if (params.dryRun) {
      results.push({ table: "events", deleted: count ?? 0 });
    } else {
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .in("id", eventIds);
      if (deleteError) {
        console.error(
          "Error deleting events for seeded runs:",
          deleteError.message
        );
        results.push({ table: "events", deleted: null });
      } else {
        results.push({ table: "events", deleted: count ?? 0 });
      }
    }
  }

  return results;
}

async function deleteAuthUsersForSeedRuns(params: {
  runIds: string[];
  dryRun: boolean;
}): Promise<TableCleanupResult> {
  const supabase = createAdminClient();

  let profilesQuery = supabase
    .from("profiles")
    .select("id, seed_run_id")
    .not("seed_run_id", "is", null);
  if (params.runIds.length === 1) {
    profilesQuery = profilesQuery.eq("seed_run_id", params.runIds[0]);
  } else {
    profilesQuery = profilesQuery.in("seed_run_id", params.runIds);
  }

  const { data, error } = await profilesQuery;
  if (error) {
    console.error(
      "Error loading profiles for auth user cleanup:",
      error.message
    );
    return { table: "auth.users", deleted: null };
  }

  const ids = (data ?? []).map((row) => row.id as string);
  if (!ids.length) {
    return { table: "auth.users", deleted: 0 };
  }

  if (params.dryRun) {
    console.log(
      `🧪 Dry run: would delete ${ids.length} auth user(s) for seeded profiles.`
    );
    return { table: "auth.users", deleted: ids.length };
  }

  let deleted = 0;
  for (const id of ids) {
    const { error: delError } = await supabase.auth.admin.deleteUser(id);
    if (delError) {
      console.error(`Error deleting auth user ${id}:`, delError.message);
      continue;
    }
    deleted += 1;
  }

  return { table: "auth.users", deleted };
}

function writeCleanupSummary(summary: CleanupSummary, labelHint?: string) {
  if (summary.dryRun) {
    // For dry-run, just log to console (no file)
    console.log("\n🔍 Dry-run cleanup summary:");
    for (const r of summary.byTable) {
      if (r.deleted === null) {
        console.log(`- ${r.table}: error (see logs above)`);
      } else {
        console.log(`- ${r.table}: would delete ${r.deleted} row(s)`);
      }
    }
    return;
  }

  const outputDir = path.join(__dirname, ".seed-output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const safeLabel =
    labelHint?.trim().length && labelHint.trim() !== "*"
      ? labelHint.trim().replace(/[^a-zA-Z0-9_-]+/g, "-")
      : "by-id";

  const filename = `cleanup-test-data-${safeLabel}-${Date.now()}.json`;
  const outputPath = path.join(outputDir, filename);

  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`\n📝 Cleanup summary written to ${outputPath}`);

  console.log("\n✅ Cleanup summary:");
  for (const r of summary.byTable) {
    if (r.deleted === null) {
      console.log(`- ${r.table}: error (see logs above)`);
    } else {
      console.log(`- ${r.table}: deleted ${r.deleted} row(s)`);
    }
  }
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  ensureEnvGuards(opts);

  console.log("🧹 Cleaning up Supabase test/demo data...");
  console.log(`  Dry run: ${opts.dryRun ? "yes" : "no"}`);
  console.log(`  runId: ${opts.runId ?? "(not set)"}`);
  console.log(`  label filter: ${opts.label ?? "(not set)"}`);

  const runIds = await resolveRunIds(opts);

  const byTable: TableCleanupResult[] = [];

  // 1) Delete dependent data by seed_run_id where we tagged rows directly.
  byTable.push(
    await deleteBySeedRunId({
      table: "answers",
      column: "seed_run_id",
      runIds,
      dryRun: opts.dryRun,
    })
  );
  byTable.push(
    await deleteBySeedRunId({
      table: "event_attendees",
      column: "seed_run_id",
      runIds,
      dryRun: opts.dryRun,
    })
  );
  byTable.push(
    await deleteBySeedRunId({
      table: "invited_users",
      column: "seed_run_id",
      runIds,
      dryRun: opts.dryRun,
    })
  );

  // 2) Delete auth users for seeded profiles (before deleting profiles).
  byTable.push(
    await deleteAuthUsersForSeedRuns({
      runIds,
      dryRun: opts.dryRun,
    })
  );

  // 3) Delete profiles tagged with seed_run_id.
  byTable.push(
    await deleteBySeedRunId({
      table: "profiles",
      column: "seed_run_id",
      runIds,
      dryRun: opts.dryRun,
    })
  );

  // 4) Cleanup any remaining per-event data for events belonging to the seed_run(s)
  //    (e.g. match_results, match_reveals, likes, match_runs, etc.).
  const matchResults = await deleteEventsAndMatchData({
    runIds,
    dryRun: opts.dryRun,
  });
  byTable.push(...matchResults);

  // 5) Finally, delete the seed_runs rows themselves.
  byTable.push(
    await deleteBySeedRunId({
      table: "seed_runs",
      column: "id",
      runIds,
      dryRun: opts.dryRun,
    })
  );

  const summary: CleanupSummary = {
    runIds,
    byTable,
    dryRun: opts.dryRun,
    labelFilter: opts.label,
    timestamp: new Date().toISOString(),
  };

  writeCleanupSummary(summary, opts.label ?? opts.runId ?? undefined);
}

main().catch((err) => {
  console.error("Unexpected error in cleanup-test-data:", err);
  process.exit(1);
});

