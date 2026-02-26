import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export type TicketTypeRow = {
  id: string;
  event_id: string;
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  cap: number;
  sold: number;
  is_active: boolean;
  sort_order: number;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("event_ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Ticket types list error:", error);
    return new Response(error.message, { status: 500 });
  }
  return Response.json(data || []);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  let body: { code: string; name: string; price_cents: number; cap: number; is_active?: boolean; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const priceCents = typeof body.price_cents === "number" ? body.price_cents : 0;
  const cap = typeof body.cap === "number" ? body.cap : 0;

  if (!code || !name) {
    return new Response(JSON.stringify({ message: "code and name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (cap < 0 || priceCents < 0) {
    return new Response(JSON.stringify({ message: "cap and price_cents must be >= 0" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("event_ticket_types")
    .insert({
      event_id: eventId,
      code,
      name,
      price_cents: priceCents,
      currency: "sgd",
      cap,
      sold: 0,
      is_active: body.is_active !== false,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return new Response(JSON.stringify({ message: "A ticket type with this code already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Ticket type create error:", error);
    return new Response(error.message, { status: 500 });
  }
  return Response.json(data);
}
