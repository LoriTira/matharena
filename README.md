# MathArena

A competitive mental math platform with a chess.com-style Elo ranking system. Challenge other players in real-time arithmetic duels, practice solo, and climb the leaderboard.

**Live:** [matharena-ecru.vercel.app](https://matharena-ecru.vercel.app)

## Features

- **Ranked Matches** — Compete head-to-head in addition, subtraction, multiplication, and division. First to 5 correct answers wins. Elo rating updates based on opponent strength. Includes 3-2-1 countdown, match point drama, streak indicator, and ScoreDots visualization.
- **Daily Puzzle** — 5 deterministic problems each day (seeded from the date). Race the clock, compete on the daily leaderboard, and build a streak.
- **Challenge a Friend** — Generate a shareable invite link. Both players enter a lobby page, and the match starts simultaneously once both are confirmed online (heartbeat-based presence detection).
- **Achievement System** — 12 achievements across milestone, performance, streak, and social categories. Automatically checked on match completion. Trophy case on profile page.
- **Practice Mode** — Train solo with adjustable difficulty and operation selection. No rating impact.
- **Lessons** — Learn mental math tricks and techniques (multiply by 11, squaring numbers ending in 5, complement subtraction, and more).
- **Leaderboard** — Public Elo rankings with filtering by school/company affiliation.
- **Player Profiles** — Track your stats, rating history, win rate, country, affiliation, and earned achievements.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Framer Motion 12
- **Backend:** Next.js API routes, Zod validation
- **Database & Auth:** Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Deployment:** Vercel (auto-deploy on push to `main`)

## Project Structure

```
app/
  (app)/              # Authenticated pages (dashboard, play, daily, challenge lobby, profile, etc.)
  (auth)/             # Login and signup pages
  api/                # API routes
    challenge/        #   Create, accept, list, start challenges
    daily/            #   Daily puzzle: puzzle, submit, leaderboard, streak
    match/            #   Find, submit, abandon matches
    practice/         #   Generate practice problems
    profile/          #   Update profile
  challenge/[code]/   # Public challenge accept page
components/
  layout/             # Navbar (dropdown nav + mobile hamburger), MathTexture
  match/              # MatchBoard, MatchResult, ProblemDisplay, AnswerInput, ScoreDots, etc.
  challenge/          # ChallengeModal
  ui/                 # Reusable primitives: Card, Skeleton, Toast, Dropdown, Sparkline, RankBadge, AchievementBadge
hooks/                # useAuth, useMatch, useToast, useDailyPuzzle, etc.
lib/
  supabase/           # Supabase client (browser), server client, middleware session handler
  achievements/       # Achievement checker (evaluates conditions on match completion)
  match/              # Elo calculation
  problems/           # Problem generator, daily puzzle generator (deterministic PRNG), date utils
  ranks.ts            # Elo tier system (Bronze through Grandmaster) with progress calculation
  constants.ts        # Operation definitions and difficulty ranges
types/                # TypeScript interfaces (Profile, Match, AchievementDef, etc.)
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
   | 7 | `007_daily_puzzle.sql` | Daily puzzle results table with unique constraint per user/day |
   | 8 | `008_achievements.sql` | User achievements table for the achievement system |

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Deployment

Pushing to `main` auto-deploys to Vercel. Set the following environment variables in the Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Database migrations must be applied manually via the Supabase SQL Editor.

## Architecture Notes

### Design System

- **Dark theme:** `#050505` background, white text at various opacities (`/90`, `/50`, `/25`, `/15`)
- **Accent color:** Amber `#F59E0B` for CTAs and highlights
- **Fonts:** Playfair Display (serif headings), Inter (body), JetBrains Mono (numbers/stats)
- **Component variants:** Cards have `default`, `interactive`, and `highlight` variants
- **Animations:** Framer Motion for transitions and overlays; CSS keyframes in `globals.css` for shimmer, shake, gold-pulse, countdown-pulse, score-bounce

### Key Patterns

- **Supabase client in client components:** Use `useMemo(() => createClient(), [])` to stabilize the reference and prevent infinite re-render loops in `useEffect` dependencies.
- **Toast system:** `ToastProvider` must wrap the entire `(app)` layout (including `Navbar`), since `ChallengeModal` inside `Navbar` uses `useToast()`. Placing it only around `{children}` will cause a crash.
- **Middleware route protection:** New authenticated routes must be added to `protectedPaths` in `lib/supabase/middleware.ts`. Missing routes will render without auth and likely crash during SSR.
- **Daily puzzle determinism:** `lib/problems/daily.ts` uses a mulberry32 PRNG seeded from the date string. Same date always produces the same 5 problems. Answers are verified server-side by regenerating from the seed.
- **Achievement checking:** Runs in a try/catch inside `app/api/match/submit/route.ts` after Elo calculation. Failures don't block the match result response.
- **React 19 context:** Uses `<ToastContext value={...}>` (not `<ToastContext.Provider value={...}>`).

### Elo Tiers

| Tier | Elo Range | Color |
|------|-----------|-------|
| Bronze | 100–799 | `#CD7F32` |
| Silver | 800–1199 | `#C0C0C0` |
| Gold | 1200–1599 | `#F59E0B` |
| Platinum | 1600–1999 | `#06B6D4` |
| Diamond | 2000–2399 | `#8B5CF6` |
| Grandmaster | 2400+ | `#EF4444` |

Each tier has 3 divisions (I, II, III). `lib/ranks.ts` provides `getRank(elo)` returning tier info, progress, and colors.

### Troubleshooting

- **Build fails but dev server works (or vice versa):** Run `rm -rf .next node_modules && npm install && npm run build`. Stale `node_modules` can cause Turbopack to produce an incomplete build output (missing `.next/server/` directory).
- **`useToast must be used within a ToastProvider`:** A component using `useToast()` is rendering outside `ToastProvider`. Check that the provider wraps the full `(app)` layout, not just `{children}`.
- **New route returns 500 for unauthenticated users:** Add the route to `protectedPaths` in `lib/supabase/middleware.ts`.
- **Infinite re-renders on dashboard or navbar:** Likely a `createClient()` call outside `useMemo` being used as a `useEffect` dependency. Wrap in `useMemo`.
