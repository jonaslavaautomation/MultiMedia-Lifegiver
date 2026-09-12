import type { LucideIcon } from 'lucide-react';
import { BookOpen, Image as ImageIcon, LayoutTemplate, Music4, Presentation as PresentationIcon } from 'lucide-react';
import { BIBLE_BOOKS } from '@/data/bibleBooks';
import { parseReference } from '@/lib/bibleReference';
import type { GlobalSearchData } from '@/hooks/useGlobalSearchData';

export type PaletteResultKind = 'bible' | 'presentation' | 'song' | 'media' | 'template';

export interface PaletteResult {
  kind: PaletteResultKind;
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

const MAX_PER_GROUP = 5;

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function referenceLabel(parsed: ReturnType<typeof parseReference>): string {
  if (!parsed) return '';
  const { book, chapter, verseStart, verseEnd } = parsed;
  if (verseStart == null) return `${book.name} ${chapter}`;
  if (verseEnd == null) return `${book.name} ${chapter}:${verseStart}`;
  return `${book.name} ${chapter}:${verseStart}-${verseEnd}`;
}

/**
 * Builds the Command Palette's result list for a given query. Empty query
 * shows a handful of recently-updated presentations as a default landing
 * view; a non-empty query filters every category client-side (these lists
 * are small — a church's own content, not a public catalog) plus a Bible
 * reference match when the text parses as one (e.g. "John 3:16").
 */
export function buildPaletteResults(query: string, data: GlobalSearchData): PaletteResult[] {
  const trimmed = query.trim();
  const results: PaletteResult[] = [];

  if (!trimmed) {
    data.presentations.slice(0, MAX_PER_GROUP).forEach((p) => {
      results.push({ kind: 'presentation', id: p.id, icon: PresentationIcon, title: p.title, subtitle: 'Recent presentation' });
    });
    return results;
  }

  const parsedRef = parseReference(trimmed, BIBLE_BOOKS);
  if (parsedRef) {
    results.push({
      kind: 'bible',
      id: 'bible-ref',
      icon: BookOpen,
      title: `Go to ${referenceLabel(parsedRef)}`,
      subtitle: 'Bible reference',
    });
  }

  data.presentations
    .filter((p) => matches(trimmed, p.title))
    .slice(0, MAX_PER_GROUP)
    .forEach((p) => results.push({ kind: 'presentation', id: p.id, icon: PresentationIcon, title: p.title, subtitle: 'Presentation' }));

  data.songs
    .filter((s) => matches(trimmed, s.title, s.author))
    .slice(0, MAX_PER_GROUP)
    .forEach((s) => results.push({ kind: 'song', id: s.id, icon: Music4, title: s.title, subtitle: s.author ? `Song — ${s.author}` : 'Song' }));

  data.media
    .filter((m) => matches(trimmed, m.name))
    .slice(0, MAX_PER_GROUP)
    .forEach((m) => results.push({ kind: 'media', id: m.id, icon: ImageIcon, title: m.name, subtitle: `Media — ${m.type}` }));

  data.templates
    .filter((t) => matches(trimmed, t.name, t.category))
    .slice(0, MAX_PER_GROUP)
    .forEach((t) => results.push({ kind: 'template', id: t.id, icon: LayoutTemplate, title: t.name, subtitle: t.category ? `Template — ${t.category}` : 'Template' }));

  return results;
}
