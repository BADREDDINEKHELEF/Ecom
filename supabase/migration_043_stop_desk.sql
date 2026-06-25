-- MIGRATION 043: Add Stop-Desk Option to Orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_stopdesk BOOLEAN DEFAULT false;
