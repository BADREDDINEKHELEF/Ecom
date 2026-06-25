-- Provider-specific tracking columns for multi-provider support
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS procolis_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS procolis_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS zr_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS zr_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS colivraison_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS colivraison_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS maystro_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS maystro_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rex_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rex_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS yassir_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS yassir_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ecom_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ecom_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS apec_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS apec_label_url text;

CREATE INDEX IF NOT EXISTS idx_orders_provider_tracking ON public.orders(delivery_provider, yalidine_tracking, procolis_tracking, zr_tracking);
