# Avatar / Profile Photo Setup

## Bucket Creation

The migration `012_avatars_storage.sql` creates the `avatars` bucket automatically. If it fails (e.g. storage schema not initialized), create manually:

### Via Supabase Dashboard

1. Go to **Storage** in your Supabase project
2. Click **New bucket**
3. Name: `avatars`
4. **Public bucket**: Yes (so avatar URLs work without signed URLs)
5. **File size limit**: 5 MB
6. **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

### Via SQL (Supabase SQL Editor)

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);
```

## Recommended Bucket Policy

With **session-based auth** (no Supabase Auth), uploads are done **server-side** via the service role, which bypasses RLS. The migration adds policies for when you migrate to Supabase Auth:

- **Upload**: Users can upload only to `avatars/<their_profile_id>/...`
- **Read**: Public read (bucket is public)

If the bucket is **private**, use signed URLs instead of public URLs. Update `lib/supabase/avatar.ts` to use `createSignedUrl()` and set `public: false` on the bucket.
