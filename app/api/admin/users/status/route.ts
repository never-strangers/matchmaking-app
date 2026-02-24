import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const VALID_STATUSES = ["approved", "rejected", "pending_verification"] as const;

export async function POST(req: NextRequest) {
  const session = await getAuthUser();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { profile_id?: string; new_status?: string };
  try {
    body = (await req.json()) as { profile_id?: string; new_status?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const profileId = typeof body.profile_id === "string" ? body.profile_id.trim() : "";
  const newStatus = typeof body.new_status === "string" ? body.new_status.trim() : "";

  if (!profileId) {
    return new Response(JSON.stringify({ error: "profile_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return new Response(
      JSON.stringify({ error: "new_status must be approved, rejected, or pending_verification" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase.rpc("admin_set_profile_status", {
    p_profile_id: profileId,
    p_new_status: newStatus,
  });

  if (error) {
    console.error("admin_set_profile_status error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to update status" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return Response.json({ ok: true, profile: data });
}
