-- Practice session tracking
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
  ON practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
