import type { Metadata } from 'next';
import { M55_PUBLIC_SHARE_IMAGE, M55_PUBLIC_SHARE_IMAGE_PATH } from '../../lib/m55/g4PublicShareImage';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';

const title = 'M55｜生年月日から始める自己理解';
const description = `${TOP_FREE_ENTRY_PUBLIC_COPY.home.heroSupportJa} 無料で自分の傾向を見られます。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/home',
  },
  openGraph: {
    title,
    description,
    url: '/home',
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

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
