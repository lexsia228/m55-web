import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { R8CPlatformCashCoverageProofV1 } from './r8SettlementLockLogic';
import type { R8CLockedSettlementBundleV1 } from './r8SettlementExecutionContract';
import type { R8BPayoutInstructionV1, R8BPayoutBatchV1 } from './r8SettlementContract';
import type { DurableSettlementRepositoryV1 } from './r8SettlementInMemoryRepository';
import type { R8CDurableLockInputV1, R8CDurableLockResultV1 } from './r8SettlementExecutionContract';

export async function loadPlatformCashCoverageProofFromDbV1(): Promise<R8CPlatformCashCoverageProofV1> {
  const db = getSupabaseAdmin() as any;
  try {
    const { data, error } = await db
      .from('m55_r8_platform_liquidity_coverage_v1')
      .select('coverage_snapshot_id,available_jpy,coverage_ratio_bps')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return { ok: false, reason: 'COVERAGE_PROOF_MISSING' };
    const available = Number(data.available_jpy);
    const ratio = Number(data.coverage_ratio_bps);
    if (!Number.isInteger(available) || ratio < 10_000) {
      return { ok: false, reason: 'COVERAGE_INSUFFICIENT' };
    }
    return {
      ok: true,
      availableJpy: available,
      proofSnapshotId: data.coverage_snapshot_id as string,
    };
  } catch {
    return { ok: false, reason: 'COVERAGE_PROOF_MISSING' };
  }
}

function mapBundleRow(row: Record<string, unknown>): R8CLockedSettlementBundleV1 | null {
  const instructionId = row.instruction_id as string | undefined;
  if (!instructionId) return null;
  const batch: R8BPayoutBatchV1 = {
    batchId: row.batch_id as string,
    creatorEconomicIdentityId: row.creator_economic_identity_id as string,
    cutoffInstantUtc: new Date(row.cutoff_at as string),
    idempotencyKey: row.batch_idempotency_key as string,
    lockedAtUtc: new Date(row.locked_at as string),
    instructionId,
  };
  const instruction: R8BPayoutInstructionV1 = {
    instructionId,
    creatorEconomicIdentityId: row.creator_economic_identity_id as string,
    batchId: batch.batchId,
    idempotencyKey: row.instruction_idempotency_key as string,
    mode: row.mode as R8BPayoutInstructionV1['mode'],
    cutoffInstantUtc: batch.cutoffInstantUtc,
    payoutDueAtUtc: new Date(row.payout_due_at as string),
    settlementPayableJpy: Number(row.settlement_payable_jpy),
    payoutProcessingFeeJpy: Number(row.payout_processing_fee_jpy),
    payoutFeePolicyVersion: row.payout_fee_policy_version as R8BPayoutInstructionV1['payoutFeePolicyVersion'],
    withholdingJpy: Number(row.withholding_jpy),
    netPayoutJpy: Number(row.net_payout_jpy),
    lockedAtUtc: batch.lockedAtUtc,
    parentInstructionId: (row.parent_instruction_id as string | null) ?? null,
  };
  return {
    batch,
    instruction,
    feeCharge: {
      feeChargeId: row.fee_charge_id as string,
      instructionId,
      feeJpy: Number(row.payout_processing_fee_jpy),
      feePolicyVersion: instruction.payoutFeePolicyVersion,
      idempotencyKey: row.fee_idempotency_key as string,
    },
    batchLines: [],
  };
}

export async function listPersistedSettlementBundlesForCreatorV1(
  creatorEconomicIdentityId: string,
): Promise<R8CLockedSettlementBundleV1[]> {
  const db = getSupabaseAdmin() as any;
  try {
    const { data, error } = await db
      .from('m55_r8_payout_instructions_v1')
      .select(
        'instruction_id,batch_id,creator_economic_identity_id,mode,payout_due_at,settlement_payable_jpy,payout_processing_fee_jpy,payout_fee_policy_version,withholding_jpy,net_payout_jpy,parent_instruction_id,locked_at,idempotency_key',
      )
      .eq('creator_economic_identity_id', creatorEconomicIdentityId)
      .order('locked_at', { ascending: false });
    if (error) return [];

    const batches = new Map<string, Record<string, unknown>>();
    const { data: batchRows } = await db
      .from('m55_r8_payout_batches_v1')
      .select('batch_id,creator_economic_identity_id,cutoff_at,idempotency_key,locked_at,instruction_id')
      .eq('creator_economic_identity_id', creatorEconomicIdentityId);
    for (const b of batchRows ?? []) {
      batches.set(b.instruction_id as string, b as Record<string, unknown>);
    }

    const fees = new Map<string, Record<string, unknown>>();
    const { data: feeRows } = await db
      .from('m55_r8_payout_fee_charges_v1')
      .select('fee_charge_id,instruction_id,idempotency_key');
    for (const f of feeRows ?? []) {
      fees.set(f.instruction_id as string, f as Record<string, unknown>);
    }

    const out: R8CLockedSettlementBundleV1[] = [];
    for (const inst of data ?? []) {
      const batch = batches.get(inst.instruction_id as string);
      const fee = fees.get(inst.instruction_id as string);
      if (!batch || !fee) continue;
      const mapped = mapBundleRow({
        ...inst,
        batch_id: batch.batch_id,
        cutoff_at: batch.cutoff_at,
        batch_idempotency_key: batch.idempotency_key,
        locked_at: inst.locked_at,
        instruction_idempotency_key: inst.idempotency_key,
        fee_charge_id: fee.fee_charge_id,
        fee_idempotency_key: fee.idempotency_key,
      });
      if (mapped) out.push(mapped);
    }
    return out;
  } catch {
    return [];
  }
}

export function createPostgresSettlementRepositoryV1(): DurableSettlementRepositoryV1 {
  return {
    lockSettlementBatch(_input, _coverage): R8CDurableLockResultV1 {
      return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
    },
    getBatchByIdempotencyKey() {
      return null;
    },
    getInstructionById() {
      return null;
    },
    listBundlesForCreator(creatorEconomicIdentityId) {
      void creatorEconomicIdentityId;
      return [];
    },
  };
}

/** Runtime lock must go through RPC once SQL is applied; until then fail-closed. */
export async function lockSettlementBatchViaPostgresRpcV1(
  input: R8CDurableLockInputV1,
  coverage: R8CPlatformCashCoverageProofV1,
): Promise<R8CDurableLockResultV1> {
  if (!coverage.ok) return { ok: false, reason: 'INSUFFICIENT_CASH_COVERAGE' };
  const db = getSupabaseAdmin() as any;
  try {
    const { data, error } = await db.rpc('m55_r8_lock_payout_batch_v1', {
      p_creator_economic_identity_id: input.creatorEconomicIdentityId,
      p_cutoff_at: input.cutoffInstantUtc.toISOString(),
      p_batch_idempotency_key: input.batchIdempotencyKey,
      p_fee_idempotency_key: input.feeChargeIdempotencyKey,
      p_withholding_jpy: input.withholdingJpy,
      p_coverage_snapshot_id: coverage.proofSnapshotId,
      p_applicable_legal_due_at: input.applicableLegalDueAtUtc?.toISOString() ?? null,
      p_as_of: input.asOfUtc.toISOString(),
    });
    if (error || !data) return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
    return data as R8CDurableLockResultV1;
  } catch {
    return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
  }
}
