-- Add country field to profiles
ALTER TABLE profiles ADD COLUMN country TEXT;
CREATE INDEX idx_profiles_country ON profiles (country) WHERE country IS NOT NULL;
