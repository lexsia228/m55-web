import { PublicShell } from '../_components/PublicShell';
import { IntroSection } from './components/intro-section';
import { WhatIsSection } from './components/what-is-section';
import { FrameworkSection } from './components/framework-section';
import { WhatBecomesVisibleSection } from './components/what-becomes-visible-section';
import { WhatYouCanDoSection } from './components/what-you-can-do-section';
import { SuitableForSection } from './components/suitable-for-section';
import { NextStepSection } from './components/next-step-section';
import styles from './how-it-works.module.css';

export const metadata = {
  title: 'M55の見方を知る | M55',
  description:
    'M55は、自分を見つめ直すための地図です。10通りの資質と5つの解析軸、無料 /core と Entry Report、相談返書のつながりを静かに説明します。',
};

export default function HowM55WorksPage() {
  return (
    <PublicShell>
      <div className={styles.page}>
        <IntroSection />
        <WhatIsSection />
        <FrameworkSection />
        <WhatBecomesVisibleSection />
        <WhatYouCanDoSection />
        <SuitableForSection />
        <NextStepSection />
      </div>
    </PublicShell>
  );
}
