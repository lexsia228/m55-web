import Link from 'next/link';
import { findValidScoutInvite } from '../../../../lib/m55/creatorDistribution/invite';
import styles from '../../creator.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator招待 | M55',
  robots: { index: false, follow: false },
  other: { referrer: 'no-referrer' },
};

export default async function CreatorInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let valid = false;
  try { valid = Boolean(await findValidScoutInvite(token)); } catch { valid = false; }
  return (
    <div className={styles.page}>
      {valid ? (
        <div className={styles.card}>
          <h1 className={styles.cardTitle}>M55 Creator 招待</h1>
          <p className={styles.cardBody}>
            M55からの招待は、Creator Affiliateへの申請をご案内するものです。
            招待を受けたことにより、参加承認または報酬の発生が保証されるものではありません。
          </p>
          <div className={styles.cardActions}>
            <Link href={`/creator/apply?invite=${encodeURIComponent(token)}`} className={styles.primaryCta}>
              申請へ進む
            </Link>
            <Link href="/creator" className={styles.secondaryCta}>募集ページを見る</Link>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <h1 className={styles.cardTitle}>この招待は利用できません</h1>
          <p className={styles.cardBody}>
            有効期限・利用済み・取り消しをご確認ください。
          </p>
          <div className={styles.cardActions}>
            <Link href="/creator" className={styles.secondaryCta}>募集ページへ</Link>
            <Link href="/support" className={styles.tertiaryLink}>サポート</Link>
          </div>
        </div>
      )}
    </div>
  );
}
