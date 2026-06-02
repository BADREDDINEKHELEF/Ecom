-- ============================================================
-- Casbah Store — Supabase Schema
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

-- Products: anyone can read; service_role only for writes (admin uses anon + permissive below for MVP)
create policy "Public can read products"
  on public.products for select using (true);

create policy "Anon can manage products"
  on public.products for all using (true) with check (true);

-- Orders: anyone can insert (guest checkout); read all (admin filters in app)
create policy "Anyone can create orders"
  on public.orders for insert with check (true);

create policy "Anyone can read orders"
  on public.orders for select using (true);

create policy "Anyone can update order status"
  on public.orders for update using (true) with check (true);

-- Order items: same
create policy "Anyone can create order items"
  on public.order_items for insert with check (true);

create policy "Anyone can read order items"
  on public.order_items for select using (true);

-- Audit log: anyone can insert, no reads via anon
create policy "Service can insert audit log"
  on public.admin_audit_log for insert with check (true);

-- Indexes for performance
create index if not exists orders_phone_idx      on public.orders(phone);
create index if not exists orders_status_idx     on public.orders(status);
create index if not exists orders_created_idx    on public.orders(created_at desc);
create index if not exists products_niche_idx    on public.products(niche_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
