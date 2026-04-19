import { auth } from '@clerk/nextjs/server';
import { resolveEntryReportOwnership } from '../../lib/m55/dtrOwnershipGate';
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

  let ownershipState: 'owned' | 'locked' | 'expired' | 'anonymous' = 'anonymous';

  if (userId) {
    const ownership = await resolveEntryReportOwnership(userId);
    ownershipState = ownership.unlockState;
  }

  return (
    <>
      <PublicHeader />
      <main className={styles.main}>
        <DtrShelfPanel ownershipState={ownershipState} />
      </main>
      <PublicFooter />
    </>
  );
}
