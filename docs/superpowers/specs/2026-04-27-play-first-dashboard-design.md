# Play-first dashboard redesign

**Date**: 2026-04-27
**Status**: Approved (pending final review)

## Goal

Make mathsarena.com a play-first product. The home page IS the dashboard. A logged-out visitor can play a singleplayer game in two clicks, and the conversion CTA appears at exactly the right moment — not before. Visual language: clarity, dopamine, addictiveness.

## What changes at a glance

1. **Logged-in dashboard** ([app/(app)/dashboard/page.tsx](app/(app)/dashboard/page.tsx)): the play hub gets a much bolder treatment — two hero panels (Single Player vs Multiplayer) instead of subtle column headers. Below the hub: Active Challenges (hidden when empty), then Recent Matches. Rating card and the Daily Results block are removed from the dashboard (still accessible via `/profile` and `/daily`).
2. **Root URL** ([app/page.tsx](app/page.tsx)): the marketing page is replaced by a logged-out variant of the same play hub. Single Player tiles are immediately playable as guest. Multiplayer tiles are visibly locked, with "SIGN IN TO PLAY" as the section CTA.
3. **Practice page** ([app/(app)/practice/page.tsx](app/(app)/practice/page.tsx)) is moved out of `(app)` and into a public route so guests can play. Stats from guest sessions are NOT written to `practice_sessions` (no leaderboard impact).
4. **Post-game results** for guests: a single hero "save your score" CTA card replaces the standard results panel; a soft "play again as guest" link sits beneath. Logged-in users see the existing results panel unchanged.
5. **Auth nav**: when logged out, the navbar shows a "SIGN IN" pill (filled brand-accent) on the right.

## Visual direction

### Two-panel play hub (Direction A, with refinements)

Replaces the current `PlayHub` two-sub-grid layout. Single hero band:

- **Left panel — Single Player.** Slightly wider (`flex: 3` vs `flex: 2`). White-ish border (`border-edge-strong` at 2px, becomes white in dark mode). Calm. Contains two tiles: 120s Sprint, Daily Puzzle.
- **Right panel — Multiplayer.** Narrower. Brand-accent border (`border-accent` at 2px) with a soft `accent-glow` shadow. Electric. Contains two tiles: Find a Player, Challenge a friend.
- Each panel has an eyebrow label (`SOLO` / `RANKED`), a serif title (`Single Player` / `Multiplayer`), then two tiles in a row.
- Each tile is full-height; the CTA pill is anchored to the bottom of the tile via flex (no wandering buttons depending on stat content length).

### Section stat strips

Section-level stats stay (per the previous request):
- Single Player panel header: `SPRINT PB 47 · DAILY BEST #1 · 11.0s` on the right.
- Multiplayer panel header: `ELO 1075` on the right.

### Tile copy (locked)

| Tile | Title | Blurb | Stat | Logged-in CTA | Logged-out CTA |
|---|---|---|---|---|---|
| Sprint | 120s Sprint | Beat your best in 2 minutes | `BEST 47` / "Set your first record" | START SPRINT | ▶ PLAY FREE |
| Daily | Daily Puzzle | 5 problems, fastest time today | `🔥 7-day streak` / "Start your streak" | SOLVE TODAY'S PUZZLE | ▶ PLAY FREE |
| Find a Player | Find a Player | Ranked match, first to 5 | `● 8 online` | PLAY NOW | 🔒 (panel CTA) |
| Challenge a friend | Challenge a friend | Send a private match link | `2 invites waiting` / "Generate a private link" | CREATE CHALLENGE | 🔒 (panel CTA) |

### Logged-out specifics

- Tiles in the Multiplayer panel are dimmed (`opacity-50`) and have a small lock glyph next to the title. Clicking either tile opens the auth modal/route.
- A soft gradient overlay covers the bottom of the Multiplayer panel with a single CTA card: small eyebrow "REAL OPPONENTS · REAL RATING", line "Free account, 30 seconds.", filled button "SIGN IN TO PLAY".
- Top nav (`Navbar.tsx`) hides PLAY/LEARN/RANKINGS dropdowns and the user menu when no session. Shows logo on the left and a single brand-accent "SIGN IN" pill on the right. The "CHALLENGE" button is also hidden.

### Post-game guest results

After a guest finishes a Sprint:

- Final score in giant serif (`font-serif text-6xl`) with eyebrow "FINAL SCORE".
- Stat strip: correct, wrong, accuracy.
- Hero card below (max-w 460px, centered): brand-accent border + soft glow, eyebrow "YOUR SCORE IS UNSAVED", serif h2 "Sign in to keep {score}.", body "Track your PB, climb the global leaderboard, and unlock ranked duels — all free.", filled white-on-black "SIGN IN TO PLAY" button, plus a tiny "or play again as guest →" link beneath.

Logged-in users see the existing post-game results UI unchanged.

## Architecture

### Route changes

| Route | Before | After |
|---|---|---|
| `/` | Marketing homepage (`app/page.tsx`) | Renders the play hub. SSR-detects auth and branches to logged-in or logged-out layout in the same component. |
| `/practice` | Auth-gated, lives under `(app)/` | Moved to `app/practice/page.tsx` (public). Still uses `useAuth` internally to decide whether to persist the session. |
| `/dashboard` | Distinct page, redundant with new `/` | Becomes a redirect to `/`. |
| `/daily`, `/play`, `/challenge/*` | Auth-gated | Unchanged. Clicking from logged-out routes them through `/login?redirect=...`. |

### Middleware

- Remove `/practice` from auth-gated routes in [middleware.ts](middleware.ts).
- Keep `/dashboard` redirect in middleware (302 to `/`).

### Component changes

| Component | Change |
|---|---|
| `components/dashboard/PlayHub.tsx` | Replaced. New two-panel structure with `<PlayPanel>` sub-component. Accepts `mode: 'guest' \| 'authed'` prop that switches CTAs, lock states, and overlay. |
| `components/dashboard/PlayTile.tsx` | Kept; gets a `locked?: boolean` prop and `ctaLabel` becomes optional (when locked, the panel CTA replaces it). |
| `components/dashboard/PlayPanel.tsx` | New. Wraps the eyebrow + title + stats + 2 tiles + optional locked-overlay CTA. Two variants: `variant: 'sp' \| 'mp'` toggling the border treatment (white vs accent). |
| `components/practice/SprintResults.tsx` (or wherever sprint results render) | Add a `guestMode` branch that renders the new hero "Sign in to keep {score}" card instead of the default save UI. |
| `app/page.tsx` | Replaced. SSR reads the Supabase session; renders the same `PlayHub` with `mode="guest"` or `mode="authed"`. Greeting only shown when authed. |
| `app/(app)/dashboard/page.tsx` | Strips Rating and Daily-completed blocks. Renders `<PlayHub mode="authed" />` + `<ActiveChallengesCard />` (only when there are challenges) + `<RecentMatchesCard />` (always, with empty state). |
| `app/practice/page.tsx` (relocated) | Branches on auth: persists `practice_sessions` for authed users only. Renders `SprintResults` with `guestMode={!user}` for guests. |

### Data flow

`PlayHub` now needs a `mode` prop. In `mode="guest"`:
- All tile stats become null/empty.
- Sprint tile shows "▶ PLAY FREE" CTA → navigates to `/practice?sprint=120`.
- Daily, Find a Player, and Challenge tiles render in their `locked` state. Daily is locked because the once-per-day server constraint can't be cleanly modeled for anonymous users in v1. The panel-level CTA card on the MP panel says "SIGN IN TO PLAY" → routes to `/login`. Clicking a locked tile also routes to `/login?redirect=<original-path>`.

In `mode="authed"`: identical to current behavior plus the new bolder visual.

**Note on guest daily**: the spec scopes guest play to **Sprint only** for v1. Daily Puzzle's once-per-day server logic + leaderboard makes guest semantics murky. Daily tile in guest mode renders with a "🔒" lock glyph and the panel CTA's "SIGN IN TO PLAY" applies. We can revisit this once Sprint guest flow ships.

### Below the play hub (in order)

1. **Active Challenges** — extract existing inline JSX from `app/(app)/dashboard/page.tsx` into `components/dashboard/ActiveChallengesCard.tsx`. Same visual, rendered only when `activeChallenges.length > 0`.
2. **Recent Matches** — extract existing inline JSX into `components/dashboard/RecentMatchesCard.tsx`. Always rendered. Same visual (W/L badge, opponent, score, ELO delta, link to analysis). Empty state stays the same: "No matches played yet. Start a ranked match!"

## Out of scope (deferred, not removed)

- **Rating card and Daily Results panels**: these still exist as components and continue to render on `/profile` and `/daily`. They're no longer on the dashboard. If users complain about not seeing their ELO at-a-glance, we add a compact "ELO 1075 · Silver I" pill into the Multiplayer panel's stat strip in a follow-up.
- **Guest daily puzzle**: not in v1.
- **Achievements / streaks section**: not in v1.
- **Anonymous session persistence (localStorage PB for guests)**: not in v1. Guest scores are ephemeral.

## Verification

End-to-end, in order:

1. **Logged-in /:** loads dashboard. Two-panel hub renders, SP wider with white border, MP narrower with accent glow. Section stats correct. Tiles navigate or open modal.
2. **Logged-out /:** loads guest hub. SP tiles show PLAY FREE. MP tiles dimmed with lock. Panel CTA card visible. Top nav shows SIGN IN pill.
3. **Guest Sprint:** click PLAY FREE on Sprint tile → `/practice?sprint=120` → countdown → game → results. Results show hero "save your score" CTA. Score is NOT in the database.
4. **Authed Sprint:** existing flow, results unchanged, score persisted.
5. **Active Challenges:** when `activeChallenges.length === 0`, no card rendered. When > 0, card appears below hub.
6. **Mobile (375px)**: SP panel stacks above MP panel; tiles stack inside each panel. Lock overlay still readable.
7. **Tablet (768px)**: both panels visible side-by-side or stacked depending on density; CTAs reachable.
8. **Desktop (1440px)**: two panels side-by-side, SP wider.
9. **Theme accents**: cycle violet/teal/gold/blue. MP border + glow follow accent. SP border stays neutral.
10. **/dashboard** redirects to `/` when authed.

## Open question / follow-up

- **Resolved during brainstorm**: copy is "SIGN IN TO PLAY" everywhere (not "Sign up").
- **Pending**: do we want the existing `<NextPuzzleCountdown />` to surface on the dashboard for completed-today daily users? Currently the spec drops it. If users complain we add a slim "✓ Daily done · next in 4h 12m" strip to the Single Player panel header. Acceptable to defer.
