import type { SongSectionType } from '@/types';

/**
 * Smart lyrics parser for the "paste to import" flow (src/components/songs/SmartImportModal.tsx).
 *
 * Deliberately NOT a lyrics-fetching/scraping tool — there is no free,
 * legal source of full worship-song lyrics text (CCLI SongSelect is
 * licensed/paid; general lyrics sites prohibit scraping in their terms of
 * service). Instead, this takes lyrics text the user already has the
 * rights to use (their own CCLI-licensed copy, a hymnal, a file they
 * wrote) and does the actual "smart" work: strip chord charts, detect
 * Verse/Chorus/Pre-Chorus/Refrain/Bridge/Intro/Outro/Tag structure, and
 * turn it into the same `SongSection[]` shape the manual editor produces.
 */

export interface ParsedSection {
  type: SongSectionType;
  label: string;
  text: string;
}

export interface ParseLyricsResult {
  sections: ParsedSection[];
  /** How structure was determined — surfaced in the UI so the user knows to double-check unlabeled imports more carefully. */
  method: 'labeled' | 'unlabeled-heuristic' | 'empty';
  /** Lines that were recognized as a chord chart (e.g. "G   D   Em   C") and removed from the lyrics text. */
  chordLinesStripped: number;
}

const LABEL_RULES: { type: SongSectionType; pattern: RegExp }[] = [
  { type: 'pre-chorus', pattern: /^pre[\s-]?chorus$/i },
  { type: 'chorus', pattern: /^chorus$/i },
  { type: 'refrain', pattern: /^refrain$/i },
  { type: 'bridge', pattern: /^bridge$/i },
  { type: 'verse', pattern: /^verse\s*\d*$/i },
  { type: 'intro', pattern: /^intro(duction)?$/i },
  { type: 'outro', pattern: /^(outro|ending|end)$/i },
  { type: 'tag', pattern: /^tag$/i },
  { type: 'verse', pattern: /^v\d+$/i }, // shorthand some hymnals use, e.g. "V1"
  { type: 'chorus', pattern: /^c\d*$/i }, // shorthand, e.g. "C" or "C1" for chorus
];

// A "chord-only" line: every whitespace-separated token looks like a chord
// symbol (root note A-G, optional accidental/quality/extension, optional
// slash bass note) and nothing else — real lyric lines essentially never
// match this in full, since it requires *every* word to parse as a chord.
const CHORD_TOKEN = /^[A-G](#|b)?(maj|min|m|dim|aug|sus[24]?|add\d+|[0-9]){0,3}(\/[A-G](#|b)?)?$/;

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 12) return false;
  return tokens.every((tok) => CHORD_TOKEN.test(tok));
}

function matchLabel(line: string): SongSectionType | null {
  // Strip common label decoration: [Verse 1], (Chorus), "Verse 1:", "CHORUS —"
  const cleaned = line
    .trim()
    .replace(/^[[(]|[\])]$/g, '')
    .replace(/[:\-–—]\s*$/, '')
    .trim();
  if (!cleaned || cleaned.length > 24) return null; // a label line is short; a lyric line rarely is
  for (const rule of LABEL_RULES) {
    if (rule.pattern.test(cleaned)) return rule.type;
  }
  return null;
}

function labelText(type: SongSectionType): string {
  return type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}

/** Assigns "Verse 1"/"Verse 2"/"Chorus"/"Chorus 2"… following the same numbering convention already used when adding sections by hand (labelForNewSection in SongDetailPage). */
function numberedLabel(type: SongSectionType, countsSoFar: Map<SongSectionType, number>): string {
  const count = (countsSoFar.get(type) ?? 0) + 1;
  countsSoFar.set(type, count);
  const base = labelText(type);
  return count > 1 ? `${base} ${count}` : base;
}

export function parseLyrics(rawText: string): ParseLyricsResult {
  const allLines = rawText.replace(/\r\n/g, '\n').split('\n');

  let chordLinesStripped = 0;
  const lines = allLines.filter((line) => {
    if (isChordLine(line)) {
      chordLinesStripped += 1;
      return false;
    }
    return true;
  });

  const text = lines.join('\n').trim();
  if (!text) {
    return { sections: [], method: 'empty', chordLinesStripped };
  }

  // --- Pass 1: explicit [Verse]/[Chorus]/etc. labels -----------------------
  const labeledSections: ParsedSection[] = [];
  const counts = new Map<SongSectionType, number>();
  let currentType: SongSectionType | null = null;
  let currentLines: string[] = [];
  let sawAnyLabel = false;

  function flushCurrent() {
    if (currentType === null) return;
    const body = currentLines.join('\n').trim();
    if (body) {
      labeledSections.push({ type: currentType, label: numberedLabel(currentType, counts), text: body });
    }
    currentLines = [];
  }

  for (const line of lines) {
    const label = matchLabel(line);
    if (label) {
      flushCurrent();
      currentType = label;
      sawAnyLabel = true;
    } else if (currentType !== null) {
      currentLines.push(line);
    }
    // Lines before the first recognized label are intentionally dropped in
    // labeled mode — they're virtually always a title/attribution line
    // pasted along with the lyrics, not a section itself.
  }
  flushCurrent();

  if (sawAnyLabel && labeledSections.length > 0) {
    return { sections: labeledSections, method: 'labeled', chordLinesStripped };
  }

  // --- Pass 2: no labels at all — blank-line paragraph blocks, with a
  // repeated-block-is-the-chorus heuristic (the one thing every worship
  // song's structure reliably signals even with zero explicit markup). ----
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return { sections: [], method: 'empty', chordLinesStripped };
  }

  const normalize = (b: string) => b.toLowerCase().replace(/\s+/g, ' ').trim();
  const occurrences = new Map<string, number>();
  for (const block of blocks) {
    const key = normalize(block);
    occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  }

  const heuristicCounts = new Map<SongSectionType, number>();
  const sections: ParsedSection[] = blocks.map((block) => {
    const isRepeated = (occurrences.get(normalize(block)) ?? 0) > 1;
    const type: SongSectionType = isRepeated ? 'chorus' : 'verse';
    return { type, label: numberedLabel(type, heuristicCounts), text: block };
  });

  return { sections, method: 'unlabeled-heuristic', chordLinesStripped };
}
