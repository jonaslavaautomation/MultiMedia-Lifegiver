-- Motion Background Library: per-user favorites.
--
-- The 54 built-in motion presets themselves are static catalog data shipped
-- in the app (src/lib/motionLibrary.ts), not a database table — there is
-- nothing for the church to author or customize about the library itself.
-- The only thing that's actually per-user, persisted state is which preset
-- ids a given user has starred, which is what this table holds.

create table if not exists motion_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  motion_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, motion_id)
);

alter table motion_favorites enable row level security;

-- Every signed-in team member manages only their own favorites — consistent
-- with this app's existing per-user-data trust model (e.g. profiles).
create policy "users_manage_own_motion_favorites"
on motion_favorites
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
