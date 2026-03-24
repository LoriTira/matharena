CREATE TABLE daily_puzzle_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  puzzle_date DATE NOT NULL,
  total_time_ms INTEGER NOT NULL,
  problem_times JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, puzzle_date)
);

CREATE INDEX idx_daily_puzzle_date ON daily_puzzle_results (puzzle_date, total_time_ms);
CREATE INDEX idx_daily_puzzle_user ON daily_puzzle_results (user_id, puzzle_date DESC);

ALTER TABLE daily_puzzle_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily puzzle results"
  ON daily_puzzle_results FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own results"
  ON daily_puzzle_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
