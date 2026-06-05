-- ============================================================
-- Migration 004 — Online payments, delivery tokens, store customization
-- ============================================================

-- ── 1. Vendor store customization columns ────────────────────
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS banner_url       TEXT,
  ADD COLUMN IF NOT EXISTS accent_color     VARCHAR(7) DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS seo_title        VARCHAR(70),
  ADD COLUMN IF NOT EXISTS seo_description  VARCHAR(160);

-- ── 2. Delivery provider tokens in vendor_delivery_config ────
ALTER TABLE vendor_delivery_config
  ADD COLUMN IF NOT EXISTS procolis_token  TEXT,
  ADD COLUMN IF NOT EXISTS zr_token        TEXT;

-- ── 3. Payment status tracking on orders ─────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS satim_order_id TEXT;

-- pending_payment = order created, awaiting online payment
-- paid            = online payment confirmed by gateway
-- failed          = payment failed or cancelled
-- refunded        = refund issued

-- Update status enum constraint to allow pending_payment
-- (Supabase uses text fields not enums by default, so this is informational)
-- Valid statuses: pending | pending_payment | confirmed | shipped | delivered | cancelled

-- ── 4. Index for payment lookups ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_satim_order_id ON orders(satim_order_id) WHERE satim_order_id IS NOT NULL;

-- ── 5. RLS: vendors can read their own store data ─────────────
-- (public store page reads via anon key, so products must be publicly readable)
-- These policies should already exist from migration_003, but ensure products are public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'products' AND policyname = 'products_public_read'
  ) THEN
    CREATE POLICY products_public_read ON products
      FOR SELECT USING (true);
  END IF;
END $$;

-- ── 6. Public vendor read for store pages ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendors' AND policyname = 'vendors_public_read'
  ) THEN
    CREATE POLICY vendors_public_read ON vendors
      FOR SELECT USING (is_active = true);
  END IF;
END $$;
