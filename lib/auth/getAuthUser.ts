import { createClient } from "@/lib/supabase/server";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { cookies } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export type AuthUser = {
  profile_id: string;
  invited_user_id: string; // Same as profile_id for Supabase auth; from session for invite flow
  status: string;
  role: string;
  display_name: string;
  phone_e164: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
  email?: string | null; // From Supabase auth user when available
};

/**
 * Get current user from Supabase Auth or custom ns_session.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  // 1) Try Supabase Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const serviceSupabase = getServiceSupabaseClient();
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("id, status, role, display_name, phone_e164, avatar_path, avatar_updated_at")
      .eq("id", user.id)
      .maybeSingle();

    return {
      profile_id: user.id,
      invited_user_id: user.id,
      status: profile?.status ?? "pending_verification",
      role: profile?.role === "admin" ? "admin" : "user",
      display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "User",
      phone_e164: profile?.phone_e164 ?? null,
      avatar_path: profile?.avatar_path ?? null,
      avatar_updated_at: profile?.avatar_updated_at ?? null,
      email: user.email ?? null,
    };
  }

  // 2) Fall back to custom session (invite flow)
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  const serviceSupabase = getServiceSupabaseClient();
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("status, avatar_path, avatar_updated_at, email")
    .eq("id", session.profile_id)
    .maybeSingle();

  return {
    profile_id: session.profile_id,
    invited_user_id: session.invited_user_id,
    status: profile?.status ?? "pending_verification",
    role: session.role,
    display_name: session.display_name,
    phone_e164: session.phone_e164 ?? null,
    avatar_path: profile?.avatar_path ?? null,
    avatar_updated_at: profile?.avatar_updated_at ?? null,
    email: profile?.email ?? null,
  };
}
