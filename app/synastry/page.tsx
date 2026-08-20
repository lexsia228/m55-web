import type { Metadata } from 'next';
import { PublicShell } from '../_components/PublicShell';
import CompatibilityGuestExperience from '../../components/compatibility/CompatibilityGuestExperience';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';

const title = '二人の関係を読み解く | M55';
const description = TOP_FREE_ENTRY_PUBLIC_COPY.home.productMapPairBodyJa.replace(/\n/g, '');

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/synastry',
  },
  openGraph: {
    title,
    description,
    url: '/synastry',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function SynastryPage() {
  return (
    <PublicShell>
      <CompatibilityGuestExperience
        commerceEnabled={isCompatibilityCommerceEnabled()}
      />
    </PublicShell>
  );
}
