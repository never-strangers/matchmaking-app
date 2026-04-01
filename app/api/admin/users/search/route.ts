import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function GET(req: NextRequest) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

  const supabase = getServiceSupabaseClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, name, email, city, status, gender, instagram")
    .eq("status", "approved")
    .limit(limit);

  if (q) {
    // Escape special chars for ilike
    const safe = q.replace(/[%_\\]/g, "\\$&");
    query = query.or(
      `full_name.ilike.%${safe}%,name.ilike.%${safe}%,email.ilike.%${safe}%,instagram.ilike.%${safe}%`
    );
  }

  const { data, error } = await query.order("full_name", { ascending: true });

  if (error) {
    console.error("[users/search] error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ users: data || [] });
}
