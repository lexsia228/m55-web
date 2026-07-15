import type { MetadataRoute } from 'next';

const SITE_ORIGIN = 'https://m55-webv2.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dev/',
        '/dtr/core',
        '/my',
        '/prototype/',
        '/purchase/',
        '/reply/',
        '/sign-in/',
        '/sign-up/',
        '/synastry/purchase/',
        '/synastry/report/',
      ],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
