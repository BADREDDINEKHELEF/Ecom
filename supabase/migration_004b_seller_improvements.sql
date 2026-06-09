-- ============================================================
-- Migration 004: Seller Experience Improvements
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Product variants (JSONB — no separate table needed) ───────────────────────
-- Each variant: { id, options: {Taille: "38", Couleur: "Bleu"}, price, stock, sku }
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variants          JSONB    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN  DEFAULT true,
  ADD COLUMN IF NOT EXISTS vendor_notes      TEXT     DEFAULT NULL;

-- ── In-app messages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id    UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_id     UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  buyer_phone  TEXT        NOT NULL,
  buyer_name   TEXT        NOT NULL,
  sender       TEXT        NOT NULL CHECK (sender IN ('buyer', 'seller')),
  content      TEXT        NOT NULL,
  is_read      BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own messages"
  ON public.messages FOR ALL USING (
    vendor_id = (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  ) WITH CHECK (
    vendor_id = (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin can manage messages"
  ON public.messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS messages_vendor_idx ON public.messages(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_buyer_idx  ON public.messages(vendor_id, buyer_phone);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON public.messages(vendor_id, is_read) WHERE is_read = false;

-- ── Flash sales ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  TEXT        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id   UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  flash_price NUMERIC     NOT NULL,
  stock_limit INTEGER,
  sold_count  INTEGER     DEFAULT 0,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active flash sales"
  ON public.flash_sales FOR SELECT USING (is_active = true AND now() BETWEEN starts_at AND ends_at);
CREATE POLICY "Vendors manage own flash sales"
  ON public.flash_sales FOR ALL USING (
    vendor_id = (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  ) WITH CHECK (
    vendor_id = (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin can manage flash sales"
  ON public.flash_sales FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS flash_sales_product_idx ON public.flash_sales(product_id);
CREATE INDEX IF NOT EXISTS flash_sales_vendor_idx  ON public.flash_sales(vendor_id);
CREATE INDEX IF NOT EXISTS flash_sales_active_idx  ON public.flash_sales(is_active, starts_at, ends_at);

-- ── Payouts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payouts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id    UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount       NUMERIC     NOT NULL,   -- net payout after commission
  gross_amount NUMERIC     NOT NULL,   -- before commission
  commission   NUMERIC     NOT NULL,   -- platform fee amount
  period_from  DATE        NOT NULL,
  period_to    DATE        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  bank_account TEXT,
  reference    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  paid_at      TIMESTAMPTZ
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors read own payouts"
  ON public.payouts FOR SELECT USING (
    vendor_id = (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin can manage payouts"
  ON public.payouts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS payouts_vendor_idx ON public.payouts(vendor_id, created_at DESC);

-- ── Payout bank accounts per vendor ──────────────────────────────────────────
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS payout_account_type TEXT    DEFAULT NULL,  -- 'cib' | 'ccp' | 'baridimob'
  ADD COLUMN IF NOT EXISTS payout_account_num  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payout_account_name TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payout_schedule     TEXT    DEFAULT 'weekly';  -- 'weekly' | 'manual'

-- ── Promo codes: extend with vendor scope ─────────────────────────────────────
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS vendor_id         UUID    REFERENCES public.vendors(id) ON DELETE CASCADE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS niche_id          TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS free_shipping     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS one_per_buyer     BOOLEAN DEFAULT false;

-- ── RPC: unread message count per vendor ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_message_count(p_vendor_id UUID)
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*) FROM public.messages
  WHERE vendor_id = p_vendor_id AND is_read = false AND sender = 'buyer';
$$;
