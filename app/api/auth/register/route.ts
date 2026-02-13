import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { verifyPendingInviteToken, signSessionToken, SessionRole } from "@/lib/auth/sessionToken";

type RegisterBody = {
  display_name?: string;
  phone_e164?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  city?: string;
  dob?: string;
  gender?: string;
  attracted_to?: string;
  looking_for?: string;
  reason?: string;
  instagram?: string;
};

/** Normalize to E.164: trim, strip spaces/dashes, digits only with + prefix. */
function normalizePhoneE164(raw: string): string {
  const digits = String(raw).trim().replace(/[\s\-\.]/g, "").replace(/\D/g, "");
  return digits.length ? `+${digits}` : "";
}

/** Validate E.164: 10–15 digits total (country + number). */
function isValidPhoneE164(e164: string): boolean {
  const digits = e164.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
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

  const displayName =
    (body.display_name ?? `${(body.first_name ?? "").trim()} ${(body.last_name ?? "").trim()}`.trim()) ||
    "";
  const phoneE164 = normalizePhoneE164(body.phone_e164 ?? "");
  const fullName = body.first_name || body.last_name
    ? `${(body.first_name ?? "").trim()} ${(body.last_name ?? "").trim()}`.trim()
    : displayName;
  const cityFromBody = (body.city ?? "").trim();
  const dob = (body.dob ?? "").trim() || null;
  const gender = (body.gender ?? "").trim() || null;
  const attractedTo = (body.attracted_to ?? "").trim() || null;
  const reason = (body.reason ?? "").trim() || null;
  const instagram = (body.instagram ?? "").trim() || null;

  if (!displayName && !fullName) {
    return new Response(
      JSON.stringify({ error: "Name is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!phoneE164 || !isValidPhoneE164(phoneE164)) {
    return new Response(
      JSON.stringify({ error: "A valid phone number is required (8–15 digits, e.g. +65 9123 4567)" }),
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
    city = cityFromBody || ((invitedUser as { city?: string | null }).city ?? "sg");
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
    city = cityFromBody || ((template as { city?: string | null }).city ?? "sg");

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
  const realEmail = (body.email ?? "").trim();
  const syntheticEmail =
    realEmail || (safeDigits.length > 0 ? `invite_${safeDigits}@demo.local` : `invite_${profileId}@demo.local`);

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: profileId,
      name: fullName || displayName,
      display_name: fullName || displayName,
      email: syntheticEmail,
      phone: phoneE164,
      phone_e164: phoneE164,
      city,
      dob: dob || null,
      gender: gender || null,
      attracted_to: attractedTo || null,
      reason: reason || null,
      instagram: instagram || null,
      full_name: fullName || displayName,
      status: "pending_verification",
      email_verified: !!realEmail,
      role,
      invited_user_id: invitedId,
      created_at: new Date().toISOString(),
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

  // Add to admins table when role is admin (Option B: admins table)
  if (role === "admin") {
    await supabase.from("admins").upsert({ profile_id: String(inserted.id) }, { onConflict: "profile_id" });
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

  return Response.json({ ok: true, redirect: "/pending" });
}
