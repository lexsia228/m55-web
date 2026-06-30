import { notFound } from 'next/navigation';
import PaidDtrAnalysisPreviewClient from '../../../components/dtr/__preview__/PaidDtrAnalysisPreviewClient';

function isPreviewBlockedInProduction(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  return false;
}

export const metadata = {
  title: 'Paid DTR Analysis Preview (dev)',
  robots: { index: false, follow: false },
};

export default function PaidDtrAnalysisPreviewPage() {
  if (isPreviewBlockedInProduction()) {
    notFound();
  }

  return (
    <main data-m55-dev-preview="paid-dtr-analysis" data-testid="m55-dev-paid-dtr-analysis-preview">
      <PaidDtrAnalysisPreviewClient />
    </main>
  );
}
