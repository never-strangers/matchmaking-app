import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { verifyPendingInviteToken, signSessionToken, SessionRole } from "@/lib/auth/sessionToken";

type RegisterBody = {
  display_name?: string;
  phone_e164?: string;
};

/** Normalize to E.164-like: digits only, then + prefix. */
function normalizePhoneE164(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");
  return digits.length ? `+${digits}` : "";
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const pendingToken = cookieStore.get("ns_pending_invite")?.value;
  const pending = verifyPendingInviteToken(pendingToken);
  if (!pending) {
    return new Response(
      JSON.stringify({ error: "Missing or expired invite. Please use your invite link again." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const displayName = (body.display_name ?? "").trim();
  const phoneE164 = normalizePhoneE164(body.phone_e164 ?? "");
  if (!displayName) {
    return new Response(
      JSON.stringify({ error: "Display name is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!phoneE164 || phoneE164.length < 10) {
    return new Response(
      JSON.stringify({ error: "A valid phone number is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getServiceSupabaseClient();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_e164", phoneE164)
    .maybeSingle();
  if (existingProfile) {
    return new Response(
      JSON.stringify({ error: "This phone is already registered. Use Login instead." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  let invitedId: string;
  let role: SessionRole;
  let city: string;

  if (pending.invited_user_id) {
    // Per-user invite: use existing invited_users row
    const { data: invitedUser, error: invitedError } = await supabase
      .from("invited_users")
      .select("id, role, city")
      .eq("id", pending.invited_user_id)
      .eq("is_active", true)
      .single();

    if (invitedError || !invitedUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive invite" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    invitedId = String(invitedUser.id);
    role = invitedUser.role === "admin" ? "admin" : "user";
    city = (invitedUser as { city?: string | null }).city ?? "Singapore";
  } else {
    // Shared link: use invite_token as template, create new invited_users row for this person
    const { data: template, error: templateError } = await supabase
      .from("invited_users")
      .select("role, city")
      .eq("invite_token", pending.invite_token)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive invite" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    role = template.role === "admin" ? "admin" : "user";
    city = (template as { city?: string | null }).city ?? "Singapore";

    const newInvitedId = crypto.randomUUID();
    const newToken = crypto.randomUUID();
    const { error: insertInvitedError } = await supabase.from("invited_users").insert({
      id: newInvitedId,
      phone_e164: phoneE164,
      display_name: displayName,
      role,
      invite_token: newToken,
      is_active: true,
    });
    if (insertInvitedError) {
      console.error("Failed to create invited_user on register:", insertInvitedError);
      return new Response(
        JSON.stringify({ error: "Failed to create account" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    invitedId = newInvitedId;
  }

  const profileId = crypto.randomUUID();
  const safeDigits = phoneE164.replace(/\D/g, "").slice(-12);
  const syntheticEmail =
    safeDigits.length > 0 ? `invite_${safeDigits}@demo.local` : `invite_${profileId}@demo.local`;

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: profileId,
      name: displayName,
      display_name: displayName,
      email: syntheticEmail,
      phone: phoneE164,
      phone_e164: phoneE164,
      city,
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
    console.error("Failed to create profile on register:", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to create profile" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  cookieStore.delete("ns_pending_invite");
  const sessionToken = signSessionToken({
    profile_id: String(inserted.id),
    invited_user_id: invitedId,
    role,
    phone_e164: phoneE164,
    display_name: displayName,
  });
  cookieStore.set("ns_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return Response.json({ ok: true, redirect: "/events" });
}
