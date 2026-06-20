/**
 * M55 Phase6 Next.js Integration Kit
 * - Output is static export (mobile-friendly)
 * - No image optimization (keeps build deterministic)
 */
const nextConfig = {
 // output: 'export',
  trailingSlash: false, // /legal/privacy 等の直アクセスを確実に。true だと /privacy/ へのリダイレクトで一部環境で 404 の報告あり
  reactStrictMode: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: '/terms', destination: '/legal/terms', permanent: true },
      { source: '/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/refund', destination: '/legal/refund', permanent: true },
    ];
  },
};

export default nextConfig;
