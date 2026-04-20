import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ value: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { value } = await context.params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status, sort_order } = body as Record<string, unknown>;

  if (status !== undefined && status !== "live" && status !== "coming_soon") {
    return Response.json({ error: "status must be 'live' or 'coming_soon'" }, { status: 400 });
  }
  if (sort_order !== undefined && (typeof sort_order !== "number" || !Number.isInteger(sort_order))) {
    return Response.json({ error: "sort_order must be an integer" }, { status: 400 });
  }
  if (status === undefined && sort_order === undefined) {
    return Response.json({ error: "Provide at least one of: status, sort_order" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (sort_order !== undefined) update.sort_order = sort_order;

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("city_config")
    .update(update)
    .eq("value", value)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/admin/cities]", error);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  return Response.json(data);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ value: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { value } = await context.params;

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("city_config")
    .delete()
    .eq("value", value)
    .select();

  if (error) {
    console.error("[DELETE /api/admin/cities]", error);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return Response.json({ error: `City '${value}' not found` }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
