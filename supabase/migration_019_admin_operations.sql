-- migration_019: Batch 4 — Admin & Operations
-- Return/refund workflow, announcement banner, featured niches display order

CREATE TABLE IF NOT EXISTS public.return_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID NOT NULL REFERENCES public.orders(id),
  vendor_id     UUID REFERENCES public.vendors(id),
  reason        TEXT NOT NULL,
  photos        TEXT[] DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','rejected','refunded','returned')),
  admin_note    TEXT,
  refund_amount NUMERIC DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert return"  ON public.return_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "All read returns"      ON public.return_requests FOR SELECT USING (true);
CREATE POLICY "Admin update returns"  ON public.return_requests FOR UPDATE USING (true);

-- Announcement banner columns on store_settings
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS announcement_text   TEXT    DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS announcement_active BOOLEAN DEFAULT false;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS announcement_color  TEXT    DEFAULT 'amber';

-- Display order for niches (stored on the niches table or a separate featured table)
CREATE TABLE IF NOT EXISTS public.featured_niches (
  id            SERIAL PRIMARY KEY,
  niche_id      TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_visible    BOOLEAN DEFAULT true
);
