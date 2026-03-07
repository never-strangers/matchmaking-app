import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const [selectedRes, templatesRes, answersRes] = await Promise.all([
    supabase
      .from("event_questions")
      .select("id, template_id, prompt, type, options, weight, sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("question_templates")
      .select("id, prompt, type, options, tags, weight, \"order\", is_default, default_rank")
      .eq("is_active", true)
      .order("is_default", { ascending: false })   // defaults first
      .order("default_rank", { ascending: true })
      .order("order", { ascending: true }),
    supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  const selected = selectedRes.data ?? [];
  const selectedTemplateIds = new Set(
    selected.map((s: { template_id: string | null }) => s.template_id).filter(Boolean)
  );

  const available = (templatesRes.data ?? []).filter(
    (t: { id: string }) => !selectedTemplateIds.has(t.id)
  );

  // Defaults: templates with is_default=true, ordered by default_rank, for auto-populate on new events
  const defaults = (templatesRes.data ?? [])
    .filter((t: { is_default: boolean }) => t.is_default)
    .sort((a: { default_rank: number }, b: { default_rank: number }) => (a.default_rank ?? 0) - (b.default_rank ?? 0));

  return Response.json({
    selected,
    available,
    defaults,
    has_answers: (answersRes.count ?? 0) > 0,
  });
}
