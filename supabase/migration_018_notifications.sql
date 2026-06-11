-- migration_018: Batch 3 — Notifications Infrastructure
-- In-app seller notifications table, optional email column on abandoned_checkouts

CREATE TABLE IF NOT EXISTS public.seller_notifications (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  title     TEXT NOT NULL,
  body      TEXT,
  link      TEXT,
  is_read   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors read own notifications" ON public.seller_notifications FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Service inserts" ON public.seller_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Vendors mark read" ON public.seller_notifications FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Add email capture to abandoned_checkouts for recovery emails
ALTER TABLE public.abandoned_checkouts ADD COLUMN IF NOT EXISTS email TEXT;
