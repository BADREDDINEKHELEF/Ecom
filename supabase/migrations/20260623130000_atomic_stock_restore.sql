-- This migration creates an RPC to atomically restore product stock.
-- It's used to fix the H-02 race condition vulnerability where concurrent
-- order failures could lead to corrupted stock counts.
CREATE OR REPLACE FUNCTION restore_product_stocks(
  items JSONB -- e.g., '[{"productId": "uuid", "quantity": 3}, ...]'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(items)
  LOOP
    UPDATE public.products
    SET    stock = stock + (item->>'quantity')::INT
    WHERE  id   = (item->>'productId')::UUID;
  END LOOP;
END;
$$;
