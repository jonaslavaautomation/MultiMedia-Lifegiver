/*
# Bible Verses Cache — Unique Constraint

1. Changes
- Adds a unique index on `bible_verses (book, chapter, verse_start, translation)`.

## Why
`bible_verses` acts as a cache: the app fetches chapters from a public
Bible API on first lookup and writes them here so future lookups are
instant and don't depend on the external API. Without a uniqueness
constraint, two users looking up the same uncached chapter at the same
time could both insert the same verses, duplicating rows. This index lets
the cache-write use `upsert(..., { onConflict: '...', ignoreDuplicates: true })`
to close that race safely.
*/

CREATE UNIQUE INDEX IF NOT EXISTS uq_bible_verses_ref
  ON bible_verses (book, chapter, verse_start, translation);
