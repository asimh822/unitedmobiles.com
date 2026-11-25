# United Mobiles — Project Context

## What this is
An e-commerce-style website for **United Mobiles**, a mobile phone shop. There is NO online payment gateway — every order ends as a **WhatsApp message** to the shop, and the sale is completed manually by a salesman with **Cash on Delivery**. A companion desktop inventory app (the shop EPOS, `E:\ShopSoftware`) already exists and is not part of this project — this is a standalone web app with its own database. **Exception since Nov 2026: the Used category is fed by the EPOS** (see "Used phones from the EPOS" at the end).

Business goal: minimum number of clicks from "browsing" to "order sent." Every design/technical decision should serve that goal.

---

## Tech Stack (do not deviate without asking)
- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database + Storage**: Supabase (Postgres + Supabase Storage for images)
- **Hosting target**: Vercel
- **Images**: Next.js `<Image>` component everywhere — no raw `<img>` tags
- **Analytics**: Vercel Analytics (lightweight, no custom tracking scripts)

---

## Design System
- **Palette lives in `app/globals.css` (`@theme`)**: Multan blue-pottery colours. Primary/CTA cobalt `brand` `#1c4e9c`, accents `turq` and `gold`, background `cream` `#faf7f0`, text `ink` `#1c1917`. (The original teal/coral plan was dropped.)
- **WhatsApp buttons are green** (`wa` icon-only, `wa-dark` with a label), never brand blue.
- **Tone**: Modern, catchy, mobile-shop energy — NOT a corporate telecom look (avoid reference sites like Carphone Warehouse's red/contract-heavy styling — we don't sell contracts or plans)
- **Mobile-first**: Majority of traffic is expected on phones. Design and test mobile layouts first, then scale up to desktop.
- **Currency formatting**: Always `Rs. 45,000` style with thousands separators — never raw numbers.

---

## Navigation & Category System

**Top menu**: New Phones | Used | Kits | KeyPad Phones | Tabs | Accessories (Kits added Nov 2026, see "Kits from the EPOS")

**Accessories has a dropdown submenu** with these subcategories:
- Chargers
- Watches
- Gadgets
- Sound (this itself expands to three items: Handsfree, Headphones, Bluetooth)

**Data model implication**: Every product has:
- `category` — one of: New Phones, Used, KeyPad Phones, Tabs, Accessories
- `subcategory` — only applies when category = Accessories (Chargers, Watches, Gadgets, or Sound)
- `sub_subcategory` — only applies when subcategory = Sound (Handsfree, Headphones, or Bluetooth)

Accessory products use a lighter spec set than phones (no RAM/Storage/PTA required — admin form should adapt fields shown based on category selected).

**Brands are a proper entity** (not just a text field) — a `Brands` table with: name, logo (optional), and a manually-set `display_order` field editable in admin. This controls the order brands appear in on the homepage.

---

## Site Structure

### 1. Homepage (`/`)
- **Banner**: covers the top 1/3 of the viewport (not full page) — headline + the animated trust-line reveal inside it:
  1. ✓ Genuine Products with Official Warranty
  2. ✓ Cash on Delivery
  3. ✓ Lowest Price Guaranteed
  4. ✓ Physical Shop for Over a Decade
  - Lightweight CSS-only stagger animation, plays once, no heavy library.
- **Below the banner — Brand Rows (New Phones only)**:
  - Only products where `category = "New Phones"` appear here.
  - Grouped by brand, in the manually-set `display_order` from the Brands table.
  - Each brand section is a horizontal block: **6 product cards per row, 2 rows = 12 products** shown per brand on the homepage.
  - **Left side of each brand block**: the brand name displayed **vertically** (rotated 90°, e.g. "VIVO" reading top-to-bottom), spanning the full height of that brand's 2-row block — acts as a section label.
  - Product cards in this layout are **compact**: smaller image, model name, and price only — no specs, no badges, no full detail on this view.
  - **When a model has multiple RAM+ROM variants at different prices, the card shows "Starting from Rs. X"** using the lowest-priced variant. This same rule applies to product cards on category and brand pages too.
  - Clicking a product card → goes to the full Product Detail Page.
  - **Clicking the vertical brand name** → opens a separate **Brand Page** (`/brand/[brand-slug]`) showing ALL New Phones models for that brand in a standard filterable grid (see below).
- No search bar, filters, or sort needed directly on the homepage itself — this page is purely the brand-browsing entry point. Search/filter/sort live on category and brand pages.

### 2. Category Pages (`/new-phones`, `/used`, `/keypad-phones`, `/tabs`, and Accessories subpages like `/accessories/chargers`, `/accessories/sound/headphones`, etc.)
- Standard filterable grid layout (this is the original plan, still applies here):
  - Search bar (text search by brand/model)
  - Filter bar: Brand, Price range, RAM/Storage (phones/tabs only), Condition (New/Used)
  - Sort: Price low→high, high→low, Newest
  - Product grid with sale badges and stock indicators, paginated/infinite-scroll

### 3. Brand Page (`/brand/[brand-slug]`)
- Same standard filterable grid as category pages, scoped to that brand's New Phones catalog

### 4. Product Detail Page (`/products/[id]`)
- Image gallery with thumbnails
- **Two independent variant selectors**: Color swatches AND RAM+ROM combo selector (e.g. buttons/dropdown for "4GB+64GB", "4GB+128GB", "6GB+128GB", "6GB+256GB", "8GB+128GB", "8GB+256GB" — only show combos that actually exist in stock for that model)
- Selecting a different RAM+ROM combo updates the displayed price and the RAM/Storage values in the spec boxes
- Selecting a different color updates the displayed image (and price if that color affects it)
- A single model (e.g. "Y05") with multiple RAM+ROM combos is ONE product page — not separate pages per combo
- Specs displayed as **categorized icon boxes** — NOT paragraphs or long tables. Group into categories like Display, Camera, Memory, Battery, Connectivity, matching the icon-box pattern, each spec is a small card with an icon + label + value.
- Badges: PTA Approved, Official/Shop Warranty, "Easy Installments Available" (generic — never name a specific bank/vendor)
- Price block (sale styling if applicable) — reflects the currently selected variant combo
- **Buy Now** button (primary CTA, coral) — sends the currently selected color + RAM/ROM combo + its price to checkout
- "Similar Phones" section at bottom (same brand or similar price range)

### 5. Checkout Flow
- Step 1: Form — **Name** and **Address** only (no phone field — WhatsApp auto-captures sender's number, no email, no payment info)
- Step 2: **Order review/confirmation screen** — shows phone name, color, price, name, address with an Edit option before sending
- Step 3: On confirm, generate a `wa.me/923109627000` link with a pre-filled, URL-encoded message containing: mobile name, color, price, customer name, address. Open this link (opens WhatsApp app/web with message ready to send).

### 6. Admin Panel (`/admin`)
- Protected by a single password stored in an environment variable (no multi-user auth system needed for v1)
- **Bulk CSV import** — for the initial catalog load (50–200 products). Build the import to be flexible enough to map common column names (Brand, Model, Price, RAM, Storage, Color, Condition, etc.) from a desktop-exported CSV.
- **CSV export** — ability to export the current live catalog back to CSV (backup / reconciliation with desktop app)
- **Single "Add/Edit Product" form** — for ongoing one-at-a-time updates when new models arrive, with fields that adapt based on selected Category/Subcategory
- **Brand management** — add/edit brands and set their `display_order` for the homepage
- Product fields: Category, Subcategory (if applicable), Sub-subcategory (if Sound), Brand, Model, Original Price, Sale Price + on/off toggle, RAM, Storage, Color/variant, Condition (New/Used), PTA Approved (bool), Warranty info, Images (multi-upload), Specs (grouped by category), Stock status (In Stock/Out of Stock)

### 7. Site-wide
- Floating WhatsApp "Chat with us" button (persistent, links to shop WhatsApp for general inquiries, separate from the checkout flow)

---

## Explicitly OUT of scope for v1 — do not build these
- Customer accounts/login
- Online payment gateway (COD only)
- Shopping cart (single-product Buy Now flow only)
- Reviews/ratings
- Wishlist/favorites
- Product comparison tool
- Multi-language support
- Naming specific banks/installment vendors anywhere in the UI

---

## Performance Requirements (non-negotiable)
- Use Next.js `<Image>` for all images (auto WebP/AVIF, lazy loading, responsive sizes)
- Use Static Generation / ISR for homepage and product listing pages where possible
- Paginate or infinite-scroll the product grid — never fetch the full catalog at once
- Keep client-side JS minimal — server components by default, client components only for interactive pieces (filters, variant swatches, checkout form, admin forms)
- No heavy animation libraries — CSS transitions or minimal, targeted use only
- Loading skeletons for product grid and detail page while data fetches
- Graceful empty states (no search results, missing product image placeholder, empty catalog)

---

## SEO
- Meta tags + Open Graph tags per product page (so shared links show phone image, name, price)
- `sitemap.xml` generation
- Semantic HTML structure throughout

---

## Environment Variables
All secrets/config values must live in `.env` — never hardcoded in source:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_WHATSAPP_NUMBER` (currently `923109627000` = 0310 9627000; changed 20 Aug 2026 to match the Google Business Profile)

---

## Working Conventions
- TypeScript throughout, strict typing on Product/Order data models
- Keep components small and reusable (e.g. `ProductCard`, `SpecBox`, `PriceTag`, `TrustBadge`)
- Favor server components; mark client components explicitly with `"use client"` only where interactivity is required
- Ask before introducing any new major dependency not already listed in this file

---

## Deploying (read this first)
- **The live site is whatever is on GitHub `main`.** Vercel builds every push to `main` (live in ~1 to 3 minutes). Nothing on this PC goes live until it is committed AND pushed. There is no Vercel CLI here.
- Work on `main`. A side branch (`catalog-sep-2026`) is how two months of finished work (promo carousel, Quick Prices, price lock) sat unpublished from 09/09/2026 until 14/11/2026 without anyone noticing.
- Deploy routine: `npm run build` (must pass), commit, `git push origin main`, then confirm on https://www.unitedmobiles.net.
- When a change is finished, deploy it or say clearly that it is NOT live yet.
- Never commit `Shop Pics/` (46 MB of raw iPhone photos) or `.env.local`. `/backups` is gitignored.
- Supabase schema changes are SQL files in `supabase/migrations/` that the owner runs by hand in the Supabase SQL editor. There is no DB password here, so a migration is not applied until he says so. Applied so far: 001 to 008 (008 Kits applied 25/11/2026).

## Current state (Nov 2026)
- Homepage carousel (`components/HeroCarousel.tsx`): Used slide first (`UsedPromoSlide.tsx`, live data, hidden when no used stock), trust banner (`Hero.tsx`), vivo V80 launch slide (`LaunchSlide.tsx`, `saleDate` flips "Pre-book" to "Now in stock" by itself). `PromoSlide.tsx` is kept for manufacturer key-visual promos (images in `public/promo/`). Then the brand rows.
- **Payment is no longer pure COD (since 14/11/2026): 10% advance by bank transfer, rest cash on delivery.** All wording and the rupee split come from `lib/payment.ts` (`ADVANCE_PERCENT`); never hardcode "Cash on Delivery" again. The WhatsApp order message template is unchanged.
- No "Easy Installments" badge on used phones.
- Customers see **"Pre-Owned"**, never "Used" (menu `components/NavLinks.tsx`, cards, filter, page heading). The DB category, the condition value and the `/used` URL stay "Used"; the `/used` search title keeps the word for Google ("Pre-Owned (Used) Phones in Multan").
- Admin: Quick Prices (`/admin/quick-prices`) and Quick Add panels besides the normal product form.
- `price_locked` (migration 005): a shop-set price the PriceOye scripts (`scripts/*priceoye*.mjs`) must leave alone. Those scripts only touch New Phones, KeyPad Phones and Tabs, never Used.
- Images: `next.config.ts` has `images.unoptimized: true` (Vercel Hobby image quota), so **an image's stored file size IS what every visitor downloads**. Keep stored images small; never put a multi-hundred-KB photo on a list card.
- Product URLs are SSG with 5 min revalidation; `/used` and other category pages render per request.

## Design refresh (19 Nov 2026)
- **Header**: on a phone the logo row scrolls away and five equal category tabs stay pinned (`sticky top-[-52px]` in `app/layout.tsx` = logo row height; change one, change both). `components/OpenStatus.tsx` shows "Open now · till 10:30 PM" from `lib/business.ts`.
- **/build build step is a full-screen, no-scroll sheet** (`fixed inset-0`, `100dvh`): stage flexes, six tabs in one row, panel fixed at 176px, button in flow. Keep any new panel content inside that height or the one-screen fit breaks on 360x600 phones.
- **Product page**: a pinned Buy Now bar (below `lg`) shows whenever the real button is off screen (`ProductPurchasePanel.tsx`). WhatsApp float and price note move up on `/products/*` to clear it.
- **Price notice is a corner card, not a modal** (`components/PriceNotice.tsx`): non-blocking, once per session, auto-hides, never on /build or /admin.
- **Motion utilities** in `globals.css`: `card-lift`, `reveal` (scroll-driven, wrap a section, never the same element as `card-lift`), `cta-shine`, `wa-pulse`, `bg-drift`, `float-y`, `live-dot`. CSS only, all off under reduced motion.
- Pre-Owned compact cards show the condition score and storage; filters are one swipeable row on phones.

## Used phones from the EPOS
- Since 14/11/2026 every used phone in the shop is listed by the EPOS (`E:\ShopSoftware\website_sync.py`, hourly from the shop's API server, or "Update Website Now" on the shop PC). The salesman takes the photos and sets condition, warranty, PTA and price in the salesman app.
- One product row per PHYSICAL handset: `source = 'epos'`, `epos_ref = 'used-<stock_item_id>'`, plus `condition_score` (1 to 10), `warranty_until` (date), `color` (migration 006). Sold or returned phones are deleted by the sync, photos included.
- **The EPOS owns these rows. Do not edit them in the admin panel**: the next sync overwrites the fields, or deletes the row when the phone is sold. Fix data on the salesman app / shop PC instead. Hand-made products have `source = 'manual'` and the sync never touches them.
- The 31 old hand-made Used listings were removed on 14/11/2026 (backup: `backups/removed-manual-used-2026-11-14.json`, script `scripts/remove-manual-used.mjs`).
- The IMEI is never on the website and must never be added.
- Badges: `lib/types.ts` `warrantyLabel()` (live countdown from `warranty_until`; an expired warranty shows nothing) and `formatConditionScore()` ("8.5/10"), used by `ProductCard` and `TrustBadges`.
- Photos in Storage: `used/<id>/<slot>-<hash>.webp` (full, phone page) and `used/<id>/t1-<hash>.webp` (480px card copy, ~5 to 30 KB). **`cardImage()` in `lib/types.ts` finds the card copy BY NAME**; it must stay in step with `_push_one()` in `E:\ShopSoftware\website_sync.py`. Change one, change both.

## Kits from the EPOS (Nov 2026)
- Category **Kits** (`/kits`, `app/kits/page.tsx`): phones the shop sells that are NOT in its EPOS stock. Pushed by the same EPOS sync as Used: `source='epos'`, `epos_ref='kit-<id>'`, `condition='Used'` (so the condition and warranty badges work unchanged), photos in `kits/<id>/` with the same `t1-` card copy, so `cardImage()` needs no change.
- Migration **008** widens the category check to allow 'Kits'. Applied 25/11/2026.
- Same rules as Used: the EPOS owns these rows, never edit them in admin; the IMEI never appears.
- Phone header now has SIX tabs (label 10px on phones to fit). Kits are not on /build or the homepage.

## Build Your Dream Phone (`/build`, Nov 2026)
- Port of `E:\ShopSoftware\prototypes\build_your_phone.html`. `three` (npm) is the one extra dependency and loads only on /build after a persona is tapped (`components/build/PhoneStage.tsx` via `next/dynamic`, `ssr:false`).
- Shelf = New Phones + Pre-Owned (`lib/build-data.ts`); KeyPad and Tabs are left out. Matching, picks and WhatsApp text: `lib/build-match.ts`. Spec parsing: `lib/match-specs.ts` (no `@/` imports, because `scripts/parse-match-specs.mjs` imports it directly).
- Migration 007: `screen_in, battery_mah, main_cam_mp, lens_count, ram_gb, storage_gb` on products (override/cache; nulls are parsed live) and the anonymous `build_logs` table (written only by `app/api/build-log`, no personal data).
- Pre-Owned rows have no spec sheet: screen/battery/camera come from the same model in New Phones (`findDonor`); RAM/storage only ever the handset's own.
