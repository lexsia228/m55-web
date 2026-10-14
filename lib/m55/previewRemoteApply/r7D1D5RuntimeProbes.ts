import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { R7DeltaStepId } from './r7D1D5OfflinePlan.ts';

export const R7_D1_D5_RUNTIME_PROBES_SQL_RELATIVE_PATH =
  'docs/planning/r7-preview-delta/M55_R7_D1_D5_RUNTIME_PROBES_V1.sql' as const;

export const R7_RUNTIME_PROBE_IDS = [
  'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT',
  'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
  'R7_D2_PRE_CATALOG_R6_PURCHASE_MONEY_ABSENT',
  'R7_D2_POST_CATALOG_R6_PURCHASE_MONEY_PRESENT',
  'R7_D3_PRE_CATALOG_R6_REFUND_DISPUTE_ABSENT',
  'R7_D3_POST_CATALOG_R6_REFUND_DISPUTE_PRESENT',
  'R7_D4_PRE_CATALOG_R6_COMMISSION_LEDGER_ABSENT',
  'R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT',
  'R7_D5_PRE_CATALOG_R7_REFERRAL_RPC_ABSENT',
  'R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT',
] as const;

export type R7RuntimeProbeId = (typeof R7_RUNTIME_PROBE_IDS)[number];

export type R7ProbePayload = Record<string, boolean | number>;

export type R7RuntimeProbeDefinition = {
  readonly probeId: R7RuntimeProbeId;
  readonly sqlText: string;
  readonly sqlSha256: string;
  readonly stepId: R7DeltaStepId;
  readonly phase: 'pre' | 'post';
};

export type R7ProbeValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: string };

const PROBE_ID_TO_STEP_PHASE: Readonly<Record<R7RuntimeProbeId, { stepId: R7DeltaStepId; phase: 'pre' | 'post' }>> =
  {
    R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT: { stepId: 'D1', phase: 'pre' },
    R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT: { stepId: 'D1', phase: 'post' },
    R7_D2_PRE_CATALOG_R6_PURCHASE_MONEY_ABSENT: { stepId: 'D2', phase: 'pre' },
    R7_D2_POST_CATALOG_R6_PURCHASE_MONEY_PRESENT: { stepId: 'D2', phase: 'post' },
    R7_D3_PRE_CATALOG_R6_REFUND_DISPUTE_ABSENT: { stepId: 'D3', phase: 'pre' },
    R7_D3_POST_CATALOG_R6_REFUND_DISPUTE_PRESENT: { stepId: 'D3', phase: 'post' },
    R7_D4_PRE_CATALOG_R6_COMMISSION_LEDGER_ABSENT: { stepId: 'D4', phase: 'pre' },
    R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT: { stepId: 'D4', phase: 'post' },
    R7_D5_PRE_CATALOG_R7_REFERRAL_RPC_ABSENT: { stepId: 'D5', phase: 'pre' },
    R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT: { stepId: 'D5', phase: 'post' },
  };

function sha256Utf8(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function parseProbeSqlFile(fileText: string): Map<R7RuntimeProbeId, string> {
  const map = new Map<R7RuntimeProbeId, string>();
  const pattern = /-- @probe ([A-Z0-9_]+)\n([\s\S]*?)(?=\n-- @probe |\s*$)/g;
  for (const match of fileText.matchAll(pattern)) {
    const id = match[1] as R7RuntimeProbeId;
    const sql = match[2].trim();
    if (!R7_RUNTIME_PROBE_IDS.includes(id)) {
      throw new Error('HOLD_UNKNOWN_PROBE_ID_IN_SQL_FILE');
    }
    map.set(id, sql);
  }
  if (map.size !== R7_RUNTIME_PROBE_IDS.length) {
    throw new Error('HOLD_PROBE_SQL_FILE_INCOMPLETE');
  }
  return map;
}

let cachedRegistry: ReadonlyMap<R7RuntimeProbeId, R7RuntimeProbeDefinition> | null = null;

export function loadR7RuntimeProbeRegistry(repoRoot: string): ReadonlyMap<R7RuntimeProbeId, R7RuntimeProbeDefinition> {
  if (cachedRegistry) return cachedRegistry;
  const absPath = join(repoRoot, R7_D1_D5_RUNTIME_PROBES_SQL_RELATIVE_PATH);
  const fileText = readFileSync(absPath, 'utf8');
  const parsed = parseProbeSqlFile(fileText);
  const registry = new Map<R7RuntimeProbeId, R7RuntimeProbeDefinition>();
  for (const probeId of R7_RUNTIME_PROBE_IDS) {
    const sqlText = parsed.get(probeId);
    if (!sqlText) throw new Error('HOLD_PROBE_SQL_MISSING');
    const meta = PROBE_ID_TO_STEP_PHASE[probeId];
    registry.set(probeId, {
      probeId,
      sqlText,
      sqlSha256: sha256Utf8(sqlText),
      stepId: meta.stepId,
      phase: meta.phase,
    });
  }
  cachedRegistry = registry;
  return registry;
}

export function getR7RuntimeProbeDefinition(
  repoRoot: string,
  probeId: R7RuntimeProbeId,
): R7RuntimeProbeDefinition {
  const registry = loadR7RuntimeProbeRegistry(repoRoot);
  const def = registry.get(probeId);
  if (!def) throw new Error('HOLD_UNKNOWN_PROBE_ID');
  return def;
}

function asPayload(value: unknown): R7ProbePayload | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const payload = row.probe_payload ?? row;
  if (!payload || typeof payload !== 'object') return null;
  const out: R7ProbePayload = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'boolean' || typeof v === 'number') out[k] = v;
    else return null;
  }
  return out;
}

function requireBool(payload: R7ProbePayload, key: string, expected: boolean): R7ProbeValidationResult | null {
  const v = payload[key];
  if (typeof v !== 'boolean') return { ok: false, holdReasonCode: 'HOLD_PROBE_PAYLOAD_SHAPE_MISMATCH' };
  if (v !== expected) return { ok: false, holdReasonCode: 'HOLD_PROBE_CATALOG_STATE_MISMATCH' };
  return null;
}

function requireInt(payload: R7ProbePayload, key: string, expected: number): R7ProbeValidationResult | null {
  const v = payload[key];
  if (typeof v !== 'number') return { ok: false, holdReasonCode: 'HOLD_PROBE_PAYLOAD_SHAPE_MISMATCH' };
  if (v !== expected) return { ok: false, holdReasonCode: 'HOLD_PROBE_CATALOG_STATE_MISMATCH' };
  return null;
}

function requireAllBools(payload: R7ProbePayload, keys: readonly string[], expected: boolean): R7ProbeValidationResult | null {
  for (const key of keys) {
    const check = requireBool(payload, key, expected);
    if (check) return check;
  }
  return null;
}

export function validateR7RuntimeProbeResult(
  probeId: R7RuntimeProbeId,
  rawRow: unknown,
): R7ProbeValidationResult {
  const payload = asPayload(rawRow);
  if (!payload) return { ok: false, holdReasonCode: 'HOLD_PROBE_PAYLOAD_SHAPE_MISMATCH' };

  switch (probeId) {
    case 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT':
      return requireInt(payload, 'anchor_table_count', 0) ?? { ok: true };
    case 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT': {
      const checks = [
        requireInt(payload, 'anchor_table_count', 7),
        requireBool(payload, 'reject_mutation_function_present', true),
        requireBool(payload, 'reject_mutation_empty_args', true),
        requireBool(payload, 'snapshots_content_fingerprint_text_column_ok', true),
      ];
      return checks.find((c) => c !== null) ?? { ok: true };
    }
    case 'R7_D2_PRE_CATALOG_R6_PURCHASE_MONEY_ABSENT':
      return requireAllBools(payload, ['purchase_money_table_absent', 'record_function_absent'], true) ?? { ok: true };
    case 'R7_D2_POST_CATALOG_R6_PURCHASE_MONEY_PRESENT': {
      const checks = [
        requireBool(payload, 'purchase_money_table_present', true),
        requireBool(payload, 'canonical_payment_evidence_id_column_present', true),
        requireBool(payload, 'record_function_present', true),
        requireBool(payload, 'record_function_signature_ok', true),
        requireBool(payload, 'record_function_search_path_empty', true),
      ];
      return checks.find((c) => c !== null) ?? { ok: true };
    }
    case 'R7_D3_PRE_CATALOG_R6_REFUND_DISPUTE_ABSENT':
      return requireAllBools(payload, ['refund_table_absent', 'dispute_table_absent'], true) ?? { ok: true };
    case 'R7_D3_POST_CATALOG_R6_REFUND_DISPUTE_PRESENT': {
      const checks = [
        requireBool(payload, 'refund_table_present', true),
        requireBool(payload, 'dispute_table_present', true),
        requireBool(payload, 'refund_record_function_present', true),
        requireBool(payload, 'refund_record_function_signature_ok', true),
        requireBool(payload, 'refund_record_function_search_path_empty', true),
      ];
      return checks.find((c) => c !== null) ?? { ok: true };
    }
    case 'R7_D4_PRE_CATALOG_R6_COMMISSION_LEDGER_ABSENT':
      return requireBool(payload, 'ledger_table_absent', true) ?? { ok: true };
    case 'R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT': {
      const checks = [
        requireBool(payload, 'ledger_table_present', true),
        requireBool(payload, 'one_accrual_unique_index_present', true),
        requireBool(payload, 'one_accrual_index_on_ledger_table', true),
        requireBool(payload, 'one_accrual_index_unique', true),
        requireBool(payload, 'one_accrual_index_valid', true),
        requireBool(payload, 'one_accrual_index_ready', true),
        requireBool(payload, 'one_accrual_index_key_order_ok', true),
        requireBool(payload, 'one_accrual_index_predicate_exact_ok', true),
        requireBool(payload, 'insert_ledger_function_present', true),
        requireBool(payload, 'insert_ledger_function_signature_ok', true),
      ];
      return checks.find((c) => c !== null) ?? { ok: true };
    }
    case 'R7_D5_PRE_CATALOG_R7_REFERRAL_RPC_ABSENT':
      return requireAllBools(
        payload,
        ['issue_or_get_absent', 'rotate_absent', 'one_active_unique_index_absent'],
        true,
      ) ?? { ok: true };
    case 'R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT': {
      const checks = [
        requireBool(payload, 'issue_or_get_present', true),
        requireBool(payload, 'rotate_present', true),
        requireBool(payload, 'issue_or_get_signature_ok', true),
        requireBool(payload, 'rotate_signature_ok', true),
        requireBool(payload, 'issue_or_get_service_role_execute', true),
        requireBool(payload, 'rotate_service_role_execute', true),
        requireBool(payload, 'issue_or_get_security_definer', true),
        requireBool(payload, 'rotate_security_definer', true),
        requireBool(payload, 'issue_or_get_search_path_empty', true),
        requireBool(payload, 'rotate_search_path_empty', true),
        requireBool(payload, 'issue_or_get_non_privileged_execute_absent', true),
        requireBool(payload, 'rotate_non_privileged_execute_absent', true),
        requireBool(payload, 'one_active_index_on_referral_links_table', true),
        requireBool(payload, 'one_active_index_unique', true),
        requireBool(payload, 'one_active_index_valid', true),
        requireBool(payload, 'one_active_index_ready', true),
        requireBool(payload, 'one_active_index_single_key_ok', true),
        requireBool(payload, 'one_active_index_predicate_exact_ok', true),
        requireBool(payload, 'duplicate_active_violation_present', false),
        requireBool(payload, 'post_apply_unique_index_invariant_scope_only', true),
      ];
      return checks.find((c) => c !== null) ?? { ok: true };
    }
    default:
      return { ok: false, holdReasonCode: 'HOLD_UNKNOWN_PROBE_ID' };
  }
}

/** Negative fixtures for local validation tests (no live DB). */
export const R7_PROBE_NEGATIVE_FIXTURES: Readonly<
  Record<string, { probeId: R7RuntimeProbeId; payload: R7ProbePayload }>
> = {
  D1_PRE_UNEXPECTED_TABLE: {
    probeId: 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT',
    payload: { anchor_table_count: 1 },
  },
  D1_POST_WRONG_FUNCTION_ARGS: {
    probeId: 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
    payload: {
      anchor_table_count: 7,
      reject_mutation_function_present: true,
      reject_mutation_empty_args: false,
      snapshots_content_fingerprint_text_column_ok: true,
    },
  },
  D1_POST_WRONG_FINGERPRINT_COLUMN: {
    probeId: 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
    payload: {
      anchor_table_count: 7,
      reject_mutation_function_present: true,
      reject_mutation_empty_args: true,
      snapshots_content_fingerprint_text_column_ok: false,
    },
  },
  D2_POST_WRONG_SIGNATURE: {
    probeId: 'R7_D2_POST_CATALOG_R6_PURCHASE_MONEY_PRESENT',
    payload: {
      purchase_money_table_present: true,
      canonical_payment_evidence_id_column_present: true,
      record_function_present: true,
      record_function_signature_ok: false,
      record_function_search_path_empty: true,
    },
  },
  D4_POST_INDEX_NOT_READY: {
    probeId: 'R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT',
    payload: {
      ledger_table_present: true,
      one_accrual_unique_index_present: true,
      one_accrual_index_on_ledger_table: true,
      one_accrual_index_unique: true,
      one_accrual_index_valid: true,
      one_accrual_index_ready: false,
      one_accrual_index_key_order_ok: true,
      one_accrual_index_predicate_exact_ok: true,
      insert_ledger_function_present: true,
      insert_ledger_function_signature_ok: true,
    },
  },
  D4_POST_WRONG_INDEX_KEY: {
    probeId: 'R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT',
    payload: {
      ledger_table_present: true,
      one_accrual_unique_index_present: true,
      one_accrual_index_on_ledger_table: true,
      one_accrual_index_unique: true,
      one_accrual_index_valid: true,
      one_accrual_index_ready: true,
      one_accrual_index_key_order_ok: false,
      one_accrual_index_predicate_exact_ok: true,
      insert_ledger_function_present: true,
      insert_ledger_function_signature_ok: true,
    },
  },
  D5_POST_WRONG_INDEX_PREDICATE: {
    probeId: 'R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT',
    payload: {
      issue_or_get_present: true,
      rotate_present: true,
      issue_or_get_signature_ok: true,
      rotate_signature_ok: true,
      issue_or_get_service_role_execute: true,
      rotate_service_role_execute: true,
      issue_or_get_security_definer: true,
      rotate_security_definer: true,
      issue_or_get_search_path_empty: true,
      rotate_search_path_empty: true,
      issue_or_get_non_privileged_execute_absent: true,
      rotate_non_privileged_execute_absent: true,
      one_active_index_on_referral_links_table: true,
      one_active_index_unique: true,
      one_active_index_valid: true,
      one_active_index_ready: true,
      one_active_index_single_key_ok: true,
      one_active_index_predicate_exact_ok: false,
      duplicate_active_violation_present: false,
      post_apply_unique_index_invariant_scope_only: true,
    },
  },
  D5_POST_UNAUTHORIZED_RPC_EXECUTE: {
    probeId: 'R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT',
    payload: {
      issue_or_get_present: true,
      rotate_present: true,
      issue_or_get_signature_ok: true,
      rotate_signature_ok: true,
      issue_or_get_service_role_execute: true,
      rotate_service_role_execute: true,
      issue_or_get_security_definer: true,
      rotate_security_definer: true,
      issue_or_get_search_path_empty: true,
      rotate_search_path_empty: true,
      issue_or_get_non_privileged_execute_absent: false,
      rotate_non_privileged_execute_absent: true,
      one_active_index_on_referral_links_table: true,
      one_active_index_unique: true,
      one_active_index_valid: true,
      one_active_index_ready: true,
      one_active_index_single_key_ok: true,
      one_active_index_predicate_exact_ok: true,
      duplicate_active_violation_present: false,
      post_apply_unique_index_invariant_scope_only: true,
    },
  },
  D5_POST_DUPLICATE_ACTIVE_PRESENT: {
    probeId: 'R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT',
    payload: {
      issue_or_get_present: true,
      rotate_present: true,
      issue_or_get_signature_ok: true,
      rotate_signature_ok: true,
      issue_or_get_service_role_execute: true,
      rotate_service_role_execute: true,
      issue_or_get_security_definer: true,
      rotate_security_definer: true,
      issue_or_get_search_path_empty: true,
      rotate_search_path_empty: true,
      issue_or_get_non_privileged_execute_absent: true,
      rotate_non_privileged_execute_absent: true,
      one_active_index_on_referral_links_table: true,
      one_active_index_unique: true,
      one_active_index_valid: true,
      one_active_index_ready: true,
      one_active_index_single_key_ok: true,
      one_active_index_predicate_exact_ok: true,
      duplicate_active_violation_present: true,
      post_apply_unique_index_invariant_scope_only: true,
    },
  },
};

export function resetR7RuntimeProbeRegistryCacheForTests(): void {
  cachedRegistry = null;
}
