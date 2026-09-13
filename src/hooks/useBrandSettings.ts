import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMediaUrlById } from '@/lib/mediaStorage';
import { COLOR_SWATCHES } from '@/lib/editorConstants';
import type { BrandSettings } from '@/types';

interface UseBrandSettingsResult {
  /** This church's brand color swatches — falls back to the built-in default palette if not yet loaded/customized. */
  colors: string[];
  /** A signed URL for the custom logo, or null if none is set (callers fall back to the built-in /lifegiver-logo.png). */
  logoUrl: string | null;
  /** The church's chosen primary font (one of EDITOR_FONTS). */
  fontFamily: string;
  /** The raw row, for the Settings page's edit form — null while loading. */
  settings: BrandSettings | null;
  loading: boolean;
  /** Re-fetches — call after saving a change in the Settings page. */
  refresh: () => void;
}

/**
 * Reads the one shared brand_settings row (see its migration) and resolves
 * its logo_media_id to a usable signed URL. Every consumer (the editor's
 * Brand panel, the Settings page's edit form) gets its own fetch on mount —
 * matching how every other panel/page in this app already loads its own
 * data, rather than introducing a new global-cache pattern for this one
 * case.
 */
export function useBrandSettings(): UseBrandSettingsResult {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from('brand_settings').select('*').eq('id', 1).maybeSingle();
      if (cancelled) return;

      if (error) {
        console.error('Error loading brand settings:', error.message);
        setLoading(false);
        return;
      }

      const row = data as BrandSettings | null;
      setSettings(row);

      if (row?.logo_media_id) {
        const url = await getMediaUrlById(row.logo_media_id);
        if (!cancelled) setLogoUrl(url);
      } else if (!cancelled) {
        setLogoUrl(null);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return {
    colors: settings?.colors ?? COLOR_SWATCHES,
    logoUrl,
    fontFamily: settings?.font_family ?? 'Poppins',
    settings,
    loading,
    refresh,
  };
}
