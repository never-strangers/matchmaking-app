import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { signSessionToken, SessionRole } from "@/lib/auth/sessionToken";

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
    // Create a new profile for this invited user
    const profileId = crypto.randomUUID();
    const safeDigits = String(phoneE164 || "")
      .replace(/\D/g, "")
      .slice(-12);
    const syntheticEmail =
      safeDigits.length > 0
        ? `invite_${safeDigits}@demo.local`
        : `invite_${profileId}@demo.local`;

    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: profileId,
        name: displayName,
        display_name: displayName,
        email: syntheticEmail,
        phone: phoneE164,
        phone_e164: phoneE164,
        city: "Singapore",
        status: "approved",
        email_verified: true,
        role,
        invited_user_id: invitedId,
        created_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Failed to create profile from invite:", insertError);
      return new Response("Failed to create profile", { status: 500 });
    }

    profile = inserted;
  } else {
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

