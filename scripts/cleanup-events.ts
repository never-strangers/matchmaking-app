import "dotenv/config";
import { createAdminClient } from "../lib/supabase/adminClient";

type CleanupOptions = {
  keepIds: string[];
  dryRun: boolean;
};

type TableResult = {
  table: string;
  count: number | null;
};

function parseArgs(argv: string[]): CleanupOptions {
  const keepIds: string[] = [];
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--keep" && i + 1 < argv.length) {
      const raw = argv[i + 1];
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => keepIds.push(id));
      i++;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { keepIds, dryRun };
}

function ensureEnvGuards(opts: CleanupOptions) {
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
      "❌ SEED_CONFIRM=true is required to run cleanup (non dry-run). Use --dry-run to preview."
    );
    process.exit(1);
  }
}

function formatKeepList(keepIds: string[]): string {
  if (!keepIds.length) return "(none – all events will be affected)";
  return keepIds.join(", ");
}

async function getEventIdsToDelete(keepIds: string[]): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase.from("events").select("id");
  if (keepIds.length > 0) {
    query = query.not("id", "in", `(${keepIds.join(",")})`);
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((r: { id: string }) => r.id);
}

async function deleteMessagesForEvents(
  eventIds: string[],
  dryRun: boolean
): Promise<TableResult> {
  if (eventIds.length === 0) return { table: "messages", count: 0 };
  const supabase = createAdminClient();
  const { data: convs, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .in("event_id", eventIds);
  if (convError || !convs?.length) {
    if (convError?.message?.includes("Could not find the table")) {
      return { table: "messages", count: 0 };
    }
    return { table: "messages", count: null };
  }
  const convIds = convs.map((c: { id: string }) => c.id);
  const { count, error: countError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", convIds);
  if (countError) {
    if (countError.message.includes("Could not find the table")) return { table: "messages", count: 0 };
    return { table: "messages", count: null };
  }
  if (dryRun) return { table: "messages", count: count ?? 0 };
  const { error: delError } = await supabase.from("messages").delete().in("conversation_id", convIds);
  if (delError) {
    console.error("Error deleting from messages:", delError.message);
    return { table: "messages", count: null };
  }
  return { table: "messages", count: count ?? 0 };
}

async function deleteByEventId(
  table: string,
  column: string,
  keepIds: string[],
  dryRun: boolean
): Promise<TableResult> {
  const supabase = createAdminClient();

  // First compute how many rows match the filter (for dry-run and reporting).
  let countQuery = supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (keepIds.length > 0) {
    const inList = `(${keepIds.join(",")})`;
    countQuery = countQuery.not(column, "in", inList);
  }

  const { error: countError, count } = await countQuery;
  if (countError) {
    // Some Supabase projects might not have all optional tables (e.g. match_reveals)
    // if migrations haven't been applied yet. In that case, treat as 0 rows.
    if (countError.message.includes("Could not find the table")) {
      console.log(`Table ${table} does not exist in this project, skipping.`);
      return { table, count: 0 };
    }

    console.error(`Error counting ${table}:`, countError.message);
    if (dryRun) {
      return { table, count: null };
    }
  }

  if (dryRun) {
    return { table, count: count ?? 0 };
  }

  let mutation = supabase.from(table).delete();
  if (keepIds.length > 0) {
    const inList = `(${keepIds.join(",")})`;
    mutation = mutation.not(column, "in", inList);
  }

  const { error: deleteError } = await mutation;

  if (deleteError) {
    if (deleteError.message.includes("Could not find the table")) {
      console.log(`Table ${table} does not exist in this project, skipping.`);
      return { table, count: 0 };
    }

    console.error(`Error deleting from ${table}:`, deleteError.message);
    return { table, count: null };
  }

  return { table, count: count ?? 0 };
}

async function main() {
  const { keepIds, dryRun } = parseArgs(process.argv.slice(2));
  ensureEnvGuards({ keepIds, dryRun });

  console.log("🧹 Cleanup events script");
  console.log(`  Dry run: ${dryRun ? "yes" : "no"}`);
  console.log(`  Keep event_id(s): ${formatKeepList(keepIds)}`);
  console.log("");

  const results: TableResult[] = [];

  // Resolve event IDs to delete (for messages/conversations which need event_id list)
  const eventIdsToDelete = await getEventIdsToDelete(keepIds);

  // 1) messages (FK: conversation_id → conversations; must delete before conversations)
  results.push(await deleteMessagesForEvents(eventIdsToDelete, dryRun));

  // 2) conversations (FK: match_result_id → match_results; delete before match_results)
  results.push(
    await deleteByEventId("conversations", "event_id", keepIds, dryRun)
  );

  // 3) match_reveals (depends on match_results.id + events.id)
  results.push(
    await deleteByEventId("match_reveals", "event_id", keepIds, dryRun)
  );

  // 4) match_reveal_queue (depends on match_results.id)
  results.push(
    await deleteByEventId("match_reveal_queue", "event_id", keepIds, dryRun)
  );

  // 5) match_results
  results.push(
    await deleteByEventId("match_results", "event_id", keepIds, dryRun)
  );

  // 6) match_rounds (incremental matching state)
  results.push(
    await deleteByEventId("match_rounds", "event_id", keepIds, dryRun)
  );

  // 7) match_runs (per-event matching runs)
  results.push(
    await deleteByEventId("match_runs", "event_id", keepIds, dryRun)
  );

  // 8) likes
  results.push(await deleteByEventId("likes", "event_id", keepIds, dryRun));

  // 9) answers
  results.push(await deleteByEventId("answers", "event_id", keepIds, dryRun));

  // 10) event_attendees
  results.push(
    await deleteByEventId("event_attendees", "event_id", keepIds, dryRun)
  );

  // 11) questions (event-scoped)
  results.push(await deleteByEventId("questions", "event_id", keepIds, dryRun));

  // 12) event_ticket_types
  results.push(
    await deleteByEventId("event_ticket_types", "event_id", keepIds, dryRun)
  );

  // 13) events (root)
  const supabase = createAdminClient();
  // Count matching events first for reporting.
  let eventCountQuery = supabase
    .from("events")
    .select("*", { count: "exact", head: true });
  if (keepIds.length > 0) {
    const inList = `(${keepIds.join(",")})`;
    eventCountQuery = eventCountQuery.not("id", "in", inList);
  }
  const { error: eventsCountError, count: eventsCount } = await eventCountQuery;

  if (eventsCountError) {
    console.error("Error counting events:", eventsCountError.message);
    if (dryRun) {
      results.push({ table: "events", count: null });
    }
  }

  if (!dryRun) {
    let mutation = supabase.from("events").delete();
    if (keepIds.length > 0) {
      const inList = `(${keepIds.join(",")})`;
      mutation = mutation.not("id", "in", inList);
    }
    const { error: eventsDeleteError } = await mutation;
    if (eventsDeleteError) {
      console.error("Error deleting from events:", eventsDeleteError.message);
      results.push({ table: "events", count: null });
    } else {
      results.push({ table: "events", count: eventsCount ?? 0 });
    }
  } else {
    results.push({ table: "events", count: eventsCount ?? 0 });
  }

  console.log("");
  console.log(dryRun ? "🔍 Dry-run summary:" : "✅ Cleanup summary:");
  for (const r of results) {
    if (r.count === null) {
      console.log(`- ${r.table}: error (see logs above)`);
    } else {
      console.log(
        `- ${r.table}: ${dryRun ? "would delete" : "deleted"} ${r.count} row(s)`
      );
    }
  }
}

main().catch((err) => {
  console.error("Unexpected error in cleanup-events:", err);
  process.exit(1);
});

