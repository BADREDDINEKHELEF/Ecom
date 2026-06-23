CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(days_back INT DEFAULT 30)
RETURNS TABLE (
    "totalRevenue"        BIGINT,
    "revenueGrowth"       INT,
    "totalOrders"         BIGINT,
    "ordersGrowth"        INT,
    "avgOrderValue"       BIGINT,
    "deliveryRate"        INT,
    "returnRate"          INT,
    "totalVendors"        BIGINT,
    "activeVendors"       BIGINT,
    "newVendorsThisMonth" BIGINT,
    "totalProducts"       BIGINT,
    "activeSubscriptions" BIGINT,
    "mrr"                 BIGINT,
    "monthly"             JSONB,
    "byWilaya"            JSONB,
    "topVendors"          JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    since_date      TIMESTAMPTZ := NOW() - (days_back || ' days')::INTERVAL;
    prior_start_date TIMESTAMPTZ := NOW() - ((days_back * 2) || ' days')::INTERVAL;
    month_start_date TIMESTAMPTZ := DATE_TRUNC('month', NOW());

    -- Current Period Metrics
    current_total_revenue   BIGINT;
    current_total_orders    BIGINT;
    current_delivered_count BIGINT;
    current_returned_count  BIGINT;

    -- Prior Period Metrics
    prior_total_revenue     BIGINT;
    prior_total_orders      BIGINT;

BEGIN
    -- Aggregate current period orders
    SELECT
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0)::BIGINT,
        COUNT(CASE WHEN status <> 'cancelled' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN status = 'returned' THEN 1 END)::BIGINT
    INTO
        current_total_revenue,
        current_total_orders,
        current_delivered_count,
        current_returned_count
    FROM public.orders
    WHERE created_at >= since_date;

    -- Aggregate prior period orders
    SELECT
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0)::BIGINT,
        COUNT(CASE WHEN status <> 'cancelled' THEN 1 END)::BIGINT
    INTO
        prior_total_revenue,
        prior_total_orders
    FROM public.orders
    WHERE created_at >= prior_start_date AND created_at < since_date;

    -- RETURN QUERY to build the final result set
    RETURN QUERY
    WITH vendor_stats AS (
        SELECT
            COUNT(*)::BIGINT,
            COUNT(CASE WHEN is_active = TRUE THEN 1 END)::BIGINT,
            COUNT(CASE WHEN created_at >= month_start_date THEN 1 END)::BIGINT
        FROM public.vendors
    ),
    product_stats AS (
        SELECT COUNT(*)::BIGINT FROM public.products
    ),
    subscription_stats AS (
        SELECT
            COUNT(*)::BIGINT,
            COALESCE(SUM(p.price_dzd), 0)::BIGINT
        FROM public.vendor_subscriptions vs
        JOIN public.subscription_plans p ON vs.plan_id = p.id
        WHERE vs.status = 'active'
    ),
    monthly_chart AS (
        SELECT jsonb_agg(d) FROM (
            SELECT
                TO_CHAR(month_series.month, 'Mon') as month,
                COALESCE(o.revenue, 0) as revenue,
                COALESCE(o.orders, 0) as orders
            FROM generate_series(
                DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
                DATE_TRUNC('month', NOW()),
                '1 month'
            ) AS month_series(month)
            LEFT JOIN (
                SELECT
                    DATE_TRUNC('month', created_at) as month,
                    SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)::BIGINT as revenue,
                    COUNT(id)::BIGINT as orders
                FROM public.orders
                WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '5 months') AND status <> 'cancelled'
                GROUP BY 1
            ) o ON month_series.month = o.month
            ORDER BY month_series.month
        ) d
    ),
    wilaya_chart AS (
        SELECT jsonb_agg(d) FROM (
            SELECT
                wilaya,
                COUNT(*)::BIGINT as orders,
                SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)::BIGINT as revenue
            FROM public.orders
            WHERE created_at >= since_date AND wilaya IS NOT NULL AND status <> 'cancelled'
            GROUP BY wilaya
            ORDER BY orders DESC
            LIMIT 15
        ) d
    ),
    top_vendors_chart AS (
        SELECT jsonb_agg(d) FROM (
             WITH vendor_order_stats AS (
                SELECT
                    oi.vendor_id,
                    o.id as order_id,
                    o.status,
                    oi.subtotal
                FROM public.order_items oi
                JOIN public.orders o ON oi.order_id = o.id
                WHERE o.created_at >= since_date AND oi.vendor_id IS NOT NULL
            ),
            vendor_agg AS (
                SELECT
                    v.id,
                    v.store_name as name,
                    v.store_slug as slug,
                    COUNT(DISTINCT vos.order_id) as orders,
                    SUM(CASE WHEN vos.status = 'delivered' THEN vos.subtotal ELSE 0 END)::BIGINT as revenue,
                    COUNT(DISTINCT CASE WHEN vos.status = 'delivered' THEN vos.order_id END)::BIGINT as delivered
                FROM vendor_order_stats vos
                JOIN public.vendors v ON vos.vendor_id = v.id
                GROUP BY v.id, v.store_name, v.store_slug
            )
            SELECT
                *,
                CASE WHEN orders > 0 THEN (delivered * 100 / orders)::INT ELSE 0 END as "deliveryRate"
            FROM vendor_agg
            ORDER BY revenue DESC
            LIMIT 10
        ) d
    )
    SELECT
        current_total_revenue,
        CASE WHEN prior_total_revenue > 0 THEN ((current_total_revenue - prior_total_revenue) * 100 / prior_total_revenue)::INT ELSE 0 END,
        current_total_orders,
        CASE WHEN prior_total_orders > 0 THEN ((current_total_orders - prior_total_orders) * 100 / prior_total_orders)::INT ELSE 0 END,
        CASE WHEN current_delivered_count > 0 THEN (current_total_revenue / current_delivered_count)::BIGINT ELSE 0 END,
        CASE WHEN current_total_orders > 0 THEN (current_delivered_count * 100 / current_total_orders)::INT ELSE 0 END,
        CASE WHEN current_total_orders > 0 THEN (current_returned_count * 100 / current_total_orders)::INT ELSE 0 END,
        (SELECT * FROM vendor_stats),
        (SELECT * FROM product_stats),
        (SELECT * FROM subscription_stats),
        (SELECT * FROM monthly_chart),
        (SELECT * FROM wilaya_chart),
        (SELECT * FROM top_vendors_chart);
END;
$$;
