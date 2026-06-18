import Link from 'next/link';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;
const cta = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

export function NextStepSection() {
  return (
    <section
      className={`${styles.shellNarrow} ${styles.foldAlt} ${styles.nextSection}`}
      aria-labelledby="how-m55-next-title"
    >
      <p className={styles.sectionKicker}>06 — 次のステップ</p>
      <h2 id="how-m55-next-title" className={styles.visuallyHidden}>
        次のステップ
      </h2>
      <p className={styles.nextLead}>{copy.nextLeadJa}</p>
      <p className={styles.nextSub}>{copy.nextSubJa}</p>

      <div className={styles.ctaStack}>
        <Link href={cta.coreFreeHref} className={styles.primaryCta}>
          無料の見取り図を確認する
        </Link>
        <Link href={cta.viewSavedPlansHref} className={styles.secondaryCta}>
          {cta.viewSavedPlansJa}
        </Link>
      </div>

      <div className={styles.nextFoot}>
        <p className={styles.nextFootText}>
          M55は、今の自分を読みやすくし、扱いやすくするためにあります。
        </p>
      </div>
    </section>
  );
}
