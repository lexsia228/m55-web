import type { MetadataRoute } from "next";

const CANONICAL_ORIGIN = "https://m-55.jp";

/** Curated public discovery set — G4 organic discovery authority. No fake freshness. */
const PUBLIC_DISCOVERY_PATHS = [
  "/home",
  "/core",
  "/dtr/lp",
  "/how-m55-works",
  "/ten-views",
  "/synastry",
  "/support",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_DISCOVERY_PATHS.map((path) => ({
    url: `${CANONICAL_ORIGIN}${path}`,
  }));
}
