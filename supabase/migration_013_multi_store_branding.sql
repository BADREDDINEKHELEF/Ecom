-- Migration 013: Multi-store support + extended store branding
-- Run AFTER migration_012_sponsored_products.sql

-- ── 1. owner_id — separates "who owns this store" from the per-store user_id ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vendors' AND column_name='owner_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN owner_id UUID REFERENCES auth.users(id);
    -- Backfill: existing vendors keep their user_id as owner
    UPDATE vendors SET owner_id = user_id WHERE owner_id IS NULL;
  END IF;
END $$;

-- ── 2. Extended branding fields ───────────────────────────────────────────────
DO $$
BEGIN
  -- Cover image (wide hero, different from square logo)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='cover_url') THEN
    ALTER TABLE vendors ADD COLUMN cover_url TEXT;
  END IF;

  -- Social links
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='social_instagram') THEN
    ALTER TABLE vendors ADD COLUMN social_instagram TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='social_facebook') THEN
    ALTER TABLE vendors ADD COLUMN social_facebook TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='social_whatsapp') THEN
    ALTER TABLE vendors ADD COLUMN social_whatsapp TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='social_tiktok') THEN
    ALTER TABLE vendors ADD COLUMN social_tiktok TEXT;
  END IF;

  -- Store theme
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='theme_preset') THEN
    ALTER TABLE vendors ADD COLUMN theme_preset TEXT DEFAULT 'default'
      CHECK (theme_preset IN ('default','minimal','bold','elegant','earthy'));
  END IF;

  -- Business type (for display and filtering)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='business_type') THEN
    ALTER TABLE vendors ADD COLUMN business_type TEXT DEFAULT 'individual'
      CHECK (business_type IN ('individual','small_business','wholesaler','brand'));
  END IF;

  -- Subscription status (denormalized cache; source of truth = vendor_subscriptions)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='subscription_status') THEN
    ALTER TABLE vendors ADD COLUMN subscription_status TEXT DEFAULT 'trial'
      CHECK (subscription_status IN ('trial','active','grace_period','expired','none'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='subscription_plan_id') THEN
    ALTER TABLE vendors ADD COLUMN subscription_plan_id TEXT REFERENCES subscription_plans(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='subscription_expires_at') THEN
    ALTER TABLE vendors ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── 3. Index for multi-store lookups ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendors_owner_id ON vendors (owner_id);

-- ── 4. View: all stores owned by a user ───────────────────────────────────────
CREATE OR REPLACE VIEW vendor_stores AS
SELECT
  v.id,
  v.owner_id,
  v.user_id,
  v.store_name,
  v.store_slug,
  v.logo_url,
  v.banner_url,
  v.cover_url,
  v.description,
  v.wilaya,
  v.is_active,
  v.is_approved,
  v.subscription_status,
  v.subscription_plan_id,
  v.subscription_expires_at,
  v.theme_preset,
  v.business_type,
  v.accent_color,
  v.social_instagram,
  v.social_facebook,
  v.social_whatsapp,
  v.social_tiktok,
  v.created_at
FROM vendors v;
