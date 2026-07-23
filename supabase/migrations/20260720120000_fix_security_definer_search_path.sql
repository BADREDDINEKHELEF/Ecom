-- Fix SECURITY DEFINER functions missing SET search_path = public.
-- Without an explicit search_path, these functions use the default
-- search path (typically "$user", public), which can be exploited by
-- a user who creates a schema earlier in the path with objects that
-- shadow system functions — leading to privilege escalation.
--
-- Each function is re-created with SET search_path = public to lock
-- the resolution scope at definition time.
--
-- Safe to re-run; all statements use CREATE OR REPLACE.
--
-- Also adds a CHECK constraint on products.stock to prevent
-- negative stock at the database level (data integrity).

-- ============================================================
-- 1. restore_product_stocks (migrations/20260623130000)
-- ============================================================
CREATE OR REPLACE FUNCTION restore_product_stocks(
  items JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(items)
  LOOP
    UPDATE public.products
    SET    stock = stock + (item->>'quantity')::INT
    WHERE  id   = (item->>'productId')::TEXT;
  END LOOP;
END;
$$;

-- ============================================================
-- 2. decrement_product_stocks (migrations/20260702000005)
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_product_stocks(
  items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  v_product_id TEXT;
  v_quantity INT;
  v_stock INT;
  result JSONB := '[]'::JSONB;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(items)
  LOOP
    v_product_id := item->>'productId';
    v_quantity := COALESCE((item->>'quantity')::INT, 0);

    IF v_quantity <= 0 THEN
      result := result || jsonb_build_object('productId', v_product_id, 'ok', false, 'reason', 'invalid_quantity');
      CONTINUE;
    END IF;

    SELECT stock
    INTO v_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      result := result || jsonb_build_object('productId', v_product_id, 'ok', false, 'reason', 'not_found');
    ELSIF v_stock < v_quantity THEN
      result := result || jsonb_build_object('productId', v_product_id, 'ok', false, 'reason', 'insufficient', 'available', v_stock);
    ELSE
      UPDATE public.products
      SET stock = stock - v_quantity
      WHERE id = v_product_id;
      result := result || jsonb_build_object('productId', v_product_id, 'ok', true);
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- ============================================================
-- 3. get_seller_analytics (migrations/20260702000004)
-- ============================================================
CREATE OR REPLACE FUNCTION get_seller_analytics(
  p_vendor_id UUID,
  p_days_back INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ := NOW() - (p_days_back || ' days')::INTERVAL;
  v_prior_start TIMESTAMPTZ := NOW() - ((p_days_back * 2) || ' days')::INTERVAL;
  v_prior_end TIMESTAMPTZ := v_since;
  v_months INT := CASE
    WHEN p_days_back <= 31 THEN 1
    WHEN p_days_back <= 93 THEN 3
    ELSE 6
  END;
  v_current_orders JSONB;
  v_current_items JSONB;
  v_prior_orders JSONB;
  v_result JSONB;
BEGIN
  SELECT COALESCE(JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'order_id', t.order_id,
      'status', t.status,
      'wilaya', t.wilaya,
      'delivery_provider', COALESCE(t.delivery_provider, 'direct'),
      'created_at', t.created_at,
      'vendor_total', t.vendor_total
    )
  ), '[]'::JSONB)
  INTO v_current_orders
  FROM (
    SELECT
      oi.order_id,
      o.status,
      o.wilaya,
      o.delivery_provider,
      o.created_at,
      SUM(oi.subtotal) AS vendor_total
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.vendor_id = p_vendor_id
      AND o.created_at >= v_since
    GROUP BY oi.order_id, o.status, o.wilaya, o.delivery_provider, o.created_at
  ) t;

  SELECT COALESCE(JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'order_id', oi.order_id,
      'product_name', oi.product_name,
      'quantity', oi.quantity,
      'subtotal', oi.subtotal,
      'status', o.status
    )
  ), '[]'::JSONB)
  INTO v_current_items
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND o.created_at >= v_since;

  SELECT COALESCE(JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'order_id', t.order_id,
      'status', t.status,
      'vendor_total', t.vendor_total
    )
  ), '[]'::JSONB)
  INTO v_prior_orders
  FROM (
    SELECT
      oi.order_id,
      o.status,
      SUM(oi.subtotal) AS vendor_total
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.vendor_id = p_vendor_id
      AND o.created_at >= v_prior_start
      AND o.created_at < v_prior_end
    GROUP BY oi.order_id, o.status
  ) t;

  WITH current_orders AS (
    SELECT * FROM JSONB_TO_RECORDSET(v_current_orders)
    AS x(order_id UUID, status TEXT, wilaya TEXT, delivery_provider TEXT, created_at TIMESTAMPTZ, vendor_total NUMERIC)
  ),
  current_items AS (
    SELECT * FROM JSONB_TO_RECORDSET(v_current_items)
    AS x(order_id UUID, product_name TEXT, quantity INT, subtotal NUMERIC, status TEXT)
  ),
  prior_orders AS (
    SELECT * FROM JSONB_TO_RECORDSET(v_prior_orders)
    AS x(order_id UUID, status TEXT, vendor_total NUMERIC)
  ),
  current_metrics AS (
    SELECT
      COALESCE(SUM(vendor_total) FILTER (WHERE status = 'delivered'), 0) AS total_revenue,
      COUNT(*) FILTER (WHERE status <> 'cancelled') AS total_orders,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
      COUNT(*) FILTER (WHERE status IN ('confirmed', 'shipped', 'delivered')) AS confirmed_orders,
      COUNT(*) FILTER (WHERE status IN ('shipped', 'delivered')) AS shipped_orders,
      COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
      COUNT(*) FILTER (WHERE status = 'returned') AS returned_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
      COUNT(*) FILTER (WHERE status IN ('delivered', 'returned')) AS finished_orders
    FROM current_orders
  ),
  prior_metrics AS (
    SELECT
      COALESCE(SUM(vendor_total) FILTER (WHERE status = 'delivered'), 0) AS prior_revenue,
      COUNT(*) FILTER (WHERE status <> 'cancelled') AS prior_orders
    FROM prior_orders
  ),
  monthly_chart AS (
    SELECT COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'month', TO_CHAR(d.month_date, 'Mon'),
        'revenue', COALESCE(o.revenue, 0),
        'orders', COALESCE(o.orders, 0)
      ) ORDER BY d.month_date
    ), '[]'::JSONB) AS data
    FROM generate_series(
      DATE_TRUNC('month', NOW()) - ((v_months - 1) || ' months')::INTERVAL,
      DATE_TRUNC('month', NOW()),
      '1 month'::INTERVAL
    ) AS d(month_date)
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(vendor_total) FILTER (WHERE status = 'delivered'), 0) AS revenue,
        COUNT(*) FILTER (WHERE status <> 'cancelled') AS orders
      FROM current_orders
      WHERE DATE_TRUNC('month', created_at) = d.month_date
    ) o ON TRUE
  ),
  day_chart AS (
    SELECT COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'date', TO_CHAR(d.day_date, 'DD Mon'),
        'revenue', COALESCE(o.revenue, 0),
        'orders', COALESCE(o.orders, 0)
      ) ORDER BY d.day_date
    ), '[]'::JSONB) AS data
    FROM generate_series(
      (NOW() - (LEAST(p_days_back, 90) || ' days')::INTERVAL)::DATE,
      NOW()::DATE,
      '1 day'::INTERVAL
    ) AS d(day_date)
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(vendor_total) FILTER (WHERE status = 'delivered'), 0) AS revenue,
        COUNT(*) FILTER (WHERE status <> 'cancelled') AS orders
      FROM current_orders
      WHERE created_at::DATE = d.day_date
    ) o ON TRUE
  ),
  wilaya_chart AS (
    SELECT COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'wilaya', wilaya,
        'orders', orders,
        'revenue', revenue,
        'delivered', delivered,
        'returned', returned,
        'avgOrder', CASE WHEN orders > 0 THEN ROUND(revenue / orders) ELSE 0 END,
        'deliveryRate', CASE WHEN orders > 0 THEN ROUND((delivered::NUMERIC / orders) * 100) ELSE 0 END,
        'returnRate', CASE WHEN orders > 0 THEN ROUND((returned::NUMERIC / orders) * 100) ELSE 0 END
      ) ORDER BY orders DESC
    ), '[]'::JSONB) AS data
    FROM (
      SELECT
        wilaya,
        COUNT(*) FILTER (WHERE status <> 'cancelled') AS orders,
        COALESCE(SUM(vendor_total) FILTER (WHERE status = 'delivered'), 0) AS revenue,
        COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
        COUNT(*) FILTER (WHERE status = 'returned') AS returned
      FROM current_orders
      WHERE wilaya IS NOT NULL
      GROUP BY wilaya
      ORDER BY orders DESC
      LIMIT 15
    ) w
  ),
  provider_chart AS (
    SELECT COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT('provider', provider, 'count', cnt) ORDER BY cnt DESC
    ), '[]'::JSONB) AS data
    FROM (
      SELECT COALESCE(delivery_provider, 'direct') AS provider, COUNT(*) AS cnt
      FROM current_orders
      GROUP BY delivery_provider
    ) p
  ),
  top_products_chart AS (
    SELECT COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'name', product_name,
        'units', units,
        'revenue', revenue,
        'orders', orders,
        'avgPrice', CASE WHEN units > 0 THEN ROUND(revenue / units) ELSE 0 END
      ) ORDER BY revenue DESC
    ), '[]'::JSONB) AS data
    FROM (
      SELECT
        product_name,
        SUM(quantity) AS units,
        SUM(subtotal) AS revenue,
        COUNT(DISTINCT order_id) AS orders
      FROM current_items
      GROUP BY product_name
      ORDER BY revenue DESC
      LIMIT 15
    ) p
  ),
  dow_chart AS (
    SELECT COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'day', CASE dow
          WHEN 0 THEN 'Dim' WHEN 1 THEN 'Lun' WHEN 2 THEN 'Mar' WHEN 3 THEN 'Mer'
          WHEN 4 THEN 'Jeu' WHEN 5 THEN 'Ven' WHEN 6 THEN 'Sam'
        END,
        'orders', orders,
        'revenue', revenue
      ) ORDER BY dow
    ), '[]'::JSONB) AS data
    FROM (
      SELECT
        EXTRACT(DOW FROM created_at)::INT AS dow,
        COUNT(*) FILTER (WHERE status <> 'cancelled') AS orders,
        COALESCE(SUM(vendor_total) FILTER (WHERE status = 'delivered'), 0) AS revenue
      FROM current_orders
      GROUP BY EXTRACT(DOW FROM created_at)
    ) d
  )
  SELECT JSONB_BUILD_OBJECT(
    'totalRevenue', cm.total_revenue,
    'totalOrders', cm.total_orders,
    'pendingOrders', cm.pending_orders,
    'confirmedOrders', cm.confirmed_orders,
    'shippedOrders', cm.shipped_orders,
    'deliveredOrders', cm.delivered_orders,
    'returnedOrders', cm.returned_orders,
    'cancelledOrders', cm.cancelled_orders,
    'avgOrderValue', CASE WHEN cm.delivered_orders > 0 THEN ROUND(cm.total_revenue / cm.delivered_orders) ELSE 0 END,
    'returnRate', CASE WHEN cm.finished_orders > 0 THEN ROUND((cm.returned_orders::NUMERIC / cm.finished_orders) * 100) ELSE 0 END,
    'deliveryRate', CASE WHEN cm.finished_orders > 0 THEN ROUND((cm.delivered_orders::NUMERIC / cm.finished_orders) * 100) ELSE 0 END,
    'priorRevenue', pm.prior_revenue,
    'priorOrders', pm.prior_orders,
    'revenueGrowth', CASE WHEN pm.prior_revenue > 0 THEN ROUND(((cm.total_revenue - pm.prior_revenue) / pm.prior_revenue) * 100) ELSE 0 END,
    'ordersGrowth', CASE WHEN pm.prior_orders > 0 THEN ROUND(((cm.total_orders - pm.prior_orders) / pm.prior_orders) * 100) ELSE 0 END,
    'projectedRevenue', CASE WHEN p_days_back > 0 THEN ROUND((cm.total_revenue / p_days_back) * 30) ELSE 0 END,
    'monthly', mc.data,
    'byDay', dc.data,
    'byWilaya', wc.data,
    'byProvider', pc.data,
    'topProducts', tpc.data,
    'worstProducts', '[]'::JSONB,
    'byDayOfWeek', dwc.data
  )
  INTO v_result
  FROM current_metrics cm
  CROSS JOIN prior_metrics pm
  CROSS JOIN monthly_chart mc
  CROSS JOIN day_chart dc
  CROSS JOIN wilaya_chart wc
  CROSS JOIN provider_chart pc
  CROSS JOIN top_products_chart tpc
  CROSS JOIN dow_chart dwc;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- ============================================================
-- 4. check_refund_amount (migrations/20260706140000, migration_055)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_refund_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
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
$body$;

-- ============================================================
-- 5. decrement_product_stock (migration_005)
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id TEXT,
  p_quantity   INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INT;
BEGIN
  SELECT stock
  INTO v_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  IF v_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE public.products
  SET    stock = stock - p_quantity
  WHERE  id = p_product_id;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 6. restore_stock_on_cancel (migration_005)
-- ============================================================
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.products p
    SET    stock = stock + oi.quantity
    FROM   public.order_items oi
    WHERE  oi.order_id = NEW.id
      AND  oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. get_vendor_pending_orders (migration_005)
-- ============================================================
CREATE OR REPLACE FUNCTION get_vendor_pending_orders(p_vendor_id UUID)
RETURNS TABLE (
  order_id       UUID,
  order_status   TEXT,
  order_total    NUMERIC,
  order_created  TIMESTAMPTZ,
  full_name      TEXT,
  phone          TEXT,
  wilaya         TEXT,
  city           TEXT,
  item_id        UUID,
  product_id     TEXT,
  product_name   TEXT,
  product_image  TEXT,
  product_price  NUMERIC,
  quantity       INT,
  subtotal       NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id           AS order_id,
    o.status       AS order_status,
    o.total        AS order_total,
    o.created_at   AS order_created,
    o.full_name,
    o.phone,
    o.wilaya,
    o.city,
    oi.id          AS item_id,
    oi.product_id,
    oi.product_name,
    oi.product_image,
    oi.product_price,
    oi.quantity,
    oi.subtotal
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND o.status IN ('pending', 'confirmed')
  ORDER BY o.created_at DESC;
$$;

-- ============================================================
-- 8. get_cod_wilaya_stats (migration_006)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_cod_wilaya_stats()
RETURNS TABLE (
  wilaya               TEXT,
  total_cod_orders     BIGINT,
  collected            BIGINT,
  refused              BIGINT,
  returned             BIGINT,
  unreachable          BIGINT,
  pending_cod_orders   BIGINT,
  collection_rate_pct  NUMERIC,
  avg_attempts         NUMERIC,
  collected_amount_dzd NUMERIC,
  lost_amount_dzd      NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wilaya,
    COUNT(*) FILTER (WHERE payment_method = 'cash')                              AS total_cod_orders,
    COUNT(*) FILTER (WHERE cod_outcome = 'collected')                            AS collected,
    COUNT(*) FILTER (WHERE cod_outcome = 'refused')                              AS refused,
    COUNT(*) FILTER (WHERE cod_outcome = 'returned')                             AS returned,
    COUNT(*) FILTER (WHERE cod_outcome = 'unreachable')                          AS unreachable,
    COUNT(*) FILTER (WHERE payment_method = 'cash' AND cod_outcome IS NULL)      AS pending_cod_orders,
    ROUND(
      COUNT(*) FILTER (WHERE cod_outcome = 'collected')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE payment_method = 'cash' AND cod_outcome IS NOT NULL), 0) * 100,
      1
    )                                                                             AS collection_rate_pct,
    ROUND(AVG(delivery_attempts) FILTER (WHERE payment_method = 'cash'), 2)      AS avg_attempts,
    COALESCE(SUM(total) FILTER (WHERE cod_outcome = 'collected'), 0)              AS collected_amount_dzd,
    COALESCE(SUM(total) FILTER (WHERE cod_outcome IN ('refused','returned')), 0)  AS lost_amount_dzd
  FROM public.orders
  GROUP BY wilaya
  ORDER BY total_cod_orders DESC NULLS LAST;
$$;

-- ============================================================
-- 9. get_cod_provider_stats (migration_006)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_cod_provider_stats()
RETURNS TABLE (
  delivery_provider    TEXT,
  total_cod_orders     BIGINT,
  collected            BIGINT,
  refused              BIGINT,
  returned             BIGINT,
  collection_rate_pct  NUMERIC,
  collected_amount_dzd NUMERIC,
  lost_amount_dzd      NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(delivery_provider, 'Non assigne')                                   AS delivery_provider,
    COUNT(*) FILTER (WHERE payment_method = 'cash')                              AS total_cod_orders,
    COUNT(*) FILTER (WHERE cod_outcome = 'collected')                            AS collected,
    COUNT(*) FILTER (WHERE cod_outcome = 'refused')                              AS refused,
    COUNT(*) FILTER (WHERE cod_outcome = 'returned')                             AS returned,
    ROUND(
      COUNT(*) FILTER (WHERE cod_outcome = 'collected')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE payment_method = 'cash' AND cod_outcome IS NOT NULL), 0) * 100,
      1
    )                                                                             AS collection_rate_pct,
    COALESCE(SUM(total) FILTER (WHERE cod_outcome = 'collected'), 0)             AS collected_amount_dzd,
    COALESCE(SUM(total) FILTER (WHERE cod_outcome IN ('refused','returned')), 0) AS lost_amount_dzd
  FROM public.orders
  GROUP BY delivery_provider
  ORDER BY total_cod_orders DESC NULLS LAST;
$$;

-- ============================================================
-- 10. purge_expired_tokens (migration_007)
-- ============================================================
CREATE OR REPLACE FUNCTION purge_expired_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM admin_token_blacklist WHERE expires_at < NOW();
$$;

-- ============================================================
-- 11. log_audit_event (migration_008)
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_event(
  p_actor_id    UUID,
  p_actor_role  TEXT,
  p_action      TEXT,
  p_resource    TEXT,
  p_resource_id TEXT    DEFAULT NULL,
  p_old_value   JSONB   DEFAULT NULL,
  p_new_value   JSONB   DEFAULT NULL,
  p_ip_address  INET    DEFAULT NULL,
  p_user_agent  TEXT    DEFAULT NULL,
  p_metadata    JSONB   DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO audit_log (
    actor_id, actor_role, action, resource, resource_id,
    old_value, new_value, ip_address, user_agent, metadata
  ) VALUES (
    p_actor_id, p_actor_role, p_action, p_resource, p_resource_id,
    p_old_value, p_new_value, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- 12. cleanup_expired_revoked_tokens (migration_027)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_revoked_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.admin_revoked_tokens WHERE expires_at < now();
$$;

-- ============================================================
-- 13. create_commission_on_delivery (migration_032)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_commission_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
  v_rate      NUMERIC;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    SELECT oi.vendor_id INTO v_vendor_id
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND oi.vendor_id IS NOT NULL
    LIMIT 1;

    IF v_vendor_id IS NOT NULL THEN
      SELECT COALESCE(commission_rate, 0.05) INTO v_rate
      FROM public.vendors WHERE id = v_vendor_id;

      INSERT INTO public.commissions (order_id, vendor_id, order_total_dzd, commission_rate, commission_amount_dzd)
      VALUES (NEW.id, v_vendor_id, NEW.total, v_rate, ROUND(NEW.total * v_rate, 2))
      ON CONFLICT (order_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 14. cleanup_old_admin_sessions (migration_040)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_admin_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.admin_sessions
  WHERE (is_active = false OR expires_at < now())
    AND created_at < now() - INTERVAL '7 days';
$$;

-- ============================================================
-- 15. Data integrity: prevent negative stock (schema.sql L16)
-- ============================================================
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_non_negative;
ALTER TABLE public.products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
