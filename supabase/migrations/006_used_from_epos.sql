-- 006: used phones pushed by the shop's EPOS (E:\ShopSoftware\website_sync.py)
--
-- Every used phone is ONE product row: one physical handset with its own
-- photos, condition and warranty. The EPOS owns these rows (source = 'epos')
-- and creates, updates and deletes them; hand-made products keep
-- source = 'manual' and the sync never touches them.
--
-- epos_ref is "used-<stock_item_id>", the EPOS's own stock row id. The IMEI is
-- never sent to the website.
--
-- Run once in the Supabase SQL editor.

alter table products
  add column if not exists source text not null default 'manual',
  add column if not exists epos_ref text unique,
  add column if not exists condition_score numeric
    check (condition_score is null or (condition_score >= 1 and condition_score <= 10)),
  add column if not exists warranty_until date,
  add column if not exists color text;

create index if not exists idx_products_source on products (source);
