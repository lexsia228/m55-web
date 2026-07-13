import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  resolveDtrShelfAccess,
  type DtrShelfUxState,
} from '../../../../lib/m55/dtrShelfAccess';
import { resolveSavedReportTierSummary } from '../../../../lib/m55/dtrSavedReportTier';
import { resolveEntryReportOwnership } from '../../../../lib/m55/dtrOwnershipGate';
import { readConsultWalletDisplaySnapshot } from '../../../../lib/m55/reply/consultWalletDisplaySnapshot';

export const dynamic = 'force-dynamic';

/**
 * Fail-closed: `ready: true` only when DB says paid ownership AND persisted purchase snapshot.
 * Owned without snapshot is never reported as unpaid (showPurchaseCta stays false).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [access, tier, ownership] = await Promise.all([
    resolveDtrShelfAccess(userId),
    resolveSavedReportTierSummary(userId),
    resolveEntryReportOwnership(userId),
  ]);

  const ownershipState =
    access.kind === 'anonymous' ? 'anonymous' : access.ownershipState;
  const uxState: DtrShelfUxState =
    access.kind === 'anonymous' ? 'auth_required' : access.uxState;

  const hasOwnership =
    access.kind === 'authenticated' && access.unlockState === 'owned';
  const hasPurchaseSnapshot =
    access.kind === 'authenticated' && access.snapshotReady;
  const ready = hasOwnership && hasPurchaseSnapshot;
  const showPurchaseCta =
    access.kind === 'authenticated' ? access.showPurchaseCta : false;
  const consultWallet =
    ready && ownership.unlockState === 'owned' && ownership.reportInstanceId
      ? await readConsultWalletDisplaySnapshot(userId, ownership.reportInstanceId)
      : null;

  console.info(
    '[report-snapshot-ready]',
    JSON.stringify({
      ownershipState,
      uxState,
      hasOwnership,
      hasPurchaseSnapshot,
      ready,
      showPurchaseCta,
    })
  );

  return NextResponse.json({
    ready,
    hasOwnership,
    hasPurchaseSnapshot,
    showPurchaseCta,
    ownershipState,
    uxState,
    savedReportTier: {
      hasLight: tier.hasLight,
      hasFull: tier.hasFull,
      canUpgradeFromLight: tier.canUpgradeFromLight,
      reportInstanceId: tier.reportInstanceId,
    },
    consultWallet,
  });
}
