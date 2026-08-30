import styles from './DtrPaidDecisionUx.module.css';

const STEPS = ['追加質問', '回答確認', 'プラン', 'お支払い'] as const;

export type PaidJourneyStepIndex = 0 | 1 | 2 | 3;

type Props = {
  activeStep: PaidJourneyStepIndex;
};

export default function DtrPaidJourneyStepRail({ activeStep }: Props) {
  return (
    <ol className={styles.journeyRail} aria-label="プレミアム購入の流れ">
      {STEPS.map((label, index) => {
        const isActive = index === activeStep;
        const isDone = index < activeStep;
        return (
          <li
            key={label}
            className={[
              styles.journeyRailStep,
              isActive ? styles.journeyRailStepActive : '',
              isDone ? styles.journeyRailStepDone : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={styles.journeyRailIndex}>{index + 1}</span>
            <span className={styles.journeyRailLabel}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
