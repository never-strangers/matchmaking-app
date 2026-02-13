import { getAuthUser } from "@/lib/auth/getAuthUser";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json({
    profile_id: auth.profile_id,
    invited_user_id: auth.invited_user_id,
    role: auth.role,
    phone_e164: auth.phone_e164,
    display_name: auth.display_name,
    avatar_path: auth.avatar_path ?? null,
    avatar_updated_at: auth.avatar_updated_at ?? null,
    status: auth.status,
  });
}

