-- Migration 030: Per-vendor pixel tracking
-- Part 1: vendor-specific Meta Pixel + Google Tag IDs
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS gtag_id       TEXT;

-- Part 2: custom first-party pixel system
-- Each vendor gets a unique pixel_id for embedding on external pages
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS pixel_id UUID DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS public.pixel_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL DEFAULT 'pageview',   -- pageview | click | custom
  page_url    TEXT,
  referrer    TEXT,
  user_agent  TEXT,
  ip_hash     TEXT,                                -- SHA-256 of IP for dedup, no PII stored
  country     TEXT,
  meta        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pixel_events ENABLE ROW LEVEL SECURITY;

-- Public insert (the pixel fires from anywhere)
CREATE POLICY "Anyone can insert pixel event"
  ON public.pixel_events FOR INSERT WITH CHECK (true);

-- Vendors read only their own events
CREATE POLICY "Vendors read own pixel events"
  ON public.pixel_events FOR SELECT
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS pixel_events_vendor_created
  ON public.pixel_events (vendor_id, created_at DESC);
