-- 007: "Build Your Dream Phone" (/build)
--
-- 1. Numeric match fields on products, filled by scripts/parse-match-specs.mjs
--    from the free-text spec groups. The /build page parses on the fly for any
--    row where they are still null (e.g. a used phone the EPOS added after the
--    last script run), so a value set here is an override/cache, not a must.
--    The EPOS sync never sends these columns, so it leaves them alone.
--
-- 2. build_logs: one anonymous row per finished build, so the shop can see
--    what customers want. NO personal data: no name, phone, IP or user agent.
--    Written only by the server route app/api/build-log (service role); RLS is
--    on with no policies, so the public anon key can neither read nor write it.
--
-- Run once in the Supabase SQL editor.

alter table products
  add column if not exists screen_in numeric check (screen_in is null or (screen_in > 0 and screen_in < 20)),
  add column if not exists battery_mah integer check (battery_mah is null or battery_mah > 0),
  add column if not exists main_cam_mp numeric check (main_cam_mp is null or main_cam_mp > 0),
  add column if not exists lens_count smallint check (lens_count is null or lens_count between 1 and 6),
  add column if not exists ram_gb numeric check (ram_gb is null or ram_gb > 0),
  add column if not exists storage_gb integer check (storage_gb is null or storage_gb > 0);

create table if not exists build_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  persona text not null,
  screen_in numeric not null,
  ram_gb integer not null,
  storage_gb integer not null,
  battery_mah integer not null,
  main_cam_mp integer not null,
  lens_count smallint not null,
  color text,
  est_price integer not null,
  -- The three picks in order: Closest twin, Smart saver, Worth the upgrade.
  pick_ids uuid[] not null default '{}',
  -- Which pick's "Reserve on WhatsApp" was tapped (0-2), null = none.
  whatsapp_pick smallint check (whatsapp_pick is null or whatsapp_pick between 0 and 2),
  whatsapp_at timestamptz
);

create index if not exists idx_build_logs_created on build_logs (created_at desc);

alter table build_logs enable row level security;

-- Handy reads for the SQL editor:
--   select persona, count(*), round(avg(est_price)) from build_logs group by 1 order by 2 desc;
--   select ram_gb, storage_gb, count(*) from build_logs group by 1, 2 order by 3 desc;
--   select count(*) filter (where whatsapp_pick is not null) * 100.0 / count(*) as reserve_pct from build_logs;
