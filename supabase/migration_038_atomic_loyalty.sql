-- Atomic loyalty point operations to prevent race conditions.
-- Bug 1: awardPoints used upsert (SET not +=) then read-modify-write → double-credits existing users
-- Bug 2: redeemPoints used read-modify-write with no row lock → double-spend under concurrency

-- Award points atomically: INSERT with delta, ON CONFLICT DO += (never overwrites existing balance)
CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_user_id  UUID,
  p_order_id UUID,
  p_delta    INTEGER,
  p_reason   TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $award$
BEGIN
  IF p_delta <= 0 THEN
    RAISE EXCEPTION 'invalid_delta: p_delta must be positive';
  END IF;

  INSERT INTO public.user_points (user_id, points_balance, lifetime_points, updated_at)
  VALUES (p_user_id, p_delta, p_delta, now())
  ON CONFLICT (user_id) DO UPDATE
    SET points_balance  = user_points.points_balance  + EXCLUDED.points_balance,
        lifetime_points = user_points.lifetime_points + EXCLUDED.lifetime_points,
        updated_at      = now();

  INSERT INTO public.points_transactions (user_id, order_id, delta, reason)
  VALUES (p_user_id, p_order_id, p_delta, p_reason);
END;
$award$;

-- Redeem points atomically: UPDATE WHERE balance >= amount (row-level guard, no separate read)
-- Returns TRUE if successful, FALSE if balance insufficient
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_user_id UUID,
  p_points  INTEGER,
  p_reason  TEXT DEFAULT 'Utilisation en caisse'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $redeem$
DECLARE
  v_rows INT;
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'invalid_points: p_points must be positive';
  END IF;

  UPDATE public.user_points
  SET    points_balance = points_balance - p_points,
         updated_at     = now()
  WHERE  user_id        = p_user_id
    AND  points_balance >= p_points;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.points_transactions (user_id, delta, reason)
  VALUES (p_user_id, -p_points, p_reason);

  RETURN TRUE;
END;
$redeem$;

GRANT EXECUTE ON FUNCTION award_loyalty_points(UUID, UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION redeem_loyalty_points(UUID, INTEGER, TEXT) TO service_role;
