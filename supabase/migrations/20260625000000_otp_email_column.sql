-- Add email column to password_reset_otps to resolve schema mismatch (M-05)
ALTER TABLE public.password_reset_otps ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on the new email column
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.password_reset_otps (email);

-- Backfill existing email values from the phone column (since it was used to store emails)
UPDATE public.password_reset_otps
SET    email = phone
WHERE  phone LIKE '%@%';
