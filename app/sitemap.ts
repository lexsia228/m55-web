import type { MetadataRoute } from 'next';

const SITE_ORIGIN = 'https://m55-webv2.vercel.app';

const PUBLIC_ROUTES = [
  '/home',
  '/how-m55-works',
  '/ten-views',
  '/core',
  '/dtr',
  '/dtr/lp',
  '/synastry',
  '/pricing',
  '/support',
  '/legal/refund',
  '/legal/tokushoho',
  '/legal/terms',
  '/legal/privacy',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_ORIGIN}${route}`,
    changeFrequency: route.startsWith('/legal/') ? 'yearly' : 'monthly',
    priority: route === '/home' ? 1 : route === '/dtr' ? 0.9 : 0.7,
  }));
}
