-- Migration 011: Subscription plans and vendor subscriptions
-- Run AFTER migration_010_rls_hardening.sql

-- ── Subscription plans (seeded with 3 tiers) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                          TEXT PRIMARY KEY,         -- 'basic' | 'professional' | 'enterprise'
  name_en                     TEXT NOT NULL,
  name_ar                     TEXT NOT NULL,
  name_fr                     TEXT NOT NULL,
  price_dzd                   INTEGER NOT NULL,
  billing_period_days         INTEGER NOT NULL DEFAULT 30,
  max_products                INTEGER NOT NULL DEFAULT 50,
  max_stores                  INTEGER NOT NULL DEFAULT 1,
  sponsored_products_allowed  INTEGER NOT NULL DEFAULT 0,
  features_en                 JSONB NOT NULL DEFAULT '[]',
  features_ar                 JSONB NOT NULL DEFAULT '[]',
  features_fr                 JSONB NOT NULL DEFAULT '[]',
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  display_order               INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans
  (id, name_en, name_ar, name_fr, price_dzd, max_products, max_stores, sponsored_products_allowed, display_order, features_en, features_ar, features_fr)
VALUES
  (
    'basic',
    'Basic',
    'أساسي',
    'Basique',
    3000,
    50,
    1,
    0,
    1,
    '["Up to 50 products", "1 store", "Standard support", "Order management", "Basic analytics"]'::jsonb,
    '["حتى 50 منتج", "متجر واحد", "دعم عادي", "إدارة الطلبات", "تحليلات أساسية"]'::jsonb,
    '["Jusqu''à 50 produits", "1 boutique", "Support standard", "Gestion des commandes", "Analytique de base"]'::jsonb
  ),
  (
    'professional',
    'Professional',
    'احترافي',
    'Professionnel',
    6000,
    200,
    3,
    3,
    2,
    '["Up to 200 products", "3 stores", "Priority support", "Advanced analytics", "3 sponsored products", "Custom store branding"]'::jsonb,
    '["حتى 200 منتج", "3 متاجر", "دعم ذو أولوية", "تحليلات متقدمة", "3 منتجات مدفوعة", "هوية بصرية مخصصة"]'::jsonb,
    '["Jusqu''à 200 produits", "3 boutiques", "Support prioritaire", "Analytique avancée", "3 produits sponsorisés", "Image de marque personnalisée"]'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'مؤسسي',
    'Entreprise',
    12000,
    1000,
    10,
    10,
    3,
    '["Unlimited products", "10 stores", "Dedicated support", "Full analytics suite", "10 sponsored products", "Homepage featured placement", "API access"]'::jsonb,
    '["منتجات غير محدودة", "10 متاجر", "دعم مخصص", "مجموعة تحليلات كاملة", "10 منتجات مدفوعة", "عرض مميز في الصفحة الرئيسية", "وصول API"]'::jsonb,
    '["Produits illimités", "10 boutiques", "Support dédié", "Suite analytique complète", "10 produits sponsorisés", "Placement en vedette sur la page d''accueil", "Accès API"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ── Vendor subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id             UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  plan_id               TEXT NOT NULL REFERENCES subscription_plans(id),
  status                TEXT NOT NULL DEFAULT 'trial'
                          CHECK (status IN ('trial','active','grace_period','expired','cancelled')),
  amount_dzd            INTEGER NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  grace_period_ends_at  TIMESTAMPTZ,               -- 7 days after expires_at
  payment_reference     TEXT,                       -- bank transfer ref or BaridiMob receipt
  payment_method        TEXT CHECK (payment_method IN ('manual','baridi_mob','ccp','edahabia')),
  payment_proof_url     TEXT,                       -- uploaded screenshot/receipt
  admin_note            TEXT,
  renewed_from_id       UUID REFERENCES vendor_subscriptions(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_vendor
  ON vendor_subscriptions (vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_expires
  ON vendor_subscriptions (expires_at)
  WHERE status IN ('active','grace_period');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_vendor_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_vendor_subscriptions_updated_at ON vendor_subscriptions;
CREATE TRIGGER trg_vendor_subscriptions_updated_at
  BEFORE UPDATE ON vendor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_vendor_subscriptions_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE subscription_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_subscriptions  ENABLE ROW LEVEL SECURITY;

-- Anyone can read plans
CREATE POLICY "plans_public_read" ON subscription_plans
  FOR SELECT USING (TRUE);

-- Vendors read their own subscriptions; service_role reads all
CREATE POLICY "subscriptions_vendor_read" ON vendor_subscriptions
  FOR SELECT USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Only service_role writes (all mutations go through server-side API)
CREATE POLICY "subscriptions_service_insert" ON vendor_subscriptions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "subscriptions_service_update" ON vendor_subscriptions
  FOR UPDATE USING (auth.role() = 'service_role');
