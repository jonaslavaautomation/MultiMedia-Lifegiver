export type UserRole = 'admin' | 'media' | 'pastor';

export type PresentationStatus = 'draft' | 'ready' | 'archived';

export type MediaType = 'image' | 'video' | 'audio';

export type SongSectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'refrain'
  | 'bridge'
  | 'tag'
  | 'outro';

export interface SongSection {
  id: string;
  type: SongSectionType;
  label: string;
  text: string;
  order: number;
}

export interface SongLyrics {
  sections: SongSection[];
}

/**
 * Slide canvas data stored in `slides.content`. This is Fabric.js's own
 * `canvas.toJSON(['id','data'])` output, round-tripped opaquely via
 * `canvas.loadFromJSON()` — we don't assert its internal shape beyond the
 * `meta` sidecar we bolt on ourselves.
 */
export interface SlideCanvasMeta {
  schemaVersion: 1;
  backgroundMediaId: string | null;
  /**
   * An externally-hosted video URL used as a live/motion background,
   * pasted directly (not uploaded to the Media library). Mutually
   * exclusive with backgroundMediaId in practice — only one is ever set.
   */
  backgroundVideoEmbedUrl?: string | null;
  /**
   * A built-in Motion Background Library preset id (see src/lib/motionLibrary.ts).
   * Mutually exclusive with backgroundMediaId/backgroundVideoEmbedUrl —
   * only one background source is ever set at a time.
   */
  backgroundMotionId?: string | null;
}

export interface SlideCanvasData {
  [key: string]: unknown;
  meta?: SlideCanvasMeta;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Presentation {
  id: string;
  title: string;
  description: string | null;
  status: PresentationStatus;
  service_date: string | null;
  created_by: string | null;
  slide_data: Record<string, unknown>;
  /** The song this presentation was auto-generated from (Smart Import / Generate Slides), if any. */
  source_song_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresentationWithCreator extends Presentation {
  creator?: Pick<Profile, 'full_name' | 'role'> | null;
}

export interface Slide {
  id: string;
  presentation_id: string;
  title: string;
  content: SlideCanvasData;
  background_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  key: string | null;
  tempo: string | null;
  lyrics: SongLyrics;
  /** Set when this song was created from an online search result (src/lib/songSearch/) — a link back to the source, never the lyrics text itself. */
  source_url: string | null;
  /** Which SongSearchProvider found it, e.g. 'itunes' — null for a hand-entered or paste-only import. */
  source_provider: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SongWithCreator extends Song {
  creator?: Pick<Profile, 'full_name' | 'role'> | null;
}

export interface BibleVerse {
  id: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
  text: string;
  translation: string;
  created_by: string | null;
  created_at: string;
}

export type MediaFolder = 'images' | 'videos' | 'audio' | 'backgrounds' | 'logos';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  folder: string | null;
  metadata: Record<string, unknown>;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItemWithUploader extends MediaItem {
  uploader?: Pick<Profile, 'full_name' | 'role'> | null;
}

export interface Template {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  thumbnail_url: string | null;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateWithCreator extends Template {
  creator?: Pick<Profile, 'full_name' | 'role'> | null;
}

/** The one shared row in brand_settings — see its migration for why it's a singleton. */
export interface BrandSettings {
  id: number;
  colors: string[];
  logo_media_id: string | null;
  font_family: string;
  updated_by: string | null;
  updated_at: string;
}
