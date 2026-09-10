# LifeGiver Media Studio

A private church presentation and media management web application. Built for church media teams to create worship presentations, manage songs, add Bible verses, upload media, and run live presentations.

> **Current Phase: Phase 1 — Foundation**
>
> This phase includes authentication, dashboard, presentation management, and the application shell. The slide editor, live presentation mode, and content management (songs, Bible, media, templates) will be added in future phases.

## Tech Stack

- **React** 18 + **TypeScript** — UI framework with strict typing
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling with a custom dark studio theme
- **Supabase** — PostgreSQL database, authentication, and storage
- **Lucide React** — Icon library
- **React Router** — Client-side routing

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

1. Create a new project at [supabase.com](https://supabase.com).
2. Copy your project URL and anon key into `.env`.
3. The database migration is applied automatically via the Supabase MCP tools. To apply manually, run the SQL from the migration in the Supabase SQL Editor.
4. In Supabase Auth settings:
   - Enable Email/Password authentication.
   - Disable email confirmation (off by default).
   - There is no public registration — admins create accounts via the Supabase dashboard or API.

### Database Schema

The following tables are created:

| Table | Purpose |
|---|---|
| `profiles` | User profiles with roles (admin, media, pastor). Auto-created on signup. |
| `presentations` | Worship presentation records with title, status, and service date. |
| `slides` | Individual slides within a presentation (Phase 3). |
| `songs` | Worship song library with lyrics and metadata. |
| `bible_verses` | Saved Bible verses for presentations. |
| `media` | Uploaded images, videos, and audio files. |
| `templates` | Reusable slide templates. |

All tables use:
- UUID primary keys
- Timestamps (`created_at`, `updated_at`)
- Foreign keys with proper cascade rules
- JSONB columns for flexible content storage
- Row Level Security with role-based policies

### Creating Your First Admin User

1. Go to Supabase Dashboard → Authentication → Users → Add user.
2. Enter an email and password.
3. The `profiles` table will auto-create a row with role `media`.
4. Update the role to `admin` in the Supabase Table Editor (profiles table).

## Local Development

```bash
npm run dev
```

The dev server starts automatically. Open the URL shown in your terminal.

## Build

```bash
npm run build
```

Type checking:

```bash
npm run typecheck
```

## Vercel Deployment

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Vercel will run `npm run build` automatically.

## Roles & Permissions

| Role | Access |
|---|---|
| **Admin** | Full access including Users and Settings |
| **Media** | Presentations, Songs, Bible, Media, Templates |
| **Pastor** | Presentations, Songs, Bible, Media, Templates |

Admin-only pages:
- `/users` — Manage team members and roles
- `/settings` — Application configuration

## Current Phase 1 Features

- Email/password authentication (no public registration)
- Protected routes — only authenticated users can access the app
- Role-based access control (admin, media, pastor)
- Dashboard with presentation/song/media/template counts
- Recent presentations and upcoming services
- Presentation management: create, list, open, duplicate, delete
- Presentation editor placeholder (ready for Phase 3)
- Responsive sidebar navigation with mobile support
- Clean placeholder pages for Songs, Bible, Media, and Templates
- Users management page (admin only)
- Settings page with app info (admin only)
- Dark professional media-studio aesthetic with maroon/red accents

## Future Phases

### Phase 2 — Content Management
- Song library with lyric editor
- Bible verse search and management
- Media upload and management
- Template builder

### Phase 3 — Slide Editor & Live Presentation
- Full Canva-style slide editor with drag-and-drop
- Live presentation mode with projector/dual-screen support
- Real-time lyrics display during worship
- Slide transitions and animations
- Background media integration

## Project Structure

```
src/
├── components/
│   ├── layout/          # AppLayout, Sidebar, Header, MobileNav
│   ├── ui/              # Button, Card, Badge, Input, Modal, StatCard, EmptyState
│   └── LoadingScreen.tsx
├── context/
│   └── AuthContext.tsx  # Supabase auth provider
├── lib/
│   └── supabase.ts      # Supabase client singleton
├── pages/               # Route pages
├── types/
│   └── index.ts         # TypeScript types for database models
├── App.tsx              # Router setup
├── main.tsx             # Entry point
└── index.css            # Tailwind + global styles
```

## License

Church-owned application. All rights reserved.
