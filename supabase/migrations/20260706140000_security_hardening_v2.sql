-- Security hardening migration v2 — based on actual StoreDz schema.
-- Run this in Supabase Dashboard → SQL Editor as a single query.
-- All statements are idempotent: re-running is safe.

-- ============================================================
-- 1. CLEANUP: DROP PLAINTEXT OTP COLUMNS
-- ============================================================

DELETE FROM public.password_reset_otps;

ALTER TABLE public.password_reset_otps
  DROP COLUMN IF EXISTS otp,
  DROP COLUMN IF EXISTS otp_salt;

ALTER TABLE public.password_reset_otps
  ALTER COLUMN otp_hash DROP DEFAULT;

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_reset_otps_service_only ON public.password_reset_otps;
CREATE POLICY password_reset_otps_service_only ON public.password_reset_otps
  FOR ALL USING (false) WITH CHECK (false);

-- ============================================================
-- 2. CUSTOMER PHONE HASH: FULL SHA-256
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_vendor_customers(p_vendor_id UUID)
RETURNS TABLE(
  phone_hash     TEXT,
  masked_phone   TEXT,
  display_name   TEXT,
  wilaya         TEXT,
  order_count    INT,
  lifetime_value NUMERIC,
  delivery_rate  INT,
  last_order_at  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    encode(sha256(lower(trim(o.phone))::bytea), 'hex')      AS phone_hash,
    lower(trim(o.phone))                                    AS masked_phone,
    (array_agg(o.full_name ORDER BY o.created_at DESC))[1]  AS display_name,
    (array_agg(o.wilaya    ORDER BY o.created_at DESC))[1]  AS wilaya,
    count(DISTINCT o.id)::INT                               AS order_count,
    sum(o.total)                                            AS lifetime_value,
    round(
      100.0 * count(DISTINCT o.id) FILTER (WHERE o.status = 'delivered')
            / NULLIF(count(DISTINCT o.id), 0)
    )::INT                                                  AS delivery_rate,
    max(o.created_at)                                       AS last_order_at
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND o.phone IS NOT NULL
    AND o.phone <> ''
  GROUP BY lower(trim(o.phone))
  ORDER BY max(o.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_vendor_customer_detail(
  p_vendor_id  UUID,
  p_phone_hash TEXT
)
RETURNS TABLE(
  order_id     UUID,
  full_name    TEXT,
  masked_phone TEXT,
  wilaya       TEXT,
  city         TEXT,
  total        NUMERIC,
  status       TEXT,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    o.id,
    o.full_name,
    lower(trim(o.phone)) AS masked_phone,
    o.wilaya,
    o.city,
    o.total,
    o.status,
    o.created_at
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND encode(sha256(lower(trim(o.phone))::bytea), 'hex') = p_phone_hash
  GROUP BY o.id
  ORDER BY o.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.resolve_vendor_phone_by_hash(
  p_vendor_id  UUID,
  p_phone_hash TEXT
)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.phone
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND encode(sha256(lower(trim(o.phone))::bytea), 'hex') = p_phone_hash
    AND o.phone IS NOT NULL
    AND o.phone <> ''
  LIMIT 1;
$$;

-- ============================================================
-- 3. ENABLE RLS ON CORE TABLES
-- ============================================================

ALTER TABLE IF EXISTS public.vendors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. DROP OVERLY PERMISSIVE POLICIES
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname ILIKE '%true%' OR
        policyname ILIKE '%allow_all%' OR
        policyname ILIKE '%public%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 5. SAFE POLICIES BASED ON YOUR SCHEMA
-- ============================================================

-- Vendors: a seller sees/edits only their own vendor row
DROP POLICY IF EXISTS vendors_select_own ON public.vendors;
CREATE POLICY vendors_select_own ON public.vendors
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vendors_update_own ON public.vendors;
CREATE POLICY vendors_update_own ON public.vendors
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper to resolve current vendor id from auth user
CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS UUID AS $$
  SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Products: scoped by vendor_id
DROP POLICY IF EXISTS products_select_own ON public.products;
CREATE POLICY products_select_own ON public.products
  FOR SELECT USING (vendor_id = public.current_vendor_id());

DROP POLICY IF EXISTS products_insert_own ON public.products;
CREATE POLICY products_insert_own ON public.products
  FOR INSERT WITH CHECK (vendor_id = public.current_vendor_id());

DROP POLICY IF EXISTS products_update_own ON public.products;
CREATE POLICY products_update_own ON public.products
  FOR UPDATE USING (vendor_id = public.current_vendor_id());

DROP POLICY IF EXISTS products_delete_own ON public.products;
CREATE POLICY products_delete_own ON public.products
  FOR DELETE USING (vendor_id = public.current_vendor_id());

-- Orders: customer sees own orders; seller sees orders containing their items
DROP POLICY IF EXISTS orders_customer_select ON public.orders;
CREATE POLICY orders_customer_select ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS orders_vendor_select ON public.orders;
CREATE POLICY orders_vendor_select ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = orders.id
        AND oi.vendor_id = public.current_vendor_id()
    )
  );

-- Order items: scoped by vendor_id
DROP POLICY IF EXISTS order_items_vendor_select ON public.order_items;
CREATE POLICY order_items_vendor_select ON public.order_items
  FOR SELECT USING (vendor_id = public.current_vendor_id());

DROP POLICY IF EXISTS order_items_vendor_update ON public.order_items;
CREATE POLICY order_items_vendor_update ON public.order_items
  FOR UPDATE USING (vendor_id = public.current_vendor_id());

-- Shipments: scoped by vendor_id
DROP POLICY IF EXISTS shipments_vendor_select ON public.shipments;
CREATE POLICY shipments_vendor_select ON public.shipments
  FOR SELECT USING (vendor_id = public.current_vendor_id());

-- Messages: scoped by vendor_id
DROP POLICY IF EXISTS messages_vendor_select ON public.messages;
CREATE POLICY messages_vendor_select ON public.messages
  FOR SELECT USING (vendor_id = public.current_vendor_id());

DROP POLICY IF EXISTS messages_vendor_insert ON public.messages;
CREATE POLICY messages_vendor_insert ON public.messages
  FOR INSERT WITH CHECK (vendor_id = public.current_vendor_id());

-- Payouts: scoped by vendor_id
DROP POLICY IF EXISTS payouts_vendor_select ON public.payouts;
CREATE POLICY payouts_vendor_select ON public.payouts
  FOR SELECT USING (vendor_id = public.current_vendor_id());

-- Promo codes: scoped by vendor_id
DROP POLICY IF EXISTS promo_codes_vendor_manage ON public.promo_codes;
CREATE POLICY promo_codes_vendor_manage ON public.promo_codes
  FOR ALL USING (vendor_id = public.current_vendor_id())
  WITH CHECK (vendor_id = public.current_vendor_id());

-- Store settings: global single-row config; authenticated sellers read, service_role writes.
-- If you add a vendor_id later, replace this with a scoped policy.
DROP POLICY IF EXISTS store_settings_public_read ON public.store_settings;
CREATE POLICY store_settings_public_read ON public.store_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS store_settings_service_write ON public.store_settings;
CREATE POLICY store_settings_service_write ON public.store_settings
  FOR ALL USING (false) WITH CHECK (false);

-- Reviews: public read only (no owner/vendor column in your schema)
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT USING (true);

-- ============================================================
-- 6. REFUND CAP: prevent refunds larger than order total
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_refund_amount()
RETURNS TRIGGER AS $$
DECLARE
  order_total NUMERIC;
  existing_refunds NUMERIC;
BEGIN
  SELECT COALESCE(total, 0) INTO order_total
  FROM public.orders WHERE id = NEW.order_id;

  SELECT COALESCE(SUM(amount), 0) INTO existing_refunds
  FROM public.returns
  WHERE order_id = NEW.order_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (existing_refunds + NEW.amount) > order_total THEN
    RAISE EXCEPTION 'Refund amount exceeds order total. Order: %, Total: %, Already refunded: %, New refund: %',
      NEW.order_id, order_total, existing_refunds, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'returns') THEN
    DROP TRIGGER IF EXISTS refund_amount_check ON public.returns;
    CREATE TRIGGER refund_amount_check
      BEFORE INSERT OR UPDATE ON public.returns
      FOR EACH ROW EXECUTE FUNCTION public.check_refund_amount();
  END IF;
END $$;

-- ============================================================
-- 7. REVOKE PUBLIC EXECUTE ON SECURITY DEFINER FUNCTIONS
-- ============================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL PROCEDURES IN SCHEMA public FROM PUBLIC;

-- Re-grant necessary functions
GRANT EXECUTE ON FUNCTION public.current_vendor_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_vendor_customers(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_vendor_customer_detail(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_vendor_phone_by_hash(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_refund_amount() TO authenticated, service_role;

-- ============================================================
-- 8. STORAGE BUCKET POLICIES
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('products', 'products', true),
  ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS products_public_read ON storage.objects;
CREATE POLICY products_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS products_vendor_upload ON storage.objects;
CREATE POLICY products_vendor_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT id::text FROM public.vendors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS vendor_logos_public_read ON storage.objects;
CREATE POLICY vendor_logos_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'vendor-logos');

DROP POLICY IF EXISTS vendor_logos_owner_upload ON storage.objects;
CREATE POLICY vendor_logos_owner_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vendor-logos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT id::text FROM public.vendors WHERE user_id = auth.uid())
  );

-- ============================================================
-- DONE
-- ============================================================
