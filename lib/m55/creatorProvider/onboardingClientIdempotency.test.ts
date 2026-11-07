import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { createOnboardingClientIdempotencyKeyV1 } from './onboardingClientIdempotency.ts';
import { decideOnboardingSessionCreateV1 } from './providerOnboardingSessionLogic.ts';

describe('onboarding client idempotency keys', () => {
  it('generates a fresh key per intentional action', () => {
    const a = createOnboardingClientIdempotencyKeyV1();
    const b = createOnboardingClientIdempotencyKeyV1();
    assert.notEqual(a, b);
    assert.ok(a.length >= 8);
  });

  it('allows recovery after exhausted server session key with a new client key', () => {
    assert.deepEqual(decideOnboardingSessionCreateV1({ existingStatus: 'COMPLETED' }), {
      action: 'reject',
      reason: 'client_idempotency_key_exhausted',
      priorStatus: 'COMPLETED',
    });
    assert.deepEqual(decideOnboardingSessionCreateV1({ existingStatus: null }), {
      action: 'insert',
      reason: 'no_row',
    });
  });

  it('Creator portal issues a new key per click (not memoized for component lifetime)', () => {
    const src = readFileSync(
      join(process.cwd(), 'app/creator/_components/CreatorPayoutReadinessPanel.tsx'),
      'utf8',
    );
    assert.doesNotMatch(src, /useMemo\([\s\S]*idempotencyKey/);
    assert.match(src, /createOnboardingClientIdempotencyKeyV1\(\)/);
  });
});
