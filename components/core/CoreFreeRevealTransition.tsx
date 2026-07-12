'use client';

import { useEffect } from 'react';
import { revealTransitionDurationMs } from '../../lib/m55/freeResult/coreFreeRevealUxState';
import styles from './CoreExperience.module.css';

type Props = {
  onComplete: () => void;
};

export default function CoreFreeRevealTransition({ onComplete }: Props) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = revealTransitionDurationMs(reduced);
    const timer = window.setTimeout(onComplete, ms);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeRevealTransition}`}
      aria-live="polite"
      aria-busy="true"
    >
      <p className={styles.freeRevealTransitionLead}>6つの答えがそろいました</p>
      <p className={styles.freeRevealTransitionSub}>
        生年月日の土台と重ねて、今の輪郭を開きます
      </p>
    </section>
  );
}
