/**
 * Profile type for public.profiles table.
 * Aligned with WP admin columns for migration readiness.
 */
export interface Profile {
  id: string;
  email: string | null;
  phone_e164: string | null; // E.164 format, PII - only visible to own profile
  username: string | null;
  full_name: string | null;
  instagram: string | null;
  city: string | null;
  dob: string | null; // ISO date string (YYYY-MM-DD)
  gender: string | null;
  attracted_to: string | null;
  reason: string | null;
  status: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
  created_at: string;
  updated_at: string | null;
  // Migration helpers for WordPress linkage
  wp_user_id: number | null;
  wp_user_login: string | null;
  wp_registered_at: string | null;
  wp_source: Record<string, unknown> | null;
}

/**
 * Editable profile fields (safe for user to update).
 * Excludes system fields: id, created_at, wp_*, status (admin-only).
 */
export type ProfileUpdateInput = Partial<Pick<
  Profile,
  | "email"
  | "phone_e164"
  | "username"
  | "full_name"
  | "instagram"
  | "city"
  | "dob"
  | "gender"
  | "attracted_to"
  | "reason"
  | "avatar_path"
>>;
