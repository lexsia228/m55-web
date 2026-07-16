/**
 * /home — Shell Home (primary entry point via root redirect)
 *
 * Public Home panel. Birth date: CTA → BirthProfileIntakeLayer. Full edit: /my.
 */

import HomePanel from '../../components/home/HomePanel';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { PublicShell } from '../_components/PublicShell';

export const metadata = {
  title: 'M55 | 自分と二人のうまくいく流れを無料解析',
  description: TOP_FREE_ENTRY_PUBLIC_COPY.home.heroSupportJa,
  alternates: { canonical: '/home' },
  openGraph: {
    title: 'M55 | あなたの「いつもこうなる」には、順番がある。',
    description: TOP_FREE_ENTRY_PUBLIC_COPY.home.heroSupportJa,
    url: '/home',
    images: [{ url: '/home/hero-tech-map.webp', alt: 'M55の読み解き' }],
  },
};

export default function HomePage() {
  return (
    <PublicShell>
      <HomePanel compatibilityCommerceAvailable={isCompatibilityCommerceEnabled()} />
    </PublicShell>
  );
}
