import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
