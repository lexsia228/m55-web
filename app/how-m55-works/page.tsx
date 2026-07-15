import { PublicShell } from '../_components/PublicShell';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { IntroSection } from './components/intro-section';
import { WhatIsSection } from './components/what-is-section';
import { CalendarLayersSection } from './components/calendar-layers-section';
import { PublicProductTruthSection } from './components/public-product-truth-section';
import { FrameworkSection } from './components/framework-section';
import { SuitableForSection } from './components/suitable-for-section';
import { WhatYouCanDoSection } from './components/what-you-can-do-section';
import { ValuesBoundarySection } from './components/values-boundary-section';
import { NextStepSection } from './components/next-step-section';
import styles from './how-it-works.module.css';

export const metadata = {
  title: 'M55の仕組み | 入力・読み解き・商品について',
  description: TOP_FREE_ENTRY_PUBLIC_COPY.metadata.howM55WorksDescriptionJa,
  alternates: { canonical: '/how-m55-works' },
  openGraph: {
    title: 'M55の仕組み',
    description: TOP_FREE_ENTRY_PUBLIC_COPY.metadata.howM55WorksDescriptionJa,
    url: '/how-m55-works',
  },
};

export default function HowM55WorksPage() {
  return (
    <PublicShell>
      <div className={styles.page}>
        <IntroSection />
        <WhatIsSection />
        <CalendarLayersSection />
        <PublicProductTruthSection />
        <FrameworkSection />
        <WhatYouCanDoSection />
        <SuitableForSection />
        <ValuesBoundarySection />
        <NextStepSection />
      </div>
    </PublicShell>
  );
}
