/*
# Phase 2 gap fixes: song categories, media folders, extra indexes

1. Changes
- `songs.category` (text, nullable) — lets songs be filtered by category
  (Worship, Hymn, Contemporary, etc.) in the Song Library UI.
- `templates.description` (text, nullable) — short description shown in
  the Template Library, alongside the existing name/category/thumbnail.
- The `media` storage bucket's `allowed_mime_types` is extended to include
  audio formats — Media now supports audio uploads, and the bucket's
  original `INSERT ... ON CONFLICT (id) DO NOTHING` never re-applies to an
  already-existing bucket, so this needs an explicit UPDATE.
- `media.folder` (text, nullable) — organizational grouping distinct from
  `type` (image/video/audio): images/videos/audio/backgrounds/logos.
  Existing rows are left NULL (shown as "Uncategorized" in the UI); new
  uploads set this going forward.
- `media.updated_at` (timestamptz, default now()) + trigger — media rows
  didn't track updates before (e.g. renames).
- Additional indexes for fields the Bible/Song/Media UIs filter on.

All changes are purely additive (`ADD COLUMN IF NOT EXISTS` /
`CREATE INDEX IF NOT EXISTS`) — safe to run regardless of the exact
current state of these tables, and non-destructive to existing data.
*/

ALTER TABLE songs ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);

ALTER TABLE templates ADD COLUMN IF NOT EXISTS description text;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'
]
WHERE id = 'media';

ALTER TABLE media ADD COLUMN IF NOT EXISTS folder text;
ALTER TABLE media ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);

DROP TRIGGER IF EXISTS trigger_media_updated_at ON media;
CREATE TRIGGER trigger_media_updated_at
  BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_bible_verses_translation ON bible_verses(translation);
CREATE INDEX IF NOT EXISTS idx_bible_verses_verse_start ON bible_verses(verse_start);

NOTIFY pgrst, 'reload schema';
