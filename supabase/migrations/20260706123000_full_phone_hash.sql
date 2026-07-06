-- Use the full SHA-256 hash (64 hex chars) for customer phone hashes.
-- The previous 16-char truncation provided only ~64 bits and was vulnerable
-- to brute-force reversal of Algerian phone numbers.

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
    encode(sha256(lower(trim(o.phone))::bytea), 'hex')            AS phone_hash,
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
    AND encode(sha256(lower(trim(o.phone))::bytea), 'hex') = p_phone_hash
  GROUP BY o.id
  ORDER BY o.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_vendor_customer_detail(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vendor_customer_detail(UUID, TEXT) TO service_role;

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
    AND encode(sha256(lower(trim(o.phone))::bytea), 'hex') = p_phone_hash
    AND o.phone IS NOT NULL
    AND o.phone <> ''
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_vendor_phone_by_hash(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_vendor_phone_by_hash(UUID, TEXT) TO service_role;
