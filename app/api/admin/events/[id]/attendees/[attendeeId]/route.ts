import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; attendeeId: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId, attendeeId } = await context.params;
  const supabase = getServiceSupabaseClient();

  // attendeeId is the event_attendees.id (row UUID)
  const { error } = await supabase
    .from("event_attendees")
    .delete()
    .eq("id", attendeeId)
    .eq("event_id", eventId); // safety: scope to event

  if (error) {
    console.error("[attendees/delete]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
