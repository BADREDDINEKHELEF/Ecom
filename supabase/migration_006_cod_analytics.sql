-- ============================================================
-- Migration 006 — COD Analytics
-- Tracks Cash-on-Delivery outcomes by wilaya and provider.
-- This is the most critical analytics signal for Algerian e-commerce:
-- COD refusal rates vary widely by wilaya and delivery partner.
-- ============================================================

-- ── 1. Add COD outcome columns to orders ────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cod_outcome TEXT
    CHECK (cod_outcome IN ('collected', 'refused', 'unreachable', 'returned', 'partial'))
    DEFAULT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_attempts INT DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refusal_reason TEXT DEFAULT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_provider TEXT DEFAULT NULL;


-- ── 2. COD analytics view (per wilaya + provider) ───────────

CREATE OR REPLACE VIEW public.cod_analytics AS
SELECT
  wilaya,
  COALESCE(delivery_provider, 'unassigned')              AS delivery_provider,
  COUNT(*)  FILTER (WHERE payment_method = 'cash')       AS total_cod_orders,
  COUNT(*)  FILTER (WHERE cod_outcome = 'collected')     AS collected,
  COUNT(*)  FILTER (WHERE cod_outcome = 'refused')       AS refused,
  COUNT(*)  FILTER (WHERE cod_outcome = 'returned')      AS returned,
  COUNT(*)  FILTER (WHERE cod_outcome = 'unreachable')   AS unreachable,
  ROUND(
    COUNT(*) FILTER (WHERE cod_outcome = 'collected')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE payment_method = 'cash' AND cod_outcome IS NOT NULL), 0) * 100,
    1
  )                                                       AS collection_rate_pct,
  ROUND(
    AVG(delivery_attempts) FILTER (WHERE payment_method = 'cash'),
    2
  )                                                       AS avg_attempts,
  SUM(total) FILTER (WHERE cod_outcome = 'collected')    AS collected_amount_dzd,
  SUM(total) FILTER (WHERE cod_outcome IN ('refused', 'returned'))
                                                          AS lost_amount_dzd,
  COUNT(*) FILTER (WHERE payment_method = 'cash' AND cod_outcome IS NULL)
                                                          AS pending_cod_orders
FROM public.orders
GROUP BY wilaya, delivery_provider;


-- ── 3. Provider-level summary view ───────────────────────────

CREATE OR REPLACE VIEW public.cod_provider_summary AS
SELECT
  COALESCE(delivery_provider, 'unassigned')              AS delivery_provider,
  COUNT(*)  FILTER (WHERE payment_method = 'cash')       AS total_cod_orders,
  COUNT(*)  FILTER (WHERE cod_outcome = 'collected')     AS collected,
  COUNT(*)  FILTER (WHERE cod_outcome = 'refused')       AS refused,
  COUNT(*)  FILTER (WHERE cod_outcome = 'returned')      AS returned,
  ROUND(
    COUNT(*) FILTER (WHERE cod_outcome = 'collected')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE payment_method = 'cash' AND cod_outcome IS NOT NULL), 0) * 100,
    1
  )                                                       AS collection_rate_pct,
  SUM(total) FILTER (WHERE cod_outcome = 'collected')    AS collected_amount_dzd,
  SUM(total) FILTER (WHERE cod_outcome IN ('refused', 'returned'))
                                                          AS lost_amount_dzd
FROM public.orders
GROUP BY delivery_provider;


-- ── 4. RPC: get_cod_wilaya_stats (for admin dashboard) ──────

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

GRANT EXECUTE ON FUNCTION public.get_cod_wilaya_stats() TO service_role;


-- ── 5. RPC: get_cod_provider_stats ──────────────────────────

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
AS $$
  SELECT
    COALESCE(delivery_provider, 'Non assigné')                                   AS delivery_provider,
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

GRANT EXECUTE ON FUNCTION public.get_cod_provider_stats() TO service_role;


-- ── 6. Performance index ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_cod_analytics
  ON public.orders (payment_method, cod_outcome, wilaya, delivery_provider)
  WHERE payment_method = 'cash';
