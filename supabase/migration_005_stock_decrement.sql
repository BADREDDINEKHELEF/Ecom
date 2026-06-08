-- ============================================================
-- Migration 005 — Atomic Stock Decrement + Performance
-- Run AFTER migration_004_payments_and_stores.sql
-- ============================================================

-- ============================================================
-- SECTION 1: ATOMIC STOCK DECREMENT RPC
-- ============================================================
-- Uses SELECT … FOR UPDATE (row-level lock) to guarantee that
-- two simultaneous orders for the last unit of a product cannot
-- both succeed. Returns TRUE if decremented, FALSE if stock is
-- insufficient (caller raises the user-facing error).

CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id TEXT,
  p_quantity   INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock INT;
BEGIN
  -- Lock the row so no concurrent transaction can read-then-decrement simultaneously
  SELECT stock
  INTO v_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  IF v_stock < p_quantity THEN
    RETURN FALSE;  -- Caller handles the user-facing error
  END IF;

  UPDATE public.products
  SET    stock = stock - p_quantity
  WHERE  id = p_product_id;

  RETURN TRUE;
END;
$$;

-- Grant execution to the service_role (used by createAdminClient)
GRANT EXECUTE ON FUNCTION decrement_product_stock(TEXT, INT) TO service_role;


-- ============================================================
-- SECTION 2: RESTORE STOCK ON ORDER CANCELLATION
-- ============================================================
-- When an order transitions to 'cancelled', restore the stock
-- for all its items so they become available again.

CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when status changes TO 'cancelled' FROM a non-cancelled state
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

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;
CREATE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_cancel();


-- ============================================================
-- SECTION 3: VENDOR PENDING ORDERS — DB-SIDE FILTER
-- ============================================================
-- Replaces the JS-side filter in getVendorPendingOrders().
-- Avoids fetching all vendor orders into application memory.

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

GRANT EXECUTE ON FUNCTION get_vendor_pending_orders(UUID) TO service_role;


-- ============================================================
-- SECTION 4: LOW STOCK ALERT INDEX
-- ============================================================
-- Enables fast queries to find products below their reorder threshold.

CREATE INDEX IF NOT EXISTS products_low_stock_idx
  ON public.products(vendor_id, stock)
  WHERE stock <= COALESCE(low_stock_threshold, 5);


-- ============================================================
-- SECTION 5: ORDERS — add updated_at column for tracking
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Auto-update updated_at on any order change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
