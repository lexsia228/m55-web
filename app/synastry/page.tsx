import type { Metadata } from 'next';
import { PublicShell } from '../_components/PublicShell';
import CompatibilityGuestExperience from '../../components/compatibility/CompatibilityGuestExperience';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { M55_PUBLIC_SHARE_IMAGE, M55_PUBLIC_SHARE_IMAGE_PATH } from '../../lib/m55/g4PublicShareImage';
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
    images: [M55_PUBLIC_SHARE_IMAGE],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: [M55_PUBLIC_SHARE_IMAGE_PATH],
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
