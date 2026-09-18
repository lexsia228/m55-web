import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';
import { CreatorPortalPanel } from '../_components/CreatorPortalPanel';
import styles from '../creator.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator申請状況 | M55',
  robots: { index: false, follow: false },
};

export default async function CreatorPortalPage() {
  const { userId } = await auth();
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Creator Portal</h1>
      <p className={styles.lead}>
        申請状況と、対応が必要な場合の次のアクションを確認できます。
      </p>
      {userId ? (
        <CreatorPortalPanel />
      ) : (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Creator申請状況を確認する</h2>
          <p className={styles.cardBody}>
            ログインすると、現在の申請状況と必要な次の対応を確認できます。
          </p>
          <div className={styles.cardActions}>
            <SignInButton mode="modal">
              <button type="button" className={styles.buttonPrimary}>ログインして確認する</button>
            </SignInButton>
            <Link href="/support" className={styles.secondaryCta}>サポートに相談</Link>
          </div>
        </div>
      )}
      {userId && (
        <p className={styles.footerLinks}>
          <Link href="/support" className={styles.tertiaryLink}>サポートに相談</Link>
        </p>
      )}
    </div>
  );
}
