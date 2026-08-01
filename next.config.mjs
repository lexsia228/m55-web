/**
 * M55 Phase6 Next.js Integration Kit
 * - Output is static export (mobile-friendly)
 * - No image optimization (keeps build deterministic)
 *
 * Clean-capture E2E (`M55_E2E_CLEAN_CAPTURE=1`): disable Next.js devIndicators so
 * the `[data-nextjs-dev-tools-button]` "N" control is never generated. Next 15.5
 * documents `devIndicators: false` as the supported disable path; env-only
 * `NEXT_DISABLE_DEV_INDICATOR` is not sufficient on this installed version.
 * Preview/Production never set M55_E2E_CLEAN_CAPTURE.
 */
const cleanCaptureE2E = process.env.M55_E2E_CLEAN_CAPTURE === '1';

const nextConfig = {
 // output: 'export',
  trailingSlash: false, // /legal/privacy 等の直アクセスを確実に。true だと /privacy/ へのリダイレクトで一部環境で 404 の報告あり
  reactStrictMode: true,
  images: { unoptimized: true },
  ...(cleanCaptureE2E ? { devIndicators: false } : {}),
  async redirects() {
    return [
      { source: '/terms', destination: '/legal/terms', permanent: true },
      { source: '/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/refund', destination: '/legal/refund', permanent: true },
    ];
  },
};

export default nextConfig;
