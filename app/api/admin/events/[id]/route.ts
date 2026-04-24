import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export type UpdateEventBody = {
  title?: string;
  description?: string;
  start_at?: string | null;
  end_at?: string | null;
  city?: string | null;
  category?: "friends" | "dating";
  whats_included?: string | null;
  price_cents?: number;
  payment_required?: boolean;
  max_males?: number | null;
  max_females?: number | null;
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  let body: UpdateEventBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t) updates.title = t;
  }
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.start_at !== undefined) updates.start_at = body.start_at || null;
  if (body.end_at !== undefined) updates.end_at = body.end_at || null;
  if (body.city !== undefined) updates.city = body.city?.trim() || null;
  if (body.category === "dating" || body.category === "friends") updates.category = body.category;
  if (body.whats_included !== undefined) updates.whats_included = body.whats_included?.trim() || null;
  if (typeof body.price_cents === "number" && body.price_cents >= 0) updates.price_cents = body.price_cents;
  if (typeof body.payment_required === "boolean") updates.payment_required = body.payment_required;
  if (body.max_males   !== undefined) updates.max_males   = typeof body.max_males   === "number" ? body.max_males   : null;
  if (body.max_females !== undefined) updates.max_females = typeof body.max_females === "number" ? body.max_females : null;

  if (Object.keys(updates).length === 0) {
    return Response.json({ ok: true });
  }

  if (body.start_at) {
    const startDate = new Date(body.start_at);
    if (isNaN(startDate.getTime()) || startDate < new Date()) {
      return new Response(
        JSON.stringify({ message: "Start date cannot be in the past" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const { error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", eventId);

  if (error) {
    console.error("Update event error:", error);
    return new Response(error.message || "Update failed", { status: 500 });
  }
  return Response.json({ ok: true });
}

// Soft-delete an event (recoverable for 30 days)
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId)
    .is("deleted_at", null); // prevent double-delete

  if (error) {
    console.error("Soft-delete event error:", error);
    return new Response(error.message || "Delete failed", { status: 500 });
  }
  return Response.json({ ok: true });
}
