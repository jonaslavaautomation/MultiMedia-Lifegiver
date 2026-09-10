export type UserRole = 'admin' | 'media' | 'pastor';

export type PresentationStatus = 'draft' | 'ready' | 'archived';

export type MediaType = 'image' | 'video' | 'audio';

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
  content: Record<string, unknown>;
  background_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  title: string;
  author: string | null;
  key: string | null;
  tempo: string | null;
  lyrics: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  metadata: Record<string, unknown>;
  uploaded_by: string | null;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  category: string | null;
  thumbnail_url: string | null;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
