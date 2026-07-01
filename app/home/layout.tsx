import type { Metadata } from 'next';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';

export const metadata: Metadata = {
  title: TOP_FREE_ENTRY_PUBLIC_COPY.metadata.homeTitleJa,
  description: TOP_FREE_ENTRY_PUBLIC_COPY.metadata.homeDescriptionJa,
  openGraph: {
    title: TOP_FREE_ENTRY_PUBLIC_COPY.metadata.homeTitleJa,
    description: TOP_FREE_ENTRY_PUBLIC_COPY.metadata.homeDescriptionJa,
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
