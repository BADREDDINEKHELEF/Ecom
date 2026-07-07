-- Migration 052: Harden Gift Card RLS policies
-- Drops permissive public SELECT and UPDATE policies on the gift_cards table.
-- Access is now restricted exclusively to the server side via the service_role key.

DROP POLICY IF EXISTS "Public read gift card" ON public.gift_cards;
DROP POLICY IF EXISTS "Service update gift card" ON public.gift_cards;
