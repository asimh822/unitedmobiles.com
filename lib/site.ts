/** Canonical site origin for sitemap/OG URLs. NEXT_PUBLIC_SITE_URL overrides if set. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://www.unitedmobiles.net"
    : "http://localhost:3000");
