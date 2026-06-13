import { createHash } from 'node:crypto';

import { canonicalSerializePreviewRemoteApply } from './types.ts';

export const M55_PREVIEW_REMOTE_APPLY_TIMEOUT_POLICY_V1 =
  'M55_PREVIEW_REMOTE_APPLY_TIMEOUT_POLICY_v1' as const;

export type TimeoutPolicyMilliseconds = {
  readonly connectMs: 15000;
  readonly lockMs: 30000;
  readonly statementMs: 120000;
  readonly idleInTransactionMs: 180000;
  readonly mutationDeadlineMs: 600000;
  readonly postCommitVerificationMs: 120000;
  readonly ackClassifierMs: 180000;
};

export type TimeoutPolicy = {
  readonly identifier: typeof M55_PREVIEW_REMOTE_APPLY_TIMEOUT_POLICY_V1;
  readonly units: 'milliseconds';
  readonly values: TimeoutPolicyMilliseconds;
  readonly environmentOverrideForbidden: true;
  readonly cliOverrideForbidden: true;
  readonly canonical_payload_sha256: string;
};

const TIMEOUT_VALUES: TimeoutPolicyMilliseconds = {
  connectMs: 15000,
  lockMs: 30000,
  statementMs: 120000,
  idleInTransactionMs: 180000,
  mutationDeadlineMs: 600000,
  postCommitVerificationMs: 120000,
  ackClassifierMs: 180000,
};

function buildCanonicalTimeoutPayload(): Omit<TimeoutPolicy, 'canonical_payload_sha256'> {
  return {
    identifier: M55_PREVIEW_REMOTE_APPLY_TIMEOUT_POLICY_V1,
    units: 'milliseconds',
    values: TIMEOUT_VALUES,
    environmentOverrideForbidden: true,
    cliOverrideForbidden: true,
  };
}

export function computeTimeoutPolicyCanonicalPayloadSha256(): string {
  const payload = buildCanonicalTimeoutPayload();
  return createHash('sha256')
    .update(Buffer.from(canonicalSerializePreviewRemoteApply(payload), 'utf8'))
    .digest('hex');
}

export const TIMEOUT_POLICY: TimeoutPolicy = {
  ...buildCanonicalTimeoutPayload(),
  canonical_payload_sha256: computeTimeoutPolicyCanonicalPayloadSha256(),
};

export function validateTimeoutPolicyInvariants(policy: TimeoutPolicy = TIMEOUT_POLICY): void {
  const values = policy.values;
  const entries = Object.values(values);
  for (const value of entries) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('HOLD_TIMEOUT_POLICY');
    }
  }
  if (!(values.mutationDeadlineMs > values.idleInTransactionMs)) {
    throw new Error('HOLD_TIMEOUT_POLICY');
  }
  if (!(values.idleInTransactionMs > values.statementMs)) {
    throw new Error('HOLD_TIMEOUT_POLICY');
  }
  if (!(values.statementMs > values.lockMs)) {
    throw new Error('HOLD_TIMEOUT_POLICY');
  }
  if (!(values.lockMs > values.connectMs)) {
    throw new Error('HOLD_TIMEOUT_POLICY');
  }
}
