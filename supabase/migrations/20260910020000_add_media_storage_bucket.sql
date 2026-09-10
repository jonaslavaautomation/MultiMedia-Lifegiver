/*
# Media Storage Bucket

1. Storage
- Creates a private `media` storage bucket for uploaded images/videos.
  Private (not public) because this is an invitation-only church app —
  files should never be reachable via a guessable public URL; the app
  always reads them through short-lived signed URLs
  (see src/lib/mediaStorage.ts).
- Size/MIME-type limits are enforced at the bucket level as a backstop,
  in addition to the app's own client-side validation.

2. Security (RLS on storage.objects)
- Mirrors the existing `media` table's RLS: any authenticated user may
  read any object (shared church content), but only the uploader may
  insert/update/delete their own objects.
- Ownership is enforced by the upload path convention `{auth.uid()}/...`
  (checked via storage.foldername) for inserts, and by Storage's built-in
  `owner` column for update/delete.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  524288000, -- 500MB bucket ceiling; the app enforces tighter per-type limits (see src/lib/mediaStorage.ts)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "media_bucket_select_all" ON storage.objects;
CREATE POLICY "media_bucket_select_all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_bucket_insert_own" ON storage.objects;
CREATE POLICY "media_bucket_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "media_bucket_update_own" ON storage.objects;
CREATE POLICY "media_bucket_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'media' AND owner = auth.uid());

DROP POLICY IF EXISTS "media_bucket_delete_own" ON storage.objects;
CREATE POLICY "media_bucket_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());
