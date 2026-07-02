-- ============================================================
--  Shree Surgico Pharmaceuticals — Complete Database Schema
--  Run this entire file in Supabase SQL Editor:
--  https://supabase.com → Your Project → SQL Editor → New query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── 1. Products ──────────────────────────────────────────────
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  salt_name     text,
  category      text,
  manufacturer  text,
  mrp           numeric(10,2) not null,
  sell_price    numeric(10,2) not null,
  requires_rx   boolean default false,
  created_at    timestamptz default now()
);

-- ── 2. Inventory (one row per batch per product) ─────────────
create table if not exists inventory (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references products(id) on delete cascade,
  batch_no        text,
  stock_qty       int default 0,
  reorder_at      int default 10,
  expiry_date     date,
  purchase_price  numeric(10,2)
);

-- ── 3. Customers ─────────────────────────────────────────────
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  phone       text unique not null,
  email       text,
  created_at  timestamptz default now()
);

-- ── 4. Orders ────────────────────────────────────────────────
create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid references customers(id),
  status             text default 'pending'
                     check (status in ('pending','confirmed','packing','dispatched','delivered','cancelled')),
  total              numeric(10,2),
  delivery_address   jsonb,
  payment_method     text,
  razorpay_order_id  text,
  created_at         timestamptz default now()
);

-- ── 5. Order items ───────────────────────────────────────────
create table if not exists order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references orders(id) on delete cascade,
  product_id     uuid references products(id),
  qty            int not null,
  price_at_sale  numeric(10,2) not null
);

-- ── 6. Prescriptions ─────────────────────────────────────────
create table if not exists prescriptions (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade,
  image_url    text,
  status       text default 'pending'
               check (status in ('pending','approved','rejected')),
  verified_by  text,
  created_at   timestamptz default now()
);

-- ── 7. Indexes for fast lookups ───────────────────────────────
create index if not exists idx_inventory_product   on inventory(product_id);
create index if not exists idx_inventory_expiry    on inventory(expiry_date);
create index if not exists idx_orders_customer     on orders(customer_id);
create index if not exists idx_orders_status       on orders(status);
create index if not exists idx_order_items_order   on order_items(order_id);
create index if not exists idx_prescriptions_order on prescriptions(order_id);

-- Full-text search on product names and salt names
create index if not exists idx_products_name_search
  on products using gin(to_tsvector('english', name || ' ' || coalesce(salt_name,'')));

-- ── 8. Atomic place_order function ───────────────────────────
--  Called from /api/orders to create order + deduct stock
--  in a single transaction. Prevents overselling.
create or replace function place_order(
  p_customer_id    uuid,
  p_items          jsonb,     -- [{ product_id, qty, price }]
  p_total          numeric,
  p_address        jsonb,
  p_payment_method text
) returns uuid as $$
declare
  v_order_id  uuid;
  item        jsonb;
  v_stock     int;
begin
  -- Create the order
  insert into orders (customer_id, total, delivery_address, payment_method, status)
  values (p_customer_id, p_total, p_address, p_payment_method, 'confirmed')
  returning id into v_order_id;

  -- Loop through each cart item
  for item in select * from jsonb_array_elements(p_items) loop

    -- Check sufficient stock
    select stock_qty into v_stock
    from inventory
    where product_id = (item->>'product_id')::uuid
    order by expiry_date asc   -- FIFO: oldest batch first
    limit 1;

    if v_stock is null or v_stock < (item->>'qty')::int then
      raise exception 'Insufficient stock for product %', (item->>'product_id');
    end if;

    -- Insert order line item
    insert into order_items (order_id, product_id, qty, price_at_sale)
    values (
      v_order_id,
      (item->>'product_id')::uuid,
      (item->>'qty')::int,
      (item->>'price')::numeric
    );

    -- Deduct stock (FIFO — oldest batch first)
    update inventory
    set stock_qty = stock_qty - (item->>'qty')::int
    where id = (
      select id from inventory
      where product_id = (item->>'product_id')::uuid
      order by expiry_date asc
      limit 1
    );

  end loop;

  return v_order_id;
end;
$$ language plpgsql;

-- ── 9. Row Level Security ─────────────────────────────────────
-- Enable RLS on all tables
alter table products      enable row level security;
alter table inventory     enable row level security;
alter table customers     enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;
alter table prescriptions enable row level security;

-- Public can read products and inventory (storefront)
create policy "Public read products"
  on products for select using (true);

create policy "Public read inventory"
  on inventory for select using (true);

-- Customers can only see their own data
create policy "Customers see own record"
  on customers for select using (phone = current_setting('app.customer_phone', true));

-- Orders only visible to the owning customer
create policy "Customers see own orders"
  on orders for select
  using (customer_id in (
    select id from customers
    where phone = current_setting('app.customer_phone', true)
  ));

-- Service role (your API routes) bypasses all RLS — no extra policies needed.

-- ── 10. Storage bucket for prescriptions ─────────────────────
-- Run this to create the storage bucket
-- (or create it manually in Supabase Storage UI)
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;

-- Allow service role to read/write prescriptions
create policy "Service role full access prescriptions"
  on storage.objects for all
  using (bucket_id = 'prescriptions');

-- ── 11. Seed sample products (optional, remove in production) ─
insert into products (name, salt_name, category, manufacturer, mrp, sell_price, requires_rx) values
  ('Dolo 650',       'Paracetamol 650mg',          'Tablet',  'Micro Labs', 30,  28,  false),
  ('Crocin Advance', 'Paracetamol 500mg',           'Tablet',  'GSK',        35,  32,  false),
  ('Azithral 500',   'Azithromycin 500mg',           'Tablet',  'Alembic',    85,  80,  true),
  ('Alex Cough',     'Chlorpheniramine+Dextromethorphan', 'Syrup', 'Glenmark', 110, 100, false),
  ('Betnovate-N',    'Betamethasone+Neomycin',       'Cream',   'GSK',        78,  70,  false),
  ('Pan 40',         'Pantoprazole 40mg',            'Tablet',  'Alkem',      52,  48,  true)
on conflict do nothing;

-- Seed inventory for sample products
insert into inventory (product_id, batch_no, stock_qty, reorder_at, expiry_date, purchase_price)
select id, 'BATCH001', 100, 20, '2026-12-01', mrp * 0.6
from products
on conflict do nothing;
