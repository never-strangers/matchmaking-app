import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const body = await req.json() as { template_ids?: string[] };
  const { template_ids } = body;

  if (!Array.isArray(template_ids) || template_ids.length < 20 || template_ids.length > 30) {
    return Response.json(
      { ok: false, error: "Select between 20 and 30 questions." },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabaseClient();

  // Check for existing answers
  const { count: answerCount } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  const hasAnswers = (answerCount ?? 0) > 0;

  // Load current event_questions
  const { data: current } = await supabase
    .from("event_questions")
    .select("id, template_id")
    .eq("event_id", eventId);

  const currentTemplateIds = (current ?? [])
    .map((r: { template_id: string | null }) => r.template_id)
    .filter((id): id is string => id !== null);

  // Detect removals
  const removedTemplateIds = currentTemplateIds.filter((id) => !template_ids.includes(id));
  if (hasAnswers && removedTemplateIds.length > 0) {
    return Response.json(
      {
        ok: false,
        error: "Cannot remove questions after users have answered. You may only add new questions.",
      },
      { status: 400 }
    );
  }

  // Load template details for new additions
  const newTemplateIds = template_ids.filter((id) => !currentTemplateIds.includes(id));
  let templateRows: Array<{
    id: string; prompt: string; type: string; options: unknown; weight: number;
  }> = [];
  if (newTemplateIds.length > 0) {
    const { data: tpls } = await supabase
      .from("question_templates")
      .select("id, prompt, type, options, weight")
      .in("id", newTemplateIds);
    templateRows = (tpls ?? []) as typeof templateRows;
  }

  // Upsert new rows
  if (templateRows.length > 0) {
    const toInsert = templateRows.map((t, i) => ({
      event_id: eventId,
      template_id: t.id,
      prompt: t.prompt,
      type: t.type ?? "scale",
      options: t.options ?? null,
      weight: t.weight ?? 1,
      sort_order: template_ids.indexOf(t.id),
    }));
    const { error: insertErr } = await supabase
      .from("event_questions")
      .upsert(toInsert, { onConflict: "event_id,template_id" });
    if (insertErr) {
      return Response.json({ ok: false, error: insertErr.message }, { status: 500 });
    }
  }

  // Update sort_order for existing rows
  for (const eq of (current ?? [])) {
    const newIdx = template_ids.indexOf(eq.template_id ?? "");
    if (newIdx !== -1) {
      await supabase
        .from("event_questions")
        .update({ sort_order: newIdx })
        .eq("id", eq.id);
    }
  }

  // Delete removed rows (only if no answers)
  if (!hasAnswers && removedTemplateIds.length > 0) {
    await supabase
      .from("event_questions")
      .delete()
      .eq("event_id", eventId)
      .in("template_id", removedTemplateIds);
  }

  return Response.json({ ok: true, count: template_ids.length });
}
