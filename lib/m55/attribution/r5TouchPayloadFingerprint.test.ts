import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  M55_R5_QUALIFIED_TOUCH_PAYLOAD_FINGERPRINT_PURPOSE_V1,
  computeQualifiedTouchPayloadFingerprintV1,
} from './r5TouchPayloadFingerprint';

describe('r5TouchPayloadFingerprint', () => {
  const base = {
    qualifiedActionKind: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK' as const,
    tokenVersion: 'v1' as const,
    tokenDigest: 'a'.repeat(64),
    qualifiedTouchAtMs: 1_700_000_000_000,
    trackingContractVersion: 'v1' as const,
    attributionPolicyVersion: 'v1' as const,
  };

  it('is deterministic for frozen canonical fields', () => {
    const first = computeQualifiedTouchPayloadFingerprintV1(base);
    const second = computeQualifiedTouchPayloadFingerprintV1(base);
    assert.equal(first, second);
    assert.match(first, /^[0-9a-f]{64}$/);
  });

  it('pins the independent known vector', () => {
    const hash = createHash('sha256');
    hash.update(M55_R5_QUALIFIED_TOUCH_PAYLOAD_FINGERPRINT_PURPOSE_V1, 'utf8');
    hash.update('\0', 'utf8');
    hash.update('CREATOR', 'utf8');
    hash.update('\0', 'utf8');
    hash.update(base.qualifiedActionKind, 'utf8');
    hash.update('\0', 'utf8');
    hash.update('v1', 'utf8');
    hash.update('\0', 'utf8');
    hash.update(base.tokenDigest, 'utf8');
    hash.update('\0', 'utf8');
    hash.update(String(base.qualifiedTouchAtMs), 'utf8');
    hash.update('\0', 'utf8');
    hash.update('v1', 'utf8');
    hash.update('\0', 'utf8');
    hash.update('v1', 'utf8');
    assert.equal(computeQualifiedTouchPayloadFingerprintV1(base), hash.digest('hex'));
  });

  it('does not include touch_event_key in fingerprint input', () => {
    const withDifferentKeyMs = {
      ...base,
      qualifiedTouchAtMs: base.qualifiedTouchAtMs + 1,
    };
    assert.notEqual(
      computeQualifiedTouchPayloadFingerprintV1(base),
      computeQualifiedTouchPayloadFingerprintV1(withDifferentKeyMs),
    );
  });
});
