-- Atomic gift card redemption to fix stale-read race condition.
--
-- Bug: redeem/route.ts read card.balance in JS, then wrote SET balance = card.balance - deduct.
-- Two concurrent requests with different amounts both read balance=1000; one writes 400,
-- the other writes 700 (using stale 1000 base). Final balance 700 instead of 100.
-- The .gte() guard only prevented going negative, not the stale-base overwrite.
--
-- Fix: SELECT FOR UPDATE NOWAIT (row lock, fails immediately if contended) + relative
--      SET balance = balance - deduct inside one function.

CREATE OR REPLACE FUNCTION redeem_gift_card(
  p_code   TEXT,
  p_amount NUMERIC
)
RETURNS TABLE(deducted NUMERIC, remaining_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $redeem_gc$
DECLARE
  v_id      UUID;
  v_balance NUMERIC;
  v_active  BOOLEAN;
  v_expires TIMESTAMPTZ;
  v_deduct  NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: p_amount must be positive';
  END IF;

  -- Lock the row so concurrent calls serialize; NOWAIT returns error immediately
  -- instead of blocking serverless request indefinitely
  BEGIN
    SELECT id, balance, is_active, expires_at
    INTO   v_id, v_balance, v_active, v_expires
    FROM   public.gift_cards
    WHERE  code = upper(trim(p_code))
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'card_locked';
  END;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_card';
  END IF;

  IF NOT v_active THEN
    RAISE EXCEPTION 'inactive_card';
  END IF;

  IF v_expires IS NOT NULL AND v_expires < now() THEN
    RAISE EXCEPTION 'expired_card';
  END IF;

  IF v_balance <= 0 THEN
    RAISE EXCEPTION 'zero_balance';
  END IF;

  v_deduct := LEAST(p_amount, v_balance);

  UPDATE public.gift_cards
  SET    balance = balance - v_deduct  -- relative decrement on locked row
  WHERE  id      = v_id;

  RETURN QUERY SELECT v_deduct, v_balance - v_deduct;
END;
$redeem_gc$;

GRANT EXECUTE ON FUNCTION redeem_gift_card(TEXT, NUMERIC) TO service_role;
