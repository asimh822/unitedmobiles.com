-- United Mobiles — initial schema
-- Run this in the Supabase SQL editor (or via supabase CLI migrations).

create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  price numeric not null check (price >= 0),
  sale_price numeric check (sale_price >= 0),
  sale_active boolean not null default false,
  ram text,
  storage text,
  condition text not null default 'New' check (condition in ('New', 'Used')),
  pta_approved boolean not null default true,
  warranty text,
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock')),
  images text[] not null default '{}',
  -- Grouped specs rendered as icon boxes:
  -- [{ "category": "Display", "items": [{ "label": "Size", "value": "6.8\"" }] }]
  specs jsonb not null default '[]',
  -- Effective price makes price sorting cheap and index-friendly.
  effective_price numeric generated always as (
    case when sale_active and sale_price is not null then sale_price else price end
  ) stored,
  created_at timestamptz not null default now()
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  color text not null,
  color_hex text,
  storage text,
  ram text,
  price numeric check (price >= 0),          -- null = inherit product price
  sale_price numeric check (sale_price >= 0),
  image text,                                 -- null = product's first image
  in_stock boolean not null default true,
  sort_order int not null default 0
);

create index if not exists idx_products_brand on products (brand);
create index if not exists idx_products_effective_price on products (effective_price);
create index if not exists idx_products_created_at on products (created_at desc);
create index if not exists idx_variants_product on product_variants (product_id);

-- Row Level Security: public read, writes only via service role (admin panel).
alter table products enable row level security;
alter table product_variants enable row level security;

create policy "Public read products" on products for select using (true);
create policy "Public read variants" on product_variants for select using (true);

-- Storage bucket for product images (public read).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');
