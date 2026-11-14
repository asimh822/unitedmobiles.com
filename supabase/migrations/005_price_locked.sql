-- United Mobiles — hand-set price protection
-- Run in the Supabase SQL editor.
-- Marks a product whose price the shop sets deliberately, so the PriceOye
-- sync (scripts/update-prices-priceoye.mjs) skips it instead of pulling the
-- price back to the market rate. First case: ZTE A36 at Rs. 29,999 against
-- PriceOye's Rs. 17,999.

alter table products
  add column if not exists price_locked boolean not null default false;

comment on column products.price_locked is
  'Shop-set price; update-prices-priceoye.mjs must not overwrite price or variant prices.';
