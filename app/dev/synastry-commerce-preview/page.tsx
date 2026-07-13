import { notFound } from 'next/navigation';
import CompatibilityCommercePreviewClient from '../../../components/compatibility/__preview__/CompatibilityCommercePreviewClient';
import { isPaidCompatibilityPreviewBlocked } from '../../../lib/m55/compatibility/paidCompatibilityPreviewGuard';

export const metadata = {
  title: 'Compatibility Commerce Preview (dev)',
  robots: { index: false, follow: false },
};

export default function CompatibilityCommercePreviewPage() {
  if (isPaidCompatibilityPreviewBlocked({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })) {
    notFound();
  }
  return (
    <main
      data-m55-dev-preview="compatibility-commerce"
      data-testid="m55-dev-compatibility-commerce-preview"
    >
      <CompatibilityCommercePreviewClient />
    </main>
  );
}
