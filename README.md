# BurgerNom

Your personal Marin burger quest. A mobile-first companion app for working through the
[Marin Burger Club](https://mbccom.weebly.com/rankings.html) rankings: track what you've
tried, rate burgers yourself, and get a personalized recommendation for what to try next.

## Stack

- Next.js 16 (App Router, TypeScript, Server Actions)
- Tailwind CSS v4
- Supabase (Postgres, Auth with Google OAuth, Row Level Security)
- Vercel Cron for daily MBC data sync
- Vitest for tests

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations in `supabase/migrations/` **in order**
   (`0001_init.sql`, then `0002_views.sql`). These create every table, RLS policy, and
   trigger the app needs. (If you have the Supabase CLI linked to the project, you can
   instead run `supabase db push`.)
3. In **Authentication → Providers**, enable **Google** and supply a Google OAuth Client
   ID/Secret (create one in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   — Web application type, authorized redirect URI
   `https://<your-project-ref>.supabase.co/auth/v1/callback`).
4. In **Authentication → URL Configuration**, add your app's URL (e.g.
   `http://localhost:3000` for local dev, plus your production URL) to the redirect
   allow list.
5. Grab your Project URL, anon key, and service-role key from **Project Settings → API**.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in every value:

```bash
cp .env.example .env.local
```

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: MBC importer, sync routes. Never exposed to the client. |
| `MBC_CSV_URL` | The published Google Sheets CSV export that is the source of truth for rankings |
| `CRON_SECRET` | Shared secret required to trigger a sync (`Authorization: Bearer $CRON_SECRET`) |
| `NEXT_PUBLIC_SITE_URL` | Used for building the OAuth callback URL |

## 3. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll land on the marketing page; sign in with Google to
reach the app.

## 4. Import the Marin Burger Club rankings

The app has no data until you run a sync at least once:

```bash
curl -X POST http://localhost:3000/api/admin/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

This fetches `MBC_CSV_URL`, parses it defensively (deriving the current PBASO-style
score categories straight from the header row), and upserts restaurants/rankings/scores
without ever touching user data. Every run — success or failure — is logged to the
`sync_runs` table.

In production, `vercel.json` schedules this automatically once a day via Vercel Cron
against `/api/cron/sync`. Set `CRON_SECRET` as a Vercel project environment variable and
Vercel will automatically send the matching `Authorization` header — no extra
configuration needed there.

## 5. Tests, lint, build

```bash
npm run test    # vitest — CSV parsing, importer logic, recommendation engine, taste
                 # profile, stats, filtering (uses a saved fixture, no network needed)
npm run lint
npm run build
```

## How it works

- **Official vs. personal data**: `restaurants`, `mbc_rankings`, and
  `mbc_category_scores` hold only official MBC data and are re-imported daily.
  `user_restaurant_entries` and `user_restaurant_category_scores` hold each user's
  status/ratings/comments and are never touched by the importer. Row Level Security
  scopes all personal tables to `auth.uid()`.
- **Dynamic rating categories**: the importer derives score categories (Patty, Bun,
  Accoutrements, Starch, Overall, at time of writing) directly from whatever columns sit
  between the "Avg. Rating" and "# of Ratings" columns in the source CSV, so the app
  adapts automatically if MBC adds, removes, or renames a category.
- **Recommendation engine** (`src/lib/recommendation`): blends the official MBC ranking
  with a personal-preference score learned from the covariance between the user's
  per-category ratings and their overall ratings. The more a user has rated, the more
  personal taste is weighted relative to raw MBC rank. Every recommendation includes a
  plain-English, hedged explanation. Four modes: "what should I try next," "best
  untried," "surprise me" (randomized among strong candidates), and "like my favorites"
  (cosine similarity of category-score profiles).
- **Taste profile** (`src/lib/tasteProfile`): generated entirely from the numbers and
  comments already in the database — no paid LLM/AI API required or depended on. Simple
  word-frequency analysis surfaces recurring comment themes as a free, good-enough
  substitute for sentiment analysis.

## What you need to provide

- A Supabase project (free tier is fine) with the migrations applied.
- A Google OAuth Client ID/Secret, added to Supabase's Google auth provider.
- The environment variables above, set locally (`.env.local`) and in your Vercel project.
- One manual or cron-triggered sync to populate the rankings before the app is useful.
