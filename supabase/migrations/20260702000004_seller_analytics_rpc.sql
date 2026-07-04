-- DB-side seller analytics RPC.
-- Replaces the JS aggregation in getSellerAnalytics() which fetched every order
-- and order_item for the vendor into application memory.
CREATE OR REPLACE FUNCTION get_seller_analytics(
  p_vendor_id UUID,
  p_days_back INT DEFAULT 30
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  -- Current period: one row per order containing the vendor's aggregated subtotal.
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

  -- Current period line items for product-level aggregations.
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

  -- Prior period: one row per order with vendor subtotal.
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

  -- Build the full result using JSONB subqueries against the CTEs above.
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

GRANT EXECUTE ON FUNCTION get_seller_analytics(UUID, INT) TO service_role;
