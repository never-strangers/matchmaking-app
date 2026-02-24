import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { signSessionToken } from "@/lib/auth/sessionToken";
import { cookies } from "next/headers";

const NS_SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Syncs the current Supabase auth user into an ns_session cookie
 * so server-rendered admin (and other cookie-based checks) see the session.
 * Call after login or after reset-password session is set.
 */
export async function POST() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = signSessionToken({
    profile_id: auth.profile_id,
    invited_user_id: auth.invited_user_id,
    role: auth.role === "admin" ? "admin" : "user",
    display_name: auth.display_name ?? "User",
    phone_e164: auth.phone_e164 ?? "",
  });

  const cookieStore = await cookies();
  cookieStore.set("ns_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: NS_SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
