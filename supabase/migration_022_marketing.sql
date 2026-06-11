-- migration_022: Batch 7 — Marketing & Conversion
-- Social proof counter, referral program

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.vendors  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS public.referral_signups (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id      UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages referrals" ON public.referral_signups FOR ALL USING (true);
