-- Song Search + Lyric Import: source attribution.
--
-- When a song is created from an online search result (see
-- src/lib/songSearch/), we preserve where it came from — never the lyrics
-- themselves (no licensed source provides those to this app; see
-- src/lib/songSearch/itunesProvider.ts's header), just a link back to the
-- source and which provider it was found through. Both nullable: a song
-- created by hand or via the existing paste-only Smart Import has neither.

alter table songs
  add column if not exists source_url text,
  add column if not exists source_provider text;
