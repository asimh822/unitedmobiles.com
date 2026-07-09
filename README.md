# United Mobiles — Web Shop

E-commerce-style storefront for United Mobiles. No payment gateway: every order becomes a
pre-filled WhatsApp message, completed manually with cash on delivery.

Stack: Next.js (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres + Storage) · Vercel.

## Running locally

```bash
npm install
npm run dev
```

Until real Supabase keys are added, the site serves the built-in sample catalog
(`lib/seed-data.json`), so every page works out of the box.

## Connecting Supabase (go-live checklist)

1. Create a project at [supabase.com](https://supabase.com), then open **SQL Editor** and run
   each file in `supabase/migrations/` in order (001 creates tables/RLS/storage; 002 adds
   categories and the brands table). After 002, run `node scripts/backfill-categories.mjs`
   to categorize existing products and seed the brands table.
2. Copy **Settings → API** values into `.env.local` (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Set `ADMIN_PASSWORD` in `.env.local` to a strong password (it protects `/admin` and signs
   the admin session cookie).
4. Optional: load the demo catalog into the real database with
   `node scripts/seed-supabase.mjs`, or go straight to a CSV import.

## First CSV import

1. Sign in at `/admin` and open **Import CSV**.
2. Upload the CSV exported from the desktop inventory app. Columns are auto-matched
   (Brand/Make, Model/Name, Price/Retail, RAM/Memory, Storage/ROM, Colour, Condition, PTA,
   Warranty, Stock/Availability…) — fix any mapping with the dropdowns, check the preview,
   then import. `docs/sample-import.csv` shows the shape it accepts.
3. Rows sharing Brand + Model + Condition merge into one product; each distinct color becomes
   a variant. Add photos afterwards via **Edit** on each product.
4. **Export CSV** on the same screen downloads the live catalog for backup/reconciliation.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the five env vars from `.env.example` in **Project → Settings → Environment Variables**,
   plus `NEXT_PUBLIC_SITE_URL=https://your-domain` (used for sitemap/Open Graph URLs).
3. Deploy. Homepage/product pages use ISR (5-minute revalidate) and refresh automatically
   after admin edits.

## Layout of interest

- `lib/catalog.ts` — all catalog queries; falls back to seed data when Supabase isn't configured
- `lib/whatsapp.ts` — the exact order-message template and `wa.me` link builders
- `app/admin/actions.ts` — server actions: login, product CRUD, CSV import
- `supabase/migrations/001_init.sql` — schema, RLS, storage bucket
