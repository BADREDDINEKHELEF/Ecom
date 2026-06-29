-- migration_054_missing_columns_and_rpcs.sql
-- Adds missing DB objects required by code introduced in the last batch of changes.
--
-- What this fixes:
--   1. orders.baridimob_payment_id  -- column referenced in BaridiMob POST handler
--   2. orders.idempotency_key       -- column + unique index for checkout dedup
--   3. failed_stock_restores table  -- dead-letter table for failed stock restores
--   4. claim_gift_card()            -- called by orders.ts instead of redeem_gift_card()
--   5. decrement_promo_uses()       -- promo rollback on order create failure
--   6. get_vendor_customers()       -- customer dashboard RPC
--   7. get_vendor_customer_detail() -- customer detail RPC
--   8. resolve_vendor_phone_by_hash() -- phone reveal RPC
--
-- Note: sha256(bytea) is a PostgreSQL 11+ built-in; no pgcrypto extension required.
-- The first 16 hex chars of sha256(lower(trim(phone))) are used as a stable opaque
-- customer ID — this must stay in sync with phoneToHash() in src/lib/supabase/customers.ts.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New columns on orders
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS baridimob_payment_id TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Partial unique index: only one non-null idempotency_key allowed per value.
-- Partial (WHERE NOT NULL) so rows without a key don't conflict with each other.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Dead-letter table for failed stock restores
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.failed_stock_restores (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  items      JSONB       NOT NULL,
  error      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.failed_stock_restores ENABLE ROW LEVEL SECURITY;
-- Service-role only; no direct access from client

CREATE INDEX IF NOT EXISTS idx_failed_stock_restores_created_at
  ON public.failed_stock_restores(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. claim_gift_card(p_code, p_amount) → boolean
--
-- Different from redeem_gift_card() which deducts LEAST(amount, balance).
-- This function requires balance >= p_amount and returns false otherwise,
-- so the caller can trust that giftCardDeduction equals exactly what was requested.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_gift_card(
  p_code   TEXT,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $claim_gc$
DECLARE
  v_id      UUID;
  v_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;

  BEGIN
    SELECT id, balance
    INTO   v_id, v_balance
    FROM   public.gift_cards
    WHERE  code      = upper(trim(p_code))
      AND  is_active = TRUE
      AND  (expires_at IS NULL OR expires_at > now())
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN RETURN FALSE;
  END;

  IF NOT FOUND OR v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.gift_cards
  SET    balance = balance - p_amount
  WHERE  id      = v_id;

  RETURN TRUE;
END;
$claim_gc$;

REVOKE ALL ON FUNCTION public.claim_gift_card(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_gift_card(TEXT, NUMERIC) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. decrement_promo_uses(p_promo_id) → void
--
-- Rollback companion to increment_promo_uses() (migration_003).
-- Called when order creation fails after the promo was already incremented,
-- so tight use-limit promos are not permanently consumed by failed orders.
-- GREATEST(0, ...) prevents going below zero on a double-rollback.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_promo_uses(
  p_promo_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.promo_codes
  SET    uses_count = GREATEST(0, uses_count - 1)
  WHERE  id = p_promo_id;
$$;

REVOKE ALL ON FUNCTION public.decrement_promo_uses(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_promo_uses(UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. get_vendor_customers(p_vendor_id) → TABLE
--
-- Returns one aggregated row per distinct customer (by phone) for a vendor.
-- phone_hash = first 16 hex chars of sha256(lower(trim(phone))) — stable opaque ID.
-- masked_phone = raw phone returned to JS so JS can apply its own masking.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_vendor_customers(
  p_vendor_id UUID
)
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    left(encode(sha256(lower(trim(o.phone))::bytea), 'hex'), 16) AS phone_hash,
    lower(trim(o.phone))                                          AS masked_phone,
    (array_agg(o.full_name ORDER BY o.created_at DESC))[1]       AS display_name,
    (array_agg(o.wilaya    ORDER BY o.created_at DESC))[1]       AS wilaya,
    count(DISTINCT o.id)::INT                                     AS order_count,
    sum(o.total)                                                  AS lifetime_value,
    round(
      100.0 * count(DISTINCT o.id) FILTER (WHERE o.status = 'delivered')
            / NULLIF(count(DISTINCT o.id), 0)
    )::INT                                                        AS delivery_rate,
    max(o.created_at)                                             AS last_order_at
  FROM public.order_items oi
  JOIN public.orders       o  ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND o.phone IS NOT NULL
    AND o.phone <> ''
  GROUP BY lower(trim(o.phone))
  ORDER BY max(o.created_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.get_vendor_customers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vendor_customers(UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_vendor_customer_detail(p_vendor_id, p_phone_hash) → TABLE
--
-- Returns all orders by a specific customer (identified by phone_hash) for a vendor.
-- p_phone_hash must be the first 16 hex chars of sha256(lower(trim(phone))).
-- ─────────────────────────────────────────────────────────────────────────────

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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id         AS order_id,
    o.full_name,
    lower(trim(o.phone)) AS masked_phone,
    o.wilaya,
    o.city,
    o.total,
    o.status,
    o.created_at
  FROM public.order_items oi
  JOIN public.orders       o  ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND left(encode(sha256(lower(trim(o.phone))::bytea), 'hex'), 16) = p_phone_hash
  GROUP BY o.id
  ORDER BY o.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_vendor_customer_detail(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vendor_customer_detail(UUID, TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. resolve_vendor_phone_by_hash(p_vendor_id, p_phone_hash) → TEXT
--
-- Returns the raw phone number for a given vendor + phone_hash.
-- Only called by the phone-reveal endpoint — keeps raw phone out of the
-- customer list queries so it never accidentally leaks.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resolve_vendor_phone_by_hash(
  p_vendor_id  UUID,
  p_phone_hash TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.phone
  FROM public.order_items oi
  JOIN public.orders       o  ON o.id = oi.order_id
  WHERE oi.vendor_id = p_vendor_id
    AND left(encode(sha256(lower(trim(o.phone))::bytea), 'hex'), 16) = p_phone_hash
    AND o.phone IS NOT NULL
    AND o.phone <> ''
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_vendor_phone_by_hash(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_vendor_phone_by_hash(UUID, TEXT) TO service_role;
