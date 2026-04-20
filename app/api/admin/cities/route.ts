import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(req: NextRequest) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { value, label, status } = body as Record<string, unknown>;

  if (typeof value !== "string" || !/^[a-z0-9_-]+$/.test(value)) {
    return Response.json({ error: "value must be a lowercase alphanumeric code (e.g. 'sby')" }, { status: 400 });
  }
  if (typeof label !== "string" || !label.trim()) {
    return Response.json({ error: "label is required" }, { status: 400 });
  }
  if (status !== "live" && status !== "coming_soon") {
    return Response.json({ error: "status must be 'live' or 'coming_soon'" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  // Use max sort_order + 1 so new city appears at the end of its group
  const { data: maxRow } = await supabase
    .from("city_config")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("city_config")
    .insert({ value: value.trim(), label: label.trim(), status, sort_order })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: `City code '${value}' already exists` }, { status: 409 });
    }
    console.error("[POST /api/admin/cities]", error);
    return Response.json({ error: "Insert failed" }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
