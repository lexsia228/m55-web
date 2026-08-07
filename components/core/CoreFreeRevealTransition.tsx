'use client';

import { useEffect, useState } from 'react';
import { revealTransitionDurationMs } from '../../lib/m55/freeResult/coreFreeRevealUxState';
import styles from './CoreExperience.module.css';

type Props = {
  onComplete: () => void;
  /** Public trait name for branded reveal — never DOB/answers. */
  traitNameJa?: string;
};

/**
 * Short guided-discovery completion transition — no fake percent, no long analysis.
 * Result content generation is unchanged (handled after this phase).
 */
export default function CoreFreeRevealTransition({ onComplete, traitNameJa }: Props) {
  const [phase, setPhase] = useState(0);
  const phases = [
    '5つの回答が揃いました',
    '生年月日の土台と、いまの5つの回答を重ねています。',
    traitNameJa ? `あなたの資質は『${traitNameJa}』` : '無料結果ができました',
  ] as const;

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onComplete();
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const timer = window.setTimeout(finish, revealTransitionDurationMs(true));
      return () => window.clearTimeout(timer);
    }

    const stepMs = 520;
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => setPhase(1), stepMs),
      window.setTimeout(() => setPhase(2), stepMs * 2),
      window.setTimeout(finish, stepMs * 3),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
    // Intentionally once on mount — parent handlers are flight-guarded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lead = phases[Math.min(phase, phases.length - 1)]!;
  const sub =
    phase === 0
      ? '次の画面で読み解きを開きます。'
      : phase === 1
        ? '長い解析の待ち時間はありません。'
        : 'あなた向けの結果カードを開きます。';

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeRevealTransition}`}
      aria-live="polite"
      aria-busy="true"
      data-testid="m55-free-reveal-transition"
    >
      <p className={styles.freeRevealTransitionLead}>{lead}</p>
      <p className={styles.freeRevealTransitionSub}>{sub}</p>
      {phase >= 2 && traitNameJa ? (
        <p className={styles.freeRevealTraitMark} data-testid="m55-free-reveal-trait">
          {traitNameJa}
        </p>
      ) : null}
    </section>
  );
}
