-- migration_055_payment_integrity.sql
-- Hardens payment / checkout integrity after the Q3 audit.
--
-- 1. orders.points_redeemed           — audit trail of loyalty discount per order
-- 2. Loyalty RPCs bound to order_id   — prevents double-spend & enables rollback
-- 3. financial_transactions table     — immutable ledger for payment state transitions
-- 4. record_financial_transaction()   — helper to keep audit logging consistent
--
-- All changes are defensive: they skip tables/columns that do not yet exist.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Order-level loyalty audit column
-- ─────────────────────────────────────────────────────────────────────────────

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders'
      AND column_name = 'points_redeemed'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN points_redeemed NUMERIC DEFAULT 0;
  END IF;
END $do$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Loyalty RPCs bound to an order (only if loyalty tables exist)
-- ─────────────────────────────────────────────────────────────────────────────

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_points'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'points_transactions'
  ) THEN

    CREATE OR REPLACE FUNCTION public.award_loyalty_points(
      p_user_id  UUID,
      p_order_id UUID,
      p_delta    INTEGER,
      p_reason   TEXT DEFAULT ''
    )
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'guest_not_allowed: loyalty points require an authenticated user';
      END IF;

      IF p_delta <= 0 THEN
        RAISE EXCEPTION 'invalid_delta: p_delta must be positive';
      END IF;

      INSERT INTO public.user_points (user_id, points_balance, lifetime_points, updated_at)
      VALUES (p_user_id, p_delta, p_delta, now())
      ON CONFLICT (user_id) DO UPDATE
        SET points_balance  = user_points.points_balance  + EXCLUDED.points_balance,
            lifetime_points = user_points.lifetime_points + EXCLUDED.points_balance,
            updated_at      = now();

      INSERT INTO public.points_transactions (user_id, order_id, delta, reason)
      VALUES (p_user_id, p_order_id, p_delta, p_reason);
    END;
    $body$;

    CREATE OR REPLACE FUNCTION public.redeem_loyalty_points_for_order(
      p_user_id    UUID,
      p_points     INTEGER,
      p_order_id   UUID,
      p_reason     TEXT DEFAULT 'Utilisation en caisse'
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_rows INT;
    BEGIN
      IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'guest_not_allowed: loyalty redemption requires an authenticated user';
      END IF;

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

      INSERT INTO public.points_transactions (user_id, order_id, delta, reason)
      VALUES (p_user_id, p_order_id, -p_points, p_reason);

      RETURN TRUE;
    END;
    $body$;

    CREATE OR REPLACE FUNCTION public.restore_loyalty_points(
      p_user_id    UUID,
      p_points     INTEGER,
      p_order_id   UUID,
      p_reason     TEXT DEFAULT 'Remboursement points - annulation commande'
    )
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      IF p_user_id IS NULL OR p_points <= 0 THEN
        RETURN;
      END IF;

      INSERT INTO public.user_points (user_id, points_balance, lifetime_points, updated_at)
      VALUES (p_user_id, p_points, 0, now())
      ON CONFLICT (user_id) DO UPDATE
        SET points_balance = user_points.points_balance + EXCLUDED.points_balance,
            updated_at     = now();

      INSERT INTO public.points_transactions (user_id, order_id, delta, reason)
      VALUES (p_user_id, p_order_id, p_points, p_reason);
    END;
    $body$;

    REVOKE ALL ON FUNCTION public.award_loyalty_points(UUID, UUID, INTEGER, TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.award_loyalty_points(UUID, UUID, INTEGER, TEXT) TO service_role;

    REVOKE ALL ON FUNCTION public.redeem_loyalty_points_for_order(UUID, INTEGER, UUID, TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points_for_order(UUID, INTEGER, UUID, TEXT) TO service_role;

    REVOKE ALL ON FUNCTION public.restore_loyalty_points(UUID, INTEGER, UUID, TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.restore_loyalty_points(UUID, INTEGER, UUID, TEXT) TO service_role;
  END IF;
END $do$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Financial transactions ledger (only if orders table exists)
-- ─────────────────────────────────────────────────────────────────────────────

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.financial_transactions (
      id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
      amount          NUMERIC NOT NULL,
      currency        TEXT NOT NULL DEFAULT 'DZD',
      status_before   TEXT,
      status_after    TEXT,
      payment_status_before TEXT,
      payment_status_after  TEXT,
      payment_method  TEXT,
      gateway_ref     TEXT,
      reason          TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS financial_transactions_service_only ON public.financial_transactions;
    CREATE POLICY financial_transactions_service_only ON public.financial_transactions
      FOR ALL USING (false) WITH CHECK (false);

    CREATE INDEX IF NOT EXISTS idx_financial_transactions_order_id
      ON public.financial_transactions(order_id);

    CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at
      ON public.financial_transactions(created_at DESC);
  END IF;
END $do$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper to record payment state transitions
-- ─────────────────────────────────────────────────────────────────────────────

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'financial_transactions'
  ) THEN
    CREATE OR REPLACE FUNCTION public.record_financial_transaction(
      p_order_id            UUID,
      p_amount              NUMERIC,
      p_currency            TEXT DEFAULT 'DZD',
      p_status_before       TEXT DEFAULT NULL,
      p_status_after        TEXT DEFAULT NULL,
      p_payment_status_before TEXT DEFAULT NULL,
      p_payment_status_after  TEXT DEFAULT NULL,
      p_payment_method      TEXT DEFAULT NULL,
      p_gateway_ref         TEXT DEFAULT NULL,
      p_reason              TEXT DEFAULT ''
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_id UUID;
    BEGIN
      INSERT INTO public.financial_transactions (
        order_id, amount, currency,
        status_before, status_after,
        payment_status_before, payment_status_after,
        payment_method, gateway_ref, reason
      )
      VALUES (
        p_order_id, p_amount, COALESCE(p_currency, 'DZD'),
        p_status_before, p_status_after,
        p_payment_status_before, p_payment_status_after,
        p_payment_method, p_gateway_ref, p_reason
      )
      RETURNING id INTO v_id;

      RETURN v_id;
    END;
    $body$;

    REVOKE ALL ON FUNCTION public.record_financial_transaction(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.record_financial_transaction(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
  END IF;
END $do$;
