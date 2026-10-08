import type { NextConfig } from "next";

// GITHUB_PAGES=true builds a fully static site for https://<user>.github.io/sitesafe-si.
// The Pages workflow passes PAGES_BASE_PATH from actions/configure-pages, so the path
// follows the repository name. The /api/report route is removed for that build; the
// report page then uses the rule-based summary in the browser.
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = isPages
  ? {
      output: "export",
      basePath: process.env.PAGES_BASE_PATH ?? "/sitesafe-si",
      trailingSlash: true,
      images: { unoptimized: true },
      env: { NEXT_PUBLIC_STATIC_EXPORT: "true" },
    }
  : {};

export default nextConfig;
