import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; tid: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId, tid } = await context.params;
  let body: { code?: string; name?: string; price_cents?: number; cap?: number; is_active?: boolean; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const updates: Record<string, unknown> = {};
  if (typeof body.code === "string") updates.code = body.code.trim();
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.price_cents === "number") updates.price_cents = body.price_cents;
  if (typeof body.cap === "number") updates.cap = body.cap;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length <= 1) {
    return Response.json({ ok: true });
  }

  const { data, error } = await supabase
    .from("event_ticket_types")
    .update(updates)
    .eq("id", tid)
    .eq("event_id", eventId)
    .select()
    .single();

  if (error) {
    console.error("Ticket type update error:", error);
    return new Response(error.message, { status: 500 });
  }
  return Response.json(data);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; tid: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId, tid } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { error } = await supabase
    .from("event_ticket_types")
    .delete()
    .eq("id", tid)
    .eq("event_id", eventId);

  if (error) {
    console.error("Ticket type delete error:", error);
    return new Response(error.message, { status: 500 });
  }
  return Response.json({ ok: true });
}
