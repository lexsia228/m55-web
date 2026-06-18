/**
 * M55 Production purchase-wave authority (LOCAL validation only).
 * No network, DB, payment, or credential access.
 */

import { createHash } from 'node:crypto';

export const WAVE_AUTHORITY_SCHEMA_VERSION =
  'm55_production_purchase_wave_authority_v1' as const;

export const SUBJECT_LABEL_A = 'M55_PROD_PURCHASE_A' as const;
export const SUBJECT_LABEL_B = 'M55_PROD_PURCHASE_B' as const;

export const CANONICAL_SUBJECT_LABELS = [SUBJECT_LABEL_A, SUBJECT_LABEL_B] as const;

export const APPROVED_SCENARIOS = [
  'LIGHT_PURCHASE_SUBJECT_A',
  'LIGHT_TO_FULL_SUBJECT_A',
  'DUPLICATE_FULL_REJECTION_SUBJECT_A',
  'FRESH_FULL_SUBJECT_B',
] as const;

export type ApprovedScenario = (typeof APPROVED_SCENARIOS)[number];

export const APPROVED_ACTION_ORDER = [...APPROVED_SCENARIOS] as const;

export const AMOUNT_POLICIES = {
  light_yen: 1000,
  full_yen: 1480,
  upgrade_yen: 600,
} as const;

export const MAX_SUCCESSFUL_CHARGE_COUNT = 3 as const;
export const MAX_LIGHT_CHARGE_COUNT = 1 as const;
export const MAX_UPGRADE_CHARGE_COUNT = 1 as const;
export const MAX_FRESH_FULL_CHARGE_COUNT = 1 as const;
export const MAX_DUPLICATE_FULL_CHARGE_COUNT = 0 as const;
export const MAX_CHECKOUT_COUNT = 4 as const;

export const HUMAN_ACTION_STEPS = [
  'W0',
  'W1',
  'W2',
  'W3',
  'W4',
  'W5',
  'W6',
  'W7',
  'W8',
  'W9',
  'W10',
  'W11',
  'W12',
  'W13',
  'W14',
  'W15',
  'W16',
  'W17',
  'W18',
] as const;

export type HumanActionStep = (typeof HUMAN_ACTION_STEPS)[number];

export const HUMAN_TO_INTERNAL_STATE_MAP: readonly {
  human_step: HumanActionStep;
  internal_states: readonly string[];
}[] = [
  { human_step: 'W0', internal_states: ['W0_AUTHORITY_CONFIRMATION'] },
  { human_step: 'W1', internal_states: ['W1_TEST_SUBJECTS_CONFIRMED'] },
  { human_step: 'W2', internal_states: ['W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED'] },
  { human_step: 'W3', internal_states: ['W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED'] },
  { human_step: 'W4', internal_states: ['W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED'] },
  { human_step: 'W5', internal_states: ['W3_LIGHT_POSTCHECK'] },
  { human_step: 'W6', internal_states: ['W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED'] },
  { human_step: 'W7', internal_states: ['W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED'] },
  { human_step: 'W8', internal_states: ['W5_CONVERSION_POSTCHECK'] },
  { human_step: 'W9', internal_states: ['W6_DUPLICATE_FULL_REJECTION_CHECK'] },
  { human_step: 'W10', internal_states: ['W6_DUPLICATE_FULL_REJECTION_CHECK'] },
  { human_step: 'W11', internal_states: ['W6_DUPLICATE_FULL_REJECTION_CHECK'] },
  { human_step: 'W12', internal_states: ['W7_FRESH_FULL_HUMAN_ACTION_REQUIRED'] },
  { human_step: 'W13', internal_states: ['W7_FRESH_FULL_HUMAN_ACTION_REQUIRED'] },
  { human_step: 'W14', internal_states: ['W8_FULL_POSTCHECK'] },
  { human_step: 'W15', internal_states: ['W9_IDEMPOTENCY_AND_EXACTNESS_CLOSURE'] },
  { human_step: 'W16', internal_states: ['W11_PURCHASE_WAVE_COMPLETE_DELETION_SEPARATE'] },
  { human_step: 'W17', internal_states: ['W10_REFUND_CLEANUP_HUMAN_DECISION'] },
  { human_step: 'W18', internal_states: ['W11_PURCHASE_WAVE_COMPLETE_DELETION_SEPARATE'] },
];

export const PAYMENT_OUTCOME_CLASSES = [
  'PAYMENT_CONFIRMED_AND_APPLICATION_PENDING',
  'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN',
  'PAYMENT_DECLINED_NO_CHARGE',
  'CHECKOUT_NOT_CREATED',
  'CHECKOUT_CREATED_PAYMENT_NOT_ATTEMPTED',
  'PAYMENT_STATUS_AMBIGUOUS',
  'DUPLICATE_CHARGE_RISK',
  'UNKNOWN',
] as const;

export type PaymentOutcomeClass = (typeof PAYMENT_OUTCOME_CLASSES)[number];

export const SUCCESSFUL_PAYMENT_OUTCOMES: readonly PaymentOutcomeClass[] = [
  'PAYMENT_CONFIRMED_AND_APPLICATION_PENDING',
  'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN',
];

export const APPROVAL_PHRASE_TEMPLATE =
  'APPROVE CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-EXECUTION MAIN_<safe-short-sha> DEPLOYMENT_<safe-id> AUTHORITY_<safe-hash>';

export type BindingConfirmations = {
  vercel_production_binding_exact: boolean;
  supabase_production_binding_exact: boolean;
  clerk_live_binding_exact: boolean;
  stripe_live_mode_exact: boolean;
  light_price_binding_exact: boolean;
  full_price_binding_exact: boolean;
  upgrade_price_binding_exact: boolean;
};

export type PurchaseWaveAuthority = {
  schema_version: typeof WAVE_AUTHORITY_SCHEMA_VERSION;
  gate_title: string;
  approved_main_commit: string;
  approved_production_deployment_identity: string;
  approved_production_deployment_commit: string;
  approved_production_chain_evidence_identity: string;
  approved_compatibility_evidence_identity: string;
  approved_rollout_order: 'MIGRATE_THEN_DEPLOY' | 'DEPLOY_THEN_MIGRATE' | 'STAGED_PROTECTED_CUTOVER';
  approved_purchase_harness_commit: string;
  approved_purchase_harness_file_identities: readonly string[];
  approved_postcheck_identity: string;
  approved_binding_confirmation_identity: string;
  approved_subject_labels: readonly string[];
  approved_subject_precheck_identity: string;
  approved_scenarios: readonly ApprovedScenario[];
  approved_amount_policies: typeof AMOUNT_POLICIES;
  approved_action_order: readonly ApprovedScenario[];
  approved_max_checkout_count: number;
  approved_max_successful_charge_count: number;
  approved_max_light_charge_count: number;
  approved_max_upgrade_charge_count: number;
  approved_max_fresh_full_charge_count: number;
  approved_max_duplicate_full_charge_count: number;
  binding_confirmations: BindingConfirmations;
  final_rc_gate: string;
  final_rc_verdict: string;
  preview_deletion_smoke_gate: string;
  preview_deletion_smoke_verdict: string;
  dns_blocker_resolved: boolean;
  human_approval_phrase_hash: string;
  issued_at: string;
  expires_at: string;
  single_use: true;
  consumed: boolean;
  execution_nonce_hash: string;
  prior_ambiguous_action: boolean;
};

export type PurchaseWaveAuthorityValidationResult = {
  schema_version: typeof WAVE_AUTHORITY_SCHEMA_VERSION;
  ready: boolean;
  failed_flags: string[];
  unknown_flags: string[];
  allowed_next_action: string;
  remaining_charge_budget: {
    light: number;
    upgrade: number;
    fresh_full: number;
    duplicate_full: number;
    total: number;
  };
  approved_subject_labels: readonly string[];
};

const FORBIDDEN_FIELD_PATTERNS = [
  /sk_live_/,
  /sk_test_/,
  /whsec_/,
  /price_[A-Za-z0-9]{8,}/,
  /Bearer\s+/,
];

const FORBIDDEN_OUTPUT_PATTERNS = [
  ...FORBIDDEN_FIELD_PATTERNS,
  /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /user_[a-zA-Z0-9]{10,}/,
  /cus_[a-zA-Z0-9]+/,
];

export function hashApprovalPhrase(phrase: string): string {
  return createHash('sha256').update(phrase, 'utf8').digest('hex');
}

export function assertSecretSafeOutput(value: string): void {
  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error('SECRET_OR_PII_OUTPUT_FORBIDDEN');
    }
  }
}

export function authorityContainsForbiddenFields(
  authority: PurchaseWaveAuthority,
): boolean {
  const blob = JSON.stringify(authority);
  return FORBIDDEN_FIELD_PATTERNS.some((p) => p.test(blob));
}

export function humanActionMapIsConsistent(): boolean {
  if (HUMAN_ACTION_STEPS.length !== 19) return false;
  if (HUMAN_TO_INTERNAL_STATE_MAP.length !== 19) return false;
  for (let i = 0; i < HUMAN_ACTION_STEPS.length; i++) {
    if (HUMAN_TO_INTERNAL_STATE_MAP[i]?.human_step !== HUMAN_ACTION_STEPS[i]) return false;
    if ((HUMAN_TO_INTERNAL_STATE_MAP[i]?.internal_states.length ?? 0) === 0) return false;
  }
  return true;
}

export function paymentOutcomeAllowsCharge(outcome: PaymentOutcomeClass): boolean {
  return SUCCESSFUL_PAYMENT_OUTCOMES.includes(outcome);
}

export function paymentOutcomeIsAmbiguous(outcome: PaymentOutcomeClass): boolean {
  return (
    outcome === 'PAYMENT_STATUS_AMBIGUOUS' ||
    outcome === 'DUPLICATE_CHARGE_RISK' ||
    outcome === 'UNKNOWN'
  );
}

export function evaluateCombinedPaymentEvidence(input: {
  payment_outcome: PaymentOutcomeClass;
  stripe_success_observed: boolean;
  success_page_observed: boolean;
  application_access_observed: boolean;
  postcheck_green: boolean;
}): boolean {
  if (paymentOutcomeIsAmbiguous(input.payment_outcome)) return false;
  if (input.success_page_observed && !input.postcheck_green) return false;
  if (input.stripe_success_observed && !input.postcheck_green) return false;
  if (input.application_access_observed && !input.postcheck_green) return false;
  if (input.postcheck_green && !paymentOutcomeAllowsCharge(input.payment_outcome)) return false;
  return (
    paymentOutcomeAllowsCharge(input.payment_outcome) &&
    input.postcheck_green &&
    (input.stripe_success_observed || input.application_access_observed)
  );
}

export function validatePurchaseWaveAuthority(
  authority: PurchaseWaveAuthority | null | undefined,
  ctx: {
    now: Date;
    observedMainCommit?: string;
    observedDeploymentCommit?: string;
    observedChainEvidenceIdentity?: string;
    observedCompatibilityEvidenceIdentity?: string;
    observedSubjectPrecheckIdentity?: string;
    observedBindingConfirmationIdentity?: string;
    chargesConsumed?: {
      light: number;
      upgrade: number;
      fresh_full: number;
      duplicate_full: number;
    };
  },
): PurchaseWaveAuthorityValidationResult {
  const failed: string[] = [];
  const unknown: string[] = [];

  const budget: PurchaseWaveAuthorityValidationResult['remaining_charge_budget'] = {
    light: MAX_LIGHT_CHARGE_COUNT,
    upgrade: MAX_UPGRADE_CHARGE_COUNT,
    fresh_full: MAX_FRESH_FULL_CHARGE_COUNT,
    duplicate_full: MAX_DUPLICATE_FULL_CHARGE_COUNT,
    total: MAX_SUCCESSFUL_CHARGE_COUNT,
  };

  if (!authority) {
    return result(false, ['HOLD_AUTHORITY_MISSING'], unknown, budget, []);
  }

  if (authorityContainsForbiddenFields(authority)) {
    failed.push('HOLD_FORBIDDEN_SECRET_FIELD');
  }

  if (authority.schema_version !== WAVE_AUTHORITY_SCHEMA_VERSION) {
    failed.push('HOLD_AUTHORITY_SCHEMA_MISMATCH');
  }
  if (authority.single_use !== true) failed.push('HOLD_AUTHORITY_SINGLE_USE_REQUIRED');
  if (authority.consumed) failed.push('HOLD_AUTHORITY_ALREADY_CONSUMED');
  if (authority.prior_ambiguous_action) failed.push('HOLD_PRIOR_AMBIGUOUS_ACTION');

  const expires = Date.parse(authority.expires_at);
  if (!Number.isFinite(expires) || ctx.now.getTime() > expires) {
    failed.push('HOLD_AUTHORITY_EXPIRED');
  }

  if (authority.final_rc_verdict !== 'CLOSED_GREEN') failed.push('HOLD_FINAL_RC_NOT_GREEN');
  if (authority.preview_deletion_smoke_verdict !== 'CLOSED_GREEN') {
    failed.push('HOLD_PREVIEW_DELETION_SMOKE_NOT_GREEN');
  }
  if (authority.dns_blocker_resolved !== true) failed.push('HOLD_DNS_BLOCKER_UNRESOLVED');

  if (!authority.approved_main_commit || authority.approved_main_commit.length !== 40) {
    failed.push('HOLD_MAIN_COMMIT_INVALID');
  }
  if (
    ctx.observedMainCommit &&
    authority.approved_main_commit !== ctx.observedMainCommit
  ) {
    failed.push('HOLD_MAIN_COMMIT_MISMATCH');
  }

  if (
    !authority.approved_production_deployment_commit ||
    authority.approved_production_deployment_commit.length !== 40
  ) {
    failed.push('HOLD_DEPLOYMENT_COMMIT_INVALID');
  }
  if (
    ctx.observedDeploymentCommit &&
    authority.approved_production_deployment_commit !== ctx.observedDeploymentCommit
  ) {
    failed.push('HOLD_DEPLOYMENT_COMMIT_MISMATCH');
  }

  if (!authority.approved_production_chain_evidence_identity) {
    failed.push('HOLD_CHAIN_EVIDENCE_MISSING');
  }
  if (
    ctx.observedChainEvidenceIdentity &&
    authority.approved_production_chain_evidence_identity !== ctx.observedChainEvidenceIdentity
  ) {
    failed.push('HOLD_CHAIN_EVIDENCE_MISMATCH');
  }

  if (!authority.approved_compatibility_evidence_identity) {
    failed.push('HOLD_COMPATIBILITY_EVIDENCE_MISSING');
  }
  if (
    ctx.observedCompatibilityEvidenceIdentity &&
    authority.approved_compatibility_evidence_identity !== ctx.observedCompatibilityEvidenceIdentity
  ) {
    failed.push('HOLD_COMPATIBILITY_EVIDENCE_MISMATCH');
  }

  if (!authority.approved_subject_precheck_identity) {
    failed.push('HOLD_SUBJECT_PRECHECK_IDENTITY_MISSING');
  }
  if (
    ctx.observedSubjectPrecheckIdentity &&
    authority.approved_subject_precheck_identity !== ctx.observedSubjectPrecheckIdentity
  ) {
    failed.push('HOLD_SUBJECT_PRECHECK_IDENTITY_MISMATCH');
  }

  if (!authority.approved_binding_confirmation_identity) {
    failed.push('HOLD_BINDING_CONFIRMATION_IDENTITY_MISSING');
  }
  if (
    ctx.observedBindingConfirmationIdentity &&
    authority.approved_binding_confirmation_identity !== ctx.observedBindingConfirmationIdentity
  ) {
    failed.push('HOLD_BINDING_CONFIRMATION_IDENTITY_MISMATCH');
  }

  const labels = new Set(authority.approved_subject_labels);
  if (labels.size !== 2 || !labels.has(SUBJECT_LABEL_A) || !labels.has(SUBJECT_LABEL_B)) {
    failed.push('HOLD_SUBJECT_LABEL_MISMATCH');
  }
  if (authority.approved_subject_labels.length > 2) {
    failed.push('HOLD_EXTRA_SUBJECT_FORBIDDEN');
  }

  if (
    authority.approved_scenarios.length !== APPROVED_SCENARIOS.length ||
    !APPROVED_SCENARIOS.every((s, i) => authority.approved_scenarios[i] === s)
  ) {
    failed.push('HOLD_SCENARIO_ORDER_MISMATCH');
  }

  if (
    authority.approved_action_order.length !== APPROVED_ACTION_ORDER.length ||
    !APPROVED_ACTION_ORDER.every((s, i) => authority.approved_action_order[i] === s)
  ) {
    failed.push('HOLD_ACTION_ORDER_MISMATCH');
  }

  if (authority.approved_amount_policies.light_yen !== AMOUNT_POLICIES.light_yen) {
    failed.push('HOLD_AMOUNT_POLICY_MISMATCH');
  }
  if (authority.approved_amount_policies.full_yen !== AMOUNT_POLICIES.full_yen) {
    failed.push('HOLD_AMOUNT_POLICY_MISMATCH');
  }
  if (authority.approved_amount_policies.upgrade_yen !== AMOUNT_POLICIES.upgrade_yen) {
    failed.push('HOLD_AMOUNT_POLICY_MISMATCH');
  }

  if (authority.approved_max_successful_charge_count !== MAX_SUCCESSFUL_CHARGE_COUNT) {
    failed.push('HOLD_MAX_CHARGE_MISMATCH');
  }
  if (authority.approved_max_light_charge_count !== MAX_LIGHT_CHARGE_COUNT) {
    failed.push('HOLD_MAX_LIGHT_CHARGE_MISMATCH');
  }
  if (authority.approved_max_upgrade_charge_count !== MAX_UPGRADE_CHARGE_COUNT) {
    failed.push('HOLD_MAX_UPGRADE_CHARGE_MISMATCH');
  }
  if (authority.approved_max_fresh_full_charge_count !== MAX_FRESH_FULL_CHARGE_COUNT) {
    failed.push('HOLD_MAX_FRESH_FULL_CHARGE_MISMATCH');
  }
  if (authority.approved_max_duplicate_full_charge_count !== MAX_DUPLICATE_FULL_CHARGE_COUNT) {
    failed.push('HOLD_MAX_DUPLICATE_CHARGE_MISMATCH');
  }
  if (authority.approved_max_checkout_count !== MAX_CHECKOUT_COUNT) {
    failed.push('HOLD_MAX_CHECKOUT_MISMATCH');
  }

  const bc = authority.binding_confirmations;
  if (!bc.vercel_production_binding_exact) failed.push('HOLD_VERCEL_BINDING_MISMATCH');
  if (!bc.supabase_production_binding_exact) failed.push('HOLD_SUPABASE_BINDING_MISMATCH');
  if (!bc.clerk_live_binding_exact) failed.push('HOLD_CLERK_BINDING_MISMATCH');
  if (!bc.stripe_live_mode_exact) failed.push('HOLD_STRIPE_MODE_MISMATCH');
  if (!bc.light_price_binding_exact) failed.push('HOLD_LIGHT_PRICE_BINDING_MISMATCH');
  if (!bc.full_price_binding_exact) failed.push('HOLD_FULL_PRICE_BINDING_MISMATCH');
  if (!bc.upgrade_price_binding_exact) failed.push('HOLD_UPGRADE_PRICE_BINDING_MISMATCH');

  if (!authority.human_approval_phrase_hash || authority.human_approval_phrase_hash.length !== 64) {
    failed.push('HOLD_APPROVAL_HASH_MISSING');
  }
  if (!authority.execution_nonce_hash || authority.execution_nonce_hash.length !== 64) {
    failed.push('HOLD_EXECUTION_NONCE_MISSING');
  }

  if (ctx.chargesConsumed) {
    if (ctx.chargesConsumed.light > authority.approved_max_light_charge_count) {
      failed.push('HOLD_LIGHT_CHARGE_BUDGET_EXCEEDED');
    }
    if (ctx.chargesConsumed.upgrade > authority.approved_max_upgrade_charge_count) {
      failed.push('HOLD_UPGRADE_CHARGE_BUDGET_EXCEEDED');
    }
    if (ctx.chargesConsumed.fresh_full > authority.approved_max_fresh_full_charge_count) {
      failed.push('HOLD_FRESH_FULL_CHARGE_BUDGET_EXCEEDED');
    }
    if (ctx.chargesConsumed.duplicate_full > authority.approved_max_duplicate_full_charge_count) {
      failed.push('HOLD_DUPLICATE_CHARGE_BUDGET_EXCEEDED');
    }
    const total =
      ctx.chargesConsumed.light +
      ctx.chargesConsumed.upgrade +
      ctx.chargesConsumed.fresh_full;
    if (total > authority.approved_max_successful_charge_count) {
      failed.push('HOLD_TOTAL_CHARGE_BUDGET_EXCEEDED');
    }
    budget.light = Math.max(0, authority.approved_max_light_charge_count - ctx.chargesConsumed.light);
    budget.upgrade = Math.max(
      0,
      authority.approved_max_upgrade_charge_count - ctx.chargesConsumed.upgrade,
    );
    budget.fresh_full = Math.max(
      0,
      authority.approved_max_fresh_full_charge_count - ctx.chargesConsumed.fresh_full,
    );
    budget.duplicate_full = Math.max(
      0,
      authority.approved_max_duplicate_full_charge_count - ctx.chargesConsumed.duplicate_full,
    );
    budget.total = Math.max(0, authority.approved_max_successful_charge_count - total);
  }

  return result(
    failed.length === 0 && unknown.length === 0,
    failed,
    unknown,
    budget,
    authority.approved_subject_labels,
  );
}

function result(
  ready: boolean,
  failed_flags: string[],
  unknown_flags: string[],
  remaining_charge_budget: PurchaseWaveAuthorityValidationResult['remaining_charge_budget'],
  approved_subject_labels: readonly string[],
): PurchaseWaveAuthorityValidationResult {
  return {
    schema_version: WAVE_AUTHORITY_SCHEMA_VERSION,
    ready,
    failed_flags,
    unknown_flags,
    allowed_next_action: ready
      ? 'CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-HUMAN-ACTION'
      : 'CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-AUTHORITY-REVIEW',
    remaining_charge_budget,
    approved_subject_labels,
  };
}

export function serializePurchaseWaveAuthorityResult(
  value: PurchaseWaveAuthorityValidationResult,
): string {
  const json = JSON.stringify(value);
  assertSecretSafeOutput(json);
  return json;
}

export function sqlHasSingleTopLevelSelect(sql: string): boolean {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .trim();
  return /^(WITH\b[\s\S]+)?SELECT\b/i.test(stripped);
}

export function parseSqlMutationKeywords(sql: string): string[] {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
  const forbidden = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'MERGE',
    'TRUNCATE',
    'CREATE',
    'ALTER',
    'DROP',
    'GRANT',
    'REVOKE',
    'COPY',
    'CALL',
    'DO',
    'NOTIFY',
    'EXECUTE',
  ];
  return forbidden.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(stripped));
}

export const POSTCHECK_MODES = [
  'SUBJECT_PRECHECK',
  'LIGHT_POSTCHECK',
  'CONVERSION_POSTCHECK',
  'DUPLICATE_REJECTION_POSTCHECK',
  'FRESH_FULL_POSTCHECK',
  'INTEGRATED_CLOSURE',
] as const;

export const SUBJECT_PRECHECK_CLASSIFICATIONS = [
  'SUBJECT_READY_CLEAN',
  'SUBJECT_CONFLICTING_STATE',
  'SUBJECT_IDENTITY_AMBIGUOUS',
  'SUBJECT_REAL_USER_RISK',
  'SUBJECT_UNKNOWN',
] as const;

export function sqlModeCount(sql: string): number {
  return POSTCHECK_MODES.filter((m) => sql.includes(m)).length;
}
