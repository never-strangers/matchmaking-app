import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { signSessionToken, SessionRole } from "@/lib/auth/sessionToken";

const DEMO_OTP = "6969";

type LoginBody = {
  phone_e164?: string;
  otp?: string;
};

function normalizePhoneE164(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");
  return digits.length ? `+${digits}` : "";
}

export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const otp = (body.otp ?? "").trim();
  if (otp !== DEMO_OTP) {
    return new Response(
      JSON.stringify({ error: "Invalid OTP" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const phoneE164 = normalizePhoneE164(body.phone_e164 ?? "");
  if (!phoneE164 || phoneE164.length < 10) {
    return new Response(
      JSON.stringify({ error: "A valid phone number is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getServiceSupabaseClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone_e164, role, invited_user_id")
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  if (error || !profile) {
    return new Response(
      JSON.stringify({ error: "No account found for this phone. Register first using the event link." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const role: SessionRole = profile.role === "admin" ? "admin" : "user";
  const invitedUserId = profile.invited_user_id ?? profile.id;

  const sessionToken = signSessionToken({
    profile_id: String(profile.id),
    invited_user_id: String(invitedUserId),
    role,
    phone_e164: profile.phone_e164 ?? phoneE164,
    display_name: profile.display_name ?? profile.id.slice(0, 8),
  });

  const cookieStore = await cookies();
  cookieStore.set("ns_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return Response.json({ ok: true, redirect: "/events" });
}
