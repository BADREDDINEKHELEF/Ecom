-- ============================================================
-- Casbah Store — Supabase Schema  (fully idempotent — safe to re-run)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- PRODUCTS
create table if not exists public.products (
  id            text primary key,
  niche_id      text not null,
  category      text not null,
  name          text not null,
  description   text,
  price         numeric not null,
  compare_price numeric,
  images        text[]  default '{}',
  stock         integer default 0,
  rating        numeric default 0,
  review_count  integer default 0,
  tags          text[]  default '{}',
  is_new        boolean default false,
  is_featured   boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ORDERS
create table if not exists public.orders (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users,
  full_name      text not null,
  phone          text not null,
  wilaya         text not null,
  city           text not null,
  address        text not null,
  payment_method text not null default 'cash',
  status         text not null default 'pending',
  subtotal       numeric not null,
  shipping_cost  numeric not null default 0,
  total          numeric not null,
  created_at     timestamptz default now()
);

-- ORDER ITEMS
create table if not exists public.order_items (
  id            uuid default gen_random_uuid() primary key,
  order_id      uuid references public.orders(id) on delete cascade,
  product_id    text,
  product_name  text not null,
  product_image text,
  product_price numeric not null,
  quantity      integer not null check (quantity > 0),
  subtotal      numeric not null
);

-- ADMIN AUDIT LOG (append-only — never update/delete)
create table if not exists public.admin_audit_log (
  id         bigserial primary key,
  timestamp  timestamptz default now() not null,
  action     text not null,
  ip_address text,
  user_agent text,
  result     text not null,
  meta       jsonb
);

-- Prevent updates/deletes on audit log to keep it tamper-evident
create or replace rule no_update_audit as on update to public.admin_audit_log do instead nothing;
create or replace rule no_delete_audit as on delete to public.admin_audit_log do instead nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.products        enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.admin_audit_log enable row level security;

-- Products
drop policy if exists "Public can read products"  on public.products;
drop policy if exists "Anon can manage products"   on public.products;
create policy "Public can read products"  on public.products for select using (true);
create policy "Anon can manage products"  on public.products for all    using (true) with check (true);

-- Orders
drop policy if exists "Anyone can create orders"       on public.orders;
drop policy if exists "Anyone can read orders"         on public.orders;
drop policy if exists "Anyone can update order status" on public.orders;
create policy "Anyone can create orders"       on public.orders for insert with check (true);
create policy "Anyone can read orders"         on public.orders for select using (true);
create policy "Anyone can update order status" on public.orders for update using (true) with check (true);

-- Order items
drop policy if exists "Anyone can create order items" on public.order_items;
drop policy if exists "Anyone can read order items"   on public.order_items;
create policy "Anyone can create order items" on public.order_items for insert with check (true);
create policy "Anyone can read order items"   on public.order_items for select using (true);

-- Audit log
drop policy if exists "Service can insert audit log" on public.admin_audit_log;
create policy "Service can insert audit log" on public.admin_audit_log for insert with check (true);

-- Indexes for performance
create index if not exists orders_phone_idx      on public.orders(phone);
create index if not exists orders_status_idx     on public.orders(status);
create index if not exists orders_created_idx    on public.orders(created_at desc);
create index if not exists products_niche_idx    on public.products(niche_id);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ============================================================
-- PROMO / COUPON CODES
-- ============================================================

create table if not exists public.promo_codes (
  id             uuid default gen_random_uuid() primary key,
  code           text not null unique,
  discount_type  text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null,
  min_order      numeric default 0,
  max_uses       integer,            -- null = unlimited
  uses_count     integer default 0,
  expires_at     timestamptz,        -- null = never expires
  is_active      boolean default true,
  created_at     timestamptz default now()
);

alter table public.promo_codes enable row level security;

drop policy if exists "Public can read active promos" on public.promo_codes;
drop policy if exists "Anon can manage promos"        on public.promo_codes;
create policy "Public can read active promos" on public.promo_codes for select using (true);
create policy "Anon can manage promos"        on public.promo_codes for all    using (true) with check (true);

create index if not exists promo_codes_code_idx on public.promo_codes(code);

-- Orders: extended columns
alter table public.orders
  add column if not exists promo_code_id      uuid references public.promo_codes(id),
  add column if not exists discount_amount    numeric default 0,
  add column if not exists delivery_outcome   text check (delivery_outcome in ('delivered', 'failed', 'returned')),
  add column if not exists yalidine_tracking  text,
  add column if not exists yalidine_label_url text,
  add column if not exists delivery_provider  text; -- yalidine | zr | colivraison | maystro | rex | procolis | yassir

-- ============================================================
-- PRODUCT REVIEWS
-- ============================================================

create table if not exists public.reviews (
  id           uuid default gen_random_uuid() primary key,
  product_id   text not null references public.products(id) on delete cascade,
  author_name  text not null,
  phone        text,
  rating       integer not null check (rating >= 1 and rating <= 5),
  comment      text not null,
  is_verified  boolean default false,
  created_at   timestamptz default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Public can read reviews"  on public.reviews;
drop policy if exists "Anyone can insert reviews" on public.reviews;
create policy "Public can read reviews"   on public.reviews for select using (true);
create policy "Anyone can insert reviews" on public.reviews for insert with check (true);

create index if not exists reviews_product_idx on public.reviews(product_id);

-- ============================================================
-- VENDOR / MERCHANT PLATFORM
-- ============================================================

create table if not exists public.vendors (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade unique not null,
  store_name      text not null,
  store_slug      text not null unique,
  logo_url        text,
  description     text,
  phone           text,
  wilaya          text,
  commission_rate numeric default 10,
  is_approved     boolean default true,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

alter table public.vendors enable row level security;

drop policy if exists "Public can read active vendors"    on public.vendors;
drop policy if exists "Vendors can update their own store" on public.vendors;
drop policy if exists "Anyone can insert vendor"          on public.vendors;
drop policy if exists "Admin can manage vendors"          on public.vendors;
create policy "Public can read active vendors"     on public.vendors for select using (is_active = true);
create policy "Vendors can update their own store" on public.vendors for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Anyone can insert vendor"           on public.vendors for insert with check (true);
create policy "Admin can manage vendors"           on public.vendors for all    using (true) with check (true);

-- Link products and order_items to vendors
alter table public.products    add column if not exists vendor_id uuid references public.vendors(id);
alter table public.order_items add column if not exists vendor_id uuid references public.vendors(id);

create index if not exists vendors_slug_idx       on public.vendors(store_slug);
create index if not exists vendors_user_idx       on public.vendors(user_id);
create index if not exists products_vendor_idx    on public.products(vendor_id);
create index if not exists order_items_vendor_idx on public.order_items(vendor_id);

-- ============================================================
-- RPC: safely increment promo code usage count
-- ============================================================
create or replace function increment_promo_uses(promo_id uuid)
returns void language plpgsql as $$
begin
  update public.promo_codes
  set uses_count = uses_count + 1
  where id = promo_id;
end;
$$;
