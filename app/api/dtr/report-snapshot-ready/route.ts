import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDtrReportSnapshot } from '../../../../lib/m55/dtrDraftDb';
import { resolveEntryReportOwnership } from '../../../../lib/m55/dtrOwnershipGate';
import { DTR_CORE_STATIC_V1 } from '../../../../lib/oneTimeCheckout';

export const dynamic = 'force-dynamic';

/**
 * Fail-closed: `ready: true` only when DB says paid ownership AND persisted purchase snapshot.
 * Snapshot alone (without entitlement) never yields ready.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ownership = await resolveEntryReportOwnership(userId);
  const hasOwnership = ownership.unlockState === 'owned';
  const snap = hasOwnership ? await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1) : null;
  const hasPurchaseSnapshot = snap != null;
  const ready = hasOwnership && hasPurchaseSnapshot;

  console.info(
    '[report-snapshot-ready]',
    JSON.stringify({ userId, hasOwnership, hasPurchaseSnapshot, ready })
  );

  return NextResponse.json({
    ready,
    hasOwnership,
    hasPurchaseSnapshot,
  });
}
