-- ============================================================
-- Migration 003 — Security Hardening + Performance
-- Run AFTER schema.sql and migration_002_shipments.sql
-- ============================================================

-- ============================================================
-- SECTION 1: LOCK DOWN OPEN RLS POLICIES
-- ============================================================

-- ── Orders ────────────────────────────────────────────────────
-- Drop permissive policies that let ANY anonymous user read all
-- customer PII or flip order statuses.
drop policy if exists "Anyone can read orders"        on public.orders;
drop policy if exists "Anyone can update order status" on public.orders;

-- Customers can only read their own orders (requires auth).
-- All admin reads bypass RLS via service_role key server-side.
create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Guest checkout orders (user_id = null) are admin-only via service_role.
-- We do NOT add a policy for null user_id reads — admins use service_role.

-- ── Products ──────────────────────────────────────────────────
-- Drop the catch-all "Anon can manage products" policy.
-- Products are only written by the admin using the service_role key.
drop policy if exists "Anon can manage products" on public.products;

-- ── Promo Codes ───────────────────────────────────────────────
-- Drop the catch-all "Anon can manage promos" policy.
-- Only active promos are readable; writes are service_role only.
drop policy if exists "Anon can manage promos"     on public.promo_codes;
drop policy if exists "Public can read active promos" on public.promo_codes;

create policy "Public can read active promos"
  on public.promo_codes for select
  using (is_active = true);

-- ── Store Settings ────────────────────────────────────────────
-- Completely remove anonymous write access to store configuration.
drop policy if exists "Anyone can update settings" on public.store_settings;

-- Settings reads remain public (needed for shipping cost display).
-- Writes go through service_role only (admin API routes).

-- ── Vendor Delivery Config ────────────────────────────────────
-- Credentials must only be readable by the owning vendor, not public.
alter table if exists public.vendor_delivery_config enable row level security;

drop policy if exists "Vendors can read own config" on public.vendor_delivery_config;
create policy "Vendors can read own config"
  on public.vendor_delivery_config for select
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

drop policy if exists "Vendors can upsert own config" on public.vendor_delivery_config;
create policy "Vendors can upsert own config"
  on public.vendor_delivery_config for all
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

-- ── Reviews ───────────────────────────────────────────────────
-- Keep public reads; inserts go through the API route (which rate-limits).
-- Drop any permissive update/delete policies.
drop policy if exists "Anyone can update reviews" on public.reviews;
drop policy if exists "Anyone can delete reviews" on public.reviews;

-- ── Admin Audit Log ───────────────────────────────────────────
-- No anon reads — audit log is admin-only.
drop policy if exists "Anyone can read audit log"   on public.admin_audit_log;
drop policy if exists "Anyone can insert audit log" on public.admin_audit_log;

create policy "Service can insert audit log"
  on public.admin_audit_log for insert
  with check (true);
-- Reads: service_role only (no RLS policy needed — service_role bypasses RLS)


-- ============================================================
-- SECTION 2: PRODUCT RATING TRIGGER (fixes race condition)
-- ============================================================

-- Move rating recalculation from application code to the database.
-- Eliminates the read-modify-write race when two reviews arrive simultaneously.
create or replace function update_product_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.products
  set
    rating       = (
      select round(avg(rating)::numeric, 1)
      from public.reviews
      where product_id = NEW.product_id
    ),
    review_count = (
      select count(*)
      from public.reviews
      where product_id = NEW.product_id
    )
  where id = NEW.product_id;
  return NEW;
end;
$$;

drop trigger if exists after_review_insert on public.reviews;
create trigger after_review_insert
  after insert on public.reviews
  for each row execute function update_product_rating();

-- Also recalculate on review delete (admin moderation)
drop trigger if exists after_review_delete on public.reviews;
create trigger after_review_delete
  after delete on public.reviews
  for each row execute function update_product_rating_on_delete();

create or replace function update_product_rating_on_delete()
returns trigger language plpgsql security definer as $$
begin
  update public.products
  set
    rating       = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.reviews
      where product_id = OLD.product_id
    ), 0),
    review_count = (
      select count(*)
      from public.reviews
      where product_id = OLD.product_id
    )
  where id = OLD.product_id;
  return OLD;
end;
$$;

drop trigger if exists after_review_delete on public.reviews;
create trigger after_review_delete
  after delete on public.reviews
  for each row execute function update_product_rating_on_delete();


-- ============================================================
-- SECTION 3: AGGREGATE RPCs (fix JS-side full-table pulls)
-- ============================================================

-- COD Stats — replaces fetching all orders into JS memory
create or replace function get_cod_stats()
returns json language sql stable security definer as $$
  select json_build_object(
    'total',     count(*),
    'delivered', count(*) filter (where delivery_outcome = 'delivered'),
    'failed',    count(*) filter (where delivery_outcome = 'failed'),
    'returned',  count(*) filter (where delivery_outcome = 'returned'),
    'pending',   count(*) filter (where delivery_outcome is null)
  )
  from public.orders
  where payment_method = 'cash';
$$;

-- Top Products — replaces fetching 1000 items into JS memory
create or replace function get_top_products(since_date timestamptz, result_limit int default 10)
returns table(
  product_name  text,
  total_units   bigint,
  total_revenue numeric
) language sql stable security definer as $$
  select
    oi.product_name,
    sum(oi.quantity)::bigint  as total_units,
    sum(oi.subtotal)          as total_revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.created_at >= since_date
  group by oi.product_name
  order by total_revenue desc
  limit result_limit;
$$;

-- Monthly Revenue — replaces in-JS aggregation
create or replace function get_monthly_revenue(months_back int default 6)
returns table(
  month_label text,
  revenue     numeric,
  orders      bigint
) language sql stable security definer as $$
  select
    to_char(date_trunc('month', o.created_at), 'Mon YY') as month_label,
    sum(o.total)                                          as revenue,
    count(*)                                              as orders
  from public.orders o
  where o.created_at >= date_trunc('month', now()) - (months_back - 1) * interval '1 month'
  group by date_trunc('month', o.created_at)
  order by date_trunc('month', o.created_at);
$$;

-- Order Tracking by Phone — no-login tracking page support
create or replace function get_orders_by_phone(customer_phone text)
returns table(
  id               uuid,
  full_name        text,
  wilaya           text,
  city             text,
  status           text,
  total            numeric,
  delivery_outcome text,
  yalidine_tracking text,
  delivery_provider text,
  created_at       timestamptz
) language sql stable security definer as $$
  select
    o.id, o.full_name, o.wilaya, o.city, o.status, o.total,
    o.delivery_outcome, o.yalidine_tracking, o.delivery_provider, o.created_at
  from public.orders o
  where o.phone = customer_phone
  order by o.created_at desc
  limit 20;
$$;

-- Atomic promo increment with max_uses guard (prevents over-redemption)
create or replace function increment_promo_uses(promo_id uuid)
returns boolean language plpgsql security definer as $$
declare
  v_max_uses  integer;
  v_uses_count integer;
begin
  select max_uses, uses_count
  into v_max_uses, v_uses_count
  from public.promo_codes
  where id = promo_id
  for update;  -- row-level lock prevents concurrent over-increment

  if not found then
    return false;
  end if;

  if v_max_uses is not null and v_uses_count >= v_max_uses then
    return false;  -- already maxed out
  end if;

  update public.promo_codes
  set uses_count = uses_count + 1
  where id = promo_id;

  return true;
end;
$$;

-- Vendor analytics — replaces full order_items scan in JS
create or replace function get_vendor_analytics(
  p_vendor_id uuid,
  p_days_back int default 30
)
returns json language plpgsql stable security definer as $$
declare
  v_since timestamptz := now() - (p_days_back || ' days')::interval;
  v_result json;
begin
  select json_build_object(
    'totalRevenue',    coalesce(sum(oi.subtotal), 0),
    'totalOrders',     count(distinct oi.order_id),
    'deliveredOrders', count(distinct oi.order_id) filter (where o.delivery_outcome = 'delivered'),
    'returnedOrders',  count(distinct oi.order_id) filter (where o.delivery_outcome = 'returned'),
    'pendingOrders',   count(distinct oi.order_id) filter (
                         where o.delivery_outcome is null and o.status != 'cancelled'
                       )
  )
  into v_result
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.vendor_id = p_vendor_id
    and o.created_at >= v_since;

  return v_result;
end;
$$;


-- ============================================================
-- SECTION 4: COMPOSITE INDEXES (query performance)
-- ============================================================

-- Product listing: niche + featured flag (homepage hero)
create index if not exists products_niche_featured_idx
  on public.products(niche_id, is_featured, created_at desc);

-- Analytics date-range scans
create index if not exists orders_created_payment_idx
  on public.orders(created_at, payment_method);

-- Vendor order queries (most frequent seller dashboard query)
create index if not exists order_items_vendor_order_idx
  on public.order_items(vendor_id, order_id);

-- Order status + created_at (admin order list with status filter)
create index if not exists orders_status_created_idx
  on public.orders(status, created_at desc);

-- Shipment lookups by vendor + status
create index if not exists shipments_vendor_status_idx
  on public.shipments(vendor_id, status, created_at desc);

-- Review lookups (already have product_idx, add compound for sorted fetches)
create index if not exists reviews_product_created_idx
  on public.reviews(product_id, created_at desc);

-- Abandoned checkout lookups by status
create index if not exists abandoned_status_idx
  on public.abandoned_checkouts(status, updated_at desc);


-- ============================================================
-- SECTION 5: ORDERS — add vendor_id for multi-vendor tracking
-- ============================================================

-- Allow orders to track the primary vendor (for single-vendor stores)
alter table public.orders
  add column if not exists vendor_id uuid references public.vendors(id);

create index if not exists orders_vendor_idx on public.orders(vendor_id);
