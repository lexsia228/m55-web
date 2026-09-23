import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  M55_R5_PURCHASE_ATTEMPT_ID_ISSUER,
  M55_R5_PURCHASE_ATTEMPT_SCOPE_PURPOSE_V1,
  M55_R5_STRIPE_CHECKOUT_IDEMPOTENCY_PREFIX_V1,
  M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY,
  buildPurchaseAttemptReuseScopeDigestV1,
  buildPurchaseAttemptStripeIdempotencyKeyV1,
  isM55PurchaseAttemptIdV1,
  parseMetadataPurchaseAttemptIdV1,
  resolveR5bCreatorCashProductMapV1,
} from './r5PurchaseAttemptContract';

describe('r5PurchaseAttemptContract', () => {
  it('pins trusted server-only issuer and does not mint ids', () => {
    assert.equal(M55_R5_PURCHASE_ATTEMPT_ID_ISSUER, 'TRUSTED_M55_LOCK_RPC_GEN_RANDOM_UUID');
    const source = `${isM55PurchaseAttemptIdV1.toString()}${buildPurchaseAttemptStripeIdempotencyKeyV1.toString()}`;
    assert.equal(source.includes('randomUUID'), false);
    assert.equal(isM55PurchaseAttemptIdV1(randomUUID()), true);
    assert.equal(isM55PurchaseAttemptIdV1('not-a-uuid'), false);
  });

  it('builds frozen Stripe checkout idempotency keys from attempt id', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    assert.equal(
      buildPurchaseAttemptStripeIdempotencyKeyV1(id),
      `${M55_R5_STRIPE_CHECKOUT_IDEMPOTENCY_PREFIX_V1}${id}`,
    );
    assert.equal(M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY, 'm55_pa');
  });

  it('hashes reuse scope without generation_decimal', () => {
    const a = buildPurchaseAttemptReuseScopeDigestV1({
      clerkSubjectLookupDigest: 'a'.repeat(64),
      runtimeProductId: 'dtr_core_light_v1',
      purchaseScopeId: 'scope-1',
    });
    const b = buildPurchaseAttemptReuseScopeDigestV1({
      clerkSubjectLookupDigest: 'a'.repeat(64),
      runtimeProductId: 'dtr_core_light_v1',
      purchaseScopeId: 'scope-1',
    });
    const c = buildPurchaseAttemptReuseScopeDigestV1({
      clerkSubjectLookupDigest: 'a'.repeat(64),
      runtimeProductId: 'dtr_core_light_v1',
      purchaseScopeId: 'scope-2',
    });
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(M55_R5_PURCHASE_ATTEMPT_SCOPE_PURPOSE_V1.includes('generation'), false);
  });

  it('maps Light + Full + upgrade and rejects additional interpretation', () => {
    assert.equal(
      resolveR5bCreatorCashProductMapV1({
        runtimeProductId: 'dtr_core_light_v1',
        repurchaseLane: false,
      }).ok,
      true,
    );
    assert.equal(
      resolveR5bCreatorCashProductMapV1({
        runtimeProductId: 'dtr_core_full_v1',
        repurchaseLane: true,
      }).ok,
      true,
    );
    const upgrade = resolveR5bCreatorCashProductMapV1({
      runtimeProductId: 'dtr_core_light_to_full_upgrade_v1',
      repurchaseLane: false,
    });
    assert.equal(upgrade.ok, true);
    if (upgrade.ok) {
      assert.equal(upgrade.conversionKind, 'LIGHT_TO_FULL_UPGRADE');
      assert.equal(upgrade.policyProductId, 'M55_PREMIUM_REPORT_FULL');
    }
    assert.equal(
      resolveR5bCreatorCashProductMapV1({
        runtimeProductId: 'additional_reply_ticket',
        repurchaseLane: false,
      }).ok,
      false,
    );
  });

  it('treats metadata m55_pa as correlation only', () => {
    assert.equal(
      parseMetadataPurchaseAttemptIdV1('11111111-2222-3333-4444-555555555555'),
      '11111111-2222-3333-4444-555555555555',
    );
    assert.equal(parseMetadataPurchaseAttemptIdV1('pi_abc'), null);
  });
});
