-- migration_009: newsletter_subscribers table
-- Stores email newsletter sign-ups from the footer form.
-- Uses email as primary key to prevent duplicate subscriptions naturally.

create table if not exists public.newsletter_subscribers (
  email         text        primary key,
  subscribed_at timestamptz not null default now(),
  source        text        not null default 'footer'
);

-- Prevent any user/service from reading other subscribers' emails via RLS
alter table public.newsletter_subscribers enable row level security;

-- Only service_role (server-side admin) can read the full list
-- Anon can INSERT (subscribe) but cannot read or delete
create policy "anyone_can_subscribe"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (true);

-- Admins can read/delete via service_role (bypasses RLS)
-- No read policy needed for anon/authenticated — admin client bypasses RLS anyway

-- Index for fast lookups by subscription date for analytics
create index if not exists newsletter_subscribers_subscribed_at_idx
  on public.newsletter_subscribers (subscribed_at desc);
