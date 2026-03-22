# MathArena

A competitive mental math platform with a chess.com-style Elo ranking system. Challenge other players in real-time arithmetic duels, practice solo, and climb the leaderboard.

**Live:** [matharena-ecru.vercel.app](https://matharena-ecru.vercel.app)

## Features

- **Ranked Matches** — Compete head-to-head in addition, subtraction, multiplication, and division. First to 5 correct answers wins. Elo rating updates based on opponent strength.
- **Challenge a Friend** — Generate a shareable invite link. Both players enter a lobby page, and the match starts simultaneously once both are confirmed online (heartbeat-based presence detection).
- **Practice Mode** — Train solo with adjustable difficulty and operation selection. No rating impact.
- **Lessons** — Learn mental math tricks and techniques (multiply by 11, squaring numbers ending in 5, complement subtraction, and more).
- **Leaderboard** — Public Elo rankings with filtering by school/company affiliation.
- **Player Profiles** — Track your stats, rating history, win rate, country, and affiliation (school or company).

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js API routes, Zod validation
- **Database & Auth:** Supabase (PostgreSQL + Auth + Realtime)
- **Deployment:** Vercel (auto-deploy on push to `main`)

## Project Structure

```
app/
  (app)/              # Authenticated pages (dashboard, play, challenge lobby, profile, etc.)
  (auth)/             # Login and signup pages
  api/                # API routes
    challenge/        #   Create, accept, list, start challenges
    match/            #   Find, submit, abandon matches
    practice/         #   Generate practice problems
    profile/          #   Update profile
  challenge/[code]/   # Public challenge accept page
components/           # Shared UI components (Navbar, MatchBoard, etc.)
hooks/                # React hooks (useAuth, useMatch)
lib/                  # Utilities (Supabase clients, Elo calculation, problem generation)
supabase/migrations/  # Database migration files (run in order)
```

## Getting Started

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/LoriTira/matharena.git
   cd matharena
   npm install
   ```

2. Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. Run the database migrations in order against your Supabase project (via the SQL Editor in the dashboard):

   | # | File | Description |
   |---|------|-------------|
   | 1 | `001_initial_schema.sql` | Core schema: profiles, matches, match events, lessons, RLS policies |
   | 2 | `002_add_country.sql` | Adds country field to profiles |
   | 3 | `003_challenges.sql` | Challenge system: challenges table, invite codes, RLS policies |
   | 4 | `004_fix_matchmaking_rls.sql` | Fixes RLS to allow matchmaking (seeing/joining waiting matches) |
   | 5 | `005_enable_realtime.sql` | Enables Supabase Realtime for matches and challenges tables |
   | 6 | `006_challenge_readiness.sql` | Adds heartbeat columns for lobby presence detection |

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Deployment

Pushing to `main` auto-deploys to Vercel. Set the following environment variables in the Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Database migrations must be applied manually via the Supabase SQL Editor.
