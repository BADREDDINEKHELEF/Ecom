-- ============================================================
-- Migration 010 — Final RLS hardening
-- Removes all remaining permissive policies left over from the
-- initial schema.sql MVP state. Migration 003 already dropped
-- most of them; this file handles anything that may have been
-- missed or re-created, and adds missing product write policy.
-- ============================================================

-- ── Products ──────────────────────────────────────────────────
-- DROP any stale permissive "manage" policies if they still exist.
drop policy if exists "Anon can manage products" on public.products;

-- Vendors can manage only their own products via service_role in API routes.
-- Direct authenticated vendor product writes (used by seller portal via
-- Supabase auth session — NOT service_role) need this policy.
drop policy if exists "Vendors can manage own products" on public.products;
create policy "Vendors can manage own products"
  on public.products for all
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  )
  with check (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

-- ── Promo codes ───────────────────────────────────────────────
-- Ensure no stale all-access policy remains.
drop policy if exists "Anon can manage promos"         on public.promo_codes;
drop policy if exists "Public can read active promos"  on public.promo_codes;

-- Only active codes are visible to anonymous clients.
create policy "Public can read active promos"
  on public.promo_codes for select
  using (is_active = true);
-- All writes: service_role only (admin API). No additional policy needed.

-- ── Orders — restrict order reads to own orders only ──────────
-- "Anyone can read orders" was dropped in migration_003.
-- Re-confirm: ensure no permissive read policy exists.
drop policy if exists "Anyone can read orders"         on public.orders;
drop policy if exists "Anyone can update order status" on public.orders;

-- Guest orders (user_id = null) are read by service_role only.
-- Authenticated users can read their own orders.
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- ── Order items ───────────────────────────────────────────────
-- Items are read only in the context of an order the user owns.
-- The public insert policy is needed for guest checkout (no auth).
drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
  on public.order_items for select
  using (
    order_id in (
      select id from public.orders where user_id = auth.uid()
    )
  );

-- ── Messages ──────────────────────────────────────────────────
-- Ensure messages table has proper RLS if it exists.
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'messages') then
    alter table public.messages enable row level security;
  end if;
end $$;

drop policy if exists "Vendors manage own messages" on public.messages;
create policy "Vendors manage own messages"
  on public.messages for all
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  )
  with check (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

-- ── Vendor profiles ───────────────────────────────────────────
-- Public can read approved, active vendor profiles (needed for store pages).
-- Only the owning vendor can update their own profile.
drop policy if exists "Public can read active vendors"  on public.vendors;
drop policy if exists "Vendors can update own profile"  on public.vendors;

create policy "Public can read active vendors"
  on public.vendors for select
  using (is_active = true and is_approved = true);

create policy "Vendors can update own profile"
  on public.vendors for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Flash sales ───────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'flash_sales') then
    alter table public.flash_sales enable row level security;
    drop policy if exists "Public can read active flash sales" on public.flash_sales;
    create policy "Public can read active flash sales"
      on public.flash_sales for select
      using (is_active = true and ends_at > now());
    drop policy if exists "Vendors manage own flash sales" on public.flash_sales;
    create policy "Vendors manage own flash sales"
      on public.flash_sales for all
      using (
        vendor_id in (select id from public.vendors where user_id = auth.uid())
      )
      with check (
        vendor_id in (select id from public.vendors where user_id = auth.uid())
      );
  end if;
end $$;

-- ── Reviews ───────────────────────────────────────────────────
-- Anyone can read reviews; inserts go through rate-limited API.
-- No direct authenticated insert policy — the API route uses service_role.
drop policy if exists "Anyone can update reviews" on public.reviews;
drop policy if exists "Anyone can delete reviews" on public.reviews;

-- ── Verification ─────────────────────────────────────────────
-- Run this query after applying to verify no wildcard policies remain:
--
--   select tablename, policyname, cmd, permissive, qual
--   from pg_policies
--   where schemaname = 'public'
--     and (qual = 'true' or with_check = 'true')
--   order by tablename;
--
-- Only "Anyone can create orders", "Anyone can create order_items",
-- "Service can insert audit log", and newsletter INSERT should appear.
