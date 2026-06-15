-- migration_032_analytics_events.sql
-- Analytics infrastructure: event tracking, commissions, and supporting views

-- ── analytics_events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event       TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT,
  product_id  TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  vendor_id   UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  wilaya      TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_product    ON public.analytics_events(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_vendor     ON public.analytics_events(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session    ON public.analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_created    ON public.analytics_events(created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_read_own_analytics" ON public.analytics_events
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "anyone_insert_events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

-- ── commissions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id            UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id           UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_total_dzd     NUMERIC(12,2) NOT NULL,
  commission_rate     NUMERIC(6,4)  NOT NULL DEFAULT 0.05,
  commission_amount_dzd NUMERIC(12,2) NOT NULL,
  status              TEXT CHECK (status IN ('pending','paid','disputed')) DEFAULT 'pending',
  paid_at             TIMESTAMPTZ,
  admin_note          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_vendor  ON public.commissions(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_status  ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_order   ON public.commissions(order_id);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_read_own_commissions" ON public.commissions
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- Service role manages all commission records
CREATE POLICY "service_manage_commissions" ON public.commissions
  FOR ALL USING (true);

-- ── Trigger: auto-create commission when order is delivered ───────────────────
CREATE OR REPLACE FUNCTION public.create_commission_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
  v_rate      NUMERIC;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Get primary vendor from first order item
    SELECT oi.vendor_id INTO v_vendor_id
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND oi.vendor_id IS NOT NULL
    LIMIT 1;

    IF v_vendor_id IS NOT NULL THEN
      -- Use vendor-specific commission rate if available, else default 5%
      SELECT COALESCE(commission_rate, 0.05) INTO v_rate
      FROM public.vendors WHERE id = v_vendor_id;

      INSERT INTO public.commissions (order_id, vendor_id, order_total_dzd, commission_rate, commission_amount_dzd)
      VALUES (NEW.id, v_vendor_id, NEW.total, v_rate, ROUND(NEW.total * v_rate, 2))
      ON CONFLICT (order_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_commission_on_delivery ON public.orders;
CREATE TRIGGER trigger_commission_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_commission_on_delivery();

-- Unique constraint to prevent duplicate commissions per order
ALTER TABLE public.commissions
  ADD CONSTRAINT IF NOT EXISTS commissions_order_id_key UNIQUE (order_id);

-- ── Search events helper view ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.search_analytics AS
SELECT
  metadata->>'query'                             AS search_term,
  COUNT(*)                                       AS search_count,
  COALESCE(AVG((metadata->>'results_count')::int FILTER (WHERE metadata->>'results_count' ~ '^\d+$')), 0) AS avg_results,
  COUNT(*) FILTER (WHERE (metadata->>'results_count')::text = '0') AS zero_result_count,
  DATE_TRUNC('day', created_at AT TIME ZONE 'Africa/Algiers') AS day
FROM public.analytics_events
WHERE event = 'search'
  AND metadata->>'query' IS NOT NULL
GROUP BY 1, 5;

-- ── Seller product performance view ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.seller_product_stats AS
SELECT
  p.id           AS product_id,
  p.vendor_id,
  p.name         AS product_name,
  p.stock        AS stock_quantity,
  p.price,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.event = 'product_view')      AS total_views,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.event = 'add_to_cart')       AS add_to_cart_count,
  COUNT(DISTINCT oi.order_id)                                          AS total_orders,
  COALESCE(SUM(oi.subtotal), 0)                                        AS total_revenue_dzd,
  CASE
    WHEN COUNT(DISTINCT ae.id) FILTER (WHERE ae.event = 'product_view') > 0
    THEN ROUND(
      COUNT(DISTINCT oi.order_id)::numeric /
      COUNT(DISTINCT ae.id) FILTER (WHERE ae.event = 'product_view') * 100, 2
    )
    ELSE 0
  END AS conversion_rate_pct
FROM public.products p
LEFT JOIN public.analytics_events ae ON ae.product_id = p.id
LEFT JOIN public.order_items oi ON oi.product_id = p.id
LEFT JOIN public.orders o ON o.id = oi.order_id AND o.status NOT IN ('cancelled')
GROUP BY p.id, p.vendor_id, p.name, p.stock, p.price;

-- ── Delivery performance view ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.delivery_performance AS
SELECT
  COALESCE(delivery_provider, 'direct')       AS delivery_provider,
  COALESCE(wilaya, 'Inconnue')                AS wilaya,
  COUNT(*)                                    AS total_shipments,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (
      CASE WHEN delivery_outcome = 'delivered' THEN updated_at ELSE NULL END
      - created_at
    )) / 86400
  ), 1)                                       AS avg_delivery_days,
  COUNT(*) FILTER (WHERE delivery_outcome = 'delivered')  AS delivered_count,
  COUNT(*) FILTER (WHERE delivery_outcome = 'returned')   AS returns_count,
  ROUND(
    COUNT(*) FILTER (WHERE delivery_outcome = 'delivered')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE delivery_outcome IS NOT NULL), 0) * 100, 1
  )                                           AS on_time_rate_pct,
  ROUND(
    COUNT(*) FILTER (WHERE delivery_outcome = 'returned')::numeric /
    NULLIF(COUNT(*), 0) * 100, 1
  )                                           AS return_rate_pct
FROM public.orders
WHERE delivery_provider IS NOT NULL
GROUP BY 1, 2;
