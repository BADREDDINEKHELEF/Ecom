-- migration_016: Batch 1 — Buyer UX Quick Wins
-- Add notes to orders, saved addresses, stock alerts

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL DEFAULT 'Domicile',
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL,
  address    TEXT NOT NULL,
  city       TEXT NOT NULL,
  wilaya     TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.saved_addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email      TEXT,
  phone      TEXT,
  notified   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert stock alert" ON public.stock_alerts
  FOR INSERT WITH CHECK (true);
