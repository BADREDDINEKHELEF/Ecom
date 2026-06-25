-- Add secure OTP hashing columns
ALTER TABLE public.password_reset_otps
  ADD COLUMN IF NOT EXISTS otp_hash  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS otp_salt  TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_otp_hash ON public.password_reset_otps(otp_hash);