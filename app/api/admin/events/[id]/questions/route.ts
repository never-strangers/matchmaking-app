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
      .select("id, prompt, type, options, tags, weight, \"order\"")
      .eq("is_active", true)
      .order("order", { ascending: true }),
    supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  const selected = selectedRes.data ?? [];
  const available = (templatesRes.data ?? []).filter(
    (t: { id: string }) => !selected.some((s: { template_id: string | null }) => s.template_id === t.id)
  );

  return Response.json({
    selected,
    available,
    has_answers: (answersRes.count ?? 0) > 0,
  });
}
