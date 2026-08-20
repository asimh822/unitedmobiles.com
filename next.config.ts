import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos are already small WebPs (~6 KB avg) in Supabase Storage, so Vercel's
    // optimizer adds nothing but burns the Hobby quota (5,000 transformations/month) — it hit
    // 75% on 20 Aug 2026 as Googlebot started crawling the sitemap. Serve originals directly.
    unoptimized: true,
    // Seed/placeholder product art is SVG; real product photos come from Supabase Storage.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
};

export default nextConfig;
