import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const RECOVERY_DAYS = 30;

// Restore a soft-deleted event (only within the 30-day recovery window)
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  // Fetch the event to verify it is within the recovery window
  const { data: event, error: fetchErr } = await supabase
    .from("events")
    .select("id, deleted_at")
    .eq("id", eventId)
    .single();

  if (fetchErr || !event) {
    return new Response("Event not found", { status: 404 });
  }

  if (!event.deleted_at) {
    return Response.json({ ok: true, message: "Event is already active" });
  }

  const deletedAt = new Date(event.deleted_at);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECOVERY_DAYS);

  if (deletedAt < cutoff) {
    return new Response(
      JSON.stringify({ error: "Recovery window has expired (30 days)" }),
      { status: 410, headers: { "Content-Type": "application/json" } }
    );
  }

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: null })
    .eq("id", eventId);

  if (error) {
    console.error("Restore event error:", error);
    return new Response(error.message || "Restore failed", { status: 500 });
  }
  return Response.json({ ok: true });
}
