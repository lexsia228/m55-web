import { auth } from '@clerk/nextjs/server';
import { resolveDtrShelfAccess } from '../../lib/m55/dtrShelfAccess';
import { resolveSavedReportTierSummary } from '../../lib/m55/dtrSavedReportTier';
import { PublicHeader } from '../../components/shell/PublicHeader';
import { PublicFooter } from '../_components/PublicFooter';
import DtrShelfPanel from '../../components/dtr/DtrShelfPanel';
import styles from './dtr.module.css';

export const metadata = { title: 'レポート | M55' };

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
  const tier = userId ? await resolveSavedReportTierSummary(userId) : null;

  const ownershipState =
    access.kind === 'anonymous' ? 'anonymous' : access.ownershipState;
  const snapshotReady = access.kind === 'authenticated' ? access.snapshotReady : false;
  const shelfCta = access.shelfCta;
  const ownedShelfDisplay =
    access.kind === 'authenticated' ? access.ownedShelfDisplay : null;
  const lockedShelfDisplay =
    access.kind === 'authenticated' ? access.lockedShelfDisplay : null;

  return (
    <>
      <PublicHeader />
      <main className={styles.main}>
        <DtrShelfPanel
          ownershipState={ownershipState}
          snapshotReady={snapshotReady}
          shelfCta={shelfCta}
          ownedShelfDisplay={ownedShelfDisplay}
          lockedShelfDisplay={lockedShelfDisplay}
          canUpgradeFromLight={tier?.canUpgradeFromLight ?? false}
          upgradeReportInstanceId={tier?.reportInstanceId ?? null}
        />
      </main>
      <PublicFooter />
    </>
  );
}
