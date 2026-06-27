-- Add stop_desk_cause column to capture why customer chose stop desk delivery
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stop_desk_cause TEXT;
