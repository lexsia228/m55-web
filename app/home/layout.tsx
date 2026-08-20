import type { Metadata } from 'next';
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
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
