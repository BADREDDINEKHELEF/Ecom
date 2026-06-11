-- migration_017: Batch 2 — Seller Productivity
-- Vendor vacation mode, bank details, low-stock threshold, product Q&A

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_on_vacation     BOOLEAN DEFAULT false;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS vacation_message    TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_rib            TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_ccp            TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_baridimob      TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_name   TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

CREATE TABLE IF NOT EXISTS public.product_questions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id   UUID REFERENCES public.vendors(id),
  author_name TEXT NOT NULL,
  phone       TEXT,
  question    TEXT NOT NULL,
  answer      TEXT,
  answered_at TIMESTAMPTZ,
  is_public   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read questions"   ON public.product_questions FOR SELECT USING (is_public = true);
CREATE POLICY "Anyone insert question"  ON public.product_questions FOR INSERT WITH CHECK (true);
