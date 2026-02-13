/**
 * WordPress → Supabase profile mapping.
 * Use this when migrating wp.users / wp-users data into public.profiles.
 *
 * Mapping from WP admin columns:
 * - wp.ID -> profiles.wp_user_id
 * - wp.user_login -> profiles.wp_user_login
 * - wp.user_email -> profiles.email (optional)
 * - wp.display_name -> profiles.full_name
 * - wp.user_registered -> profiles.wp_registered_at
 * - Custom meta (instagram, reason, dob, city, status, gender, attracted_to) -> profiles.*
 *
 * Do NOT store WP password; auth will be handled separately.
 */

import type { Profile } from "@/types/profile";

/** WP users table row shape (typical wp_users + meta) */
export interface WpUserRow {
  ID?: number;
  user_login?: string;
  user_email?: string;
  display_name?: string;
  user_registered?: string;
  instagram?: string;
  reason?: string;
  dob?: string;
  city?: string;
  status?: string;
  gender?: string;
  attracted_to?: string;
  [key: string]: unknown;
}

/**
 * Maps a WordPress user row to a profiles row shape for upsert.
 * Use with profiles.id = target auth user id (or new UUID for pre-auth migration).
 *
 * @param wpRow - Row from wp.users or wp-users (with meta fields)
 * @param targetProfileId - UUID for profiles.id (e.g. auth.users.id when linking)
 */
export function mapWpUserToProfile(
  wpRow: WpUserRow,
  targetProfileId: string
): Omit<Profile, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
} {
  const wpId = wpRow.ID ?? null;
  const userLogin = wpRow.user_login ?? null;
  const userRegistered = wpRow.user_registered ?? null;

  return {
    id: targetProfileId,
    email: wpRow.user_email ?? null,
    phone_e164: null,
    username: userLogin,
    full_name: wpRow.display_name ?? null,
    instagram: wpRow.instagram ?? null,
    city: wpRow.city ?? null,
    dob: wpRow.dob ?? null,
    gender: wpRow.gender ?? null,
    attracted_to: wpRow.attracted_to ?? null,
    reason: wpRow.reason ?? null,
    status: wpRow.status ?? null,
    avatar_path: null,
    avatar_updated_at: null,
    wp_user_id: wpId !== null ? Number(wpId) : null,
    wp_user_login: userLogin,
    wp_registered_at: userRegistered ? new Date(userRegistered).toISOString() : null,
    wp_source: wpRow as Record<string, unknown>, // Optional raw snapshot for debugging
  };
}
