# MathArena

A competitive mental math platform with a chess.com-style Elo ranking system. Challenge other players in real-time arithmetic duels, practice solo, and climb the leaderboard.

**Live:** [mathsarena.com](https://mathsarena.com)

## Features

- **Ranked Matches** — Compete head-to-head in addition, subtraction, multiplication, and division. First to 5 correct answers wins. Elo rating updates based on opponent strength. Includes 3-2-1 countdown, match point drama, streak indicator, and ScoreDots visualization.
- **Daily Puzzle** — 5 deterministic problems each day (seeded from the UTC date). Race the clock, compete on the daily leaderboard, and build a streak. A shared countdown timer shows time until the next puzzle on both the daily page and the dashboard card.
- **Challenge a Friend** — Generate a shareable invite link. Both players enter a lobby page, and the match starts simultaneously once both are confirmed online (heartbeat-based presence detection). Rematch detection ensures both players join the same lobby instead of creating duplicate challenges.
- **Google OAuth** — Sign in with Google in addition to email/password. Powered by Supabase Auth. Google users are auto-marked as email-verified.
- **Achievement System** — 12 achievements across milestone, performance, streak, and social categories. Automatically checked on match completion. Trophy case on profile page.
- **Practice Mode** — Train solo with adjustable difficulty, operation selection, and duration (60s/120s/300s). Includes a 120s Sprint card on the dashboard for quick access. Personal bests tracked per duration.
- **Lessons** — Learn mental math tricks and techniques (multiply by 11, squaring numbers ending in 5, complement subtraction, and more).
- **Leaderboard** — Public Elo rankings with filtering by school/company affiliation. Shows 120s sprint personal bests alongside Elo.
- **Player Profiles** — Track your stats, rating history, win rate, country, affiliation, and earned achievements.
- **Theme System** — Light, dark, and system modes with four accent color options (violet, blue, teal, gold). Persisted in localStorage. Gear icon in the navbar.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Framer Motion 12
- **Backend:** Next.js API routes, Zod validation
- **Database & Auth:** Supabase (PostgreSQL + Auth + Realtime + RLS + Google OAuth)
- **Deployment:** Vercel (auto-deploy on push to `main`)

## Project Structure

```
app/
  (app)/              # Authenticated pages (dashboard, play, daily, challenge lobby, profile, etc.)
  (auth)/             # Login and signup pages
  api/                # API routes
    auth/             #   Signup (admin-created), email verification, resend verification
    challenge/        #   Create, accept, list, start challenges
    daily/            #   Daily puzzle: puzzle, submit, leaderboard, streak
    match/            #   Find, submit, abandon matches
    practice/         #   Generate practice problems
    profile/          #   Update profile
  challenge/[code]/   # Public challenge accept page
components/
  auth/               # GoogleOAuthButton
  daily/              # NextPuzzleCountdown (shared countdown component)
  layout/             # Navbar (dropdown nav + mobile hamburger), ThemeSettings, MathTexture
  match/              # MatchBoard, MatchResult (with rematch detection), ProblemDisplay, AnswerInput, ScoreDots, etc.
  challenge/          # ChallengeModal
  ui/                 # Reusable primitives: Card, Skeleton, Toast, Dropdown, Sparkline, RankBadge, AchievementBadge
  ThemeProvider.tsx    # Theme context (light/dark/system + accent color) with FOUC prevention
hooks/                # useAuth, useMatch, useToast, useDailyPuzzle, etc.
lib/
  supabase/           # Supabase client (browser), server client, admin client, middleware session handler
  auth/               # Email verification token creation/validation (HMAC-signed, 7-day expiry)
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

2. Create a `.env.local` file with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PERF_SECRET=any_random_string
   RESEND_API_KEY=your_resend_api_key          # optional — email verification won't send without it
   EMAIL_FROM=MathArena <noreply@yourdomain.com> # optional — defaults to noreply@mathsarena.com
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
   | 9 | `009_lesson_progress.sql` | Tracks lesson completion per user |
   | 10 | `010_practice_sessions.sql` | Practice session history and personal bests |
   | 11 | `011_onboarding.sql` | Onboarding flow flag on profiles |
   | 12 | `012_email_verified.sql` | App-level email verification flag on profiles |

4. (Optional) Enable Google OAuth in the Supabase dashboard under **Auth > Providers > Google**. Add your Google Client ID and Client Secret from the [Google Cloud Console](https://console.cloud.google.com).

5. Start the dev server:
   ```bash
   npm run dev
   ```

## Deployment

Pushing to `main` auto-deploys to Vercel. Set the following environment variables in the Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — required for server-side user creation and email verification
- `PERF_SECRET` — used for HMAC-signed email verification tokens
- `RESEND_API_KEY` — optional, enables verification email sending
- `EMAIL_FROM` — optional, sender address for transactional emails

Database migrations must be applied manually via the Supabase SQL Editor.

## Architecture Notes

### Design System

- **Theme modes:** Light, dark, and system (class-based toggling with FOUC prevention via inline script)
- **Default accent:** Violet `#7C3AED` (light) / `#A78BFA` (dark)
- **Accent options:** Violet, blue, teal, gold — selectable from the navbar gear icon, persisted in localStorage
- **Background:** `#050505` (dark), `#FAFAF9` (light)
- **Fonts:** Playfair Display (serif headings), Inter (body), JetBrains Mono (numbers/stats)
- **Component variants:** Cards have `default`, `interactive`, and `highlight` variants
- **Animations:** Framer Motion for transitions and overlays; CSS keyframes in `globals.css` for shimmer, shake, gold-pulse, countdown-pulse, score-bounce

### Key Patterns

- **Supabase client in client components:** Use `useMemo(() => createClient(), [])` to stabilize the reference and prevent infinite re-render loops in `useEffect` dependencies.
- **Toast system:** `ToastProvider` must wrap the entire `(app)` layout (including `Navbar`), since `ChallengeModal` inside `Navbar` uses `useToast()`. Placing it only around `{children}` will cause a crash.
- **Middleware route protection:** New authenticated routes must be added to `protectedPaths` in `lib/supabase/middleware.ts`. Missing routes will render without auth and likely crash during SSR.
- **Daily puzzle determinism:** `lib/problems/daily.ts` uses a mulberry32 PRNG seeded from the date string. Same UTC date always produces the same 5 problems. Answers are verified server-side by regenerating from the seed.
- **Achievement checking:** Runs in a try/catch inside `app/api/match/submit/route.ts` after Elo calculation. Failures don't block the match result response.
- **Rematch detection:** When a player clicks REMATCH, the opponent's result screen polls for the incoming challenge and shows a "JOIN REMATCH" button. The create API also deduplicates — if the opponent already created a rematch, it returns the existing challenge instead of creating a new one.
- **Theme persistence:** `ThemeProvider` reads `ma-theme` and `ma-accent` from localStorage and applies `class` + `data-accent` attributes to `<html>`. An inline script in `layout.tsx` applies the theme before React hydrates to prevent FOUC.
- **React 19 context:** Uses `<ToastContext value={...}>` (not `<ToastContext.Provider value={...}>`).
- **Signup flow:** Email signup uses a server-side API route (`/api/auth/signup`) that creates users via the Supabase admin client with `email_confirm: true`, bypassing Supabase's email confirmation gate. The client then immediately calls `signInWithPassword` for auto-login. App-level email verification is tracked separately in `profiles.email_verified` and shown as a non-blocking dashboard banner.
- **OAuth redirect preservation:** Supabase OAuth multi-hop (app -> Supabase -> Google -> app) can strip query params. A `ma-oauth-redirect` cookie is set before the OAuth redirect as a fallback, read in the callback route, then cleared.
- **Admin client typing:** The Supabase admin client (`lib/supabase/admin.ts`) is untyped (no DB generics). Use `(admin as any).from('table')` for operations on columns not in the generated types (e.g., `email_verified`).

### Elo Tiers

| Tier | Elo Range |
|------|-----------|
| Bronze | 100–799 |
| Silver | 800–1199 |
| Gold | 1200–1599 |
| Platinum | 1600–1999 |
| Diamond | 2000–2399 |
| Grandmaster | 2400+ |

Each tier has 3 divisions (I, II, III). `lib/ranks.ts` provides `getRank(elo)` returning tier info, progress, and accent-colored badges.

### Troubleshooting

- **Build fails but dev server works (or vice versa):** Run `rm -rf .next node_modules && npm install && npm run build`. Stale `node_modules` can cause Turbopack to produce an incomplete build output (missing `.next/server/` directory).
- **`useToast must be used within a ToastProvider`:** A component using `useToast()` is rendering outside `ToastProvider`. Check that the provider wraps the full `(app)` layout, not just `{children}`.
- **New route returns 500 for unauthenticated users:** Add the route to `protectedPaths` in `lib/supabase/middleware.ts`.
- **Infinite re-renders on dashboard or navbar:** Likely a `createClient()` call outside `useMemo` being used as a `useEffect` dependency. Wrap in `useMemo`.
- **Theme flash on load:** Ensure the inline script in `app/layout.tsx` runs before React hydration. It reads localStorage and sets `class`/`data-accent` on `<html>` synchronously.
