-- Add purpose discriminator to password_reset_otps and tighten indexes.
-- Purpose prevents cross-flow OTP replay (e.g. using a registration OTP to
-- reset a password, or vice-versa).

-- Add purpose column if it does not exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'password_reset_otps'
      AND column_name = 'purpose'
  ) THEN
    ALTER TABLE public.password_reset_otps
      ADD COLUMN purpose TEXT NOT NULL DEFAULT 'registration'
      CONSTRAINT password_reset_otps_purpose_check
        CHECK (purpose IN ('registration', 'password_reset'));
  END IF;
END $$;

-- Existing rows without a purpose default to 'registration'. New inserts must
-- explicitly provide a purpose.
ALTER TABLE public.password_reset_otps
  ALTER COLUMN purpose DROP DEFAULT;

-- Ensure fast lookup of the newest unused OTP by email+purpose and phone+purpose.
DROP INDEX IF EXISTS idx_password_reset_otps_email_purpose;
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email_purpose
  ON public.password_reset_otps (email, purpose, created_at DESC)
  WHERE used = false;

DROP INDEX IF EXISTS idx_password_reset_otps_phone_purpose;
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_phone_purpose
  ON public.password_reset_otps (phone, purpose, created_at DESC)
  WHERE used = false;

-- Prevent multiple active OTPs for the same identifier + purpose.
-- This removes race windows where two concurrent sends create two valid codes.
DROP INDEX IF EXISTS idx_password_reset_otps_one_active_email;
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_otps_one_active_email
  ON public.password_reset_otps (email, purpose)
  WHERE used = false;

DROP INDEX IF EXISTS idx_password_reset_otps_one_active_phone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_otps_one_active_phone
  ON public.password_reset_otps (phone, purpose)
  WHERE used = false;
