-- Smart Song Search & Import: links a generated presentation back to the
-- song it was generated from, so the Song Detail page can list and jump
-- straight to the presentations it produced ("song management").
--
-- Nullable and ON DELETE SET NULL: a presentation is never invalidated by
-- its source song being renamed or deleted later — it just becomes a
-- presentation with no known origin, same as any manually-built one.

alter table presentations
  add column if not exists source_song_id uuid references songs(id) on delete set null;

create index if not exists idx_presentations_source_song_id on presentations(source_song_id);
