-- 009: offers on EPOS phones (Pre-Owned and Kits).
--
-- One row per tap on "What's your best price?" or "Send offer" on a product
-- page. The negotiation itself happens on WhatsApp; this table only shows the
-- shop which phones draw interest and what people try to pay, including the
-- ones who opened WhatsApp and never pressed send.
--
-- NO personal data: no name, phone, IP or user agent. Written only by the
-- server route app/api/offer (service role). RLS on with no policies, so the
-- public anon key can neither read nor write it.
--
-- Run once in the Supabase SQL editor.

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid,
  -- 'used-<stock_item_id>' or 'kit-<id>': survives the product row being
  -- deleted when the phone sells, and maps back to the EPOS.
  epos_ref text,
  product_name text not null,
  asking_price integer not null check (asking_price >= 0),
  -- 'best_price' = asked for the best price, no amount; 'offer' = typed amount.
  kind text not null check (kind in ('best_price', 'offer')),
  offer_amount integer check (offer_amount is null or offer_amount > 0),
  check ((kind = 'offer') = (offer_amount is not null))
);

create index if not exists idx_offers_created on offers (created_at desc);
create index if not exists idx_offers_ref on offers (epos_ref);

alter table offers enable row level security;

-- Handy reads for the SQL editor:
--   select created_at, product_name, asking_price, kind, offer_amount from offers order by created_at desc limit 50;
--   select epos_ref, product_name, count(*), max(offer_amount) from offers group by 1, 2 order by 3 desc;
