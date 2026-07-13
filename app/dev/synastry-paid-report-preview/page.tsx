import { notFound } from 'next/navigation';
import PaidCompatibilityReportPreviewClient from '../../../components/compatibility/__preview__/PaidCompatibilityReportPreviewClient';
import { isPaidCompatibilityPreviewBlocked } from '../../../lib/m55/compatibility/paidCompatibilityPreviewGuard';

export const metadata = {
  title: 'Paid Compatibility Report Preview (dev)',
  robots: { index: false, follow: false },
};

export default function PaidCompatibilityReportPreviewPage() {
  if (isPaidCompatibilityPreviewBlocked({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })) {
    notFound();
  }

  return (
    <main
      data-m55-dev-preview="paid-compatibility-report"
      data-testid="m55-dev-paid-compatibility-report-preview"
    >
      <PaidCompatibilityReportPreviewClient />
    </main>
  );
}
