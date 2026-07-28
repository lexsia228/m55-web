'use client';

import Link from 'next/link';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../../lib/m55/commercialUx/terminology';
import { FREE_FUNNEL_PAGE_CONTENT as C } from '../../lib/m55/commercialUx/experience/pageContent/freeFunnelCopy';
import PremiumExperienceSurface from '../experience/PremiumExperienceSurface';
import styles from './DtrPaidDecisionUx.module.css';

/**
 * Clean /dtr/lp entry when free result is not ready.
 * Must not claim that the free result is already complete.
 */
export default function DtrNeedFreeResultGate() {
  return (
    <PremiumExperienceSurface stateId="premium.lp.prerequisite" testId="m55-premium-experience-need-free">
      <section
      className={`${styles.shell} m55-exp-reading`}
      data-m55-paid-phase="need-free"
      data-testid="m55-dtr-need-free"
      aria-labelledby="m55-dtr-need-free-title"
    >
      <p className={styles.overline}>{T.premiumProduct}</p>
      <h2 id="m55-dtr-need-free-title" className={styles.title}>
        {C.needFreeTitleJa}
      </h2>
      <p className={styles.lead}>{C.needFreeLeadJa}</p>
      <ul className={styles.metaList}>
        <li>{C.needFreeMeta1Ja}</li>
        <li>{C.needFreeMeta2Ja}</li>
        <li>{C.needFreeMeta3Ja}</li>
      </ul>
      <div className={styles.actions}>
        <Link href="/core" className={styles.primaryBtn} data-testid="m55-dtr-need-free-start">
          {T.freeStart}
        </Link>
        <Link href="/home" className={styles.secondaryBtn}>
          {C.homeLinkJa}
        </Link>
      </div>
      </section>
    </PremiumExperienceSurface>
  );
}
