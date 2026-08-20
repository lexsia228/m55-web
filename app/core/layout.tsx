import type { Metadata } from 'next';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';

const title = '無料で自分の傾向を見る | M55';
const description = TOP_FREE_ENTRY_PUBLIC_COPY.freeEntry.leadJa.replace(/\n/g, '');

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/core',
  },
  openGraph: {
    title,
    description,
    url: '/core',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
