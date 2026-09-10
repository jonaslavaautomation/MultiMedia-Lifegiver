import { supabase } from '@/lib/supabase';
import type { MediaType } from '@/types';

const MEDIA_BUCKET = 'media';

export const MEDIA_LIMITS: Record<'image' | 'video', { maxBytes: number; mimeTypes: string[] }> = {
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
};

export type MediaValidationResult = { ok: true; type: MediaType } | { ok: false; reason: string };

export function validateFile(file: File): MediaValidationResult {
  const isImage = MEDIA_LIMITS.image.mimeTypes.includes(file.type);
  const isVideo = MEDIA_LIMITS.video.mimeTypes.includes(file.type);

  if (!isImage && !isVideo) {
    return { ok: false, reason: `Unsupported file type: ${file.type || 'unknown'}.` };
  }

  const limits = isImage ? MEDIA_LIMITS.image : MEDIA_LIMITS.video;
  if (file.size > limits.maxBytes) {
    const maxMb = Math.round(limits.maxBytes / (1024 * 1024));
    return { ok: false, reason: `File is too large. Maximum size is ${maxMb}MB.` };
  }

  return { ok: true, type: isImage ? 'image' : 'video' };
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
 * = auth.uid()::text` check.
 */
export async function uploadMediaFile(file: File, userId: string): Promise<{ path: string }> {
  const path = `${userId}/${crypto.randomUUID()}.${fileExtension(file)}`;

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

/** Like getMediaUrlById, but also returns the media row's type — used to decide image vs. video background rendering. */
export async function getMediaInfoById(mediaId: string): Promise<{ url: string; type: MediaType } | null> {
  const { data, error } = await supabase.from('media').select('url, type').eq('id', mediaId).maybeSingle();
  if (error || !data) {
    if (error) console.error('Error fetching media row:', error.message);
    return null;
  }
  const signedUrl = await getMediaSignedUrl(data.url);
  if (!signedUrl) return null;
  return { url: signedUrl, type: data.type as MediaType };
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
