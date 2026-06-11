-- migration_021: Batch 6 — Advanced Commerce
-- Pre-order, MOQ, bundles, gift cards, loyalty points

-- Product commerce extensions
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_pre_order      BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pre_order_date    TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_bundle         BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bundle_contents   JSONB DEFAULT '[]';

-- Gift cards
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  balance         NUMERIC NOT NULL DEFAULT 0,
  initial_balance NUMERIC NOT NULL,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gift card" ON public.gift_cards FOR SELECT USING (true);
CREATE POLICY "Service update gift card" ON public.gift_cards FOR UPDATE USING (true);

-- Loyalty points
CREATE TABLE IF NOT EXISTS public.user_points (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance   INTEGER DEFAULT 0,
  lifetime_points  INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service manages points" ON public.user_points FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.points_transactions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  order_id   UUID REFERENCES public.orders(id),
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.points_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service insert transactions" ON public.points_transactions
  FOR INSERT WITH CHECK (true);
