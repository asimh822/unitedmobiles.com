-- United Mobiles — "Goes with this device" suggestions
-- Run in the Supabase SQL editor.
-- Admin-picked product ids shown on the product page instead of Similar
-- Phones. Empty array = automatic accessory suggestions.

alter table products
  add column if not exists suggested_ids uuid[] not null default '{}';
