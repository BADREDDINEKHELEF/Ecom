-- migration_048: Add delivery_type column to orders table for granular delivery tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type TEXT CHECK (delivery_type IN ('home', 'office', 'stop_desk')) DEFAULT 'home';
