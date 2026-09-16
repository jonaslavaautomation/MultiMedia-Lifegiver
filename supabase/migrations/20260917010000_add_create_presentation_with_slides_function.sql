-- Auto Generate Slides: atomic presentation + slides creation.
--
-- Before this migration, generating slides from a song was two separate
-- REST calls (insert the presentation, then bulk-insert the slides) with a
-- manual "delete the presentation I just made" compensating action if the
-- second call failed — a real gap, not a true transaction: a crash between
-- the two calls (tab closed, network drop) left an orphaned empty
-- presentation with no compensating cleanup able to run.
--
-- This function does both inserts inside one PL/pgSQL function body, which
-- Postgres always runs as a single transaction — if the slides insert
-- raises (a bad row, a constraint violation, anything), the presentation
-- insert is rolled back too. Nothing partial is ever left behind.
--
-- SECURITY INVOKER (the default, stated explicitly as defense in depth,
-- matching this project's existing convention — see brand_settings'
-- migration for the same reasoning) is essential here: it means this
-- function runs with the CALLING USER's own privileges, so the existing
-- RLS policies (presentations_insert_own, slides_insert_own_presentation)
-- are enforced exactly as if the client had run the two INSERTs itself —
-- a SECURITY DEFINER function here would risk letting any authenticated
-- user create rows "as" the function's owner, bypassing those policies
-- entirely.

create or replace function create_presentation_with_slides(
  p_title text,
  p_status text default 'draft',
  p_source_song_id uuid default null,
  -- Array of {"title": text, "content": jsonb, "sort_order": integer} objects —
  -- exactly the shape src/lib/songSlideGeneration.ts already builds client-side.
  p_slides jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_presentation_id uuid;
begin
  insert into presentations (title, status, source_song_id)
  values (p_title, p_status, p_source_song_id)
  returning id into v_presentation_id;

  insert into slides (presentation_id, title, content, sort_order)
  select
    v_presentation_id,
    coalesce(elem->>'title', 'Untitled Slide'),
    coalesce(elem->'content', '{}'::jsonb),
    coalesce((elem->>'sort_order')::integer, 0)
  from jsonb_array_elements(p_slides) as elem;

  return v_presentation_id;
end;
$$;

grant execute on function create_presentation_with_slides(text, text, uuid, jsonb) to authenticated;
