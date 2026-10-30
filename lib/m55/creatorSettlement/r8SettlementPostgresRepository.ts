import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { R8CPlatformCashCoverageProofV1 } from './r8SettlementLockLogic';
import type { R8CLockedSettlementBundleV1, R8CDurableLockResultV1 } from './r8SettlementExecutionContract';
import type { R8BPayoutInstructionV1, R8BPayoutBatchV1 } from './r8SettlementContract';
import type { DurableSettlementRepositoryV1 } from './r8SettlementInMemoryRepository';
import type { R8CDurableLockInputV1 } from './r8SettlementExecutionContract';
import { SettlementPersistedReadError } from './settlementReadErrors';
import { R8_B_PAYOUT_FEE_POLICY_VERSION } from './r8SettlementContract';

const COVERAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const VERIFIED_PROOF_KINDS = new Set(['BANK_BALANCE_SNAPSHOT', 'STRIPE_BALANCE_SNAPSHOT']);

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapRpcLockResult(data: unknown): R8CDurableLockResultV1 {
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
  }
  const row = data as Record<string, unknown>;
  if (row.ok === false) {
    const reason = row.reason;
    if (typeof reason === 'string') {
      return { ok: false, reason: reason as R8CDurableLockResultV1 extends { ok: false; reason: infer R } ? R : never };
    }
    return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
  }
  if (row.ok !== true || !row.bundle || typeof row.bundle !== 'object') {
    return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
  }
  const bundleRaw = row.bundle as Record<string, unknown>;
  const batchRaw = bundleRaw.batch as Record<string, unknown>;
  const instRaw = bundleRaw.instruction as Record<string, unknown>;
  const feeRaw = bundleRaw.feeCharge as Record<string, unknown>;
  const linesRaw = bundleRaw.batchLines;

  const cutoff = parseIsoDate(batchRaw.cutoffInstantUtc);
  const lockedAt = parseIsoDate(batchRaw.lockedAtUtc);
  const payoutDue = parseIsoDate(instRaw.payoutDueAtUtc);
  if (!cutoff || !lockedAt || !payoutDue) {
    return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
  }

  const batch: R8BPayoutBatchV1 = {
    batchId: String(batchRaw.batchId),
    creatorEconomicIdentityId: String(batchRaw.creatorEconomicIdentityId),
    cutoffInstantUtc: cutoff,
    idempotencyKey: String(batchRaw.idempotencyKey),
    lockedAtUtc: lockedAt,
    instructionId: String(batchRaw.instructionId),
  };

  const instruction: R8BPayoutInstructionV1 = {
    instructionId: String(instRaw.instructionId),
    creatorEconomicIdentityId: String(instRaw.creatorEconomicIdentityId),
    batchId: String(instRaw.batchId),
    idempotencyKey: String(instRaw.idempotencyKey),
    mode: instRaw.mode as R8BPayoutInstructionV1['mode'],
    cutoffInstantUtc: cutoff,
    payoutDueAtUtc: payoutDue,
    settlementPayableJpy: Number(instRaw.settlementPayableJpy),
    payoutProcessingFeeJpy: Number(instRaw.payoutProcessingFeeJpy),
    payoutFeePolicyVersion: (instRaw.payoutFeePolicyVersion as R8BPayoutInstructionV1['payoutFeePolicyVersion']) ??
      R8_B_PAYOUT_FEE_POLICY_VERSION,
    withholdingJpy: Number(instRaw.withholdingJpy),
    netPayoutJpy: Number(instRaw.netPayoutJpy),
    lockedAtUtc: lockedAt,
    parentInstructionId: (instRaw.parentInstructionId as string | null) ?? null,
  };

  const bundle: R8CLockedSettlementBundleV1 = {
    batch,
    instruction,
    feeCharge: {
      feeChargeId: String(feeRaw.feeChargeId),
      instructionId: String(feeRaw.instructionId),
      feeJpy: Number(feeRaw.feeJpy),
      feePolicyVersion: String(feeRaw.feePolicyVersion),
      idempotencyKey: String(feeRaw.idempotencyKey),
    },
    batchLines: Array.isArray(linesRaw)
      ? linesRaw.map((line) => {
          const l = line as Record<string, unknown>;
          return {
            commissionEventId: String(l.commissionEventId),
            instructionId: String(l.instructionId),
            allocatedGrossCommissionJpy: Number(l.allocatedGrossCommissionJpy),
          };
        })
      : [],
    payoutDueReliable: instRaw.payoutDueReliable === true,
  };

  return {
    ok: true,
    bundle,
    created: row.created === true,
  };
}

async function sumActiveLiquidityReservationsJpy(
  db: ReturnType<typeof getSupabaseAdmin>,
  coverageSnapshotId: string,
): Promise<number> {
  const { error } = await (db as any)
    .from('m55_r8_platform_liquidity_reservations_v1')
    .select('reserved_net_jpy')
    .limit(1);
  if (error) {
    throw new SettlementPersistedReadError();
  }

  const { data, error: pageErr } = await (db as any)
    .from('m55_r8_platform_liquidity_reservations_v1')
    .select('reserved_net_jpy,released_at,coverage_snapshot_id')
    .eq('coverage_snapshot_id', coverageSnapshotId);
  if (pageErr) {
    throw new SettlementPersistedReadError();
  }
  let total = 0;
  for (const row of data ?? []) {
    if (row.released_at != null) continue;
    total += Number(row.reserved_net_jpy);
  }
  return total;
}

export async function loadPlatformCashCoverageProofFromDbV1(
  asOfUtc: Date = new Date(),
): Promise<R8CPlatformCashCoverageProofV1> {
  const db = getSupabaseAdmin();
  try {
    const { data, error } = await (db as any)
      .from('m55_r8_platform_liquidity_coverage_v1')
      .select('coverage_snapshot_id,available_jpy,coverage_ratio_bps,observed_at,proof_kind,source_label')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return { ok: false, reason: 'COVERAGE_PROOF_MISSING' };
    const proofKind = String(data.proof_kind ?? '');
    if (!VERIFIED_PROOF_KINDS.has(proofKind)) {
      return { ok: false, reason: 'COVERAGE_UNVERIFIED' };
    }
    const sourceLabel = String(data.source_label ?? '').trim();
    if (!sourceLabel) return { ok: false, reason: 'COVERAGE_UNVERIFIED' };
    const observedAt = parseIsoDate(data.observed_at);
    if (!observedAt) return { ok: false, reason: 'COVERAGE_PROOF_MISSING' };
    if (observedAt.getTime() > asOfUtc.getTime()) {
      return { ok: false, reason: 'COVERAGE_STALE' };
    }
    if (asOfUtc.getTime() - observedAt.getTime() > COVERAGE_MAX_AGE_MS) {
      return { ok: false, reason: 'COVERAGE_STALE' };
    }
    const available = Number(data.available_jpy);
    const ratio = Number(data.coverage_ratio_bps);
    if (!Number.isInteger(available) || ratio < 10_000) {
      return { ok: false, reason: 'COVERAGE_INSUFFICIENT' };
    }
    if (available <= 0) {
      return { ok: false, reason: 'COVERAGE_INSUFFICIENT' };
    }
    const reserved = await sumActiveLiquidityReservationsJpy(db, data.coverage_snapshot_id as string);
    if (reserved > available) {
      return { ok: false, reason: 'COVERAGE_INSUFFICIENT' };
    }
    const effectiveAvailableJpy = Math.max(available - reserved, 0);
    return {
      ok: true,
      availableJpy: available,
      effectiveAvailableJpy,
      proofSnapshotId: data.coverage_snapshot_id as string,
    };
  } catch (e) {
    if (e instanceof SettlementPersistedReadError) return { ok: false, reason: 'COVERAGE_PROOF_MISSING' };
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
    idempotencyKey: batch.idempotencyKey,
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
    batchLines: Array.isArray(row.batch_lines) ? (row.batch_lines as R8CLockedSettlementBundleV1['batchLines']) : [],
    payoutDueReliable: row.payout_due_reliable === true,
    attempts: Array.isArray(row.attempts) ? (row.attempts as R8CLockedSettlementBundleV1['attempts']) : [],
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
        'instruction_id,batch_id,creator_economic_identity_id,mode,payout_due_at,settlement_payable_jpy,payout_processing_fee_jpy,payout_fee_policy_version,withholding_jpy,net_payout_jpy,parent_instruction_id,locked_at,payout_due_reliable',
      )
      .eq('creator_economic_identity_id', creatorEconomicIdentityId)
      .order('locked_at', { ascending: false });
    if (error) throw new SettlementPersistedReadError();

    const instructionIds = (data ?? []).map((inst: { instruction_id: string }) => inst.instruction_id as string);
    if (instructionIds.length === 0) return [];

    const batches = new Map<string, Record<string, unknown>>();
    const { data: batchRows, error: batchErr } = await db
      .from('m55_r8_payout_batches_v1')
      .select('batch_id,creator_economic_identity_id,cutoff_at,idempotency_key,locked_at,instruction_id')
      .eq('creator_economic_identity_id', creatorEconomicIdentityId);
    if (batchErr) throw new SettlementPersistedReadError();
    for (const b of batchRows ?? []) {
      batches.set(b.instruction_id as string, b as Record<string, unknown>);
    }

    const fees = new Map<string, Record<string, unknown>>();
    const { data: feeRows, error: feeErr } = await db
      .from('m55_r8_payout_fee_charges_v1')
      .select('fee_charge_id,instruction_id,idempotency_key')
      .in('instruction_id', instructionIds);
    if (feeErr) throw new SettlementPersistedReadError();
    for (const f of feeRows ?? []) {
      fees.set(f.instruction_id as string, f as Record<string, unknown>);
    }

    const linesByInstruction = new Map<string, R8CLockedSettlementBundleV1['batchLines']>();
    const { data: lineRows, error: lineErr } = await db
      .from('m55_r8_payout_batch_lines_v1')
      .select('commission_event_id,instruction_id,allocated_gross_commission_jpy')
      .in('instruction_id', instructionIds);
    if (lineErr) throw new SettlementPersistedReadError();
    for (const line of lineRows ?? []) {
      const iid = line.instruction_id as string;
      const bucket = linesByInstruction.get(iid) ?? [];
      bucket.push({
        commissionEventId: line.commission_event_id as string,
        instructionId: iid,
        allocatedGrossCommissionJpy: Number(line.allocated_gross_commission_jpy),
      });
      linesByInstruction.set(iid, bucket);
    }

    const attemptsByInstruction = new Map<string, NonNullable<R8CLockedSettlementBundleV1['attempts']>>();
    const { data: attemptRows, error: attemptErr } = await db
      .from('m55_r8_payout_attempts_v1')
      .select('attempt_id,instruction_id,attempt_number,status,idempotency_key,parent_attempt_id')
      .in('instruction_id', instructionIds);
    if (attemptErr) throw new SettlementPersistedReadError();
    for (const attempt of attemptRows ?? []) {
      const iid = attempt.instruction_id as string;
      const bucket = attemptsByInstruction.get(iid) ?? [];
      bucket.push({
        attemptId: attempt.attempt_id as string,
        instructionId: iid,
        attemptNumber: Number(attempt.attempt_number),
        status: attempt.status as NonNullable<R8CLockedSettlementBundleV1['attempts']>[number]['status'],
        idempotencyKey: attempt.idempotency_key as string,
        parentAttemptId: (attempt.parent_attempt_id as string | null) ?? null,
      });
      attemptsByInstruction.set(iid, bucket);
    }

    const out: R8CLockedSettlementBundleV1[] = [];
    for (const inst of data ?? []) {
      const batch = batches.get(inst.instruction_id as string);
      const fee = fees.get(inst.instruction_id as string);
      if (!batch || !fee) {
        throw new SettlementPersistedReadError('SETTLEMENT_BUNDLE_INCOMPLETE');
      }
      const mapped = mapBundleRow({
        ...inst,
        batch_id: batch.batch_id,
        cutoff_at: batch.cutoff_at,
        batch_idempotency_key: batch.idempotency_key,
        locked_at: inst.locked_at,
        fee_charge_id: fee.fee_charge_id,
        fee_idempotency_key: fee.idempotency_key,
        batch_lines: linesByInstruction.get(inst.instruction_id as string) ?? [],
        attempts: attemptsByInstruction.get(inst.instruction_id as string) ?? [],
      });
      if (mapped) out.push(mapped);
    }
    return out;
  } catch (e) {
    if (e instanceof SettlementPersistedReadError) throw e;
    throw new SettlementPersistedReadError();
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

/** Runtime lock goes through Postgres RPC once SQL is applied. */
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
    return mapRpcLockResult(data);
  } catch {
    return { ok: false, reason: 'SETTLEMENT_STORAGE_UNAVAILABLE' };
  }
}
