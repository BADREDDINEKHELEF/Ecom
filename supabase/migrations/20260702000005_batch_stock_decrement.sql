-- Batch stock decrement RPC.
-- Replaces the per-item loop in createOrder() with a single DB round-trip.
-- Returns a JSONB array of per-item results so callers know which products
-- failed (not_found / insufficient) and can roll back successful decrements.
CREATE OR REPLACE FUNCTION decrement_product_stocks(
  items JSONB -- e.g., '[{"productId": "uuid", "quantity": 3}, ...]'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION decrement_product_stocks(JSONB) TO service_role;
