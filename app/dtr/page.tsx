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
import styles from './dtr.module.css';

export const metadata = { title: 'M55の読み解き | M55' };

/**
 * /dtr — product shelf.
 * レポートタブの着地点。Entry Report カードを商品棚として提示。
 * 将来の追加商品も同じ棚に並べられる構造。
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

  return (
    <>
      <PublicHeader />
      <main className={styles.main}>
        <M55ReadingHome
          personalOwned={personalOwned}
          personalReady={personalOwned && access.snapshotReady}
          personalHref={access.shelfCta.href}
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
