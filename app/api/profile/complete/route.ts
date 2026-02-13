import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

type CompleteBody = {
  display_name?: string;
  full_name?: string;
  email?: string;
  phone_e164?: string;
  city?: string;
  dob?: string;
  gender?: string;
  attracted_to?: string;
  reason?: string;
  instagram?: string;
};

/**
 * Complete profile after Supabase signUp (no-invite registration).
 * Creates or updates profile with full form data.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: CompleteBody;
  try {
    body = (await req.json()) as CompleteBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const profileId = auth.profile_id;
  const displayName =
    (body.display_name ?? body.full_name ?? auth.display_name ?? "User").trim();
  const fullName = (body.full_name ?? displayName).trim();
  const email = (body.email ?? auth.email ?? "").trim() || auth.email;
  const phoneE164 = (body.phone_e164 ?? auth.phone_e164 ?? "").trim() || null;
  const city = (body.city ?? "sg").trim();
  const dob = (body.dob ?? "").trim() || null;
  const gender = (body.gender ?? "").trim() || null;
  const attractedTo = (body.attracted_to ?? "").trim() || null;
  const reason = (body.reason ?? "").trim() || null;
  const instagram = (body.instagram ?? "").trim() || null;

  const supabase = getServiceSupabaseClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();

  const profileRow = {
    id: profileId,
    name: fullName || displayName,
    display_name: displayName,
    full_name: fullName || displayName,
    email: email || `profile_${profileId.slice(0, 8)}@demo.local`,
    phone_e164: phoneE164,
    phone: phoneE164,
    city,
    dob: dob || null,
    gender,
    attracted_to: attractedTo,
    reason,
    instagram,
    status: "pending_verification",
    role: "user",
    updated_at: now,
  };

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(profileRow)
      .eq("id", profileId);

    if (error) {
      console.error("Profile complete update error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      ...profileRow,
      created_at: now,
    });

    if (error) {
      console.error("Profile complete insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return Response.json({ ok: true });
}
