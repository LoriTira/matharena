-- Social layer — persistent friendships, rate limits, and historical opponent seed.
--
-- Previously "friends" were derived from past completed matches on the fly
-- (app/api/friends/route.ts). This migration introduces a real friendships
-- table with a proper request/accept flow, and seeds accepted rows for every
-- pair that has already played a completed match so nobody loses their
-- existing "friends" list after the cutover.

-- ─── 1. Enum + friendships table ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friendship_status') THEN
    CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS friendships (
  user_a        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        friendship_status NOT NULL DEFAULT 'pending',
  requested_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at   TIMESTAMPTZ,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b),
  CHECK (requested_by = user_a OR requested_by = user_b),
  CHECK (
    (status = 'pending'  AND accepted_at IS NULL) OR
    (status = 'accepted' AND accepted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a, status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b, status);
CREATE INDEX IF NOT EXISTS idx_friendships_pending
  ON friendships(user_a, user_b) WHERE status = 'pending';

-- ─── 2. Rate limit table for friend requests ───
-- One row per user; rolling 1-hour window enforced in the API handler.
CREATE TABLE IF NOT EXISTS friend_request_rate_limits (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INTEGER NOT NULL DEFAULT 0
);

-- ─── 3. RLS ───
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Friendships visible to participants" ON friendships;
CREATE POLICY "Friendships visible to participants"
  ON friendships FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Users can request friendships" ON friendships;
CREATE POLICY "Users can request friendships"
  ON friendships FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND (auth.uid() = user_a OR auth.uid() = user_b)
    AND status = 'pending'
    AND accepted_at IS NULL
    AND user_a < user_b
  );

DROP POLICY IF EXISTS "Recipient can accept" ON friendships;
CREATE POLICY "Recipient can accept"
  ON friendships FOR UPDATE
  USING (
    status = 'pending'
    AND auth.uid() <> requested_by
    AND (auth.uid() = user_a OR auth.uid() = user_b)
  )
  WITH CHECK (
    status = 'accepted'
    AND accepted_at IS NOT NULL
  );

DROP POLICY IF EXISTS "Either party can delete" ON friendships;
CREATE POLICY "Either party can delete"
  ON friendships FOR DELETE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

ALTER TABLE friend_request_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own rate limit visible" ON friend_request_rate_limits;
CREATE POLICY "Own rate limit visible"
  ON friend_request_rate_limits FOR SELECT
  USING (auth.uid() = user_id);
-- Writes to friend_request_rate_limits go through the admin client in the API handler.

-- ─── 4. Realtime publication for friendships ───
-- Full row replication so postgres_changes callbacks see old + new values.
ALTER TABLE friendships REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
  END IF;
END $$;

-- ─── 5. Seed historical opponents as accepted friends ───
-- Every distinct pair with at least one completed match becomes an accepted
-- friendship. The `requested_by` column is metadata-only for seeded rows
-- (status='accepted' means no code path ever surfaces them as pending).
INSERT INTO friendships (user_a, user_b, status, requested_by, created_at, accepted_at)
SELECT
  LEAST(player1_id, player2_id)    AS user_a,
  GREATEST(player1_id, player2_id) AS user_b,
  'accepted',
  LEAST(player1_id, player2_id)    AS requested_by,
  MIN(completed_at)                AS created_at,
  MIN(completed_at)                AS accepted_at
FROM matches
WHERE status = 'completed'
  AND player1_id IS NOT NULL
  AND player2_id IS NOT NULL
  AND player1_id <> player2_id
  AND EXISTS (SELECT 1 FROM profiles WHERE id = player1_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = player2_id)
GROUP BY LEAST(player1_id, player2_id), GREATEST(player1_id, player2_id)
ON CONFLICT (user_a, user_b) DO NOTHING;
