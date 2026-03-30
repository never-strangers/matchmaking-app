import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getServiceSupabaseClient();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.thisisneverstrangers.com").replace(/\/$/, "");

  const { data, error } = await supabase
    .from("invited_users")
    .select("id, display_name, phone_e164, role, invite_token, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []).map((row: {
    id: string;
    display_name: string;
    phone_e164: string;
    role: string;
    invite_token: string;
    is_active: boolean;
    created_at: string;
  }) => ({
    ...row,
    invite_url: `${appUrl}/invite/${row.invite_token}`,
  }));

  return Response.json({ rows });
}
