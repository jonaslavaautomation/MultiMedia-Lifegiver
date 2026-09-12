import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SearchablePresentation {
  id: string;
  title: string;
  updated_at: string;
}

export interface SearchableSong {
  id: string;
  title: string;
  author: string | null;
}

export interface SearchableMedia {
  id: string;
  name: string;
  type: string;
}

export interface SearchableTemplate {
  id: string;
  name: string;
  category: string | null;
}

export interface GlobalSearchData {
  presentations: SearchablePresentation[];
  songs: SearchableSong[];
  media: SearchableMedia[];
  templates: SearchableTemplate[];
}

const EMPTY_DATA: GlobalSearchData = { presentations: [], songs: [], media: [], templates: [] };

/**
 * Lightweight lists for the Command Palette — fetched fresh each time the
 * palette opens (small tables for a church's own content, so a full
 * re-fetch is cheap and keeps results current without a caching layer).
 */
export function useGlobalSearchData(): { data: GlobalSearchData; loading: boolean; fetch: () => Promise<void> } {
  const [data, setData] = useState<GlobalSearchData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [presRes, songsRes, mediaRes, templatesRes] = await Promise.all([
      supabase.from('presentations').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(40),
      supabase.from('songs').select('id, title, author').order('title', { ascending: true }).limit(60),
      supabase.from('media').select('id, name, type').order('created_at', { ascending: false }).limit(60),
      supabase.from('templates').select('id, name, category').order('name', { ascending: true }).limit(60),
    ]);

    setData({
      presentations: (presRes.data as SearchablePresentation[]) ?? [],
      songs: (songsRes.data as SearchableSong[]) ?? [],
      media: (mediaRes.data as SearchableMedia[]) ?? [],
      templates: (templatesRes.data as SearchableTemplate[]) ?? [],
    });
    setLoading(false);
  }, []);

  return { data, loading, fetch: fetchAll };
}
