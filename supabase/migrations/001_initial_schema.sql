-- ============================================
-- MathArena Database Schema
-- ============================================

-- Custom types
CREATE TYPE match_status AS ENUM ('waiting', 'active', 'completed', 'abandoned');
CREATE TYPE event_type AS ENUM ('answer_correct', 'answer_wrong');

-- ============================================
-- Profiles table
-- Extends Supabase auth.users with app data
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  affiliation TEXT,
  affiliation_type TEXT CHECK (affiliation_type IN ('school', 'company')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    NEW.raw_user_meta_data->>'display_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Matches table
-- ============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  status match_status NOT NULL DEFAULT 'waiting',
  problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_score INTEGER NOT NULL DEFAULT 5,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  player1_penalties INTEGER NOT NULL DEFAULT 0,
  player2_penalties INTEGER NOT NULL DEFAULT 0,
  player1_elo_before INTEGER,
  player2_elo_before INTEGER,
  player1_elo_after INTEGER,
  player2_elo_after INTEGER,
  winner_id UUID REFERENCES profiles(id),
  avg_difficulty INTEGER NOT NULL DEFAULT 1200,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Match Events table (append-only log)
-- ============================================
CREATE TABLE match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  problem_index INTEGER NOT NULL,
  event event_type NOT NULL,
  submitted_answer TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Lessons table
-- ============================================
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_profiles_elo ON profiles (elo_rating DESC);
CREATE INDEX idx_profiles_affiliation ON profiles (affiliation) WHERE affiliation IS NOT NULL;
CREATE INDEX idx_matches_status ON matches (status) WHERE status IN ('waiting', 'active');
CREATE INDEX idx_matches_player1 ON matches (player1_id);
CREATE INDEX idx_matches_player2 ON matches (player2_id);
CREATE INDEX idx_match_events_match ON match_events (match_id, created_at);
CREATE INDEX idx_lessons_category ON lessons (category, sort_order);

-- ============================================
-- Row Level Security
-- ============================================

-- Profiles: anyone can read, only owner can update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Matches: participants can read their matches, completed matches are public
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can see their matches"
  ON matches FOR SELECT
  USING (
    player1_id = auth.uid()
    OR player2_id = auth.uid()
    OR status = 'completed'
  );

CREATE POLICY "Authenticated users can insert matches"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Match participants can update"
  ON matches FOR UPDATE
  USING (
    player1_id = auth.uid()
    OR player2_id = auth.uid()
  );

-- Match events: visible to match participants and completed matches
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match event visibility"
  ON match_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_events.match_id
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid() OR m.status = 'completed')
    )
  );

CREATE POLICY "Authenticated users can insert match events"
  ON match_events FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Lessons: publicly readable
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons are publicly readable"
  ON lessons FOR SELECT
  USING (true);

-- ============================================
-- Seed: Sample Lessons
-- ============================================
INSERT INTO lessons (slug, title, description, content, category, difficulty_level, sort_order) VALUES
('multiply-by-11', 'Multiply Any Two-Digit Number by 11', 'A simple trick to instantly multiply any two-digit number by 11', E'# Multiplying by 11\n\nTo multiply any two-digit number by 11:\n\n1. **Split the digits** of the number\n2. **Add them together** and place the sum in the middle\n3. If the sum is ≥ 10, carry the 1\n\n## Examples\n\n- **36 × 11**: Split 3_6, add 3+6=9, result: **396**\n- **72 × 11**: Split 7_2, add 7+2=9, result: **792**\n- **85 × 11**: Split 8_5, add 8+5=13, carry: **(8+1)35 = 935**\n\n## Practice Tips\n\nStart with numbers where the digits sum to less than 10 (like 36, 45, 72). Once comfortable, move to numbers where you need to carry (85, 94, 67).', 'multiplication', 1, 1),

('squaring-ending-5', 'Square Numbers Ending in 5', 'Instantly square any number ending in 5', E'# Squaring Numbers Ending in 5\n\nTo square any number ending in 5:\n\n1. Take the digit(s) before the 5\n2. **Multiply by the next number up**\n3. **Append 25** to the result\n\n## Examples\n\n- **25²**: 2 × 3 = 6, append 25 → **625**\n- **45²**: 4 × 5 = 20, append 25 → **2025**\n- **85²**: 8 × 9 = 72, append 25 → **7225**\n- **115²**: 11 × 12 = 132, append 25 → **13225**\n\n## Why It Works\n\n(10a + 5)² = 100a² + 100a + 25 = 100a(a+1) + 25', 'multiplication', 1, 2),

('complement-subtraction', 'Subtraction by Complements', 'Use complements to subtract quickly from round numbers', E'# Subtraction by Complements\n\nWhen subtracting from a round number (100, 1000, etc.), use complements:\n\n1. Find the **complement** of each digit (what adds to 9), except the last digit (adds to 10)\n2. The complement IS the answer\n\n## Examples\n\n- **1000 - 372**: Complements of 3,7,2 → 6,2,8 → **628**\n- **100 - 37**: Complements of 3,7 → 6,3 → **63**\n- **10000 - 4825**: Complements → 5,1,7,5 → **5175**\n\n## For Non-Round Numbers\n\nRound up to the nearest power of 10, subtract, then adjust:\n- **843 - 567**: Think 1000 - 567 = 433, then 843 - 567 = 843 - 1000 + 433 = 276\n- Or simpler: 843 - 567 = 843 - 600 + 33 = 243 + 33 = **276**', 'subtraction', 1, 3),

('addition-left-to-right', 'Add Left to Right', 'A faster way to add large numbers mentally', E'# Adding Left to Right\n\nInstead of right-to-left (like on paper), add left-to-right for mental math:\n\n1. Start with the **largest place value**\n2. Keep a **running total**\n3. Adjust as you go\n\n## Example: 467 + 385\n\n1. 400 + 300 = **700**\n2. 60 + 80 = 140 → running total: **840**\n3. 7 + 5 = 12 → final answer: **852**\n\n## Example: 1,284 + 3,917\n\n1. 1000 + 3000 = **4000**\n2. 200 + 900 = 1100 → **5100**\n3. 80 + 10 = 90 → **5190**\n4. 4 + 7 = 11 → **5201**\n\n## Why This Works Better\n\nYou get a close estimate immediately and refine it. If interrupted, you already know the approximate answer.', 'addition', 1, 4),

('division-by-splitting', 'Division by Splitting', 'Break division into easier parts', E'# Division by Splitting\n\nBreak a hard division into easier parts:\n\n## Method 1: Split the Dividend\n\n**846 ÷ 3**:\n- 900 ÷ 3 = 300\n- But we used 54 too many: 54 ÷ 3 = 18\n- 300 - 18 = **282**\n\nOr: 600 ÷ 3 = 200, 240 ÷ 3 = 80, 6 ÷ 3 = 2 → **282**\n\n## Method 2: Factor the Divisor\n\n**720 ÷ 48**:\n- 48 = 6 × 8\n- 720 ÷ 8 = 90\n- 90 ÷ 6 = **15**\n\n## Method 3: Simplify First\n\n**1350 ÷ 54**:\n- Both divisible by 2: 675 ÷ 27\n- Both divisible by 27: 675 ÷ 27 = **25**\n\n## Quick Division Tests\n- Divisible by 2: even last digit\n- Divisible by 3: digit sum divisible by 3\n- Divisible by 4: last two digits divisible by 4\n- Divisible by 5: ends in 0 or 5', 'division', 2, 5),

('multiply-near-100', 'Multiplying Numbers Near 100', 'Use the base method for numbers close to 100', E'# Multiplying Numbers Near 100\n\nWhen both numbers are close to 100, use the **base method**:\n\n1. Find how far each number is from 100 (the \"difference\")\n2. Cross-add: take either number and add the other''s difference\n3. Multiply the differences together\n4. Combine: step 2 gives the hundreds, step 3 gives the last two digits\n\n## Examples\n\n**97 × 96**:\n- Differences: -3 and -4\n- Cross: 97 + (-4) = 93 (or 96 + (-3) = 93)\n- Multiply differences: 3 × 4 = 12\n- Answer: **9312**\n\n**104 × 103**:\n- Differences: +4 and +3\n- Cross: 104 + 3 = 107\n- Multiply: 4 × 3 = 12\n- Answer: **10712**\n\n**95 × 107**:\n- Differences: -5 and +7\n- Cross: 95 + 7 = 102\n- Multiply: (-5) × 7 = -35\n- Answer: 10200 - 35 = **10165**', 'multiplication', 2, 6);
