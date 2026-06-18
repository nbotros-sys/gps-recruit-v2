-- Prevent duplicate emails going forward
-- First clean up existing @pending.com placeholder emails (they can repeat)
-- Only enforce uniqueness on real emails
CREATE UNIQUE INDEX IF NOT EXISTS candidates_real_email_unique
ON candidates (lower(trim(email)))
WHERE email NOT LIKE '%@pending.com';
