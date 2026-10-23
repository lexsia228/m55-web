import { R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED } from './r7D1LiveExecutionGateConstants.ts';

export const R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV = 'M55_R7_D1_READONLY_PG_OBSERVATION_CHANNEL' as const;

export const R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1 = 'v1' as const;

export type R7D1ReadonlyPgObservationRuntimeHoldCode =
  | 'HOLD_READONLY_PG_OBSERVATION_NOT_AUTHORIZED'
  | 'HOLD_READONLY_PG_OBSERVATION_MUTATION_GATE_CONFLICT';

/**
 * Independent readonly-observation channel — not D1 apply / mutation authorization.
 * Human sets env in the operator shell; source never flips mutation or provenance const flags.
 */
export function evaluateR7D1ReadonlyPgObservationRuntimeAuthorization(): {
  readonly ok: true;
} | {
  readonly ok: false;
  readonly holdReasonCode: R7D1ReadonlyPgObservationRuntimeHoldCode;
} {
  if (R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED) {
    return { ok: false, holdReasonCode: 'HOLD_READONLY_PG_OBSERVATION_MUTATION_GATE_CONFLICT' };
  }
  const channel = process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];
  if (channel !== R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1) {
    return { ok: false, holdReasonCode: 'HOLD_READONLY_PG_OBSERVATION_NOT_AUTHORIZED' };
  }
  return { ok: true };
}

export function isR7D1ReadonlyPgObservationIoPermitted(): boolean {
  return evaluateR7D1ReadonlyPgObservationRuntimeAuthorization().ok;
}
