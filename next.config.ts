import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";

const nextConfig: NextConfig = {
  distDir:
    process.env.ABLE_LOCAL_PREVIEW === "true"
      ? ".next-preview"
      : process.env.ABLE_E2E === "true"
        ? ".next-e2e"
        : ".next",
  ...(basePath
    ? {
        assetPrefix: "/demo-assets",
        basePath,
        redirects: async () => [
          {
            basePath: false,
            destination: basePath,
            permanent: false,
            source: "/",
          },
        ],
      }
    : {}),
  cacheComponents: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  experimental: {
    appNewScrollHandler: true,
    cachedNavigations: true,
    inlineCss: true,
    prefetchInlining: true,
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        hostname: "*.public.blob.vercel-storage.com",
        protocol: "https",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  outputFileTracingIncludes: {
    "/api/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/katex/dist/**",
      "./node_modules/mermaid/dist/mermaid.min.js",
      "./node_modules/@fontsource/noto-sans/files/*latin-400-normal.woff2",
      "./node_modules/@fontsource/noto-sans-devanagari/files/*devanagari-400-normal.woff2",
      "./node_modules/@fontsource/noto-sans-gujarati/files/*gujarati-400-normal.woff2",
    ],
  },
  poweredByHeader: false,
  reactCompiler: true,
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
};

export default withBotId(nextConfig);
