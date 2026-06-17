-- OTP codes for WhatsApp-based password reset
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  phone      TEXT        NOT NULL,
  otp        TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  used       BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clean up expired OTPs automatically (keep table small)
CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.password_reset_otps (phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.password_reset_otps (expires_at);

-- No RLS needed — only accessed server-side via service_role
