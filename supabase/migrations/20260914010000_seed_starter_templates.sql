/*
# Seed starter templates

1. Changes
- Inserts 10 real, ready-to-use starter templates into `templates`
  (Welcome, Sermon Title, Scripture Quote, Song Title, Announcement,
  Offering, Christmas, Easter, Prayer, Thank You/Closing) — one covering
  most of TEMPLATE_CATEGORIES (src/lib/editorConstants.ts).
- Each template's `config` is a real SlideCanvasData design (Textbox/Rect
  objects, brand colors, positions on the 1920x1080 slide) — the same
  shape `slides.content` and Save-as-Template already produce — not the
  empty placeholder templates previously held. Generated and verified by
  actually loading each one through Fabric.js's own loadFromJSON before
  writing this migration (round-tripped correctly, right object counts
  and types), not hand-guessed.

## Why
Before this, applying a template did nothing (no template actually held
a usable design) and the Templates page/panel had nothing real to offer
new users. This gives every project a working starter set out of the box.

## created_by handling
`templates.created_by` is NOT NULL, defaulting to auth.uid() — but a
migration runs with no authenticated session, so that default can't
apply here. This attributes the seeded rows to an existing admin profile
(or the earliest profile if there's no admin yet), and skips seeding
entirely if there are no profiles at all yet (a brand new project with
no signed-up users) rather than failing the migration.

Each insert is guarded by `WHERE NOT EXISTS (... WHERE name = ...)` so
this migration is safe to have applied more than once.
*/

DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  -- Prefer an admin profile; fall back to the earliest-created profile if
  -- there's no admin yet. If there are no profiles at all (a brand new
  -- project with no signed-up users), skip seeding entirely rather than
  -- fail — created_by is NOT NULL with no auth.uid() to fall back on
  -- inside a migration (there's no authenticated session running it).
  SELECT id INTO seed_user_id FROM profiles ORDER BY (role = 'admin') DESC, created_at ASC LIMIT 1;

  IF seed_user_id IS NOT NULL THEN
    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Welcome', 'Welcome', 'A simple, warm welcome title for the start of a service.', '{"version":"6.9.1","objects":[{"type":"Rect","id":"67470f62-e051-47a2-a1c8-e78bc43761ec","left":900,"top":360,"width":120,"height":8,"fill":"#6b9e3f","rx":4,"ry":4},{"type":"Textbox","id":"b3a20355-07ab-4fcf-b3e5-9eeff7784922","text":"WELCOME","left":160,"top":420,"width":1600,"fontFamily":"Poppins","fontSize":140,"fill":"#ffffff","textAlign":"center","fontWeight":"bold"},{"type":"Textbox","id":"03dabd00-6544-4543-a9aa-c7478a697bbd","text":"We''re glad you''re here","left":160,"top":600,"width":1600,"fontFamily":"Poppins","fontSize":56,"fill":"#d4d4d8","textAlign":"center"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Welcome');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Sermon Title', 'Sermon', 'Title + speaker/series subtitle, with an accent underline.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"0f023027-28dd-4c37-9913-af337eaac5f1","text":"Sermon Title","left":160,"top":420,"width":1600,"fontFamily":"Poppins","fontSize":120,"fill":"#ffffff","textAlign":"center","fontWeight":"bold"},{"type":"Rect","id":"de10e7e7-d0a2-4560-be41-8afdf9ba04e7","left":870,"top":570,"width":180,"height":6,"fill":"#2f8271","rx":3,"ry":3},{"type":"Textbox","id":"bd186aef-0f24-4bfd-92f7-f6c57a3376dc","text":"Speaker Name  •  Series Name","left":160,"top":620,"width":1600,"fontFamily":"Poppins","fontSize":48,"fill":"#a1a1aa","textAlign":"center"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Sermon Title');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Scripture Quote', 'Bible', 'A large verse quote with a reference caption underneath — same layout the Bible page generates.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"dff26646-5d3b-4964-bc13-d826f82ba653","text":"Enter your verse text here.","left":160,"top":360,"width":1600,"fontFamily":"Poppins","fontSize":72,"fill":"#ffffff","textAlign":"center"},{"type":"Textbox","id":"91d4337e-c3cf-4e61-b88b-2733563adc40","text":"Book Chapter:Verse","left":160,"top":910,"width":1600,"fontFamily":"Poppins","fontSize":29,"fill":"#a1a1aa","textAlign":"center","fontStyle":"italic"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Scripture Quote');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Song Title', 'Worship', 'A large centered line, ready for a lyric or song title.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"3203e756-ba86-40c6-a24a-64f6d24c8a92","text":"Song Title","left":160,"top":480,"width":1600,"fontFamily":"Poppins","fontSize":96,"fill":"#ffffff","textAlign":"center"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Song Title');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Announcement', 'Announcement', 'Left-aligned heading and body text with a colored accent bar.', '{"version":"6.9.1","objects":[{"type":"Rect","id":"0809e107-8c4d-4f59-99d3-96156922705b","left":160,"top":300,"width":12,"height":300,"fill":"#f59e0b","rx":6,"ry":6},{"type":"Textbox","id":"5487e27a-5b5a-4fa7-89b3-c6a68353e2ec","text":"Announcement Title","left":220,"top":320,"width":1540,"fontFamily":"Poppins","fontSize":92,"fill":"#ffffff","textAlign":"left","fontWeight":"bold"},{"type":"Textbox","id":"3e267c57-54ec-4369-b0b8-fff14758c5b9","text":"Add the announcement details here — dates, times, and where to find out more.","left":220,"top":460,"width":1540,"fontFamily":"Poppins","fontSize":44,"fill":"#d4d4d8","textAlign":"left"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Announcement');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Offering', 'Offering', 'Giving-focused title and supporting line.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"4618eeb0-de0c-4094-b8a6-e9fc1fab3009","text":"Give Generously","left":160,"top":420,"width":1600,"fontFamily":"Poppins","fontSize":110,"fill":"#ffffff","textAlign":"center","fontWeight":"bold"},{"type":"Textbox","id":"ce77b9e5-3d38-44ea-962b-29ac938fb94a","text":"\"Each of you should give what you have decided in your heart to give.\"","left":160,"top":580,"width":1600,"fontFamily":"Poppins","fontSize":44,"fill":"#d4d4d8","textAlign":"center","fontStyle":"italic"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Offering');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Christmas', 'Christmas', 'A festive Christmas title slide.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"fff8c1ce-2c9e-4325-9eff-93b9643dd247","text":"Merry Christmas","left":160,"top":420,"width":1600,"fontFamily":"Poppins","fontSize":120,"fill":"#ef4444","textAlign":"center","fontWeight":"bold"},{"type":"Textbox","id":"79a4dfb0-6dfc-4fbd-83a1-48b1ef3db249","text":"Celebrating the birth of our Savior","left":160,"top":590,"width":1600,"fontFamily":"Poppins","fontSize":48,"fill":"#d4d4d8","textAlign":"center"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Christmas');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Easter', 'Easter', 'An Easter Sunday title slide.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"38ab399a-5845-4c80-8a30-7344630d3ee7","text":"He Is Risen","left":160,"top":420,"width":1600,"fontFamily":"Poppins","fontSize":130,"fill":"#ffffff","textAlign":"center","fontWeight":"bold"},{"type":"Textbox","id":"25f614f4-c7cb-4204-91a4-922040844309","text":"Death could not hold Him","left":160,"top":600,"width":1600,"fontFamily":"Poppins","fontSize":48,"fill":"#d4d4d8","textAlign":"center"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Easter');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Prayer', 'Prayer', 'A quiet, simple prayer-time title.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"bbbb61fd-29c2-4e9a-a23b-2bf4166b3fb3","text":"Let Us Pray","left":160,"top":480,"width":1600,"fontFamily":"Poppins","fontSize":100,"fill":"#ffffff","textAlign":"center"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Prayer');

    INSERT INTO templates (name, category, description, config, thumbnail_url, created_by)
    SELECT 'Thank You / Closing', 'General', 'A closing thank-you slide for the end of a service.', '{"version":"6.9.1","objects":[{"type":"Textbox","id":"6ca36050-aaaf-4707-af63-c74d9b8714cb","text":"Thank You","left":160,"top":420,"width":1600,"fontFamily":"Poppins","fontSize":120,"fill":"#ffffff","textAlign":"center","fontWeight":"bold"},{"type":"Textbox","id":"7a13434a-8e42-45c2-bc45-e1aa93df10c4","text":"See you next Sunday","left":160,"top":590,"width":1600,"fontFamily":"Poppins","fontSize":48,"fill":"#d4d4d8","textAlign":"center"}],"background":"#09090b","meta":{"schemaVersion":1,"backgroundMediaId":null}}'::jsonb, NULL, seed_user_id
    WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Thank You / Closing');

  END IF;
END $$;

