-- United Mobiles — indexes for admin search & filters
-- Run in the Supabase SQL editor.
-- Admin search uses ILIKE '%term%' on brand/model: plain btree indexes can't
-- serve infix matches, so use pg_trgm GIN indexes.

create extension if not exists pg_trgm;

create index if not exists idx_products_model_trgm on products using gin (model gin_trgm_ops);
create index if not exists idx_products_brand_trgm on products using gin (brand gin_trgm_ops);

-- Filter dropdowns (low-cardinality but cheap; combined with trgm scans).
create index if not exists idx_products_condition on products (condition);
create index if not exists idx_products_stock_status on products (stock_status);
