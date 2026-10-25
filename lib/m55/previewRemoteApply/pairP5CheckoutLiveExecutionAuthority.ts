import {
  PAIR_P5_CHECKOUT_MIGRATION_VERSION,
  PAIR_P5_CHECKOUT_STEP_ID,
  assertPairP5CheckoutProbeSqlPinnedIntegrity,
} from './pairP5CheckoutStepAuthority.ts';
import { PAIR_P5_STATIC_EXECUTION_GATE } from './pairP5IdentityOfflinePlan.ts';

export const PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTOR_ID =
  'M55_PAIR_P5_CHECKOUT_AUTHORIZATION_GATED_REAL_EXECUTOR_v1' as const;

/** P5-2 scoped Human GO — independent from P5-1 consumption; does not authorize Preview APPLY by itself. */
export const PAIR_P5_CHECKOUT_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED = true as const;

/** Post-commit READ-ONLY verifier on a distinct live connection (checkout step only). */
export const PAIR_P5_CHECKOUT_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED = true as const;

export const PAIR_P5_CHECKOUT_STATIC_EXECUTION_GATE = PAIR_P5_STATIC_EXECUTION_GATE;

export function isPairP5CheckoutHumanPreviewApplyAuthorizationGranted(): boolean {
  return PAIR_P5_CHECKOUT_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED;
}

export function pairP5CheckoutLiveFreshReadonlyProbeAuthorizationGranted(): boolean {
  return PAIR_P5_CHECKOUT_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED;
}

export function assertPairP5CheckoutPrerequisiteLocalCodeIntegrity(): void {
  assertPairP5CheckoutProbeSqlPinnedIntegrity();
}

export const PAIR_P5_CHECKOUT_LIVE_EXECUTION_PREP_READINESS = {
  executorId: PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTOR_ID,
  callableStepId: PAIR_P5_CHECKOUT_STEP_ID,
  migrationVersion: PAIR_P5_CHECKOUT_MIGRATION_VERSION,
  checkoutHumanPreviewApplyAuthorizationGranted: PAIR_P5_CHECKOUT_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED,
  checkoutLiveFreshReadonlyProbeAuthorizationGranted:
    PAIR_P5_CHECKOUT_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED,
  dedicatedCheckoutCliImplemented: true as const,
  liveMutationPathUsesCheckoutHumanGate: true as const,
  liveFreshReadonlyDistinctConnectionWired: true as const,
  previewApplyReady: false as const,
  nextHumanAction: 'ISSUE_P5_2_OPERATIONAL_RECEIPT_AND_RUN_CHECKOUT_CLI_ONCE' as const,
} as const;
