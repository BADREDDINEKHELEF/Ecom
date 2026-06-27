-- Migration 049: Integration Health & Verification Dashboard
CREATE TABLE if not exists public.integration_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  integration_name text NOT NULL, -- 'yalidine', 'zr', 'maystro', 'procolis', 'colivraison', 'rex', 'yassir', 'ecom', 'apec', 'meta_capi', 'tiktok_capi', 'google_capi'
  health_status text NOT NULL DEFAULT 'needs_configuration', -- 'connected', 'needs_configuration', 'failed'
  last_success_at timestamp with time zone,
  last_failure_at timestamp with time zone,
  last_error_message text,
  last_http_status integer,
  last_account_name text,
  last_quote_fee numeric,
  last_quote_duration text,
  last_quote_response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_vendor_integration UNIQUE (vendor_id, integration_name)
);

alter table public.integration_health enable row level security;

drop policy if exists "Vendors can read own health" on public.integration_health;
create policy "Vendors can read own health"
  on public.integration_health for select
  using (auth.uid() in (select user_id from public.vendors where id = vendor_id));

drop policy if exists "Vendors can upsert own health" on public.integration_health;
create policy "Vendors can upsert own health"
  on public.integration_health for all
  using (auth.uid() in (select user_id from public.vendors where id = vendor_id));
