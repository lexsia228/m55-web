import type { MetadataRoute } from "next";

const CANONICAL_ORIGIN = "https://m-55.jp";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/home",
          "/core",
          "/dtr/lp",
          "/how-m55-works",
          "/ten-views",
          "/synastry",
          "/support",
          "/legal/",
        ],
        disallow: [
          "/dtr/core",
          "/my",
          "/sign-in",
          "/sign-up",
          "/r/",
          "/prototype/",
          "/dev/",
          "/api/",
        ],
      },
    ],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
  };
}
