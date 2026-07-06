-- Remove plaintext OTP storage from password_reset_otps.
-- OTPs must only be stored as salted scrypt hashes in otp_hash.

-- OTP rows are ephemeral (5-minute expiry). Dropping the plaintext column
-- means existing rows must be cleared first so the NOT NULL constraint on
-- otp_hash is not violated by rows that only have a plaintext otp.
DELETE FROM public.password_reset_otps;

-- Drop the plaintext column and the unused salt column.
-- otp_hash already stores salt:hash, so a separate otp_salt is redundant.
ALTER TABLE public.password_reset_otps
  DROP COLUMN IF EXISTS otp,
  DROP COLUMN IF EXISTS otp_salt;

-- Remove the unsafe default empty string and enforce a real hash.
ALTER TABLE public.password_reset_otps
  ALTER COLUMN otp_hash DROP DEFAULT;

-- Enable RLS. Only service-role server code should access this table.
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
