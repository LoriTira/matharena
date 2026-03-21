-- ============================================
-- Challenges table for friend invite system
-- ============================================

CREATE TYPE challenge_status AS ENUM ('pending', 'accepted', 'completed', 'expired');

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  match_id UUID REFERENCES matches(id),
  status challenge_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- Indexes
CREATE INDEX idx_challenges_code ON challenges (code);
CREATE INDEX idx_challenges_sender ON challenges (sender_id, status);
CREATE INDEX idx_challenges_recipient ON challenges (recipient_id, status);

-- Row Level Security
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pending challenges are publicly readable by code"
  ON challenges FOR SELECT
  USING (status = 'pending' OR sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Authenticated users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Challenge participants can update"
  ON challenges FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (status = 'pending' AND auth.uid() IS NOT NULL)
  );
