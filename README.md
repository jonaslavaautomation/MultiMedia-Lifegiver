# LifeGiver Media Studio

A private church presentation and media management web application for LifeGiver Davao's media team — build worship presentations, manage a song library with smart lyrics import, browse Bible verses, manage media, and run live services with a full broadcast-style operator console, projector output, stage/confidence-monitor display, phone remote control, and an OBS/vMix transparent overlay.

## Tech Stack

- **React** 18 + **TypeScript** (strict) — UI framework
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling (light theme, lime/vanilla accent palette)
- **Supabase** — PostgreSQL database, authentication, storage, and Realtime
- **Fabric.js** — the slide editor's canvas engine
- **Framer Motion** — UI transitions (asset drawer, overlay animations)
- **Lucide React** — icon library
- **React Router** — client-side routing

## Feature Overview

- **Authentication** — email/password only, no public registration; roles are `admin` / `media` / `pastor`.
- **Dashboard** — at-a-glance counts and recent activity.
- **Presentations** — create, list, duplicate, delete; a Canva-style slide editor (nav rail, asset drawers, floating contextual toolbar, dotted-grid canvas) built on Fabric.js.
- **Slide backgrounds** — solid color, an uploaded image/video from the Media library, a pasted direct video URL, or a built-in **Motion Background Library** (54 original animated presets across Worship/Prayer/Bible/Sermon/Countdown/Announcement collections, with search, category filters, and per-user favorites).
- **Songs** — a song library with a manual lyrics/section editor, plus **Smart Import**: paste lyrics text and it auto-detects Verse/Pre-Chorus/Chorus/Refrain/Bridge/Intro/Outro/Tag structure, strips chord charts, lets you pick a slide theme and an optional motion background, and generates a presentation marked `ready` — immediately usable for Go Live. In-progress imports autosave locally and can be restored.
- **Bible** — browse by book/chapter/verse or jump straight to a reference (e.g. "John 3:16"); add verses to a presentation.
- **Media** — upload and manage images, videos, and audio (with a live waveform preview).
- **Templates** — reusable slide template records.
- **Live Presentation Mode** — an operator console (current/next preview, blackout, a stopwatch/countdown timer, MIDI controller + keyboard hotkey bindings) that drives, over `BroadcastChannel` (same computer) and Supabase Realtime (a remote device), a full-bleed **Projector** output, a **Stage Display** / confidence monitor, a phone-friendly **Remote Control** page, and a chroma-key-ready **Overlay** for OBS/vMix.
- **Command Palette** (⌘K) for fast navigation and search.
- **Users & Settings** — admin-only team and app configuration pages.

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |

> **Do NOT use the service role key in frontend code.** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used in the client.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com) and copy its URL/anon key into `.env`.
2. Apply every file in `supabase/migrations/` **in filename (chronological) order** via the Supabase SQL Editor — there is no automatic migration runner in this environment, so a new migration added to the repo needs to be run manually before the feature it supports will work against your database.
3. In Supabase Auth settings: enable Email/Password auth, disable email confirmation, and leave public sign-up off — admins create accounts via the Supabase dashboard.
4. First admin user: Authentication → Users → Add user, then flip that user's `role` to `admin` in the `profiles` table (Table Editor).

### Database Schema (high level)

| Table | Purpose |
|---|---|
| `profiles` | User profiles with roles (admin, media, pastor). Auto-created on signup. |
| `presentations` | Presentation records — title, status, service date, and `source_song_id` linking back to a song it was generated from. |
| `slides` | Individual slides within a presentation (Fabric.js canvas JSON + background metadata). |
| `songs` | Worship song library — lyrics stored as structured sections (type/label/text/order). |
| `bible_verses` | Saved Bible verses for presentations. |
| `media` | Uploaded images, videos, and audio files. |
| `templates` | Reusable slide template records. |
| `motion_favorites` | Per-user favorited Motion Background Library preset ids. |

All tables use UUID primary keys, `created_at`/`updated_at` timestamps, foreign keys with appropriate cascade rules, JSONB columns for flexible content, and Row Level Security with role-based policies. The Motion Background Library's 54 presets themselves are **not** a database table — they're static catalog data shipped with the app (`src/lib/motionLibrary.ts`).

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

This repo includes a `vercel.json` SPA rewrite. Import the repository at [vercel.com](https://vercel.com), add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as project environment variables, and deploy — Vercel runs `npm run build` automatically. Once the GitHub repo is connected, a push to `main` triggers a new deployment.

## Roles & Permissions

| Role | Access |
|---|---|
| **Admin** | Everything, including Users and Settings |
| **Media** | Presentations, Songs, Bible, Media, Templates, Live Presentation |
| **Pastor** | Presentations, Songs, Bible, Media, Templates, Live Presentation |

Admin-only pages: `/users` (team & roles) and `/settings` (app configuration).

## Project Structure

```
src/
├── components/
│   ├── editor/          # Slide editor: canvas stage, nav rail, asset drawers, panels
│   ├── motion/           # Motion Background Library player, card, and browser panel
│   ├── live/             # Live-mode shared renderer, timer, telemetry bar, hotkeys modal
│   ├── songs/            # Song section editor, Smart Import modal
│   ├── bible/, media/, command/, layout/, ui/
│   └── LoadingScreen.tsx
├── context/
│   └── AuthContext.tsx   # Supabase auth provider
├── hooks/                # useFabricCanvas, useLiveChannel, useMidiController, …
├── lib/                  # supabase client, slide/lyrics/motion logic, pure helpers
├── pages/                # Route pages
├── types/                # TypeScript types for database models and editor state
├── App.tsx               # Router setup
├── main.tsx               # Entry point
└── index.css              # Tailwind + global styles

supabase/migrations/       # Apply in filename order — see Supabase Setup above
```

## License

Church-owned application. All rights reserved.
