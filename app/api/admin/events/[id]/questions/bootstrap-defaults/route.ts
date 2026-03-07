import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/**
 * POST /api/admin/events/[id]/questions/bootstrap-defaults
 *
 * Idempotent: if event_questions already has >=20 rows, returns early.
 * Otherwise upserts is_default templates ordered by default_rank.
 * Safe to call on every page-load or "Skip for now" — no duplicates possible.
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  // Check existing count
  const { count: existingCount } = await supabase
    .from("event_questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if ((existingCount ?? 0) >= 20) {
    return Response.json({ ok: true, count: existingCount, bootstrapped: false });
  }

  // Load default templates ordered by default_rank
  const { data: defaults, error: tplErr } = await supabase
    .from("question_templates")
    .select("id, prompt, type, options, weight, default_rank")
    .eq("is_default", true)
    .eq("is_active", true)
    .order("default_rank", { ascending: true })
    .limit(20);

  if (tplErr || !defaults?.length) {
    return Response.json(
      { ok: false, error: "No default question templates found. Run seed:question-templates first." },
      { status: 422 }
    );
  }

  // Upsert — UNIQUE(event_id, template_id) prevents duplicates
  const rows = defaults.map((t: {
    id: string; prompt: string; type: string; options: unknown; weight: number; default_rank: number;
  }, idx: number) => ({
    event_id: eventId,
    template_id: t.id,
    prompt: t.prompt,
    type: t.type ?? "scale",
    options: t.options ?? null,
    weight: t.weight ?? 1,
    sort_order: idx,
  }));

  const { error: upsertErr } = await supabase
    .from("event_questions")
    .upsert(rows, { onConflict: "event_id,template_id" });

  if (upsertErr) {
    console.error("bootstrap-defaults upsert error:", upsertErr);
    return Response.json({ ok: false, error: upsertErr.message }, { status: 500 });
  }

  // Final count
  const { count: finalCount } = await supabase
    .from("event_questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return Response.json({ ok: true, count: finalCount, bootstrapped: true });
}
