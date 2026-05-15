import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import ConsultationRoomInput, {
  type ReplyRoomWalletSnapshot,
} from '../../components/reply/ConsultationRoomInput';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { resolveEntryReportOwnership } from '../../lib/m55/dtrOwnershipGate';

function normalizeWalletRow(data: unknown): ReplyRoomWalletSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const pic = Number(o.initial_included_count);
  const pc = Number(o.purchased_count);
  const cc = Number(o.consumed_count);
  const ac = Number(o.available_count);
  const st = o.status;
  if (
    !Number.isFinite(pic) ||
    !Number.isFinite(pc) ||
    !Number.isFinite(cc) ||
    !Number.isFinite(ac) ||
    typeof st !== 'string'
  ) {
    return null;
  }
  return {
    initial_included_count: Math.trunc(pic),
    purchased_count: Math.trunc(pc),
    consumed_count: Math.trunc(cc),
    available_count: Math.trunc(ac),
    status: st,
  };
}

function ReplyRoomSuspenseFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12 text-sm text-muted-foreground">
        読み込み中…
      </div>
    </div>
  );
}

export default async function ReplyPage() {
  const { userId: clerkUserId } = await auth();
  let userId = clerkUserId;
  if (!userId && process.env.NODE_ENV !== 'production') {
    const h = await headers();
    const testUserId = h.get('x-m55-test-user-id')?.trim();
    if (testUserId) {
      userId = testUserId;
    }
  }

  let wallet: ReplyRoomWalletSnapshot | null = null;
  let hasWalletRow = false;
  let reportInstanceId: string | null = null;
  let ownershipOwned = false;

  if (userId) {
    const ownership = await resolveEntryReportOwnership(userId);
    if (ownership.unlockState === 'owned') {
      ownershipOwned = true;
      reportInstanceId = ownership.reportInstanceId ?? null;

      const db = getSupabaseAdmin() as any;
      let q = db
        .from('reply_ticket_wallets')
        .select(
          'initial_included_count, purchased_count, consumed_count, available_count, status'
        )
        .eq('user_id', userId);

      if (reportInstanceId) {
        q = q.eq('report_instance_id', reportInstanceId);
      }

      const { data } = await q.maybeSingle();
      const normalized = normalizeWalletRow(data);
      if (normalized) {
        wallet = normalized;
        hasWalletRow = true;
      }
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<ReplyRoomSuspenseFallback />}>
        <ConsultationRoomInput
          wallet={wallet}
          hasWalletRow={hasWalletRow}
          reportInstanceId={reportInstanceId}
          ownershipOwned={ownershipOwned}
          userPresent={!!userId}
        />
      </Suspense>
    </main>
  );
}
