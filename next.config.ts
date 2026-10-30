import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The only root layout lives in app/[locale]/layout.tsx, so unmatched URLs
  // need the global 404 document instead of app/not-found.tsx (which would be
  // nested inside Next's default <html>/<body>). See src/app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  async redirects() {
    return [
      { source: "/", destination: "/en", permanent: false },
      { source: "/find", destination: "/en/find", permanent: false },
      { source: "/login", destination: "/en/login", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
