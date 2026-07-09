# United Mobiles — Project Context

## What this is
An e-commerce-style website for **United Mobiles**, a mobile phone shop. There is NO online payment gateway — every order ends as a **WhatsApp message** to the shop, and the sale is completed manually by a salesman with **Cash on Delivery**. A companion desktop inventory app already exists and is not part of this project — this is a standalone web app with its own database.

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
- **Primary color**: Teal `#0D9488`
- **Background**: Warm white `#FAFAF9`
- **Accent / CTA / Sale color**: Coral `#F97316`
- **Text**: Deep Slate `#1C1917`
- **Tone**: Modern, catchy, mobile-shop energy — NOT a corporate telecom look (avoid reference sites like Carphone Warehouse's red/contract-heavy styling — we don't sell contracts or plans)
- **Mobile-first**: Majority of traffic is expected on phones. Design and test mobile layouts first, then scale up to desktop.
- **Currency formatting**: Always `Rs. 45,000` style with thousands separators — never raw numbers.

---

## Navigation & Category System

**Top menu**: New Phones | Used | KeyPad Phones | Tabs | Accessories

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
- Step 3: On confirm, generate a `wa.me/923239637000` link with a pre-filled, URL-encoded message containing: mobile name, color, price, customer name, address. Open this link (opens WhatsApp app/web with message ready to send).

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
- `NEXT_PUBLIC_WHATSAPP_NUMBER` (currently `923239637000`)

---

## Working Conventions
- TypeScript throughout, strict typing on Product/Order data models
- Keep components small and reusable (e.g. `ProductCard`, `SpecBox`, `PriceTag`, `TrustBadge`)
- Favor server components; mark client components explicitly with `"use client"` only where interactivity is required
- Ask before introducing any new major dependency not already listed in this file
