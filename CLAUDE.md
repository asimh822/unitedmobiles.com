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

## Site Structure

### 1. Homepage (`/`)
- Hero section containing:
  - Banner/headline
  - **Animated trust-line reveal** (checkmarks appear one after another, in this order, on load/scroll into hero view):
    1. ✓ Genuine Products with Official Warranty
    2. ✓ Cash on Delivery
    3. ✓ Lowest Price Guaranteed
    4. ✓ Physical Shop for Over a Decade
  - Keep this animation lightweight CSS-only (staggered fade/slide-in), plays once, no looping, no heavy animation library.
- Search bar (text search by brand/model)
- Filter bar: **Brand**, **Price range**, **RAM/Storage**, **Condition (New/Used)**
- Sort: Price low→high, high→low, Newest
- Product grid:
  - Sale badge (strikethrough original price + coral discounted price) shown ONLY when a product's sale toggle is on
  - Stock status indicator (In Stock / Out of Stock)
  - Paginated or infinite-scroll — never load all products in one request

### 2. Product Detail Page (`/products/[id]`)
- Image gallery with thumbnails
- Color/storage variant swatches (switch image + price on selection)
- Specs displayed as **categorized icon boxes** — NOT paragraphs or long tables. Group into categories like Display, Camera, Memory, Battery, Connectivity, matching the icon-box pattern, each spec is a small card with an icon + label + value.
- Badges: PTA Approved, Official/Shop Warranty, "Easy Installments Available" (generic — never name a specific bank/vendor)
- Price block (sale styling if applicable)
- **Buy Now** button (primary CTA, coral)
- "Similar Phones" section at bottom (same brand or similar price range)

### 3. Checkout Flow
- Step 1: Form — **Name** and **Address** only (no phone field — WhatsApp auto-captures sender's number, no email, no payment info)
- Step 2: **Order review/confirmation screen** — shows phone name, color, price, name, address with an Edit option before sending
- Step 3: On confirm, generate a `wa.me/923239637000` link with a pre-filled, URL-encoded message containing: mobile name, color, price, customer name, address. Open this link (opens WhatsApp app/web with message ready to send).

### 4. Admin Panel (`/admin`)
- Protected by a single password stored in an environment variable (no multi-user auth system needed for v1)
- **Bulk CSV import** — for the initial catalog load (50–200 products). Build the import to be flexible enough to map common column names (Brand, Model, Price, RAM, Storage, Color, Condition, etc.) from a desktop-exported CSV.
- **CSV export** — ability to export the current live catalog back to CSV (backup / reconciliation with desktop app)
- **Single "Add/Edit Product" form** — for ongoing one-at-a-time updates when new models arrive
- Product fields: Brand, Model, Original Price, Sale Price + on/off toggle, RAM, Storage, Color/variant, Condition (New/Used), PTA Approved (bool), Warranty info, Images (multi-upload), Specs (grouped by category), Stock status (In Stock/Out of Stock)

### 5. Site-wide
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
