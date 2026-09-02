import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import MyOwnedPreviewClient from '../../../components/my/__preview__/MyOwnedPreviewClient';

function isPreviewBlockedInProduction(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  return false;
}

export const metadata = {
  title: 'My Page Owned Preview (dev)',
  robots: { index: false, follow: false },
};

/** Dev-only fixture owner for My Page owned SELF and Pair library evidence. */
export default function MyOwnedPreviewPage() {
  if (isPreviewBlockedInProduction()) {
    notFound();
  }

  return (
    <main
      data-m55-dev-preview="my-owned"
      data-m55-visual-subsystem="my"
      data-testid="m55-dev-my-owned-preview"
    >
      <Suspense fallback={null}>
        <MyOwnedPreviewClient />
      </Suspense>
    </main>
  );
}
