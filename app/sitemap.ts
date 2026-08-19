import type { MetadataRoute } from "next";

const CANONICAL_ORIGIN = "https://m-55.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-19");

  return [
    {
      url: `${CANONICAL_ORIGIN}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${CANONICAL_ORIGIN}/dtr/lp`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${CANONICAL_ORIGIN}/dtr`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${CANONICAL_ORIGIN}/support`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
