import { notFound } from 'next/navigation';
import { requireReviewerId } from '../../../lib/m55/creatorDistribution/security';
import { CreatorReviewQueue } from './_components/CreatorReviewQueue';
import styles from './review.module.css';

export const dynamic = 'force-dynamic';
export default async function CreatorReviewPage() {
  const reviewer = await requireReviewerId();
  if (!reviewer) notFound();
  return <main className={styles.pageShell}>
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>M55 / Creator Operations</p>
        <h1 className={styles.pageTitle}>Creator 審査キュー</h1>
        <p className={styles.pageSubtitle}>公開メディアと申請根拠を確認し、人の判断で審査を進めます。</p>
      </div>
      <span className={styles.internalBadge}><span aria-hidden="true" />Internal / Human review</span>
    </header>
    <CreatorReviewQueue />
  </main>;
}
