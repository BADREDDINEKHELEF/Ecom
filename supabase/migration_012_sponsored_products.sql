-- Migration 012: Sponsored / promoted products
-- Run AFTER migration_011_subscriptions.sql

CREATE TABLE IF NOT EXISTS sponsored_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Where this promotion appears
  placement     TEXT NOT NULL DEFAULT 'homepage'
                  CHECK (placement IN ('homepage','category','search','all')),

  -- Lifecycle
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','paused','rejected','expired')),
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,

  -- Performance counters (updated by server on each impression/click)
  impressions   BIGINT NOT NULL DEFAULT 0,
  clicks        BIGINT NOT NULL DEFAULT 0,
  conversions   BIGINT NOT NULL DEFAULT 0,

  -- Pricing
  amount_dzd    INTEGER NOT NULL DEFAULT 0,
  payment_reference TEXT,

  -- Admin
  admin_note    TEXT,
  approved_by   TEXT,           -- admin identifier
  approved_at   TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsored_vendor ON sponsored_products (vendor_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_active
  ON sponsored_products (placement, status, ends_at)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION update_sponsored_products_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_sponsored_updated_at ON sponsored_products;
CREATE TRIGGER trg_sponsored_updated_at
  BEFORE UPDATE ON sponsored_products
  FOR EACH ROW EXECUTE FUNCTION update_sponsored_products_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE sponsored_products ENABLE ROW LEVEL SECURITY;

-- Public can see active sponsored products (for homepage/category display)
CREATE POLICY "sponsored_public_active" ON sponsored_products
  FOR SELECT USING (status = 'active');

-- Vendors read their own (any status)
CREATE POLICY "sponsored_vendor_own" ON sponsored_products
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

-- Vendors can insert (pending review)
CREATE POLICY "sponsored_vendor_insert" ON sponsored_products
  FOR INSERT WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

-- Vendors can update their own pending/paused promotions
CREATE POLICY "sponsored_vendor_update" ON sponsored_products
  FOR UPDATE USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    AND status IN ('pending','paused')
  );

-- Service role full access (admin approval, counter increments)
CREATE POLICY "sponsored_service_all" ON sponsored_products
  FOR ALL USING (auth.role() = 'service_role');
