-- Add avatar columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;

-- Create avatars bucket (idempotent: only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    );
  END IF;
END
$$;

-- Storage RLS: Users can upload only to their own folder (<profile_id>/...)
-- Note: With session-based auth (no auth.uid()), uploads are done server-side via service role.
-- These policies apply when using Supabase Auth client-side.
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Public read for avatars bucket (bucket is public)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
