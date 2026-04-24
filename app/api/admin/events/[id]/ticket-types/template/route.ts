import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const DEFAULT_TYPES = [
  { code: "early_bird", name: "Early Bird", price_cents: 4500, cap: 20, sort_order: 0 },
  { code: "regular", name: "Regular", price_cents: 5000, cap: 50, sort_order: 1 },
];

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const rows = DEFAULT_TYPES.map((t) => ({
    event_id: eventId,
    code: t.code,
    name: t.name,
    price_cents: t.price_cents,
    currency: "sgd",
    cap: t.cap,
    sold: 0,
    is_active: true,
    sort_order: t.sort_order,
  }));

  const { data, error } = await supabase
    .from("event_ticket_types")
    .insert(rows)
    .select();

  if (error) {
    if (error.code === "23505") {
      return new Response(
        JSON.stringify({ message: "One or more ticket types already exist. Delete existing ones first or use different codes." }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Ticket types template error:", error);
    return new Response(error.message, { status: 500 });
  }
  return Response.json(data || []);
}
