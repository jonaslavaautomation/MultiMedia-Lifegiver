import { supabase } from '@/lib/supabase';
import type { MediaFolder, MediaType } from '@/types';

const MEDIA_BUCKET = 'media';

export const MEDIA_FOLDERS: { value: MediaFolder; label: string }[] = [
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'backgrounds', label: 'Backgrounds' },
  { value: 'logos', label: 'Logos' },
];

export const MEDIA_LIMITS: Record<MediaType, { maxBytes: number; mimeTypes: string[] }> = {
  image: {
    maxBytes: 10 * 1024 * 1024, // 10MB — comfortably covers high-res slide backgrounds
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  video: {
    // 200MB — keeps upload/playback practical without resumable/chunked upload support.
    // Larger files should be pre-compressed by the user before upload.
    maxBytes: 200 * 1024 * 1024,
    mimeTypes: ['video/mp4', 'video/webm'],
  },
  audio: {
    maxBytes: 50 * 1024 * 1024, // 50MB — comfortably covers a full song/sermon track
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
  },
};

export type MediaValidationResult = { ok: true; type: MediaType } | { ok: false; reason: string };

export function validateFile(file: File): MediaValidationResult {
  const match = (Object.entries(MEDIA_LIMITS) as [MediaType, (typeof MEDIA_LIMITS)[MediaType]][]).find(([, limits]) =>
    limits.mimeTypes.includes(file.type)
  );

  if (!match) {
    return { ok: false, reason: `Unsupported file type: ${file.type || 'unknown'}.` };
  }

  const [type, limits] = match;
  if (file.size > limits.maxBytes) {
    const maxMb = Math.round(limits.maxBytes / (1024 * 1024));
    return { ok: false, reason: `File is too large. Maximum size is ${maxMb}MB.` };
  }

  return { ok: true, type };
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  // Fall back to inferring from MIME type if the filename has no usable extension.
  const guess = file.type.split('/').pop();
  return guess ?? 'bin';
}

/**
 * Uploads a file into the private `media` bucket under a per-user path
 * prefix, matching the storage RLS policy's `(storage.foldername(name))[1]
 * = auth.uid()::text` check — the user id must stay the FIRST path
 * segment, so the organizational folder (images/videos/etc.) goes after
 * it rather than before, keeping the existing RLS policy untouched.
 */
export async function uploadMediaFile(
  file: File,
  userId: string,
  folder?: MediaFolder
): Promise<{ path: string }> {
  const path = `${userId}/${folder ? `${folder}/` : ''}${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
  return { path };
}

/**
 * The ONLY sanctioned way to get a displayable URL for an object in this
 * private bucket. Never call `.getPublicUrl()` on it — private buckets have
 * no stable public URL, and it would silently return a non-functional link.
 */
export async function getMediaSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, expiresIn);
  if (error) {
    console.error('Error creating signed URL:', error.message);
    return null;
  }
  return data.signedUrl;
}

/** Looks up a media row's storage path by id and resolves it to a signed URL. */
export async function getMediaUrlById(mediaId: string): Promise<string | null> {
  const info = await getMediaInfoById(mediaId);
  return info?.url ?? null;
}

interface MediaInfoCacheEntry {
  info: { url: string; type: MediaType };
  expiresAt: number; // when the signed URL itself expires
}

const MEDIA_INFO_TTL_MS = 3600 * 1000; // matches getMediaSignedUrl's default expiresIn
const MEDIA_INFO_SAFETY_MARGIN_MS = 60 * 1000; // re-resolve a minute before the signed URL actually expires

// Keyed by media row id (not storage path — this is the id slide
// backgrounds reference via meta.backgroundMediaId). Without this, every
// slide-background resolution — resolveAndRenderSlide runs on EVERY
// content-object reference change, and a BroadcastChannel state broadcast
// (Projector/Stage) structured-clones its payload, producing a brand-new
// reference on every single slide navigation — did a fresh, uncached
// Supabase round trip (DB row lookup + a new signed URL) per navigation,
// per window. That's the actual "internet drops mid-service, background
// breaks" failure mode: not just an hourly expiry, but every slide change.
const mediaInfoCache = new Map<string, MediaInfoCacheEntry>();

function freshMediaInfo(mediaId: string): MediaInfoCacheEntry | null {
  const entry = mediaInfoCache.get(mediaId);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt - MEDIA_INFO_SAFETY_MARGIN_MS) return null;
  return entry;
}

/**
 * Like getMediaUrlById, but also returns the media row's type — used to
 * decide image vs. video background rendering. Cached by mediaId (see
 * mediaInfoCache above) so repeated resolution of the same background is
 * instant and needs no network at all once warm. If a re-resolution
 * genuinely fails (offline), falls back to the last known-good entry even
 * if past its normal renewal window — a still-valid-but-due-for-renewal
 * signed URL is far better than a broken background, and it stays usable
 * until its own real expiry regardless of what this cache thinks of it.
 */
export async function getMediaInfoById(mediaId: string): Promise<{ url: string; type: MediaType } | null> {
  const fresh = freshMediaInfo(mediaId);
  if (fresh) return fresh.info;

  const stale = mediaInfoCache.get(mediaId) ?? null;

  const { data, error } = await supabase.from('media').select('url, type').eq('id', mediaId).maybeSingle();
  if (error || !data) {
    if (error) console.error('Error fetching media row (offline?):', error.message);
    return stale?.info ?? null;
  }

  const signedUrl = await getMediaSignedUrl(data.url);
  if (!signedUrl) return stale?.info ?? null;

  const info = { url: signedUrl, type: data.type as MediaType };
  mediaInfoCache.set(mediaId, { info, expiresAt: Date.now() + MEDIA_INFO_TTL_MS });
  return info;
}

/** Best-effort delete — used both for rollback-on-DB-failure and the Delete action. */
export async function deleteMediaObject(path: string): Promise<void> {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) {
    console.error('Error deleting storage object:', error.message);
  }
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
