'use client';

import { useMemo } from 'react';
import type { PaidCompatibilityReportSnapshot } from '../../lib/m55/compatibility/buildPaidCompatibilityReportV1';
import { projectCompatibilityPaidNarrativeV1 } from '../../lib/m55/narrative/projectCompatibilityPaidNarrativeV1';
import { projectGenericPublicShareV1 } from '../../lib/m55/narrative/projectPublicShareV1';
import PairManualBlock from './PairManualBlock';
import PublicShareCardPreview from './PublicShareCardPreview';
import NarrativeShareActions from './NarrativeShareActions';
import styles from './NarrativeShare.module.css';

export default function CompatibilityPaidShareBlock({
  snapshot,
}: {
  snapshot: PaidCompatibilityReportSnapshot;
}) {
  const narrative = useMemo(
    () => projectCompatibilityPaidNarrativeV1({ snapshot }),
    [snapshot],
  );
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const spec = useMemo(
    () => projectGenericPublicShareV1({ variant: 'pair_generic', origin }),
    [origin],
  );

  return (
    <section
      className={styles.chooser}
      aria-labelledby="pair-paid-share-title"
      data-testid="m55-pair-paid-share"
    >
      <h2 id="pair-paid-share-title" className={styles.headline}>
        共有できる範囲
      </h2>
      <p className={styles.chooserLead}>
        有料本文・使える一言・実験は公開しません。入口の一文だけを渡せます。
      </p>
      <PairManualBlock manual={narrative.manualSpec} />
      <PublicShareCardPreview spec={spec} />
      <NarrativeShareActions spec={spec} surface="compatibility_paid_report" requirePreviewAck />
    </section>
  );
}
