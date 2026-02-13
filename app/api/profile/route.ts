import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import type { Profile } from "@/types/profile";

/** Fetch current user's profile. Creates one if missing (Supabase Auth or custom session). */
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const profileId = auth.profile_id;
  const supabase = getServiceSupabaseClient();

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, email, phone_e164, username, full_name, instagram, city, dob, gender, attracted_to, reason, status, created_at, updated_at, wp_user_id, wp_user_login, wp_registered_at, wp_source, display_name, name, avatar_path, avatar_updated_at"
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    console.error("Profile fetch error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to load profile" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!row) {
    // Create profile on first visit
    const now = new Date().toISOString();
    const displayName = auth.display_name ?? "User";
    const email =
      auth.email ??
      `profile_${(auth.phone_e164 ?? "").replace(/\D/g, "").slice(-12) || profileId.slice(0, 8)}@demo.local`;
    const newProfile = {
      id: profileId,
      name: displayName,
      email,
      display_name: displayName,
      full_name: displayName,
      phone_e164: auth.phone_e164 ?? null,
      phone: auth.phone_e164 ?? null,
      city: "sg",
      username: null,
      instagram: null,
      dob: null,
      gender: null,
      attracted_to: null,
      reason: null,
      status: "pending_verification",
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select(
        "id, email, phone_e164, username, full_name, instagram, city, dob, gender, attracted_to, reason, status, created_at, updated_at, wp_user_id, wp_user_login, wp_registered_at, wp_source, avatar_path, avatar_updated_at"
      )
      .single();

    if (insertError || !inserted) {
      console.error("Profile create error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(rowToProfile(inserted));
  }

  return Response.json(rowToProfile(row));
}

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: (row.email as string) ?? null,
    phone_e164: (row.phone_e164 as string) ?? null,
    username: (row.username as string) ?? null,
    full_name:
      (row.full_name as string) ??
      (row.display_name as string) ??
      (row.name as string) ??
      null,
    instagram: (row.instagram as string) ?? null,
    city: (row.city as string) ?? null,
    dob: row.dob ? String(row.dob).slice(0, 10) : null,
    gender: (row.gender as string) ?? null,
    attracted_to: (row.attracted_to as string) ?? null,
    reason: (row.reason as string) ?? null,
    status: (row.status as string) ?? null,
    avatar_path: (row.avatar_path as string) ?? null,
    avatar_updated_at: (row.avatar_updated_at as string) ?? null,
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : null,
    wp_user_id: row.wp_user_id != null ? Number(row.wp_user_id) : null,
    wp_user_login: (row.wp_user_login as string) ?? null,
    wp_registered_at: (row.wp_registered_at as string) ?? null,
    wp_source: (row.wp_source as Record<string, unknown>) ?? null,
  };
}
