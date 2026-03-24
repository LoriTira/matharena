CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  match_id UUID REFERENCES matches(id),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_achievements_user ON user_achievements (user_id, unlocked_at DESC);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are publicly readable"
  ON user_achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);
