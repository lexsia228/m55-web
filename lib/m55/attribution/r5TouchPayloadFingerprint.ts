import { createHash } from 'node:crypto';
import { isSha256LowerHex64 } from './r5TouchSchemaContract';
import type { PersistableQualifiedActionKind } from './r5TouchSchemaContract';

export const M55_R5_QUALIFIED_TOUCH_PAYLOAD_FINGERPRINT_PURPOSE_V1 =
  'm55.r5.attribution.qualified_touch.payload.v1' as const;

export type QualifiedTouchPayloadFingerprintInputV1 = {
  qualifiedActionKind: PersistableQualifiedActionKind;
  tokenVersion: 'v1';
  tokenDigest: string;
  qualifiedTouchAtMs: number;
  trackingContractVersion: 'v1';
  attributionPolicyVersion: 'v1';
};

export function computeQualifiedTouchPayloadFingerprintV1(
  input: QualifiedTouchPayloadFingerprintInputV1,
): string {
  if (!isSha256LowerHex64(input.tokenDigest)) {
    throw new Error('INVALID_TOKEN_DIGEST');
  }
  if (!Number.isSafeInteger(input.qualifiedTouchAtMs) || input.qualifiedTouchAtMs < 0) {
    throw new Error('INVALID_QUALIFIED_TOUCH_AT_MS');
  }

  const hash = createHash('sha256');
  hash.update(M55_R5_QUALIFIED_TOUCH_PAYLOAD_FINGERPRINT_PURPOSE_V1, 'utf8');
  hash.update('\0', 'utf8');
  hash.update('CREATOR', 'utf8');
  hash.update('\0', 'utf8');
  hash.update(input.qualifiedActionKind, 'utf8');
  hash.update('\0', 'utf8');
  hash.update(input.tokenVersion, 'utf8');
  hash.update('\0', 'utf8');
  hash.update(input.tokenDigest, 'utf8');
  hash.update('\0', 'utf8');
  hash.update(String(input.qualifiedTouchAtMs), 'utf8');
  hash.update('\0', 'utf8');
  hash.update(input.trackingContractVersion, 'utf8');
  hash.update('\0', 'utf8');
  hash.update(input.attributionPolicyVersion, 'utf8');
  return hash.digest('hex');
}
