/*
# Brand Settings (Configurable Brand Kit)

1. New table: brand_settings
- A SINGLETON row (id is fixed at 1 via a CHECK constraint) holding this
  church's brand colors, primary font, and logo — shared church-wide
  config, not per-user, matching how this app already treats
  presentations/songs/media/templates as shared content rather than
  per-user data.
- `colors` (text[]) replaces the previously-hardcoded COLOR_SWATCHES
  (src/lib/editorConstants.ts) as the source of truth for the Brand
  panel's swatches — seeded here with those exact same values so nothing
  changes visually until an admin customizes it.
- `logo_media_id` references an uploaded Media Library item (resolved to
  a signed URL at use time via getMediaUrlById, same as any other media
  reference in this app) instead of a hardcoded public asset path.
  NULL means "no custom logo set yet" — callers fall back to the
  built-in /lifegiver-logo.png in that case.
- `font_family` is constrained by the app (not the DB) to one of
  EDITOR_FONTS — those are the only fonts guaranteed loaded (see
  src/index.css's Google Fonts @import), so anything else would
  silently fail to render as intended.

2. Security (RLS)
- Any authenticated user may read it (shared church content, same as
  everything else).
- Only an admin (profiles.role = 'admin') may write to it — this is a
  church-wide setting, not something every "media" role user should be
  able to change for everyone. Enforced at the RLS level (not just by
  gating the Settings page's route, which is already admin-only) as
  defense in depth.
*/

CREATE TABLE IF NOT EXISTS brand_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  colors text[] NOT NULL DEFAULT ARRAY[
    '#ffffff', '#09090b', '#2f8271', '#1c544a', '#6b9e3f',
    '#f59e0b', '#0ea5e9', '#ef4444', '#a855f7', '#71717a'
  ],
  logo_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  font_family text NOT NULL DEFAULT 'Poppins',
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_settings_select_all" ON brand_settings;
CREATE POLICY "brand_settings_select_all"
  ON brand_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "brand_settings_admin_write" ON brand_settings;
CREATE POLICY "brand_settings_admin_write"
  ON brand_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed the one singleton row if it doesn't already exist.
INSERT INTO brand_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Reuses the update_updated_at() trigger function already defined for
-- other tables (see 20260911040000_phase2_gap_fixes.sql's media trigger).
DROP TRIGGER IF EXISTS trigger_brand_settings_updated_at ON brand_settings;
CREATE TRIGGER trigger_brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

NOTIFY pgrst, 'reload schema';
