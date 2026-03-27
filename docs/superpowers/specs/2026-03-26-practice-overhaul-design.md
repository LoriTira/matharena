# Practice Section Overhaul — Design Spec

## Context

The current practice section (`app/(app)/practice/page.tsx`) is a placeholder with minimal functionality: single-operation selection, a 1-5 difficulty slider, no timer, no session model, no persistence, and no gamification. It fetches problems one-at-a-time from the server with noticeable latency.

The goal is to overhaul practice into a Zetamac-style timed speed drill with configurable operations and ranges, a polished UI with dopamine-inducing feedback loops, and persistent session tracking for improvement over time. This is personal training only — no ELO impact, no leaderboard (a competitive 120s sprint mode is planned separately in the future).

---

## Architecture

### Client-Side Problem Generation

Problems are generated entirely in the browser. The existing `generateProblem()` in `lib/problems/generator.ts` is pure TypeScript with no server dependencies. This eliminates per-problem API latency (50-200ms) which is critical for a speed drill.

Server interactions are limited to:
- **On mount:** `GET /api/practice/session` — load session history for sparkline + personal bests
- **On session end:** `POST /api/practice/session` — persist results

### State Machine

A single `usePracticeSession` hook manages the full lifecycle:

```
idle (setup screen) → playing (timer running) → finished (results) → idle
```

The hook tracks: config, timer, current problem, stats (correct/wrong/streak/bestStreak), per-operation breakdown, session history from DB, and personal bests.

Timer uses `Date.now()` delta (not raw `setInterval`) to avoid JS timer drift, ticking every 100ms for smooth progress bar animation.

---

## Three Screens

### 1. Setup Screen (`components/practice/PracticeSetup.tsx`)

Compact card layout, centered, max-w-lg:

- **Operation toggle pills** — Multi-select buttons for +, −, ×, ÷. At least one required. Uses existing button styling pattern.
- **Duration pills** — Single-select: 60s, 120s, 300s.
- **Difficulty presets** — Beginner, Standard, Hard, Expert. Selecting a preset populates range values.
- **"Customize ranges" disclosure** — Collapsible section. When expanded, shows per-enabled-operation range inputs: operand1 min/max + operand2 min/max.
  - Subtraction ranges derived from addition (reversed). Division derived from multiplication (reversed). Both still editable.
  - Compact layout: subtraction grouped under addition, division under multiplication.
- **START button** — Calls `session.startSession(config)`.

### 2. Gameplay Screen (`components/practice/PracticeGame.tsx`)

Focused minimal layout:

- **Timer progress bar** — Horizontal bar at top using `motion.div` with width animated from 100% to 0%. Time remaining text overlay. Accent color, transitions to red in last 10s. At ≤3s, timer text pulses with `animate-score-bounce`.
- **Streak counter** — Top-right, escalating visual effects:
  - 1-4: flame emoji + number, neutral color
  - 5-9: accent color, glow (`shadow-[0_0_8px]`), bounce on increment
  - 10-14: double flame, larger text, stronger glow
  - 15+: triple flame, full pulsing `animate-gold-pulse`, shimmer overlay
- **Stats row** — Three compact stat boxes: CORRECT (green), WRONG (red), ACCURACY% (accent). Pattern from `MatchResult.tsx` stats grid.
- **Problem display** — Reuses existing `ProblemDisplay` component. Wrapped in `AnimatePresence` for slide transitions (exit left at x:-300, enter right from x:300). Keyed by problem counter.
- **Answer input** — Reuses existing `AnswerInput` component. Green flash on correct, red flash + 3s lockout on wrong (already implemented). Add `animate-shake` on the problem wrapper on wrong answer.
- **End trigger** — When timer hits 0: brief white overlay flash (300ms), input disabled, 500ms pause, transition to results.

### 3. Results Screen (`components/practice/PracticeResults.tsx`)

All elements use cascading staggered `motion.div` animations (0.2s, 0.4s, 0.6s delays):

- **Animated score counter** — Counts up from 0 to final score. Reuse `AnimatedNumber` pattern from `MatchResult.tsx` (extract to `components/ui/AnimatedNumber.tsx`).
- **Personal best badge** — If score exceeds previous PB for this config: golden gradient badge with `animate-gold-pulse`. Shows "PREVIOUS BEST: 38 → NEW: 45 (+7)".
- **Sparkline bar chart** — Last 10 sessions' scores. Reuse existing `Sparkline` component from `components/ui/Sparkline.tsx`. Current session highlighted in accent color.
- **Compact stats row** — correct, wrong, accuracy%, best streak.
- **Per-operation breakdown** — List showing each operation's accuracy: "+ Addition: 15/18 (83%)". Color-coded: green ≥80%, amber 60-79%, red <60%.
- **Action buttons** — "PLAY AGAIN" (replays same config) + "SETTINGS" (returns to setup).

---

## Database

### New Table: `practice_sessions`

Migration: `supabase/migrations/010_practice_sessions.sql`

```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL,
  operations TEXT[] NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  operation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_practice_sessions_user ON practice_sessions (user_id, created_at DESC);
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own practice sessions"
  ON practice_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON practice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Follows the `lesson_progress` migration pattern exactly.

---

## API Endpoints

### `GET /api/practice/session`

Query params: `limit` (default 10), optional `duration`, `operations` filters.

Returns: `{ sessions: PracticeSessionRecord[], personalBest: number | null }`

Personal best = highest `score` for sessions matching same duration + operations combo.

### `POST /api/practice/session`

Body: `{ duration, operations, config, score, correctCount, wrongCount, bestStreak, operationBreakdown }`

Validates with Zod. Inserts into `practice_sessions`. Returns inserted record + updated personal best.

---

## New Types (`types/index.ts`)

```typescript
export type PracticeDifficulty = 'beginner' | 'standard' | 'hard' | 'expert';

export interface OperationRange {
  min1: number; max1: number; min2: number; max2: number;
}

export interface PracticeConfig {
  operations: Operation[];
  duration: 60 | 120 | 300;
  difficulty: PracticeDifficulty;
  customRanges?: Partial<Record<Operation, OperationRange>>;
}

export interface PracticeSessionResult {
  config: PracticeConfig;
  score: number;
  correctCount: number;
  wrongCount: number;
  bestStreak: number;
  operationBreakdown: Record<Operation, { correct: number; wrong: number }>;
}

export interface PracticeSessionRecord {
  id: string;
  user_id: string;
  duration: number;
  operations: Operation[];
  config: PracticeConfig;
  score: number;
  correct_count: number;
  wrong_count: number;
  best_streak: number;
  operation_breakdown: Record<string, { correct: number; wrong: number }>;
  created_at: string;
}
```

## New Constants (`lib/constants.ts`)

```typescript
export const PRACTICE_DURATIONS = [60, 120, 300] as const;

export const PRACTICE_DIFFICULTY_RANGES: Record<PracticeDifficulty, Record<Operation, OperationRange>> = {
  beginner: { '+': { min1:2, max1:50, ... }, ... },
  standard: { '+': { min1:2, max1:500, ... }, ... },
  hard: { '+': { min1:100, max1:999, ... }, ... },
  expert: { '+': { min1:100, max1:9999, ... }, ... },
};
```

---

## Problem Generator Extension (`lib/problems/generator.ts`)

Two new functions (existing functions untouched):

- `generateProblemFromRanges(operation, range)` — Like `generateProblem` but accepts explicit `{min1, max1, min2, max2}` instead of a tier.
- `generateMixedPracticeProblem(operations, ranges)` — Picks a random operation from the enabled set, looks up its range, calls `generateProblemFromRanges`.

---

## AnswerInput Refactor (`components/match/AnswerInput.tsx`)

Add optional `feedbackRef` prop as alternative to the window global pattern:

```typescript
feedbackRef?: React.MutableRefObject<((correct: boolean) => void) | null>;
```

The window global continues to work as fallback for the match system.

---

## Component & File Summary

| Type | File | Action |
|------|------|--------|
| Page | `app/(app)/practice/page.tsx` | Rewrite as thin orchestrator |
| Component | `components/practice/PracticeSetup.tsx` | New |
| Component | `components/practice/PracticeGame.tsx` | New |
| Component | `components/practice/PracticeResults.tsx` | New |
| Component | `components/practice/StreakCounter.tsx` | New |
| Component | `components/practice/TimerBar.tsx` | New |
| Component | `components/ui/AnimatedNumber.tsx` | New (extract from MatchResult) |
| Hook | `hooks/usePracticeSession.ts` | New |
| API | `app/api/practice/session/route.ts` | New |
| Migration | `supabase/migrations/010_practice_sessions.sql` | New |
| Types | `types/index.ts` | Modify (add practice types) |
| Constants | `lib/constants.ts` | Modify (add practice presets) |
| Generator | `lib/problems/generator.ts` | Modify (add range-based generation) |
| AnswerInput | `components/match/AnswerInput.tsx` | Modify (add feedbackRef prop) |
| Reuse as-is | `components/match/ProblemDisplay.tsx` | — |
| Reuse as-is | `components/ui/Sparkline.tsx` | — |
