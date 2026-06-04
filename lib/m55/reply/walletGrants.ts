import { computePurchasedTopUpToFullEquivalent } from './replyWalletFulfillmentMath';

type IncludedGrantResult =
  | { applied: true; walletId: string; availableAfter: number }
  | { applied: false; reason: 'already_granted' | 'wallet_conflict' };

export type PurchasedTopUpGrantResult =
  | { applied: true; walletId: string; availableAfter: number; purchasedDelta: number }
  | {
      applied: false;
      reason: 'already_full_equivalent' | 'wallet_not_found' | 'no_delta' | 'wallet_conflict';
    };

type GrantSource = 'INCLUDED' | 'PURCHASE';

function eventTypeForSource(source: GrantSource) {
  return source === 'PURCHASE' ? 'purchase_grant' : 'included_grant';
}

async function appendGrantLedger(
  db: any,
  params: {
    userId: string;
    walletId: string;
    availableAfter: number;
    source: GrantSource;
    delta: number;
  },
) {
  const ledgerRes = await db.from('reply_wallet_ledgers').insert({
    user_id: params.userId,
    wallet_id: params.walletId,
    delta: params.delta,
    balance_after: params.availableAfter,
    event_type: eventTypeForSource(params.source),
    source_of_grant: params.source,
  });
  if (ledgerRes.error) {
    throw ledgerRes.error;
  }
}

/**
 * 初回同梱返書を1件だけ付与する。
 * 正本判定は reply_ticket_wallets.initial_included_count を利用し、>0 の場合は再付与しない。
 */
export async function grantInitialIncludedReplyIfNeeded(
  db: any,
  userId: string,
): Promise<IncludedGrantResult> {
  const walletRes = await db
    .from('reply_ticket_wallets')
    .select('id, initial_included_count, available_count')
    .eq('user_id', userId)
    .maybeSingle();

  if (walletRes.error) {
    throw walletRes.error;
  }

  const wallet = walletRes.data as
    | { id: string; initial_included_count: number; available_count: number }
    | null;

  if (!wallet) {
    const insertWalletRes = await db
      .from('reply_ticket_wallets')
      .insert({
        user_id: userId,
        initial_included_count: 1,
        purchased_count: 0,
        consumed_count: 0,
        available_count: 1,
        status: 'active',
      })
      .select('id, available_count')
      .single();

    if (insertWalletRes.error) {
      throw insertWalletRes.error;
    }

    const inserted = insertWalletRes.data as { id: string; available_count: number };

    await appendGrantLedger(db, {
      userId,
      walletId: inserted.id,
      availableAfter: inserted.available_count,
      source: 'INCLUDED',
      delta: 1,
    });

    return { applied: true, walletId: inserted.id, availableAfter: inserted.available_count };
  }

  if (wallet.initial_included_count > 0) {
    return { applied: false, reason: 'already_granted' };
  }

  const updateWalletRes = await db
    .from('reply_ticket_wallets')
    .update({
      initial_included_count: wallet.initial_included_count + 1,
      available_count: wallet.available_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .eq('initial_included_count', 0)
    .select('id, available_count')
    .maybeSingle();

  if (updateWalletRes.error) {
    throw updateWalletRes.error;
  }

  const updated = updateWalletRes.data as { id: string; available_count: number } | null;
  if (!updated) {
    return { applied: false, reason: 'wallet_conflict' };
  }

  await appendGrantLedger(db, {
    userId,
    walletId: updated.id,
    availableAfter: updated.available_count,
    source: 'INCLUDED',
    delta: 1,
  });

  return { applied: true, walletId: updated.id, availableAfter: updated.available_count };
}

export async function grantPurchasedReplyTickets(
  db: any,
  userId: string,
  ticketCount: number,
): Promise<{ walletId: string; availableAfter: number }> {
  const normalizedCount = Number.isFinite(ticketCount)
    ? Math.trunc(ticketCount)
    : 0;
  if (normalizedCount <= 0) {
    throw new Error('ticketCount must be a positive integer');
  }

  const walletRes = await db
    .from('reply_ticket_wallets')
    .select('id, purchased_count, available_count')
    .eq('user_id', userId)
    .maybeSingle();
  if (walletRes.error) {
    throw walletRes.error;
  }

  const wallet = walletRes.data as
    | { id: string; purchased_count: number; available_count: number }
    | null;

  if (!wallet) {
    const insertWalletRes = await db
      .from('reply_ticket_wallets')
      .insert({
        user_id: userId,
        initial_included_count: 0,
        purchased_count: normalizedCount,
        consumed_count: 0,
        available_count: normalizedCount,
        status: 'active',
      })
      .select('id, available_count')
      .single();
    if (insertWalletRes.error) {
      throw insertWalletRes.error;
    }

    const inserted = insertWalletRes.data as { id: string; available_count: number };
    await appendGrantLedger(db, {
      userId,
      walletId: inserted.id,
      availableAfter: inserted.available_count,
      source: 'PURCHASE',
      delta: normalizedCount,
    });
    return { walletId: inserted.id, availableAfter: inserted.available_count };
  }

  const updateWalletRes = await db
    .from('reply_ticket_wallets')
    .update({
      purchased_count: wallet.purchased_count + normalizedCount,
      available_count: wallet.available_count + normalizedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .select('id, available_count')
    .single();
  if (updateWalletRes.error) {
    throw updateWalletRes.error;
  }

  const updated = updateWalletRes.data as { id: string; available_count: number };
  await appendGrantLedger(db, {
    userId,
    walletId: updated.id,
    availableAfter: updated.available_count,
    source: 'PURCHASE',
    delta: normalizedCount,
  });
  return { walletId: updated.id, availableAfter: updated.available_count };
}

type WalletRowForTopUp = {
  id: string;
  initial_included_count: number;
  purchased_count: number;
  consumed_count: number;
  available_count: number;
};

/**
 * FULL初回 (1+4) or reserved for app-layer upgrade before RPC apply.
 * Sets purchased_count toward 4 and available_count per DB invariant (cap 5).
 */
export async function grantPurchasedTopUpToFullEquivalentIfNeeded(
  db: any,
  userId: string,
): Promise<PurchasedTopUpGrantResult> {
  const walletRes = await db
    .from('reply_ticket_wallets')
    .select('id, initial_included_count, purchased_count, consumed_count, available_count')
    .eq('user_id', userId)
    .maybeSingle();

  if (walletRes.error) {
    throw walletRes.error;
  }

  const wallet = walletRes.data as WalletRowForTopUp | null;
  if (!wallet) {
    return { applied: false, reason: 'wallet_not_found' };
  }

  const plan = computePurchasedTopUpToFullEquivalent({
    initialIncludedCount: wallet.initial_included_count,
    purchasedCount: wallet.purchased_count,
    consumedCount: wallet.consumed_count,
    availableCount: wallet.available_count,
  });

  if (plan.skipped) {
    return { applied: false, reason: 'already_full_equivalent' };
  }
  if (plan.purchasedDelta <= 0) {
    return { applied: false, reason: 'no_delta' };
  }

  const updateWalletRes = await db
    .from('reply_ticket_wallets')
    .update({
      purchased_count: plan.nextPurchasedCount,
      available_count: plan.nextAvailableCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .eq('purchased_count', wallet.purchased_count)
    .eq('consumed_count', wallet.consumed_count)
    .eq('available_count', wallet.available_count)
    .select('id, available_count, purchased_count')
    .maybeSingle();

  if (updateWalletRes.error) {
    throw updateWalletRes.error;
  }

  const updated = updateWalletRes.data as
    | { id: string; available_count: number; purchased_count: number }
    | null;
  if (!updated) {
    return { applied: false, reason: 'wallet_conflict' };
  }

  if (plan.availableGrantDelta > 0) {
    await appendGrantLedger(db, {
      userId,
      walletId: updated.id,
      availableAfter: updated.available_count,
      source: 'PURCHASE',
      delta: plan.availableGrantDelta,
    });
  }

  return {
    applied: true,
    walletId: updated.id,
    availableAfter: updated.available_count,
    purchasedDelta: plan.purchasedDelta,
  };
}
