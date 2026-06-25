-- Add email column to orders for payment callback confirmation emails
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS email TEXT;
