-- Store the selected color variant on each order item
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_color TEXT;
