import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "./ProfileForm";
import type { Profile } from "@/types/profile";

const PROFILE_SELECT_BASE =
  "id, email, phone_e164, username, full_name, instagram, city, dob, gender, attracted_to, reason, status, created_at, updated_at, wp_user_id, wp_user_login, wp_registered_at, wp_source, display_name, name";

async function getProfile(profileId: string): Promise<Profile | null> {
  const supabase = getServiceSupabaseClient();
  // Try with avatar columns first; fall back to base if migration 012 not run
  const selectCols = `${PROFILE_SELECT_BASE}, avatar_path, avatar_updated_at`;
  const { data: firstRow, error: firstError } = await supabase
    .from("profiles")
    .select(selectCols)
    .eq("id", profileId)
    .maybeSingle();

  let row: Record<string, unknown> | null = firstRow;
  let error = firstError;

  if (error?.message?.includes("avatar_path") || error?.message?.includes("avatar_updated_at")) {
    const fallback = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_BASE)
      .eq("id", profileId)
      .maybeSingle();
    row = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("getProfile error:", error);
    return null;
  }
  if (!row) return null;

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
    avatar_path: (row.avatar_path as string | null) ?? null,
    avatar_updated_at: (row.avatar_updated_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : null,
    wp_user_id: row.wp_user_id != null ? Number(row.wp_user_id) : null,
    wp_user_login: (row.wp_user_login as string) ?? null,
    wp_registered_at: (row.wp_registered_at as string) ?? null,
    wp_source: (row.wp_source as Record<string, unknown>) ?? null,
  };
}

async function ensureProfile(profileId: string, displayName: string, phoneE164: string | null): Promise<Profile> {
  const supabase = getServiceSupabaseClient();
  const existing = await getProfile(profileId);
  if (existing) return existing;

  // Quick existence check (profile may exist but getProfile failed e.g. missing columns)
  const { data: existingRow } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();
  if (existingRow) {
    const retry = await getProfile(profileId);
    if (retry) return retry;
    // Profile exists but getProfile failed - build minimal profile from DB
    const { data: minRow } = await supabase
      .from("profiles")
      .select("id, email, phone_e164, username, full_name, instagram, city, dob, gender, attracted_to, reason, status, created_at, updated_at, display_name, name")
      .eq("id", profileId)
      .single();
    if (minRow) {
      return {
        id: String(minRow.id),
        email: (minRow.email as string) ?? null,
        phone_e164: (minRow.phone_e164 as string) ?? null,
        username: (minRow.username as string) ?? null,
        full_name: (minRow.full_name as string) ?? (minRow.display_name as string) ?? (minRow.name as string) ?? null,
        instagram: (minRow.instagram as string) ?? null,
        city: (minRow.city as string) ?? null,
        dob: minRow.dob ? String(minRow.dob).slice(0, 10) : null,
        gender: (minRow.gender as string) ?? null,
        attracted_to: (minRow.attracted_to as string) ?? null,
        reason: (minRow.reason as string) ?? null,
        status: (minRow.status as string) ?? null,
        avatar_path: null,
        avatar_updated_at: null,
        created_at: String(minRow.created_at),
        updated_at: minRow.updated_at ? String(minRow.updated_at) : null,
        wp_user_id: null,
        wp_user_login: null,
        wp_registered_at: null,
        wp_source: null,
      };
    }
  }

  const now = new Date().toISOString();
  const safeDigits = (phoneE164 ?? "").replace(/\D/g, "").slice(-12) || profileId.slice(0, 8).replace(/-/g, "");
  const syntheticEmail = `profile_${safeDigits || "new"}@demo.local`;
  const name = displayName || "User";

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({
      id: profileId,
      name,
      email: syntheticEmail,
      display_name: name,
      full_name: name,
      phone_e164: phoneE164,
      city: "sg",
      status: "approved",
      created_at: now,
      updated_at: now,
    })
    .select(
      "id, email, phone_e164, username, full_name, instagram, city, dob, gender, attracted_to, reason, status, created_at, updated_at, avatar_path, avatar_updated_at, wp_user_id, wp_user_login, wp_registered_at, wp_source"
    )
    .single();

  if (error || !inserted) {
    console.error("ensureProfile insert error:", error);
    throw new Error(error?.message ?? "Failed to create profile");
  }

  return {
    id: String(inserted.id),
    email: (inserted.email as string) ?? null,
    phone_e164: (inserted.phone_e164 as string) ?? null,
    username: (inserted.username as string) ?? null,
    full_name: (inserted.full_name as string) ?? null,
    instagram: (inserted.instagram as string) ?? null,
    city: (inserted.city as string) ?? null,
    dob: inserted.dob ? String(inserted.dob).slice(0, 10) : null,
    gender: (inserted.gender as string) ?? null,
    attracted_to: (inserted.attracted_to as string) ?? null,
    reason: (inserted.reason as string) ?? null,
    status: (inserted.status as string) ?? null,
    avatar_path: (inserted.avatar_path as string) ?? null,
    avatar_updated_at: (inserted.avatar_updated_at as string) ?? null,
    created_at: String(inserted.created_at),
    updated_at: inserted.updated_at ? String(inserted.updated_at) : null,
    wp_user_id: inserted.wp_user_id != null ? Number(inserted.wp_user_id) : null,
    wp_user_login: (inserted.wp_user_login as string) ?? null,
    wp_registered_at: (inserted.wp_registered_at as string) ?? null,
    wp_source: (inserted.wp_source as Record<string, unknown>) ?? null,
  };
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const auth = await getAuthUser();
  if (!auth) {
    redirect("/login");
  }

  const profile = await ensureProfile(
    auth.profile_id,
    auth.display_name ?? "",
    auth.phone_e164 ?? null
  );

  const { reset } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Profile"
        subtitle="Manage your account and preferences"
      />
      <ProfileForm
        initialProfile={profile}
        showResetSuccess={reset === "success"}
      />
    </div>
  );
}
