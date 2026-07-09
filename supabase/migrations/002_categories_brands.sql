-- United Mobiles — navigation categories + brands
-- Run in the Supabase SQL editor. Data backfill happens afterwards via
-- `node scripts/backfill-categories.mjs`.

alter table products
  add column if not exists category text not null default 'New Phones'
    check (category in ('New Phones', 'Used', 'KeyPad Phones', 'Tabs', 'Accessories')),
  add column if not exists subcategory text
    check (subcategory is null or subcategory in ('Chargers', 'Watches', 'Gadgets', 'Sound')),
  add column if not exists sub_subcategory text
    check (sub_subcategory is null or sub_subcategory in ('Handsfree', 'Headphones', 'Bluetooth'));

create index if not exists idx_products_category on products (category);
create index if not exists idx_products_brand_category on products (brand, category);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo text,
  display_order int not null default 999,
  created_at timestamptz not null default now()
);

alter table brands enable row level security;
create policy "Public read brands" on brands for select using (true);
