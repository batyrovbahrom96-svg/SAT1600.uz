import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  devIndicators: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "api.sattest.uz" },
      { protocol: "https", hostname: "api.qrserver.com" }
    ]
  },
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "sattest.uz" }],
        destination: "https://www.sattest.uz/:path*",
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

export default withBundleAnalyzer(nextConfig);
