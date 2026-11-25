-- 008: KITS category (Nov 2026)
--
-- Kits are phones the shop sells that are NOT in its EPOS stock. The EPOS
-- pushes them exactly like used phones (E:\ShopSoftware\website_sync.py):
-- source = 'epos', epos_ref = 'kit-<id>', condition = 'Used', category = 'Kits',
-- photos under kits/<id>/ in the product-images bucket.
--
-- This only widens the category check from 002 to allow 'Kits'. Until it is
-- run, the EPOS push of a kit fails (check violation) and used phones carry on.
--
-- Run once in the Supabase SQL editor.

do $$
declare c record;
begin
  -- 002 added the check inline, so its name is generated. Drop whichever
  -- check constraint on products guards the category list.
  for c in
    select conname from pg_constraint
     where conrelid = 'public.products'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%category%New Phones%'
       and pg_get_constraintdef(oid) not ilike '%subcategory%'
  loop
    execute format('alter table public.products drop constraint %I', c.conname);
  end loop;
end $$;

alter table products
  add constraint products_category_check
  check (category in ('New Phones', 'Used', 'Kits', 'KeyPad Phones', 'Tabs', 'Accessories'));
