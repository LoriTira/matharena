# MathArena

A competitive mental math platform with a chess.com-style Elo ranking system. Challenge other players in real-time arithmetic duels, practice solo, and climb the leaderboard.

**Live:** [matharena-ecru.vercel.app](https://matharena-ecru.vercel.app)

## Features

- **Ranked Matches** — Compete head-to-head in addition, subtraction, multiplication, and division. Win or lose Elo rating points based on your performance.
- **Practice Mode** — Train solo with adjustable difficulty. No rating impact.
- **Lessons** — Learn mental math tricks and techniques (multiply by 11, squaring numbers ending in 5, complement subtraction, and more).
- **Leaderboard** — Public rankings with filtering by school/company affiliation.
- **Player Profiles** — Track your stats, rating history, win rate, country, and affiliation (school or company).

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth + Realtime)
- **Deployment:** Vercel

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

3. Run the migrations in `supabase/migrations/` against your Supabase project (via the SQL Editor in the dashboard).

4. Start the dev server:
   ```bash
   npm run dev
   ```
