import Link from 'next/link';
import { PublicShell } from '../_components/PublicShell';
import {
  M55_METHOD_CANONICAL_COPY,
  M55_METHOD_PUBLIC_NAME,
} from '../../lib/m55/method/m55MethodAuthority';
import { M55_COMMERCIAL_TERMINOLOGY } from '../../lib/m55/commercialUx/terminology';
import M55MethodSections from '../../components/pages/M55MethodSections';
import styles from './how-it-works.module.css';

export const metadata = {
  title: `${M55_METHOD_PUBLIC_NAME} | M55`,
  description: M55_METHOD_CANONICAL_COPY.explanationJa.replace(/\n/g, ''),
};

/**
 * Canonical method route. The only public methodology name rendered here is
 * M55 複合読み解きモデル. Legacy calendar-layer storefront sections are not
 * mounted — they compete with the typed method authority.
 */
export default function HowM55WorksPage() {
  return (
    <PublicShell>
      <div className={`${styles.page} m55-exp-reading`} data-m55-experience-surface="PUBLIC_EDITORIAL">
        <M55MethodSections />
        <section
          className={`${styles.shellNarrow} ${styles.nextSection}`}
          data-testid="m55-method-next-step"
          aria-label="次のステップ"
        >
          <p className={styles.nextLead}>{M55_METHOD_CANONICAL_COPY.boundaryJa}</p>
          <div className={styles.ctaStack}>
            <Link href="/core" className={styles.primaryCta}>
              {M55_COMMERCIAL_TERMINOLOGY.freeEntry}
            </Link>
            <Link href="/home" className={styles.secondaryCta}>
              ホームへ戻る
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
