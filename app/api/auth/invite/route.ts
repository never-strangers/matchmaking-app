import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { signSessionToken, signPendingInviteToken, SessionRole } from "@/lib/auth/sessionToken";

type InviteBody = {
  invite_token?: string;
  inviteToken?: string;
};

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabaseClient();

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const inviteToken = body.invite_token || body.inviteToken;
  if (!inviteToken) {
    return new Response("Missing invite_token", { status: 400 });
  }

  const { data: invitedUser, error: invitedError } = await supabase
    .from("invited_users")
    .select("*")
    .eq("invite_token", inviteToken)
    .eq("is_active", true)
    .single();

  if (invitedError || !invitedUser) {
    return new Response("Invalid or inactive invite", { status: 401 });
  }

  const invitedId: string = invitedUser.id;
  const phoneE164: string = invitedUser.phone_e164;
  const displayName: string = invitedUser.display_name || "Guest";
  const role: SessionRole =
    invitedUser.role === "admin" ? "admin" : "user";

  // Try to find existing profile for this invited user
  const { data: existingByInvited } = await supabase
    .from("profiles")
    .select("*")
    .eq("invited_user_id", invitedId)
    .limit(1)
    .maybeSingle();

  let profile = existingByInvited;

  if (!profile) {
    // Fallback: match by phone if any profile already uses this phone
    const { data: existingByPhone } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone_e164", phoneE164)
      .limit(1)
      .maybeSingle();

    profile = existingByPhone;
  }

  if (!profile) {
    // First-time user: require registration instead of auto-creating profile
    const isSharedLink = inviteToken === (process.env.DEMO_PUBLIC_INVITE_TOKEN || "public");
    const pendingToken = signPendingInviteToken(
      isSharedLink ? { invite_token: inviteToken } : { invited_user_id: invitedId, invite_token: inviteToken }
    );
    const cookieStore = await cookies();
    const oneHour = 60 * 60;
    cookieStore.set("ns_pending_invite", pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: oneHour,
    });
    return Response.json({
      ok: true,
      pending_registration: true,
    });
  }

  {
    // Ensure invited_user_id and basic fields are kept in sync
    const updates: Record<string, unknown> = {};
    if (!profile.invited_user_id) updates.invited_user_id = invitedId;
    if (!profile.phone_e164 && phoneE164) updates.phone_e164 = phoneE164;
    if (!profile.display_name && displayName) updates.display_name = displayName;
    if (profile.role !== role) updates.role = role;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);
    }
  }

  // Issue session cookie
  const sessionToken = signSessionToken({
    profile_id: String(profile.id),
    invited_user_id: String(invitedId),
    role,
    phone_e164: phoneE164,
    display_name: displayName,
  });

  const cookieStore = await cookies();
  cookieStore.set("ns_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return Response.json({
    ok: true,
    profile_id: profile.id,
    invited_user_id: invitedId,
    role,
  });
}

