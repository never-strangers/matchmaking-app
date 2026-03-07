/**
 * Backfill: set answers.event_question_id from answers.question_id
 * where the mapping is unambiguous (event_questions.template_id → questions has a 1:1 match
 * within the same event and the answer's question_id exists in event_questions).
 *
 * Safe: only touches rows where event_question_id IS NULL and a clear match is found.
 * Idempotent: run as many times as needed.
 *
 * Usage:
 *   npx tsx scripts/backfill-answer-event-question-id.ts [--dry-run]
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`\n${isDryRun ? "🔍 DRY RUN — no writes" : "✏️  LIVE — will update rows"}\n`);

  // Load all event_questions that have a template_id
  const { data: eventQuestions, error: eqErr } = await supabase
    .from("event_questions")
    .select("id, event_id, template_id");

  if (eqErr) { console.error("❌ event_questions:", eqErr.message); process.exit(1); }

  // Load all questions table rows (legacy)
  const { data: legacyQuestions, error: lqErr } = await supabase
    .from("questions")
    .select("id, event_id, prompt");

  if (lqErr) { console.error("❌ questions:", lqErr.message); process.exit(1); }

  // Load question_templates (prompt → id)
  const { data: templates, error: tErr } = await supabase
    .from("question_templates")
    .select("id, prompt");

  if (tErr) { console.error("❌ question_templates:", tErr.message); process.exit(1); }

  // Build: template_id → set of event_question ids per event
  // Also: for each (event_id, legacy question_id) → event_question_id (if unambiguous)
  // Strategy:
  //   1. For each event_question: find which question_template it came from
  //   2. For each legacy question row: find matching template by prompt
  //   3. For each answer with question_id + null event_question_id: look up the chain

  const templateByPrompt = new Map<string, string>(); // prompt → template_id
  (templates ?? []).forEach((t: { id: string; prompt: string }) => {
    templateByPrompt.set(t.prompt.trim(), t.id);
  });

  // legacy question_id → template_id (via prompt match)
  const templateForLegacyQ = new Map<string, string>(); // question_id → template_id
  (legacyQuestions ?? []).forEach((q: { id: string; prompt: string }) => {
    const tid = templateByPrompt.get(q.prompt.trim());
    if (tid) templateForLegacyQ.set(q.id, tid);
  });

  // (event_id + template_id) → event_question_id (unambiguous if unique)
  const eqByEventAndTemplate = new Map<string, string[]>(); // `${event_id}|${template_id}` → [eq_id, ...]
  (eventQuestions ?? []).forEach((eq: { id: string; event_id: string; template_id: string | null }) => {
    if (!eq.template_id) return;
    const key = `${eq.event_id}|${eq.template_id}`;
    if (!eqByEventAndTemplate.has(key)) eqByEventAndTemplate.set(key, []);
    eqByEventAndTemplate.get(key)!.push(eq.id);
  });

  // Load answers that need backfill
  const { data: answers, error: ansErr } = await supabase
    .from("answers")
    .select("id, event_id, question_id, event_question_id")
    .is("event_question_id", null)
    .not("question_id", "is", null);

  if (ansErr) { console.error("❌ answers:", ansErr.message); process.exit(1); }

  const toUpdate: Array<{ id: string; event_question_id: string }> = [];
  const skipped = { noTemplate: 0, ambiguous: 0, noEventQ: 0 };

  (answers ?? []).forEach((a: { id: string; event_id: string; question_id: string | null; event_question_id: string | null }) => {
    if (!a.question_id) return;
    const templateId = templateForLegacyQ.get(a.question_id);
    if (!templateId) { skipped.noTemplate++; return; }

    const key = `${a.event_id}|${templateId}`;
    const eqIds = eqByEventAndTemplate.get(key) ?? [];
    if (eqIds.length === 0) { skipped.noEventQ++; return; }
    if (eqIds.length > 1) { skipped.ambiguous++; return; } // ambiguous — skip

    toUpdate.push({ id: a.id, event_question_id: eqIds[0] });
  });

  console.log(`Found ${toUpdate.length} answers to backfill`);
  console.log(`Skipped: ${skipped.noTemplate} (no template match), ${skipped.ambiguous} (ambiguous), ${skipped.noEventQ} (no event_question)`);

  if (toUpdate.length === 0) {
    console.log("\n✅ Nothing to update.");
    return;
  }

  if (isDryRun) {
    console.log("\nDry run — sample of rows that would be updated:");
    toUpdate.slice(0, 5).forEach((r) => console.log(`  answer ${r.id} → event_question_id ${r.event_question_id}`));
    return;
  }

  // Batch update in chunks of 100
  const CHUNK = 100;
  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const chunk = toUpdate.slice(i, i + CHUNK);
    for (const row of chunk) {
      const { error } = await supabase
        .from("answers")
        .update({ event_question_id: row.event_question_id })
        .eq("id", row.id);
      if (error) {
        console.error(`  ❌ Failed to update answer ${row.id}: ${error.message}`);
      } else {
        updated++;
      }
    }
    process.stdout.write(`\r  Updated ${updated}/${toUpdate.length}…`);
  }

  console.log(`\n\n✅ Backfill complete: ${updated} rows updated.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
