/*
# LifeGiver Media Studio — Foundation Schema (Phase 1)

Creates the core database tables for a church presentation and media management
application. All tables use UUID primary keys, timestamps, foreign keys, and
JSONB where appropriate. Row Level Security is enabled on every table with
owner-scoped or organization-scoped policies.

## 1. New Tables

### profiles
- `id` (uuid, PK, references auth.users) — one-to-one with Supabase auth user
- `full_name` (text) — display name
- `role` (text, NOT NULL, default 'media') — one of 'admin', 'media', 'pastor'
- `avatar_url` (text) — optional profile picture URL
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### presentations
- `id` (uuid, PK)
- `title` (text, NOT NULL)
- `description` (text) — optional description
- `status` (text, default 'draft') — draft, ready, archived
- `service_date` (date) — when the presentation will be used
- `created_by` (uuid, NOT NULL, references profiles, default auth.uid())
- `slide_data` (jsonb) — future slide content storage (Phase 3)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### media
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `type` (text, NOT NULL) — 'image', 'video', 'audio'
- `url` (text, NOT NULL) — storage URL
- `thumbnail_url` (text) — optional thumbnail
- `file_size` (bigint) — file size in bytes
- `metadata` (jsonb) — dimensions, duration, etc.
- `uploaded_by` (uuid, NOT NULL, references profiles, default auth.uid())
- `created_at` (timestamptz, default now())

### slides
- `id` (uuid, PK)
- `presentation_id` (uuid, NOT NULL, references presentations, ON DELETE CASCADE)
- `title` (text, NOT NULL)
- `content` (jsonb) — slide content (text, lyrics, verse, etc.)
- `background_id` (uuid, references media) — optional background image
- `sort_order` (integer, default 0)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### songs
- `id` (uuid, PK)
- `title` (text, NOT NULL)
- `author` (text) — songwriter or source
- `key` (text) — musical key (e.g. 'C', 'G')
- `tempo` (text) — BPM or tempo description
- `lyrics` (jsonb) — structured lyrics (verses, chorus, bridge)
- `created_by` (uuid, NOT NULL, references profiles, default auth.uid())
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### bible_verses
- `id` (uuid, PK)
- `book` (text, NOT NULL) — e.g. 'John'
- `chapter` (integer, NOT NULL)
- `verse_start` (integer, NOT NULL)
- `verse_end` (integer) — for verse ranges
- `text` (text, NOT NULL) — verse content
- `translation` (text, default 'KJV')
- `created_by` (uuid, NOT NULL, references profiles, default auth.uid())
- `created_at` (timestamptz, default now())

### templates
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `category` (text) — e.g. 'worship', 'announcement', 'scripture'
- `thumbnail_url` (text) — preview image
- `config` (jsonb) — template layout/design configuration
- `created_by` (uuid, NOT NULL, references profiles, default auth.uid())
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## 2. Indexes
- profiles: role (for filtering by role)
- presentations: created_by, service_date, status
- slides: presentation_id, sort_order
- songs: title, created_by
- bible_verses: book, chapter
- media: type, uploaded_by
- templates: category

## 3. Security (RLS)
- All tables have RLS enabled.
- profiles: users can read/update their own profile. Admins can read all profiles.
- All content tables (presentations, songs, bible_verses, media, templates):
  authenticated users can read all rows (shared church content). Users can
  insert/update/delete rows they own (created_by = auth.uid()).
- slides: access scoped through parent presentation ownership or shared read.

## 4. Important Notes
- Owner columns default to auth.uid() so frontend inserts omitting the owner
  still satisfy INSERT WITH CHECK policies.
- The profiles table uses a trigger to auto-create a profile row when a new
  auth.users record is created.
- Email confirmation is OFF (default Supabase behavior maintained).
*/

-- ============================================================
-- PROFILES TABLE (must come first — referenced by all others)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'media' CHECK (role IN ('admin', 'media', 'pastor')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin. SECURITY DEFINER so
-- its internal query bypasses RLS — defined BEFORE any policy references
-- it, specifically so a policy can NEVER be written as a self-referencing
-- subquery on profiles (which causes "infinite recursion detected in
-- policy for relation profiles", Postgres error 42P17, the moment two
-- different users' rows need to be checked in the same query — e.g. any
-- list page that joins to profiles for someone else's name).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), 'media')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PRESENTATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  service_date date,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  slide_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presentations_select_all" ON presentations;
CREATE POLICY "presentations_select_all"
  ON presentations FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "presentations_insert_own" ON presentations;
CREATE POLICY "presentations_insert_own"
  ON presentations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "presentations_update_own" ON presentations;
CREATE POLICY "presentations_update_own"
  ON presentations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "presentations_delete_own" ON presentations;
CREATE POLICY "presentations_delete_own"
  ON presentations FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- MEDIA TABLE (before slides — slides references media)
-- ============================================================

CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  url text NOT NULL,
  thumbnail_url text,
  file_size bigint,
  metadata jsonb DEFAULT '{}'::jsonb,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_select_all" ON media;
CREATE POLICY "media_select_all"
  ON media FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "media_insert_own" ON media;
CREATE POLICY "media_insert_own"
  ON media FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "media_update_own" ON media;
CREATE POLICY "media_update_own"
  ON media FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "media_delete_own" ON media;
CREATE POLICY "media_delete_own"
  ON media FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

-- ============================================================
-- SLIDES TABLE (references presentations + media)
-- ============================================================

CREATE TABLE IF NOT EXISTS slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id uuid NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Slide',
  content jsonb DEFAULT '{}'::jsonb,
  background_id uuid REFERENCES media(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slides_select_all" ON slides;
CREATE POLICY "slides_select_all"
  ON slides FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "slides_insert_own_presentation" ON slides;
CREATE POLICY "slides_insert_own_presentation"
  ON slides FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM presentations
    WHERE presentations.id = slides.presentation_id
    AND presentations.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "slides_update_own_presentation" ON slides;
CREATE POLICY "slides_update_own_presentation"
  ON slides FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM presentations
    WHERE presentations.id = slides.presentation_id
    AND presentations.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM presentations
    WHERE presentations.id = slides.presentation_id
    AND presentations.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "slides_delete_own_presentation" ON slides;
CREATE POLICY "slides_delete_own_presentation"
  ON slides FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM presentations
    WHERE presentations.id = slides.presentation_id
    AND presentations.created_by = auth.uid()
  ));

-- ============================================================
-- SONGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  key text,
  tempo text,
  lyrics jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_select_all" ON songs;
CREATE POLICY "songs_select_all"
  ON songs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "songs_insert_own" ON songs;
CREATE POLICY "songs_insert_own"
  ON songs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "songs_update_own" ON songs;
CREATE POLICY "songs_update_own"
  ON songs FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "songs_delete_own" ON songs;
CREATE POLICY "songs_delete_own"
  ON songs FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- BIBLE VERSES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book text NOT NULL,
  chapter integer NOT NULL,
  verse_start integer NOT NULL,
  verse_end integer,
  text text NOT NULL,
  translation text NOT NULL DEFAULT 'KJV',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bible_verses_select_all" ON bible_verses;
CREATE POLICY "bible_verses_select_all"
  ON bible_verses FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "bible_verses_insert_own" ON bible_verses;
CREATE POLICY "bible_verses_insert_own"
  ON bible_verses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "bible_verses_update_own" ON bible_verses;
CREATE POLICY "bible_verses_update_own"
  ON bible_verses FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "bible_verses_delete_own" ON bible_verses;
CREATE POLICY "bible_verses_delete_own"
  ON bible_verses FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- TEMPLATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  thumbnail_url text,
  config jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_all" ON templates;
CREATE POLICY "templates_select_all"
  ON templates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "templates_insert_own" ON templates;
CREATE POLICY "templates_insert_own"
  ON templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "templates_update_own" ON templates;
CREATE POLICY "templates_update_own"
  ON templates FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "templates_delete_own" ON templates;
CREATE POLICY "templates_delete_own"
  ON templates FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_presentations_created_by ON presentations(created_by);
CREATE INDEX IF NOT EXISTS idx_presentations_service_date ON presentations(service_date);
CREATE INDEX IF NOT EXISTS idx_presentations_status ON presentations(status);
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_slides_sort_order ON slides(sort_order);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_created_by ON songs(created_by);
CREATE INDEX IF NOT EXISTS idx_bible_verses_book_chapter ON bible_verses(book, chapter);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_presentations_updated_at ON presentations;
CREATE TRIGGER trigger_presentations_updated_at
  BEFORE UPDATE ON presentations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_slides_updated_at ON slides;
CREATE TRIGGER trigger_slides_updated_at
  BEFORE UPDATE ON slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_songs_updated_at ON songs;
CREATE TRIGGER trigger_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_templates_updated_at ON templates;
CREATE TRIGGER trigger_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();