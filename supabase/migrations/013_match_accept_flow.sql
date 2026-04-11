-- Flow Sprint — match accept flow
-- Adds a chess.com-style "tap to accept" step between pairing and match start.
-- When two players are paired by /api/match/find, the match is created with
-- status='pending_accept' instead of 'active'. Both clients see a MatchFoundModal
-- and must call /api/match/accept within MATCH_ACCEPT_TIMEOUT_MS (10s) or the
-- match is abandoned and the declining/timing-out player gets a 30s search cooldown.

-- ─── 1. Add 'pending_accept' to the match_status enum ───
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in some
-- Postgres versions. Supabase migrations run in transactions, so we use a
-- DO block to handle the "already exists" case gracefully.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'match_status'::regtype
      AND enumlabel = 'pending_accept'
  ) THEN
    ALTER TYPE match_status ADD VALUE 'pending_accept';
  END IF;
END $$;

-- ─── 2. Add accepted-at columns to matches ───
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS player1_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS player2_accepted_at TIMESTAMPTZ;

-- ─── 3. Cooldown table for decliners / timeouts ───
CREATE TABLE IF NOT EXISTS search_cooldowns (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_cooldowns_expires
  ON search_cooldowns(expires_at);

-- ─── 4. RLS — users can read their own cooldown row ───
-- Writes happen server-side via the admin/service-role client.
ALTER TABLE search_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own cooldown" ON search_cooldowns;
CREATE POLICY "users see own cooldown"
  ON search_cooldowns FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 5. Extend matches UPDATE policy to cover pending_accept transitions ───
-- Migration 004 already allows participants to UPDATE their matches. That policy
-- is sufficient for accept/decline — the participant is already player1 or
-- player2 by the time the status is pending_accept. No new policy needed.
--
-- However we want to make sure the existing policy's WITH CHECK still lets a
-- participant update to status='active' or 'abandoned' (both allowed under
-- "player1_id = auth.uid() OR player2_id = auth.uid()"). Verified: yes.

-- ─── 6. Add index for stale pending_accept sweep ───
-- The extended stale sweep in /api/match/find will query pending_accept matches
-- older than 30s. Piggyback on the existing idx_matches_status partial index by
-- extending it to include pending_accept.
DROP INDEX IF EXISTS idx_matches_status;
CREATE INDEX idx_matches_status
  ON matches (status)
  WHERE status IN ('waiting', 'active', 'pending_accept');
