# SikaTrack

Mobile Money (MoMo) expense tracker for Ghana, built with React + Vite.

## Features

- Local PIN-based access — data stays on your device
- Add and manage transactions
- Category tracking (Food, Transport, Bills, etc.)
- Monthly summary and insights
- Budgets and savings goals
- Backup & restore via JSON export
- PWA-ready for mobile and web install experience
- Ask Sika AI assistant (optional, via Gemini)

## Tech Stack

- Frontend: React, TypeScript, Vite
- Charts/UI: Recharts, Lucide, Sonner
- Storage: `localStorage` on the device
- AI assistant: Google Gemini API (serverless on Vercel)

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Enable Ask Sika AI (optional)

Set your Gemini API key as a server environment variable:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Create a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
For Vercel, add `GEMINI_API_KEY` in Project Settings → Environment Variables.

Copy `.env.example` to `.env.local` for local API testing.

### 3) Start development server

```bash
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

#### Ask Sika AI in local dev

`/api/ask` is a Vercel serverless function. To test Ask Sika locally, run **two terminals** from the `SikaTrack` folder:

```bash
# Terminal 1 — API on port 3000
npm run dev:vercel

# Terminal 2 — Vite proxies /api to port 3000
npm run dev
```

Set `GEMINI_API_KEY` in `.env.local` (or export it) before running `dev:vercel`.

## Production Build

```bash
npm run build
npm run preview
```

## Deployment (Vercel)

This app lives in a monorepo. In Vercel, set **Root Directory** to `SikaTrack`.

| Variable | When | Purpose |
|----------|------|---------|
| `GEMINI_API_KEY` | Runtime | Ask Sika AI (optional) |

`vercel.json` includes SPA routing, build settings, and security headers. Netlify: use `public/_redirects` for SPA fallback.

Optional: `ALLOWED_ORIGINS` (comma-separated) for extra CORS origins on `/api/ask` when using a custom domain.

## Project Notes

- All financial data is stored in the browser on the device. Use **Profile → Backup** before switching devices or clearing browser data.
- Ask Sika works without `GEMINI_API_KEY` but will return a friendly “not configured” message.
