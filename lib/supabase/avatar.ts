/**
 * Build public URL for avatar stored in Supabase Storage avatars bucket.
 * @param avatarPath - Path within bucket (e.g. userId/uuid.jpg)
 * @param cacheBust - Optional timestamp for cache busting (avatar_updated_at or updated_at)
 */
export function getAvatarPublicUrl(
  avatarPath: string | null,
  cacheBust?: string | null
): string | null {
  if (!avatarPath || !avatarPath.trim()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const base = `${url}/storage/v1/object/public/avatars/${avatarPath.trim()}`;
  return cacheBust ? `${base}?v=${cacheBust}` : base;
}
