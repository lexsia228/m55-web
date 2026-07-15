import { auth } from '@clerk/nextjs/server';
import { resolveDtrShelfAccess } from '../../lib/m55/dtrShelfAccess';
import { listOwnedCompatibilityReports } from '../../lib/m55/compatibility/compatibilityCommerceDb';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { resolveSavedReportTierSummary } from '../../lib/m55/dtrSavedReportTier';
import {
  isConsultWalletDisplaySnapshotUsable,
  readConsultWalletDisplaySnapshot,
} from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import { PublicHeader } from '../../components/shell/PublicHeader';
import { PublicFooter } from '../_components/PublicFooter';
import M55ReadingHome from '../../components/dtr/M55ReadingHome';
import type { M55ExperienceAuthority } from '../../lib/m55/m55ExperienceCardModel';
import styles from './dtr.module.css';

export const metadata = {
  title: 'M55の読み解き | 自分と二人の読み解きホーム',
  description:
    '生年月日の暦リズムと選択式の回答から、自分の輪郭や二人の反応の違いを無料で整理し、購入済みの保存版を再開できます。',
  alternates: { canonical: '/dtr' },
  openGraph: {
    title: 'M55の読み解き',
    description:
      '自分と二人の読み解きを無料で始め、購入した保存版を読み返すためのホームです。',
    url: '/dtr',
  },
};

/**
 * /dtr — primary Reading Home.
 * 無料体験の開始・継続と、購入済みレポートの再開をまとめる。
 *
 * Ownership check is done server-side and passed as prop.
 * Entitlement logic is not modified — only the display state changes.
 */
export default async function DtrPage() {
  const { userId } = await auth();
  const access = await resolveDtrShelfAccess(userId);
  const compatibility = userId
    ? await listOwnedCompatibilityReports(userId)
    : { available: true, reports: [] };
  const tier = userId ? await resolveSavedReportTierSummary(userId) : null;
  const wallet =
    userId && tier?.reportInstanceId
      ? await readConsultWalletDisplaySnapshot(userId, tier.reportInstanceId)
      : null;
  const personalOwned =
    access.kind === 'authenticated' && access.ownershipState === 'owned';
  const personalAuthority: M55ExperienceAuthority | null =
    access.kind === 'authenticated' &&
    (personalOwned ||
      access.ownershipState === 'expired' ||
      access.uxState === 'error_unknown')
      ? {
          uxState: access.uxState,
          action:
            access.uxState === 'error_unknown'
              ? 'authority_support'
              : access.lpCtaMode === 'open'
                ? 'open_owned'
                : access.lpCtaMode === 'recovery'
                  ? 'recover_owned'
                  : 'view_paid_details',
          href: access.shelfCta.href,
          label: access.shelfCta.label,
        }
      : null;

  return (
    <>
      <PublicHeader />
      <main className={styles.main}>
        <M55ReadingHome
          personalOwnershipState={personalOwned ? 'owned' : 'not_owned'}
          personalAuthority={personalAuthority}
          compatibilityReports={compatibility.reports}
          compatibilityAuthorityAvailable={compatibility.available}
          additionalReadingAvailable={
            isConsultWalletDisplaySnapshotUsable(wallet) && wallet.availableCount > 0
          }
          compatibilityCommerce={
            isCompatibilityCommerceEnabled() ? 'available' : 'paused'
          }
        />
      </main>
      <PublicFooter />
    </>
  );
}
