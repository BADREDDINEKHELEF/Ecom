-- ============================================================
-- Security hardening migration v4 — defensive, idempotent.
--
-- Applies only the critical security fixes that v2/v3 intended:
--   * Refund cap on public.return_requests.refund_amount
--   * RLS on all existing public tables
--   * Safe policies for core tables
--   * Missing FK on order_items.product_id
--   * Lock down sensitive RPC grants
--
-- All statements are wrapped so the migration succeeds even if some
-- tables/columns from the full schema are not present on this project.
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTIONS (top-level so no nested dollar-quoting issues)
-- ============================================================

CREATE OR REPLACE FUNCTION public.migration_safe_exec(
  p_table_name TEXT,
  p_sql        TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    EXECUTE p_sql;
  END IF;
END;
$body$;

CREATE OR REPLACE FUNCTION public.migration_drop_policy(
  p_table_name  TEXT,
  p_policy_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $body$
BEGIN
  PERFORM public.migration_safe_exec(
    p_table_name,
    format('DROP POLICY IF EXISTS %I ON public.%I', p_policy_name, p_table_name)
  );
END;
$body$;

CREATE OR REPLACE FUNCTION public.user_vendor_ids()
RETURNS TABLE(vendor_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT id FROM public.vendors
  WHERE user_id = auth.uid() OR owner_id = auth.uid();
$body$;

CREATE OR REPLACE FUNCTION public.check_refund_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  order_total      NUMERIC;
  existing_refunds NUMERIC;
BEGIN
  SELECT COALESCE(total, 0) INTO order_total
  FROM public.orders WHERE id = NEW.order_id;

  SELECT COALESCE(SUM(refund_amount), 0) INTO existing_refunds
  FROM public.return_requests
  WHERE order_id = NEW.order_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (existing_refunds + NEW.refund_amount) > order_total THEN
    RAISE EXCEPTION 'Refund amount exceeds order total. Order: %, Total: %, Already refunded: %, New refund: %',
      NEW.order_id, order_total, existing_refunds, NEW.refund_amount;
  END IF;

  RETURN NEW;
END;
$body$;

-- ============================================================
-- 2. FIX REFUND CAP TRIGGER
-- ============================================================

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'return_requests'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'return_requests'
      AND column_name = 'refund_amount'
  ) THEN
    DROP TRIGGER IF EXISTS refund_amount_check ON public.return_requests;
    CREATE TRIGGER refund_amount_check
      BEFORE INSERT OR UPDATE ON public.return_requests
      FOR EACH ROW EXECUTE FUNCTION public.check_refund_amount();
  END IF;
END $do$;

-- ============================================================
-- 3. ENABLE RLS ON ALL EXISTING PUBLIC TABLES
-- ============================================================

DO $do$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $do$;

-- ============================================================
-- 4. DROP KNOWN OVERLY PERMISSIVE POLICIES
-- ============================================================

DO $do$
DECLARE
  rec TEXT[];
  policies TEXT[][] := ARRAY[
    ARRAY['products',              'Anon can manage products'],
    ARRAY['orders',                'Anyone can read orders'],
    ARRAY['orders',                'Anyone can update order status'],
    ARRAY['order_items',           'Anyone can read order items'],
    ARRAY['orders',                'Users can read own orders'],
    ARRAY['order_items',           'Users can read own order items'],
    ARRAY['promo_codes',           'Anon can manage promos'],
    ARRAY['promo_codes',           'Public can read active promos'],
    ARRAY['vendors',               'Anyone can insert vendor'],
    ARRAY['vendors',               'Admin can manage vendors'],
    ARRAY['vendors',               'Public can read active vendors'],
    ARRAY['vendors',               'Vendors can update their own store'],
    ARRAY['store_settings',        'Anyone can update settings'],
    ARRAY['store_settings',        'Anyone can read settings'],
    ARRAY['vendor_delivery_config','Admin can manage delivery configs'],
    ARRAY['vendor_delivery_config','Vendors manage own delivery config'],
    ARRAY['shipments',             'Admin can manage shipments'],
    ARRAY['shipments',             'Vendors read own shipments'],
    ARRAY['shipments',             'Vendors insert own shipments'],
    ARRAY['shipments',             'Vendors update own shipments'],
    ARRAY['shipment_events',       'Anyone can read shipment events'],
    ARRAY['shipment_events',       'Service can insert shipment events'],
    ARRAY['messages',              'Admin can manage messages'],
    ARRAY['messages',              'Vendors manage own messages'],
    ARRAY['payouts',               'Admin can manage payouts'],
    ARRAY['payouts',               'Vendors read own payouts'],
    ARRAY['return_requests',       'All read returns'],
    ARRAY['return_requests',       'Admin update returns'],
    ARRAY['return_requests',       'Anyone insert return'],
    ARRAY['gift_cards',            'Public read gift card'],
    ARRAY['gift_cards',            'Service update gift card'],
    ARRAY['user_points',           'Users read own points'],
    ARRAY['user_points',           'Service manages points'],
    ARRAY['points_transactions',   'Users read own transactions'],
    ARRAY['points_transactions',   'Service insert transactions'],
    ARRAY['flash_sales',           'Admin can manage flash sales'],
    ARRAY['flash_sales',           'Public can read active flash sales'],
    ARRAY['flash_sales',           'Vendors manage own flash sales'],
    ARRAY['product_questions',     'Public read questions'],
    ARRAY['product_questions',     'Anyone insert question'],
    ARRAY['seller_notifications',  'Vendors read own notifications'],
    ARRAY['seller_notifications',  'Service inserts'],
    ARRAY['seller_notifications',  'Vendors mark read'],
    ARRAY['referral_signups',      'Service manages referrals'],
    ARRAY['pixel_events',          'Anyone can insert pixel event'],
    ARRAY['pixel_events',          'Vendors read own pixel events'],
    ARRAY['niches',                'Public read niches'],
    ARRAY['niches',                'Service role manages niches'],
    ARRAY['analytics_events',      'vendors_read_own_analytics'],
    ARRAY['analytics_events',      'anyone_insert_events'],
    ARRAY['integration_health',    'Vendors can read own health'],
    ARRAY['integration_health',    'Vendors can upsert own health'],
    ARRAY['sponsored_products',    'sponsored_public_active'],
    ARRAY['sponsored_products',    'sponsored_vendor_own'],
    ARRAY['sponsored_products',    'sponsored_vendor_insert'],
    ARRAY['sponsored_products',    'sponsored_vendor_update'],
    ARRAY['sponsored_products',    'sponsored_service_all'],
    ARRAY['subscription_plans',    'plans_public_read'],
    ARRAY['vendor_subscriptions',  'subscriptions_vendor_read'],
    ARRAY['vendor_subscriptions',  'subscriptions_service_insert'],
    ARRAY['vendor_subscriptions',  'subscriptions_service_update'],
    ARRAY['newsletter_subscribers','anyone_can_subscribe'],
    ARRAY['admin_token_blacklist', 'service_role_only'],
    ARRAY['audit_log',             'service_role_insert'],
    ARRAY['audit_log',             'service_role_select'],
    ARRAY['admin_audit_log',       'Service can insert audit log']
  ];
BEGIN
  FOREACH rec SLICE 1 IN ARRAY policies
  LOOP
    BEGIN
      PERFORM public.migration_drop_policy(rec[1], rec[2]);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $do$;

-- ============================================================
-- 5. SAFE POLICIES FOR CORE TABLES
-- ============================================================

DO $do$
BEGIN
  PERFORM public.migration_safe_exec('products',
    $sql$DROP POLICY IF EXISTS products_public_read ON public.products;
         CREATE POLICY products_public_read ON public.products FOR SELECT USING (COALESCE(is_active, true) = true);
         DROP POLICY IF EXISTS products_vendor_manage ON public.products;
         CREATE POLICY products_vendor_manage ON public.products FOR ALL USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids())) WITH CHECK (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));$sql$
  );

  PERFORM public.migration_safe_exec('orders',
    $sql$DROP POLICY IF EXISTS orders_customer_select ON public.orders;
         CREATE POLICY orders_customer_select ON public.orders FOR SELECT USING (auth.uid() = user_id);
         DROP POLICY IF EXISTS orders_vendor_select ON public.orders;
         CREATE POLICY orders_vendor_select ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = orders.id AND oi.vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids())));
         DROP POLICY IF EXISTS orders_guest_insert ON public.orders;
         CREATE POLICY orders_guest_insert ON public.orders FOR INSERT WITH CHECK (true);$sql$
  );

  PERFORM public.migration_safe_exec('order_items',
    $sql$DROP POLICY IF EXISTS order_items_guest_insert ON public.order_items;
         CREATE POLICY order_items_guest_insert ON public.order_items FOR INSERT WITH CHECK (true);
         DROP POLICY IF EXISTS order_items_vendor_select ON public.order_items;
         CREATE POLICY order_items_vendor_select ON public.order_items FOR SELECT USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));
         DROP POLICY IF EXISTS order_items_vendor_update ON public.order_items;
         CREATE POLICY order_items_vendor_update ON public.order_items FOR UPDATE USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));$sql$
  );

  PERFORM public.migration_safe_exec('vendors',
    $sql$DROP POLICY IF EXISTS vendors_public_read ON public.vendors;
         CREATE POLICY vendors_public_read ON public.vendors FOR SELECT USING (is_active = true);
         DROP POLICY IF EXISTS vendors_select_own ON public.vendors;
         CREATE POLICY vendors_select_own ON public.vendors FOR SELECT USING (auth.uid() = user_id);
         DROP POLICY IF EXISTS vendors_update_own ON public.vendors;
         CREATE POLICY vendors_update_own ON public.vendors FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);$sql$
  );

  PERFORM public.migration_safe_exec('promo_codes',
    $sql$DROP POLICY IF EXISTS promo_codes_public_read ON public.promo_codes;
         CREATE POLICY promo_codes_public_read ON public.promo_codes FOR SELECT USING (is_active = true);
         DROP POLICY IF EXISTS promo_codes_vendor_manage ON public.promo_codes;
         CREATE POLICY promo_codes_vendor_manage ON public.promo_codes FOR ALL USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids())) WITH CHECK (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));$sql$
  );

  PERFORM public.migration_safe_exec('store_settings',
    $sql$DROP POLICY IF EXISTS store_settings_public_read ON public.store_settings;
         CREATE POLICY store_settings_public_read ON public.store_settings FOR SELECT USING (true);
         DROP POLICY IF EXISTS store_settings_service_write ON public.store_settings;
         CREATE POLICY store_settings_service_write ON public.store_settings FOR ALL USING (false) WITH CHECK (false);$sql$
  );

  PERFORM public.migration_safe_exec('reviews',
    $sql$DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
         CREATE POLICY reviews_public_read ON public.reviews FOR SELECT USING (true);
         DROP POLICY IF EXISTS reviews_public_insert ON public.reviews;
         CREATE POLICY reviews_public_insert ON public.reviews FOR INSERT WITH CHECK (true);$sql$
  );

  PERFORM public.migration_safe_exec('gift_cards',
    $sql$DROP POLICY IF EXISTS gift_cards_service_only ON public.gift_cards;
         CREATE POLICY gift_cards_service_only ON public.gift_cards FOR ALL USING (false) WITH CHECK (false);$sql$
  );

  PERFORM public.migration_safe_exec('return_requests',
    $sql$DROP POLICY IF EXISTS return_requests_vendor_select ON public.return_requests;
         CREATE POLICY return_requests_vendor_select ON public.return_requests FOR SELECT USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));
         DROP POLICY IF EXISTS return_requests_service_all ON public.return_requests;
         CREATE POLICY return_requests_service_all ON public.return_requests FOR ALL USING (false) WITH CHECK (false);
         DROP POLICY IF EXISTS return_requests_public_insert ON public.return_requests;
         CREATE POLICY return_requests_public_insert ON public.return_requests FOR INSERT WITH CHECK (true);$sql$
  );

  PERFORM public.migration_safe_exec('password_reset_otps',
    $sql$DROP POLICY IF EXISTS password_reset_otps_service_only ON public.password_reset_otps;
         CREATE POLICY password_reset_otps_service_only ON public.password_reset_otps FOR ALL USING (false) WITH CHECK (false);$sql$
  );

  PERFORM public.migration_safe_exec('shipments',
    $sql$DROP POLICY IF EXISTS shipments_vendor_select ON public.shipments;
         CREATE POLICY shipments_vendor_select ON public.shipments FOR SELECT USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));$sql$
  );

  PERFORM public.migration_safe_exec('messages',
    $sql$DROP POLICY IF EXISTS messages_vendor_select ON public.messages;
         CREATE POLICY messages_vendor_select ON public.messages FOR SELECT USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));
         DROP POLICY IF EXISTS messages_vendor_insert ON public.messages;
         CREATE POLICY messages_vendor_insert ON public.messages FOR INSERT WITH CHECK (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));$sql$
  );

  PERFORM public.migration_safe_exec('payouts',
    $sql$DROP POLICY IF EXISTS payouts_vendor_select ON public.payouts;
         CREATE POLICY payouts_vendor_select ON public.payouts FOR SELECT USING (vendor_id IN (SELECT vendor_id FROM public.user_vendor_ids()));$sql$
  );
END $do$;

-- Service-only policies for admin/audit/sensitive tables.
DO $do$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'admin_audit_log','audit_log','admin_token_blacklist','admin_revoked_tokens',
    'admin_used_totp_counters','admin_sessions','seller_sessions','vendor_members',
    'security_events','seller_data_access_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    PERFORM public.migration_safe_exec(t,
      format(
        $sql$DROP POLICY IF EXISTS %I_service_only ON public.%I;
             CREATE POLICY %I_service_only ON public.%I FOR ALL USING (false) WITH CHECK (false);$sql$,
        t, t, t, t
      )
    );
  END LOOP;
END $do$;

-- ============================================================
-- 6. MISSING FOREIGN KEY
-- ============================================================

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_items'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id)
      ON DELETE SET NULL;
  END IF;
END $do$;

-- ============================================================
-- 7. REVOKE PUBLIC EXECUTE ON SENSITIVE FUNCTIONS
-- ============================================================

DO $do$
DECLARE
  fn TEXT;
  sensitive TEXT[] := ARRAY[
    'redeem_gift_card(text,numeric)',
    'claim_gift_card(text,numeric)',
    'award_loyalty_points(uuid,uuid,integer,text)',
    'redeem_loyalty_points(uuid,integer,text)',
    'decrement_product_stock(text,integer)',
    'increment_promo_uses(uuid)',
    'decrement_promo_uses(uuid)',
    'get_vendor_customers(uuid)',
    'get_vendor_customer_detail(uuid,text)',
    'resolve_vendor_phone_by_hash(uuid,text)',
    'get_vendor_pending_orders(uuid)',
    'get_vendor_analytics(uuid,integer)',
    'get_cod_stats()',
    'get_top_products(timestamptz,integer)',
    'get_monthly_revenue(integer)',
    'get_orders_by_phone(text)',
    'get_cod_wilaya_stats()',
    'get_cod_provider_stats()',
    'get_orders_by_wilaya(integer)',
    'get_orders_by_provider(integer)',
    'get_daily_revenue(integer)',
    'log_audit_event(uuid,text,text,text,text,jsonb,jsonb,inet,text,jsonb)',
    'cleanup_old_admin_sessions()',
    'cleanup_expired_revoked_tokens()',
    'purge_expired_tokens()',
    'check_refund_amount()',
    'update_product_rating()',
    'update_product_rating_on_delete()',
    'create_commission_on_delivery()',
    'restore_stock_on_cancel()',
    'user_vendor_ids()',
    'current_vendor_id()'
  ];
BEGIN
  FOREACH fn IN ARRAY sensitive
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    EXCEPTION
      WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $do$;

GRANT EXECUTE ON FUNCTION public.user_vendor_ids() TO authenticated;

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
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'products'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.vendors
      WHERE user_id = auth.uid() OR owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vendor_logos_public_read ON storage.objects;
CREATE POLICY vendor_logos_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'vendor-logos');

DROP POLICY IF EXISTS vendor_logos_owner_upload ON storage.objects;
CREATE POLICY vendor_logos_owner_upload ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'vendor-logos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.vendors
      WHERE user_id = auth.uid() OR owner_id = auth.uid()
    )
  );

-- ============================================================
-- DONE
-- ============================================================
