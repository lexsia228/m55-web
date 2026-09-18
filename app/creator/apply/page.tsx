import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';
import { CreatorApplicationForm } from '../_components/CreatorApplicationForm';
import styles from '../creator.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator申請 | M55',
  robots: { index: false, follow: false },
  other: { referrer: 'no-referrer' },
};

function ProgressStrip() {
  return (
    <div className={styles.progressStrip} aria-label="申請の進行段階">
      <div className={`${styles.progressStep} ${styles.progressStepActive}`}>
        <span className={styles.progressStepNumber}>01</span>
        申請情報
      </div>
      <div className={styles.progressStep}>
        <span className={styles.progressStepNumber}>02</span>
        審査
      </div>
      <div className={styles.progressStep}>
        <span className={styles.progressStepNumber}>03</span>
        結果・開始案内
      </div>
    </div>
  );
}

export default async function CreatorApplyPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { userId } = await auth();
  const { invite } = await searchParams;
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Creator Affiliate 申請</h1>
      <p className={styles.lead}>
        申請内容を確認のうえ、当社所定の基準に基づき審査します。M55からの招待を受けた場合も、参加承認を保証するものではありません。
      </p>
      <ProgressStrip />
      {!userId ? (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>申請にはM55アカウントが必要です</h2>
          <p className={styles.cardBody}>
            ログイン後、公開メディアと発信内容を入力して申請できます。
          </p>
          <div className={styles.cardActions}>
            <SignInButton mode="modal">
              <button type="button" className={styles.buttonPrimary}>ログインして申請へ進む</button>
            </SignInButton>
          </div>
        </div>
      ) : (
        <CreatorApplicationForm inviteToken={invite} />
      )}
    </div>
  );
}
