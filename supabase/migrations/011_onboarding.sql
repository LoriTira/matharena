-- ============================================
-- Onboarding tracking
-- ============================================

-- Add onboarding_completed column (existing users default to true)
ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT true;

-- Index for middleware queries on incomplete onboarding
CREATE INDEX idx_profiles_onboarding ON profiles (onboarding_completed) WHERE onboarding_completed = false;

-- Update trigger to set onboarding_completed = false for new signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    NEW.raw_user_meta_data->>'display_name',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
