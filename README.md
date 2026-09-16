# LifeGiver Media Studio

A private church presentation and media management web application for LifeGiver Davao's media team — build worship presentations, manage a song library with smart lyrics import, browse Bible verses in KJV/NLT/NIV, manage media, and run live services with a full broadcast-style operator console, projector output, stage/confidence-monitor display, phone remote control, and an OBS/vMix transparent overlay — resilient to a dropped internet connection mid-service.

## Tech Stack

- **React** 18 + **TypeScript** (strict) — UI framework
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling (light theme, lime/vanilla accent palette)
- **Supabase** — PostgreSQL database, authentication, storage, and Realtime
- **Fabric.js** — the slide editor's canvas engine
- **idb** (IndexedDB) — offline persistence: cached presentations, crash-safe slide drafts, and the downloadable Service Pack
- **Framer Motion** — UI transitions (asset drawer, overlay animations)
- **qrcode.react** — the Remote Control page's pairing QR code
- **Lucide React** — icon library
- **React Router** — client-side routing

## Feature Overview

- **Authentication** — email/password only, no public registration; roles are `admin` / `media` / `pastor`; login returns you to the page you were headed to, not always the Dashboard.
- **Dashboard** — at-a-glance counts and recent activity.
- **Presentations** — create, list, duplicate, delete; a Canva-style slide editor (nav rail, asset drawers, floating contextual toolbar, dotted-grid canvas) built on Fabric.js, with Undo/Redo, smart alignment (Canva/Figma-style) guides, multi-select align/distribute/group/lock, arrow-key nudge, more shapes (triangle/star/arrow), and text line-height/letter-spacing controls.
- **Slide backgrounds** — solid color, an uploaded image/video from the Media library, a pasted direct video URL, or a built-in **Motion Background Library** (54 original animated presets across Worship/Prayer/Bible/Sermon/Countdown/Announcement collections, with search, category filters, and per-user favorites).
- **Templates** — 10 real starter templates plus "Save Current Slide as Template" from inside the editor; applying one replaces the current slide's design (Undo still works right after).
- **Brand Kit** (Settings, admin) — a church-wide color palette, primary font, and logo, available from the editor's Brand panel.
- **Songs** — a song library with a manual lyrics/section editor, plus:
  - **Smart Import**: paste lyrics text and it auto-detects Verse/Pre-Chorus/Chorus/Refrain/Bridge/Intro/Outro/Tag structure (falling back to even-sized chunks for unlabeled text), strips chord charts, lets you pick a slide theme and an optional motion background, and generates a presentation marked `ready` — immediately usable for Go Live. In-progress imports autosave locally and can be restored. Section review supports Add/Duplicate/Delete/reorder, and saving checks for a likely-duplicate existing song first (Open Existing / Create Anyway / Cancel — never a silent overwrite).
  - **Auto Generate Slides** (also on the song's own page): pick which lyric sections to include, a lines-per-slide limit (long sections auto-split across multiple slides, in order, none dropped or duplicated), a theme, and an optional motion background — the presentation and every one of its slides are created together in a single atomic database transaction (see `create_presentation_with_slides` in Supabase Setup below), so a dropped connection mid-generation can never leave a half-created presentation behind. Generating again for a song that already has linked presentations asks for confirmation first. In the editor, slides can be reordered by dragging their filmstrip thumbnails.
  - **Search Online**: finds a song by title/artist (via the free, keyless iTunes Search API — title/artist/album/artwork/a short preview/a link to the source) and feeds the result straight into Smart Import, prefilled. This **never** fetches or auto-populates lyrics text — no free/legal source of full copyrighted lyrics exists — you still paste in lyrics you're authorized to use.
  - **Write with AI**: generates completely original lyrics from a topic/style/mood/structure (via the `generate-song-lyrics` Supabase Edge Function — see Environment Variables / Supabase Setup) and feeds the draft into the same Smart Import review flow for editing before saving. Never reproduces an existing song.
- **Bible** — browse by book/chapter/verse or jump straight to a reference (e.g. "John 3:16"); KJV (public domain), NLT (Tyndale, free key), and NIV (Biblica, via api.bible — requires its own API key, see Environment Variables); add verses to a presentation.
- **Media** — upload and manage images, videos, and audio (with a live waveform preview).
- **Live Presentation Mode** — an operator console (current/next preview, Blackout, Freeze, Safe Slide, a stopwatch/countdown timer, MIDI controller + keyboard hotkey bindings, a live connection-status badge) that drives, over `BroadcastChannel` (same computer) and Supabase Realtime (a remote device, with auto-reconnect), a full-bleed **Projector** output, a **Stage Display** / confidence monitor, a phone-friendly **Remote Control** page (QR-code pairing), and a chroma-key-ready **Overlay** for OBS/vMix.
- **Offline resilience** — presentations and their slides are mirrored locally (IndexedDB) the moment they load, so a dropped connection mid-service falls back to the last-known copy instead of a blank screen; in-progress editor edits are saved locally the instant they happen, ahead of the debounced cloud autosave, so a crash/reload never loses more than a moment's work; a **Service Pack** lets an operator pre-download every media background a presentation references so its playback needs no connection at all once downloaded; a **System Health** panel (Settings, admin) reports all of this plainly — what's actually cached, what's downloaded, and the live connection state — never a claim taken on faith. Every top-level route is wrapped in its own error boundary, so a crash in one screen can't take down another.
- **Command Palette** (⌘K) for fast navigation and search.
- **Users & Settings** — admin-only team, Brand Kit, and System Health pages.

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Required? | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anon public key |
| `VITE_NLT_API_KEY` | No | Free key from [api.nlt.to](https://api.nlt.to/Account/Register) (non-commercial use only). Omit it and NLT still works, just against Tyndale's more tightly rate-limited anonymous access. |
| `VITE_API_BIBLE_KEY` | Only if you want NIV | An [api.bible](https://api.bible) API key, from an account/plan with NIV specifically approved. **Without this, selecting NIV shows a clear "needs an API key" message rather than failing silently or crashing** — KJV and NLT are unaffected. |

> **Do NOT use the service role key in frontend code.** Only the variables above are used in the client.

**"Write with AI" needs one more thing, set differently** — a free [Groq](https://console.groq.com/keys) API key is a real secret, so it is never a `VITE_*` variable (those ship in the client bundle). Instead it's a **Supabase Edge Function secret**:

```bash
npx supabase functions deploy generate-song-lyrics --project-ref <your-project-ref>
npx supabase secrets set GROQ_API_KEY=gsk_... --project-ref <your-project-ref>
```

Until this is deployed, the "Write with AI" button shows a clear "not configured yet" message instead of failing mysteriously — every other feature (Search Online, Smart Import, everything else) is completely unaffected either way. Note: this key is unrelated to the iTunes Search integration (which needs no key/account at all) and to the Apple Developer Program (which doesn't provide lyrics either, at any tier).

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com) and copy its URL/anon key into `.env`.
2. Apply every file in `supabase/migrations/` **in filename (chronological) order** via the Supabase SQL Editor — there is no automatic migration runner in this environment, so a new migration added to the repo needs to be run manually before the feature it supports will work against your database.
3. In Supabase Auth settings: enable Email/Password auth, disable email confirmation, and leave public sign-up off — admins create accounts via the Supabase dashboard.
4. First admin user: Authentication → Users → Add user, then flip that user's `role` to `admin` in the `profiles` table (Table Editor).
5. Deploy the Edge Function only if you want "Write with AI" (Songs) — see the "Write with AI" note above for the exact commands. Everything else in this app works without it.

### Database Schema (high level)

| Table | Purpose |
|---|---|
| `profiles` | User profiles with roles (admin, media, pastor). Auto-created on signup. |
| `presentations` | Presentation records — title, status, service date, and `source_song_id` linking back to a song it was generated from. |
| `slides` | Individual slides within a presentation (Fabric.js canvas JSON + background metadata). |
| `songs` | Worship song library — lyrics stored as structured sections (type/label/text/order). |
| `bible_verses` | Saved Bible verses for presentations. |
| `media` | Uploaded images, videos, and audio files. |
| `templates` | Reusable slide template records (10 real starters seeded by migration). |
| `motion_favorites` | Per-user favorited Motion Background Library preset ids. |
| `brand_settings` | The one shared brand-kit row (colors, font, logo). |

The `create_presentation_with_slides(p_title, p_status, p_source_song_id, p_slides)` Postgres function (added by the `20260917010000` migration) creates a presentation and its slides together in one transaction — used by both "Generate Slides" entry points (the song page and Smart Import) instead of two separate inserts, so a failure partway through can't leave an orphaned empty presentation.

All tables use UUID primary keys, `created_at`/`updated_at` timestamps, foreign keys with appropriate cascade rules, JSONB columns for flexible content, and Row Level Security with role-based policies. The Motion Background Library's 54 presets are **not** a database table — they're static catalog data shipped with the app (`src/lib/motionLibrary.ts`). Offline caching (IndexedDB) and the downloadable Service Pack are entirely client-side/browser storage — also not database tables.

## Local Development

```bash
npm run dev
```

## Build & Checks

```bash
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

## Vercel Deployment

This repo includes a `vercel.json` SPA rewrite. Import the repository at [vercel.com](https://vercel.com), add the environment variables above as project settings, and deploy — Vercel runs `npm run build` automatically. Once the GitHub repo is connected, a push to `main` triggers a new deployment.

## Roles & Permissions

| Role | Access |
|---|---|
| **Admin** | Everything, including Users, Settings (Brand Kit + System Health) |
| **Media** | Presentations, Songs, Bible, Media, Templates, Live Presentation |
| **Pastor** | Presentations, Songs, Bible, Media, Templates, Live Presentation |

Admin-only pages: `/users` (team & roles) and `/settings` (Brand Kit, System Health).

## Project Structure

```
src/
├── components/
│   ├── editor/          # Slide editor: canvas stage, nav rail, asset drawers, panels
│   ├── motion/           # Motion Background Library player, card, and browser panel
│   ├── live/             # Live-mode shared renderer, timer, telemetry bar, hotkeys/service-pack modals
│   ├── songs/            # Song section editor, Smart Import modal
│   ├── settings/         # System Health card
│   ├── bible/, media/, command/, layout/, ui/
│   └── ErrorBoundary.tsx, LoadingScreen.tsx
├── context/
│   └── AuthContext.tsx   # Supabase auth provider
├── hooks/                # useFabricCanvas, useLiveChannel, useMidiController, useConnectionStatus, useEditorHistory, …
├── lib/                  # supabase client, slide/lyrics/motion logic, offlineStore, servicePack, pure helpers
├── pages/                # Route pages
├── types/                # TypeScript types for database models and editor state
├── App.tsx               # Router setup (every route wrapped in an ErrorBoundary)
├── main.tsx               # Entry point
└── index.css              # Tailwind + global styles

supabase/
├── migrations/            # Apply in filename order — see Supabase Setup above
└── functions/
    └── generate-song-lyrics/  # "Write with AI" — the only thing needing a real secret; see Environment Variables
```

## License

Church-owned application. All rights reserved.
