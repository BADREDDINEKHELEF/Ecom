-- ============================================================
-- Migration 002: Delivery Module + Analytics Improvements
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Add updated_at to orders ───────────────────────────────────────────────────
alter table public.orders
  add column if not exists updated_at timestamptz default now();

-- ── Add created_at to order_items ─────────────────────────────────────────────
alter table public.order_items
  add column if not exists created_at timestamptz default now();

-- ── Vendor delivery API config (per-vendor Yalidine credentials) ──────────────
create table if not exists public.vendor_delivery_config (
  id                      uuid    default gen_random_uuid() primary key,
  vendor_id               uuid    not null references public.vendors(id) on delete cascade unique,
  default_provider        text    not null default 'yalidine',
  yalidine_api_id         text,
  yalidine_api_token      text,
  auto_create_shipment    boolean not null default false,
  notify_whatsapp         boolean not null default true,
  notify_sms              boolean not null default false,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.vendor_delivery_config enable row level security;
create policy "Vendors manage own delivery config"
  on public.vendor_delivery_config for all using (
    vendor_id = (select id from public.vendors where user_id = auth.uid())
  ) with check (
    vendor_id = (select id from public.vendors where user_id = auth.uid())
  );
create policy "Admin can manage delivery configs"
  on public.vendor_delivery_config for all using (true) with check (true);

-- ── Shipments table ───────────────────────────────────────────────────────────
create table if not exists public.shipments (
  id              uuid    default gen_random_uuid() primary key,
  order_id        uuid    not null references public.orders(id) on delete cascade,
  vendor_id       uuid    references public.vendors(id),
  provider        text    not null default 'yalidine',
  tracking_number text,
  label_url       text,
  status          text    not null default 'pending'
    check (status in ('pending','picked_up','in_transit','out_for_delivery','delivered','returned','failed','cancelled')),
  status_detail   text,
  wilaya          text,
  city            text,
  recipient_name  text,
  recipient_phone text,
  declared_value  numeric default 0,
  delivery_cost   numeric default 0,
  weight_kg       numeric default 1,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  delivered_at    timestamptz
);

alter table public.shipments enable row level security;
create policy "Vendors read own shipments"
  on public.shipments for select using (
    vendor_id = (select id from public.vendors where user_id = auth.uid())
    or vendor_id is null
  );
create policy "Vendors insert own shipments"
  on public.shipments for insert with check (
    vendor_id = (select id from public.vendors where user_id = auth.uid())
    or vendor_id is null
  );
create policy "Vendors update own shipments"
  on public.shipments for update using (
    vendor_id = (select id from public.vendors where user_id = auth.uid())
    or vendor_id is null
  );
create policy "Admin can manage shipments"
  on public.shipments for all using (true) with check (true);

-- ── Shipment tracking history ─────────────────────────────────────────────────
create table if not exists public.shipment_events (
  id            bigserial primary key,
  shipment_id   uuid    not null references public.shipments(id) on delete cascade,
  status        text    not null,
  detail        text,
  location      text,
  created_at    timestamptz default now()
);

alter table public.shipment_events enable row level security;
create policy "Anyone can read shipment events" on public.shipment_events for select using (true);
create policy "Service can insert shipment events" on public.shipment_events for insert with check (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists shipments_order_idx         on public.shipments(order_id);
create index if not exists shipments_vendor_idx        on public.shipments(vendor_id);
create index if not exists shipments_tracking_idx      on public.shipments(tracking_number);
create index if not exists shipments_status_idx        on public.shipments(status);
create index if not exists shipments_created_idx       on public.shipments(created_at desc);
create index if not exists shipment_events_ship_idx    on public.shipment_events(shipment_id);
create index if not exists orders_updated_idx          on public.orders(updated_at desc);
create index if not exists orders_wilaya_idx           on public.orders(wilaya);
create index if not exists order_items_product_idx     on public.order_items(product_id);
create index if not exists order_items_vendor_idx      on public.order_items(vendor_id);
create index if not exists products_category_idx       on public.products(category);

-- ── Auto-update updated_at via triggers ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create or replace trigger shipments_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

create or replace trigger vendor_delivery_config_updated_at
  before update on public.vendor_delivery_config
  for each row execute function public.set_updated_at();

-- ── Analytics helper: orders by wilaya (last N days) ─────────────────────────
create or replace function get_orders_by_wilaya(days_back integer default 30)
returns table(wilaya text, order_count bigint, total_revenue numeric)
language sql stable as $$
  select wilaya, count(*) as order_count, sum(total) as total_revenue
  from public.orders
  where created_at >= now() - (days_back || ' days')::interval
  group by wilaya
  order by order_count desc
  limit 20;
$$;

-- ── Analytics helper: orders by delivery provider ─────────────────────────────
create or replace function get_orders_by_provider(days_back integer default 30)
returns table(provider text, order_count bigint)
language sql stable as $$
  select coalesce(delivery_provider, 'COD direct') as provider, count(*) as order_count
  from public.orders
  where created_at >= now() - (days_back || ' days')::interval
  group by delivery_provider
  order by order_count desc;
$$;

-- ── Analytics helper: daily revenue for sparkline ────────────────────────────
create or replace function get_daily_revenue(days_back integer default 30)
returns table(day date, revenue numeric, orders bigint)
language sql stable as $$
  select date_trunc('day', created_at)::date as day,
         sum(total) as revenue,
         count(*) as orders
  from public.orders
  where created_at >= now() - (days_back || ' days')::interval
  group by day
  order by day;
$$;
