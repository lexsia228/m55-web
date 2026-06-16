/**
 * M55 Production purchase smoke — wave1 orchestrator (LOCAL dry-run default).
 * SSOT products: dtr_core_light_v1, dtr_core_full_v1, dtr_core_light_to_full_upgrade_v1
 *
 * No network, credentials, or payment automation in default mode.
 * Production execution requires a separate Human-approved authority object.
 */

import { createHash } from 'node:crypto';

export const HARNESS_SCHEMA_VERSION = 'm55_production_purchase_smoke_wave1_v1' as const;

export const WAVE_STATES = [
  'W0_AUTHORITY_CONFIRMATION',
  'W1_TEST_SUBJECTS_CONFIRMED',
  'W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED',
  'W3_LIGHT_POSTCHECK',
  'W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED',
  'W5_CONVERSION_POSTCHECK',
  'W6_DUPLICATE_FULL_REJECTION_CHECK',
  'W7_FRESH_FULL_HUMAN_ACTION_REQUIRED',
  'W8_FULL_POSTCHECK',
  'W9_IDEMPOTENCY_AND_EXACTNESS_CLOSURE',
  'W10_REFUND_CLEANUP_HUMAN_DECISION',
  'W11_PURCHASE_WAVE_COMPLETE_DELETION_SEPARATE',
] as const;

export type WaveState = (typeof WAVE_STATES)[number];

export const SUBJECT_A = 'SUBJECT_A_LIGHT_CONVERSION_DUPLICATE' as const;
export const SUBJECT_B = 'SUBJECT_B_FRESH_FULL' as const;

export const PRODUCT_LIGHT = 'dtr_core_light_v1' as const;
export const PRODUCT_FULL = 'dtr_core_full_v1' as const;
export const PRODUCT_UPGRADE = 'dtr_core_light_to_full_upgrade_v1' as const;
export const RIGHT_KEY = 'm55_p:core_origin' as const;

export const AMOUNT_LIGHT_YEN = 1000 as const;
export const AMOUNT_FULL_YEN = 1480 as const;
export const AMOUNT_UPGRADE_YEN = 600 as const;

export const WALLET_INITIAL_INCLUDED = 1 as const;
export const WALLET_LIGHT_PURCHASED = 0 as const;
export const WALLET_FULL_PURCHASED = 4 as const;
export const WALLET_TOTAL_CAP = 5 as const;

export const BINDING_ENV_KEYS = {
  light: 'STRIPE_PRICE_DTR_CORE_LIGHT_V1',
  full: 'STRIPE_PRICE_DTR_CORE_FULL_V1',
  upgrade: 'STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1',
} as const;

export const DUPLICATE_FULFILLMENT_NOOP_STATUSES = [
  'duplicate_noop',
  'already_full_equivalent',
  'skipped_cap',
] as const;

export const PRE_CHECKOUT_REJECTION_CODES = ['already_purchased'] as const;
export const WALLET_CAP_REJECTION_CODES = ['cap_reached'] as const;

export type HarnessMode = 'local_dry_run' | 'production_execution';

export type ProductionSmokeAuthority = {
  schema_version: typeof HARNESS_SCHEMA_VERSION;
  gate_title: string;
  approved_commit_sha: string;
  approved_branch: string;
  approved_production_project_identity: string;
  approved_vercel_project: string;
  approved_stripe_mode: 'live';
  approved_subject_labels: readonly string[];
  approved_scenario: 'wave1_full_matrix';
  approval_phrase_hash: string;
  expires_at: string;
  single_use: true;
};

export type SafeBindingProbe = {
  key_present: boolean;
  scope_exact: boolean;
  binding_matches: boolean;
  amount_matches: boolean;
  duplicate_binding_absent: boolean;
  env_key_name: string;
  value_length?: number;
};

export type SafeBindingReport = {
  schema_version: typeof HARNESS_SCHEMA_VERSION;
  light: SafeBindingProbe;
  full: SafeBindingProbe;
  upgrade: SafeBindingProbe;
  preview_production_cross_binding_rejected: boolean;
};

export type OpaqueHumanRef = {
  label: string;
  recorded_at: string;
};

export type LightPostcheckEvidence = {
  product_id: typeof PRODUCT_LIGHT;
  amount_yen: typeof AMOUNT_LIGHT_YEN;
  fulfillment_count: number;
  entitlement_active: boolean;
  right_key: typeof RIGHT_KEY;
  wallet_initial: number;
  wallet_purchased: number;
  snapshot_count: number;
  ownership_access_green: boolean;
};

export type ConversionPostcheckEvidence = {
  upgrade_product: typeof PRODUCT_UPGRADE;
  amount_yen: typeof AMOUNT_UPGRADE_YEN;
  light_before_present: boolean;
  full_equivalent_reached: boolean;
  wallet_purchased: number;
  duplicate_initial_credit: boolean;
  duplicate_snapshot: boolean;
  conversion_fulfillment_count: number;
};

export type DuplicateFullEvidence = {
  layer: 'pre_checkout' | 'wallet_cap' | 'fulfillment_noop';
  http_status?: number;
  rejection_code?: string;
  stripe_session_created: boolean;
  charge_created: boolean;
  fulfillment_status?: string;
  state_delta: boolean;
};

export type FreshFullPostcheckEvidence = {
  product_id: typeof PRODUCT_FULL;
  amount_yen: typeof AMOUNT_FULL_YEN;
  wallet_purchased: number;
  wallet_total_available: number;
  entitlement_active: boolean;
  right_key: typeof RIGHT_KEY;
  ownership_access_green: boolean;
  duplicate_row_detected: boolean;
};

export type IdempotencyEvidence = {
  duplicate_event_processed: boolean;
  extra_fulfillment_rows: number;
  extra_wallet_grants: number;
  extra_ledger_rows: number;
  extra_snapshot_rows: number;
};

export type StepEvidence =
  | { step: 'W0_AUTHORITY_CONFIRMATION'; authority_valid: boolean }
  | { step: 'W1_TEST_SUBJECTS_CONFIRMED'; subject_a: typeof SUBJECT_A; subject_b: typeof SUBJECT_B }
  | { step: 'W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED'; human_ref: OpaqueHumanRef; payment_ambiguous: false }
  | { step: 'W3_LIGHT_POSTCHECK'; subject: typeof SUBJECT_A; evidence: LightPostcheckEvidence }
  | { step: 'W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED'; human_ref: OpaqueHumanRef; payment_ambiguous: false }
  | { step: 'W5_CONVERSION_POSTCHECK'; subject: typeof SUBJECT_A; evidence: ConversionPostcheckEvidence }
  | { step: 'W6_DUPLICATE_FULL_REJECTION_CHECK'; subject: typeof SUBJECT_A; evidence: DuplicateFullEvidence }
  | { step: 'W7_FRESH_FULL_HUMAN_ACTION_REQUIRED'; human_ref: OpaqueHumanRef; payment_ambiguous: false }
  | { step: 'W8_FULL_POSTCHECK'; subject: typeof SUBJECT_B; evidence: FreshFullPostcheckEvidence }
  | { step: 'W9_IDEMPOTENCY_AND_EXACTNESS_CLOSURE'; evidence: IdempotencyEvidence }
  | { step: 'W10_REFUND_CLEANUP_HUMAN_DECISION'; refund_requested: boolean; refund_revocation_semantics: 'UNKNOWN_FAIL_CLOSED' }
  | { step: 'W11_PURCHASE_WAVE_COMPLETE_DELETION_SEPARATE'; deletion_gate_separate: true };

export type HarnessEvidenceRecord = {
  schema_version: typeof HARNESS_SCHEMA_VERSION;
  mode: HarnessMode;
  branch: string;
  commit_sha: string;
  current_state: WaveState;
  verdict: 'GREEN' | 'HOLD' | 'RED';
  first_failure_predicate: string | null;
  steps_completed: StepEvidence[];
  binding_report: SafeBindingReport | null;
};

export type HarnessTransports = {
  readBindingProbe: (envKeyName: string, expectedAmountYen: number) => SafeBindingProbe;
  log: (payload: Record<string, string | number | boolean | null>) => void;
};

export type HarnessOptions = {
  mode?: HarnessMode;
  branch?: string;
  commitSha?: string;
  authority?: ProductionSmokeAuthority | null;
  now?: () => Date;
  transports?: Partial<HarnessTransports>;
};

const FORBIDDEN_OUTPUT_PATTERNS = [
  /sk_live_/,
  /sk_test_/,
  /whsec_/,
  /Bearer\s+/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /user_[a-zA-Z0-9]{10,}/,
  /cus_[a-zA-Z0-9]+/,
  /cs_(live|test)_[a-zA-Z0-9]+/,
  /pi_[a-zA-Z0-9]+/,
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

export function serializeEvidence(record: HarnessEvidenceRecord): string {
  const json = JSON.stringify(record);
  assertSecretSafeOutput(json);
  return json;
}

export function validateAuthority(
  authority: ProductionSmokeAuthority | null | undefined,
  ctx: { branch: string; commitSha: string; now: Date },
): { ok: true } | { ok: false; predicate: string } {
  if (!authority) return { ok: false, predicate: 'HOLD_AUTHORITY_MISSING' };
  if (authority.schema_version !== HARNESS_SCHEMA_VERSION) {
    return { ok: false, predicate: 'HOLD_AUTHORITY_SCHEMA_MISMATCH' };
  }
  if (authority.single_use !== true) {
    return { ok: false, predicate: 'HOLD_AUTHORITY_SINGLE_USE_REQUIRED' };
  }
  if (authority.approved_branch !== ctx.branch) {
    return { ok: false, predicate: 'HOLD_AUTHORITY_BRANCH_MISMATCH' };
  }
  if (authority.approved_commit_sha !== ctx.commitSha) {
    return { ok: false, predicate: 'HOLD_AUTHORITY_COMMIT_MISMATCH' };
  }
  if (authority.approved_scenario !== 'wave1_full_matrix') {
    return { ok: false, predicate: 'HOLD_AUTHORITY_SCENARIO_MISMATCH' };
  }
  const expires = Date.parse(authority.expires_at);
  if (!Number.isFinite(expires) || ctx.now.getTime() > expires) {
    return { ok: false, predicate: 'HOLD_AUTHORITY_EXPIRED' };
  }
  const labels = new Set(authority.approved_subject_labels);
  if (!labels.has(SUBJECT_A) || !labels.has(SUBJECT_B)) {
    return { ok: false, predicate: 'HOLD_AUTHORITY_SUBJECT_LABEL_MISMATCH' };
  }
  if (authority.approved_stripe_mode !== 'live') {
    return { ok: false, predicate: 'HOLD_AUTHORITY_STRIPE_MODE_INVALID' };
  }
  return { ok: true };
}

export function evaluateBindingReport(probes: {
  light: SafeBindingProbe;
  full: SafeBindingProbe;
  upgrade: SafeBindingProbe;
  preview_production_cross_binding_rejected: boolean;
}): SafeBindingReport {
  return {
    schema_version: HARNESS_SCHEMA_VERSION,
    light: probes.light,
    full: probes.full,
    upgrade: probes.upgrade,
    preview_production_cross_binding_rejected: probes.preview_production_cross_binding_rejected,
  };
}

export function bindingReportGreen(report: SafeBindingReport): boolean {
  const probes = [report.light, report.full, report.upgrade];
  return (
    report.preview_production_cross_binding_rejected &&
    probes.every(
      (p) =>
        p.key_present &&
        p.scope_exact &&
        p.binding_matches &&
        p.amount_matches &&
        p.duplicate_binding_absent,
    )
  );
}

export function evaluateLightPostcheck(evidence: LightPostcheckEvidence): string | null {
  if (evidence.product_id !== PRODUCT_LIGHT) return 'HOLD_LIGHT_WRONG_PRODUCT';
  if (evidence.amount_yen !== AMOUNT_LIGHT_YEN) return 'HOLD_LIGHT_WRONG_AMOUNT';
  if (evidence.fulfillment_count !== 1) return 'HOLD_LIGHT_DUPLICATE_FULFILLMENT';
  if (!evidence.entitlement_active) return 'HOLD_LIGHT_ENTITLEMENT_MISSING';
  if (evidence.right_key !== RIGHT_KEY) return 'HOLD_LIGHT_WRONG_RIGHT';
  if (evidence.wallet_initial !== WALLET_INITIAL_INCLUDED) return 'HOLD_LIGHT_WALLET_INITIAL_MISMATCH';
  if (evidence.wallet_purchased !== WALLET_LIGHT_PURCHASED) return 'HOLD_LIGHT_WALLET_PURCHASED_MISMATCH';
  if (evidence.snapshot_count !== 1) return 'HOLD_LIGHT_SNAPSHOT_MISMATCH';
  if (!evidence.ownership_access_green) return 'HOLD_LIGHT_OWNERSHIP_ACCESS';
  return null;
}

export function evaluateConversionPostcheck(evidence: ConversionPostcheckEvidence): string | null {
  if (evidence.upgrade_product !== PRODUCT_UPGRADE) return 'HOLD_CONVERSION_WRONG_PRODUCT';
  if (evidence.amount_yen !== AMOUNT_UPGRADE_YEN) return 'HOLD_CONVERSION_WRONG_AMOUNT';
  if (!evidence.light_before_present) return 'HOLD_CONVERSION_MISSING_LIGHT_BEFORE';
  if (!evidence.full_equivalent_reached) return 'HOLD_CONVERSION_NOT_FULL_EQUIVALENT';
  if (evidence.wallet_purchased !== WALLET_FULL_PURCHASED) return 'HOLD_CONVERSION_PURCHASED_MISMATCH';
  if (evidence.duplicate_initial_credit) return 'HOLD_CONVERSION_DUPLICATE_CREDIT';
  if (evidence.duplicate_snapshot) return 'HOLD_CONVERSION_DUPLICATE_SNAPSHOT';
  if (evidence.conversion_fulfillment_count !== 1) return 'HOLD_CONVERSION_DUPLICATE_FULFILLMENT';
  return null;
}

export function evaluateDuplicateFull(evidence: DuplicateFullEvidence): string | null {
  if (evidence.state_delta) return 'HOLD_DUPLICATE_FULL_STATE_DELTA';
  if (evidence.charge_created) return 'HOLD_DUPLICATE_FULL_CHARGE_CREATED';
  if (evidence.layer === 'pre_checkout') {
    if (evidence.stripe_session_created) return 'HOLD_DUPLICATE_FULL_SESSION_CREATED';
    if (evidence.http_status !== 409) return 'HOLD_DUPLICATE_FULL_WRONG_HTTP';
    if (!evidence.rejection_code || !PRE_CHECKOUT_REJECTION_CODES.includes(evidence.rejection_code as 'already_purchased')) {
      return 'HOLD_DUPLICATE_FULL_WRONG_REJECTION_CODE';
    }
    return null;
  }
  if (evidence.layer === 'wallet_cap') {
    if (evidence.stripe_session_created) return 'HOLD_DUPLICATE_FULL_SESSION_CREATED';
    if (evidence.http_status !== 422) return 'HOLD_DUPLICATE_FULL_WRONG_HTTP';
    if (!evidence.rejection_code || !WALLET_CAP_REJECTION_CODES.includes(evidence.rejection_code as 'cap_reached')) {
      return 'HOLD_DUPLICATE_FULL_WRONG_REJECTION_CODE';
    }
    return null;
  }
  if (evidence.layer === 'fulfillment_noop') {
    const status = evidence.fulfillment_status ?? '';
    if (!DUPLICATE_FULFILLMENT_NOOP_STATUSES.includes(status as (typeof DUPLICATE_FULFILLMENT_NOOP_STATUSES)[number])) {
      return 'HOLD_DUPLICATE_FULL_FULFILLMENT_NOT_NOOP';
    }
    return null;
  }
  return 'HOLD_DUPLICATE_FULL_LAYER_UNKNOWN';
}

export function evaluateFreshFullPostcheck(evidence: FreshFullPostcheckEvidence): string | null {
  if (evidence.product_id !== PRODUCT_FULL) return 'HOLD_FRESH_FULL_WRONG_PRODUCT';
  if (evidence.amount_yen !== AMOUNT_FULL_YEN) return 'HOLD_FRESH_FULL_WRONG_AMOUNT';
  if (evidence.wallet_purchased !== WALLET_FULL_PURCHASED) return 'HOLD_FRESH_FULL_PURCHASED_MISMATCH';
  if (evidence.wallet_total_available !== WALLET_TOTAL_CAP) return 'HOLD_FRESH_FULL_TOTAL_MISMATCH';
  if (!evidence.entitlement_active) return 'HOLD_FRESH_FULL_ENTITLEMENT_MISSING';
  if (evidence.right_key !== RIGHT_KEY) return 'HOLD_FRESH_FULL_WRONG_RIGHT';
  if (!evidence.ownership_access_green) return 'HOLD_FRESH_FULL_OWNERSHIP_ACCESS';
  if (evidence.duplicate_row_detected) return 'HOLD_FRESH_FULL_DUPLICATE_ROWS';
  return null;
}

export function evaluateIdempotency(evidence: IdempotencyEvidence): string | null {
  if (evidence.extra_fulfillment_rows > 0) return 'HOLD_IDEMPOTENCY_EXTRA_FULFILLMENT';
  if (evidence.extra_wallet_grants > 0) return 'HOLD_IDEMPOTENCY_EXTRA_WALLET';
  if (evidence.extra_ledger_rows > 0) return 'HOLD_IDEMPOTENCY_EXTRA_LEDGER';
  if (evidence.extra_snapshot_rows > 0) return 'HOLD_IDEMPOTENCY_EXTRA_SNAPSHOT';
  return null;
}

const defaultTransports: HarnessTransports = {
  readBindingProbe: (envKeyName, expectedAmountYen) => ({
    key_present: true,
    scope_exact: true,
    binding_matches: true,
    amount_matches: true,
    duplicate_binding_absent: true,
    env_key_name: envKeyName,
    value_length: expectedAmountYen > 0 ? 18 : 0,
  }),
  log: () => {
    /* no-op in local dry-run */
  },
};

export class PurchaseSmokeWave1Harness {
  readonly mode: HarnessMode;
  readonly branch: string;
  readonly commitSha: string;
  readonly authority: ProductionSmokeAuthority | null;
  readonly transports: HarnessTransports;
  readonly now: () => Date;

  private stateIndex = 0;
  private steps: StepEvidence[] = [];
  private verdict: 'GREEN' | 'HOLD' | 'RED' = 'GREEN';
  private firstFailure: string | null = null;
  private bindingReport: SafeBindingReport | null = null;
  private halted = false;

  constructor(options: HarnessOptions = {}) {
    this.mode = options.mode ?? 'local_dry_run';
    this.branch = options.branch ?? 'feat/m55-paid-lp-canonical-wave1';
    this.commitSha = options.commitSha ?? '3e298c2eed7dc4e75509efe245edc3cdc92624f7';
    this.authority = options.authority ?? null;
    this.now = options.now ?? (() => new Date());
    this.transports = { ...defaultTransports, ...options.transports };
  }

  get currentState(): WaveState {
    return WAVE_STATES[this.stateIndex];
  }

  get evidenceRecord(): HarnessEvidenceRecord {
    return {
      schema_version: HARNESS_SCHEMA_VERSION,
      mode: this.mode,
      branch: this.branch,
      commit_sha: this.commitSha,
      current_state: this.currentState,
      verdict: this.verdict,
      first_failure_predicate: this.firstFailure,
      steps_completed: [...this.steps],
      binding_report: this.bindingReport,
    };
  }

  private hold(predicate: string): void {
    if (this.halted) return;
    this.halted = true;
    this.verdict = 'HOLD';
    this.firstFailure = predicate;
  }

  private completeStep(step: StepEvidence): void {
    if (this.halted) return;
    this.steps.push(step);
    if (this.stateIndex < WAVE_STATES.length - 1) {
      this.stateIndex += 1;
    }
  }

  assertStepOrder(expected: WaveState): boolean {
    return this.currentState === expected;
  }

  runW0AuthorityConfirmation(): void {
    if (!this.assertStepOrder('W0_AUTHORITY_CONFIRMATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (this.mode === 'production_execution') {
      const result = validateAuthority(this.authority, {
        branch: this.branch,
        commitSha: this.commitSha,
        now: this.now(),
      });
      if (!result.ok) {
        this.hold(result.predicate);
        return;
      }
    }
    this.bindingReport = evaluateBindingReport({
      light: this.transports.readBindingProbe(BINDING_ENV_KEYS.light, AMOUNT_LIGHT_YEN),
      full: this.transports.readBindingProbe(BINDING_ENV_KEYS.full, AMOUNT_FULL_YEN),
      upgrade: this.transports.readBindingProbe(BINDING_ENV_KEYS.upgrade, AMOUNT_UPGRADE_YEN),
      preview_production_cross_binding_rejected: true,
    });
    if (!bindingReportGreen(this.bindingReport)) {
      this.hold('HOLD_BINDING_CONTRACT');
      return;
    }
    this.completeStep({ step: 'W0_AUTHORITY_CONFIRMATION', authority_valid: true });
  }

  runW1TestSubjectsConfirmed(): void {
    if (!this.assertStepOrder('W1_TEST_SUBJECTS_CONFIRMED')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({
      step: 'W1_TEST_SUBJECTS_CONFIRMED',
      subject_a: SUBJECT_A,
      subject_b: SUBJECT_B,
    });
  }

  recordHumanPayment(step: 'W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED' | 'W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED' | 'W7_FRESH_FULL_HUMAN_ACTION_REQUIRED', humanRef: OpaqueHumanRef, paymentAmbiguous = false): void {
    if (this.halted) return;
    if (!this.assertStepOrder(step)) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (paymentAmbiguous) {
      this.hold('HOLD_PAYMENT_AMBIGUOUS_NO_RETRY');
      return;
    }
    assertSecretSafeOutput(humanRef.label);
    this.completeStep({ step, human_ref: humanRef, payment_ambiguous: false });
  }

  runW3LightPostcheck(evidence: LightPostcheckEvidence): void {
    if (!this.assertStepOrder('W3_LIGHT_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    const failure = evaluateLightPostcheck(evidence);
    if (failure) {
      this.hold(failure);
      return;
    }
    this.completeStep({ step: 'W3_LIGHT_POSTCHECK', subject: SUBJECT_A, evidence });
  }

  runW5ConversionPostcheck(evidence: ConversionPostcheckEvidence): void {
    if (!this.assertStepOrder('W5_CONVERSION_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    const failure = evaluateConversionPostcheck(evidence);
    if (failure) {
      this.hold(failure);
      return;
    }
    this.completeStep({ step: 'W5_CONVERSION_POSTCHECK', subject: SUBJECT_A, evidence });
  }

  runW6DuplicateFullRejection(evidence: DuplicateFullEvidence): void {
    if (!this.assertStepOrder('W6_DUPLICATE_FULL_REJECTION_CHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    const failure = evaluateDuplicateFull(evidence);
    if (failure) {
      this.hold(failure);
      return;
    }
    this.completeStep({ step: 'W6_DUPLICATE_FULL_REJECTION_CHECK', subject: SUBJECT_A, evidence });
  }

  runW8FullPostcheck(evidence: FreshFullPostcheckEvidence): void {
    if (!this.assertStepOrder('W8_FULL_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    const failure = evaluateFreshFullPostcheck(evidence);
    if (failure) {
      this.hold(failure);
      return;
    }
    this.completeStep({ step: 'W8_FULL_POSTCHECK', subject: SUBJECT_B, evidence });
  }

  runW9IdempotencyClosure(evidence: IdempotencyEvidence): void {
    if (!this.assertStepOrder('W9_IDEMPOTENCY_AND_EXACTNESS_CLOSURE')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    const failure = evaluateIdempotency(evidence);
    if (failure) {
      this.hold(failure);
      return;
    }
    this.completeStep({ step: 'W9_IDEMPOTENCY_AND_EXACTNESS_CLOSURE', evidence });
  }

  runW10RefundDecision(refundRequested: boolean): void {
    if (!this.assertStepOrder('W10_REFUND_CLEANUP_HUMAN_DECISION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({
      step: 'W10_REFUND_CLEANUP_HUMAN_DECISION',
      refund_requested: refundRequested,
      refund_revocation_semantics: 'UNKNOWN_FAIL_CLOSED',
    });
  }

  runW11Complete(): void {
    if (!this.assertStepOrder('W11_PURCHASE_WAVE_COMPLETE_DELETION_SEPARATE')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'W11_PURCHASE_WAVE_COMPLETE_DELETION_SEPARATE', deletion_gate_separate: true });
    if (!this.halted) this.verdict = 'GREEN';
  }

  /** LOCAL dry-run: mocked happy path only — no payment/network. */
  runLocalDryRunHappyPath(): HarnessEvidenceRecord {
    this.runW0AuthorityConfirmation();
    this.runW1TestSubjectsConfirmed();
    this.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', {
      label: 'opaque_light_checkout_ref',
      recorded_at: this.now().toISOString(),
    });
    this.runW3LightPostcheck({
      product_id: PRODUCT_LIGHT,
      amount_yen: AMOUNT_LIGHT_YEN,
      fulfillment_count: 1,
      entitlement_active: true,
      right_key: RIGHT_KEY,
      wallet_initial: WALLET_INITIAL_INCLUDED,
      wallet_purchased: WALLET_LIGHT_PURCHASED,
      snapshot_count: 1,
      ownership_access_green: true,
    });
    this.recordHumanPayment('W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED', {
      label: 'opaque_upgrade_checkout_ref',
      recorded_at: this.now().toISOString(),
    });
    this.runW5ConversionPostcheck({
      upgrade_product: PRODUCT_UPGRADE,
      amount_yen: AMOUNT_UPGRADE_YEN,
      light_before_present: true,
      full_equivalent_reached: true,
      wallet_purchased: WALLET_FULL_PURCHASED,
      duplicate_initial_credit: false,
      duplicate_snapshot: false,
      conversion_fulfillment_count: 1,
    });
    this.runW6DuplicateFullRejection({
      layer: 'pre_checkout',
      http_status: 409,
      rejection_code: 'already_purchased',
      stripe_session_created: false,
      charge_created: false,
      state_delta: false,
    });
    this.recordHumanPayment('W7_FRESH_FULL_HUMAN_ACTION_REQUIRED', {
      label: 'opaque_full_checkout_ref',
      recorded_at: this.now().toISOString(),
    });
    this.runW8FullPostcheck({
      product_id: PRODUCT_FULL,
      amount_yen: AMOUNT_FULL_YEN,
      wallet_purchased: WALLET_FULL_PURCHASED,
      wallet_total_available: WALLET_TOTAL_CAP,
      entitlement_active: true,
      right_key: RIGHT_KEY,
      ownership_access_green: true,
      duplicate_row_detected: false,
    });
    this.runW9IdempotencyClosure({
      duplicate_event_processed: true,
      extra_fulfillment_rows: 0,
      extra_wallet_grants: 0,
      extra_ledger_rows: 0,
      extra_snapshot_rows: 0,
    });
    this.runW10RefundDecision(false);
    this.runW11Complete();
    return this.evidenceRecord;
  }

  supportsDeletionAction(): false {
    return false;
  }

  supportsWebhookReplay(): false {
    return false;
  }

  supportsAutomaticPayment(): false {
    return false;
  }

  supportsAutomaticRefund(): false {
    return false;
  }

  supportsAutomaticRetry(): false {
    return false;
  }
}

function runCli(argv: string[]): number {
  if (argv.includes('--dry-run-local')) {
    const harness = new PurchaseSmokeWave1Harness();
    const record = harness.runLocalDryRunHappyPath();
    const json = serializeEvidence(record);
    assertSecretSafeOutput(json);
    process.stdout.write(`${json}\n`);
    return record.verdict === 'GREEN' ? 0 : 1;
  }
  process.stderr.write('Usage: node --experimental-strip-types scripts/production/m55_production_purchase_smoke_wave1.ts --dry-run-local\n');
  return 2;
}

if (process.argv[1]?.endsWith('m55_production_purchase_smoke_wave1.ts')) {
  process.exitCode = runCli(process.argv.slice(2));
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
  const hits: string[] = [];
  for (const word of forbidden) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(stripped)) hits.push(word);
  }
  return hits;
}

export function sqlHasWave1ProductCoverage(sql: string): boolean {
  return (
    sql.includes(PRODUCT_LIGHT) &&
    sql.includes(PRODUCT_FULL) &&
    sql.includes(PRODUCT_UPGRADE)
  );
}

export function sqlLegacyOnlyCoverage(sql: string): boolean {
  const hasLegacy = sql.includes('DTR_CORE_STATIC_V1');
  const hasWave1 = sqlHasWave1ProductCoverage(sql);
  return hasLegacy && !hasWave1;
}

export function sqlScenarioClassificationCount(sql: string): number {
  const markers = [
    'LIGHT_GREEN',
    'CONVERSION_GREEN',
    'DUPLICATE_FULL_REJECTED_GREEN',
    'FRESH_FULL_GREEN',
    'IDEMPOTENCY_GREEN',
    'HOLD_EXACT_REASON',
    'UNKNOWN',
  ];
  return markers.filter((m) => sql.includes(m)).length;
}
