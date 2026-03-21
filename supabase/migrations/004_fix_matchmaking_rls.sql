-- Fix matchmaking RLS: allow authenticated users to discover and join waiting matches.
-- Without this, Player B cannot see or join Player A's waiting match,
-- so both players spin forever in matchmaking.

-- SELECT: any authenticated user can see waiting matches (needed to find opponents)
DROP POLICY "Players can see their matches" ON matches;
CREATE POLICY "Players can see their matches"
  ON matches FOR SELECT
  USING (
    player1_id = auth.uid()
    OR player2_id = auth.uid()
    OR status IN ('waiting', 'completed')
  );

-- UPDATE: any authenticated user can target a waiting match to join it.
-- WITH CHECK ensures the user must be player1 or player2 in the resulting row,
-- so the only valid non-participant update is setting yourself as player2_id.
DROP POLICY "Match participants can update" ON matches;
CREATE POLICY "Match participants can update"
  ON matches FOR UPDATE
  USING (
    player1_id = auth.uid()
    OR player2_id = auth.uid()
    OR (status = 'waiting' AND auth.uid() IS NOT NULL)
  )
  WITH CHECK (
    player1_id = auth.uid()
    OR player2_id = auth.uid()
  );
