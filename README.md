# SikaTrack

Mobile Money (MoMo) expense tracker for Ghana, built with React + Vite.

## Features

- User authentication:
  - Offline mode: local PIN-based access
  - Cloud mode: Supabase email/password auth
- Add and manage transactions
- Category tracking (Food, Transport, Bills, etc.)
- Monthly summary and insights
- Budgets and savings goals
- PWA-ready for mobile and web install experience

## Tech Stack

- Frontend: React, TypeScript, Vite
- Charts/UI: Recharts, Lucide, Sonner
- Backend/Database (cloud mode): Supabase (PostgreSQL + Auth + RLS)

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Choose your mode

#### Option A: Offline mode (no backend needed)

Run the app without any environment variables. Data is stored on the device via `localStorage`.

#### Option B: Cloud mode (recommended for production)

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/001_sikatrack_schema.sql` in the Supabase SQL Editor.
3. Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

You can copy `.env.example` and rename it to `.env.local`.

### 3) Start development server

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Deployment

- Vercel: `vercel.json` is included for SPA routing fallback.
- Netlify: `public/_redirects` is included for SPA routing fallback.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider environment variables for cloud mode.

## Project Notes

- If Supabase env vars are missing, the app automatically falls back to offline local mode.
- Cloud mode uses Row Level Security policies in Supabase to isolate user data.
- This repo has been cleaned of unused generated UI files for easier maintenance.
