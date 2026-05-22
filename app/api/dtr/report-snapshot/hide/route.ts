import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DTR_CORE_STATIC_V1 } from '../../../../../lib/oneTimeCheckout';
import { hideVisibleDtrReportSnapshotForUser } from '../../../../../lib/m55/hideDtrReportSnapshot';
import { hashUserIdForLedgerLog } from '../../../../../lib/m55/reply/readReplyWalletProbe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST — soft-hide current visible DTR saved report (user-facing 削除).
 * Does not return snapshot ids; does not mutate envelope or entitlements.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  }

  const result = await hideVisibleDtrReportSnapshotForUser(userId, DTR_CORE_STATIC_V1);

  if (result.ok) {
    console.info(
      '[dtr/report-snapshot/hide]',
      JSON.stringify({
        event: 'dtr_snapshot_user_hide',
        userIdHash: hashUserIdForLedgerLog(userId),
        productId: DTR_CORE_STATIC_V1,
        ok: true,
      }),
    );
    return NextResponse.json({ ok: true as const });
  }

  if (result.code === 'no_visible_snapshot') {
    return NextResponse.json({ code: 'no_visible_snapshot' as const }, { status: 404 });
  }

  if (result.code === 'already_hidden') {
    return NextResponse.json({ code: 'already_hidden' as const }, { status: 409 });
  }

  console.error(
    '[dtr/report-snapshot/hide]',
    JSON.stringify({
      event: 'dtr_snapshot_user_hide',
      userIdHash: hashUserIdForLedgerLog(userId),
      productId: DTR_CORE_STATIC_V1,
      ok: false,
      code: result.code,
    }),
  );
  return NextResponse.json({ code: 'hide_failed' as const }, { status: 500 });
}
