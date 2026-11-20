import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';
import { resolveApplyPortalGateV1 } from '../../../lib/m55/creatorApply/resolveApplyPortalGateV1';
import { ApplyPageClientGate } from './ApplyPageClientGate';
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
  const applyGate = userId != null ? await resolveApplyPortalGateV1(userId) : null;
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Creator Affiliate 申請</h1>
      <p className={styles.lead}>
        申請内容を確認のうえ、当社所定の基準に基づき審査します。M55からの招待を受けた場合も、参加承認を保証するものではありません。
      </p>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>申請前にご用意ください</h2>
        <ul className={styles.nextAction}>
          <li>M55アカウントへのログイン</li>
          <li>満18歳以上であること、日本国内居住であること</li>
          <li>ご自身が運営する公開SNS・ブログ等の活動URL</li>
          <li>活動内容の説明（フォームで入力）</li>
          <li>
            <a href="/legal/creator-affiliate-terms" className={styles.tertiaryLink}>
              Creator Affiliate 規約
            </a>
            への同意
          </li>
        </ul>
        <p className={styles.cardBody}>
          承認後は、別途 Stripe 上での本人情報・振込先口座の登録、税務関連情報の入力などが必要になる場合があります。
          全員に同一の本人確認書類の提出が必須とは限りません。詳細は承認後の案内と規約をご確認ください。
        </p>
      </div>
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
      ) : applyGate?.kind === 'portal_unavailable' ? (
        <ApplyPageClientGate gate="portal_unavailable" />
      ) : (
        <ApplyPageClientGate
          gate="apply"
          inviteToken={invite}
          existingProfileStatus={
            applyGate?.kind === 'has_profile' ? applyGate.profileStatus : null
          }
        />
      )}
    </div>
  );
}
