-- ============================================
-- Email verification tracking
-- ============================================

-- Track whether the user has verified their email address.
-- Supabase's own email_confirmed_at is used for session gating;
-- this column is our app-level flag shown as a dashboard banner.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Existing users are grandfathered as verified
UPDATE profiles SET email_verified = true WHERE email_verified = false;
