import { randomUUID } from 'node:crypto';
import type { Client } from 'pg';

import { materializePairP5PostCheckoutPreviewHistory } from './pairP5DisposablePgMigrationMaterialization.ts';
import {
  countSchemaMigrationVersion,
  executePairP5FulfillSingleTransactionOnPgClient,
} from './pairP5FulfillDisposablePgOrchestration.ts';
import { PAIR_P5_FULFILL_MIGRATION_VERSION } from './pairP5FulfillStepAuthority.ts';

export const PAIR_P5_FULFILL_DISPOSABLE_MINIMAL_SNAPSHOT = {
  schema: 'm55_pair_p5_fulfill_disposable_fixture_v1',
  axes: [],
} as const;

export async function materializePairP5FulfillDisposableBaseline(
  client: Client,
  repoRoot: string,
): Promise<void> {
  await materializePairP5PostCheckoutPreviewHistory(client, repoRoot);
  const applied = await countSchemaMigrationVersion(client, PAIR_P5_FULFILL_MIGRATION_VERSION);
  if (applied === 0) {
    const result = await executePairP5FulfillSingleTransactionOnPgClient(client, repoRoot);
    if (!result.ok) {
      throw new Error(`HOLD_PAIR_P5_FULFILL_BASELINE_APPLY_FAILED:${result.phase}:${result.error}`);
    }
  }
}

export type PairP5SeededPendingContext = {
  readonly id: string;
  readonly ownerUserId: string;
  readonly stripeCheckoutSessionId: string;
  readonly pairIdentityId: string | null;
  readonly paidContextId: string | null;
};

export async function seedPendingCompatibilityPurchaseContext(
  client: Client,
  input: {
    readonly ownerUserId?: string;
    readonly stripeCheckoutSessionId?: string;
    readonly pairIdentityId?: string | null;
    readonly paidContextId?: string | null;
  } = {},
): Promise<PairP5SeededPendingContext> {
  const ownerUserId = input.ownerUserId ?? `m55_p5_fulfill_${randomUUID().slice(0, 8)}`;
  const stripeCheckoutSessionId = input.stripeCheckoutSessionId ?? `cs_test_${randomUUID()}`;
  const pairIdentityId = input.pairIdentityId ?? null;
  const paidContextId = input.paidContextId ?? null;
  if ((pairIdentityId === null) !== (paidContextId === null)) {
    throw new Error('HOLD_PAIR_P5_FIXTURE_IDENTITY_TUPLE_MISMATCH');
  }
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO public.compatibility_purchase_contexts (
      owner_user_id,
      product_key,
      snapshot_version,
      pending_snapshot,
      status,
      stripe_checkout_session_id,
      pair_identity_id,
      paid_context_id
    ) VALUES ($1, 'compatibility_report_full_v1', 'paid_compatibility_report_v1', $2::jsonb, 'pending', $3, $4::uuid, $5::uuid)
    RETURNING id`,
    [
      ownerUserId,
      JSON.stringify(PAIR_P5_FULFILL_DISPOSABLE_MINIMAL_SNAPSHOT),
      stripeCheckoutSessionId,
      pairIdentityId,
      paidContextId,
    ],
  );
  const id = inserted.rows[0]?.id;
  if (id === undefined) {
    throw new Error('HOLD_PAIR_P5_FIXTURE_INSERT_FAILED');
  }
  return {
    id,
    ownerUserId,
    stripeCheckoutSessionId,
    pairIdentityId,
    paidContextId,
  };
}

export type FulfillRpcResult = {
  readonly ok?: boolean;
  readonly duplicate?: boolean;
  readonly reason?: string;
};

export async function callFulfillCompatibilityReportInTransaction(
  client: Client,
  input: {
    readonly purchaseContextId: string;
    readonly checkoutSessionId: string;
    readonly paymentIntentId?: string;
  },
): Promise<FulfillRpcResult> {
  await client.query('BEGIN');
  try {
    const result = await client.query<{ result: FulfillRpcResult }>(
      `SELECT public.m55_fulfill_compatibility_report_v1($1::uuid, $2::text, $3::text) AS result`,
      [input.purchaseContextId, input.checkoutSessionId, input.paymentIntentId ?? 'pi_test_fixture'],
    );
    await client.query('COMMIT');
    return result.rows[0]?.result ?? {};
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw error;
  }
}
