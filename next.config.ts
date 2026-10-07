import type { NextConfig } from "next";

// GITHUB_PAGES=true builds a fully static site for https://<user>.github.io/heatguard.
// The /api/report route is removed for that build; the report page then uses the
// rule-based summary in the browser.
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = isPages
  ? {
      output: "export",
      basePath: "/heatguard",
      trailingSlash: true,
      images: { unoptimized: true },
      env: { NEXT_PUBLIC_STATIC_EXPORT: "true" },
    }
  : {};

export default nextConfig;
