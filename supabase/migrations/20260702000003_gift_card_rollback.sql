-- Adds a rollback RPC for gift-card claims so order failures can restore balance.
-- createOrder() deducts balance via claim_gift_card; if stock or order insert
-- fails afterwards, restore_gift_card returns the reserved amount.
CREATE OR REPLACE FUNCTION restore_gift_card(
  p_code TEXT,
  p_amount NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.gift_cards
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE code = p_code;
  RETURN FOUND;
END;
$$;
