import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type Stripe from 'stripe';
import type { GuestDraftRow } from './dtrDraftDb';
import {
  resolveCheckoutPurchaseContextOwner,
  resolvePurchaseContextOwner,
  type PurchaseContextLookup,
} from './paidResult/resolveCheckoutOwnerUserId';
import { buildOpaqueStripeCheckoutMetadata } from './paidResult/stripeOpaqueCheckoutRefs';
import { verifyRetrievedStripeCheckoutSessionForDtrUser } from './verifyStripeCheckoutSessionForDtr';

const ROOT = join(import.meta.dirname, '../..');
const PURCHASE_CONTEXT_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_USER_ID = 'user_canonical_owner';

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function context(overrides: Partial<GuestDraftRow> = {}): GuestDraftRow {
  return {
    id: PURCHASE_CONTEXT_ID,
    nickname: 'stored-server-side',
    birth_date: '1990-01-01',
    extra_json: {
      purchaseInputV1: {
        version: 'pis-v1',
        frozen: true,
      },
    },
    user_id: OWNER_USER_ID,
    linked_at: '2026-07-13T00:00:00.000Z',
    updated_at: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

function checkoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: 'cs_test_owner_resolution',
    object: 'checkout.session',
    status: 'complete',
    mode: 'payment',
    payment_status: 'paid',
    client_reference_id: PURCHASE_CONTEXT_ID,
    metadata: { productId: 'dtr_core_full_v1' },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe('purchase-context owner resolver', () => {
  it('resolves the canonical owner from the server-side purchase context', async () => {
    const result = await resolvePurchaseContextOwner(
      PURCHASE_CONTEXT_ID,
      async () => context(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.purchaseContextId, PURCHASE_CONTEXT_ID);
    assert.equal(result.ownerUserId, OWNER_USER_ID);
    assert.equal(result.context.extra_json?.purchaseInputV1 != null, true);
  });

  it('fails closed for a missing purchase-context ID', async () => {
    const result = await resolvePurchaseContextOwner('', async () => context());
    assert.deepEqual(result, { ok: false, reason: 'missing_purchase_context_id' });
  });

  it('fails closed when a deleted or stale context is not found', async () => {
    const result = await resolvePurchaseContextOwner(PURCHASE_CONTEXT_ID, async () => null);
    assert.deepEqual(result, { ok: false, reason: 'purchase_context_not_found' });
  });

  it('fails closed for malformed IDs and malformed/unfrozen contexts', async () => {
    const malformedId = await resolvePurchaseContextOwner('not-a-uuid', async () => context());
    assert.deepEqual(malformedId, { ok: false, reason: 'purchase_context_invalid' });

    const unfrozen = await resolvePurchaseContextOwner(
      PURCHASE_CONTEXT_ID,
      async () => context({ extra_json: { purchaseInputV1: { frozen: false } } }),
    );
    assert.deepEqual(unfrozen, { ok: false, reason: 'purchase_context_invalid' });
  });

  it('fails closed when the canonical owner is missing', async () => {
    const result = await resolvePurchaseContextOwner(
      PURCHASE_CONTEXT_ID,
      async () => context({ user_id: null }),
    );
    assert.deepEqual(result, { ok: false, reason: 'purchase_context_owner_missing' });
  });
});

describe('processing verifier and webhook/fulfillment parity', () => {
  const validLookup: PurchaseContextLookup = async () => context();

  it('accepts a complete one-time session for the authenticated canonical owner', async () => {
    const result = await verifyRetrievedStripeCheckoutSessionForDtrUser(
      checkoutSession(),
      OWNER_USER_ID,
      validLookup,
    );
    assert.deepEqual(result, { valid: true, sessionId: 'cs_test_owner_resolution' });
  });

  it('rejects a different authenticated user', async () => {
    const result = await verifyRetrievedStripeCheckoutSessionForDtrUser(
      checkoutSession(),
      'user_different',
      validLookup,
    );
    assert.deepEqual(result, {
      valid: false,
      reason: 'purchase_context_owner_mismatch',
    });
  });

  it('preserves complete-session, payment-mode, product, and paid checks', async () => {
    assert.deepEqual(
      await verifyRetrievedStripeCheckoutSessionForDtrUser(
        checkoutSession({ status: 'open' }),
        OWNER_USER_ID,
        validLookup,
      ),
      { valid: false, reason: 'session_status_not_complete' },
    );
    assert.deepEqual(
      await verifyRetrievedStripeCheckoutSessionForDtrUser(
        checkoutSession({ mode: 'subscription' }),
        OWNER_USER_ID,
        validLookup,
      ),
      { valid: false, reason: 'mode_not_payment' },
    );
    assert.deepEqual(
      await verifyRetrievedStripeCheckoutSessionForDtrUser(
        checkoutSession({ metadata: { productId: 'unexpected' } }),
        OWNER_USER_ID,
        validLookup,
      ),
      { valid: false, reason: 'product_not_allowed' },
    );
    assert.deepEqual(
      await verifyRetrievedStripeCheckoutSessionForDtrUser(
        checkoutSession({ payment_status: 'unpaid' }),
        OWNER_USER_ID,
        validLookup,
      ),
      { valid: false, reason: 'payment_status_not_paid' },
    );
  });

  it('uses one canonical resolver in webhook, fulfillment, and processing verification', async () => {
    const session = checkoutSession();
    const webhookOwner = await resolveCheckoutPurchaseContextOwner(session, validLookup);
    assert.equal(webhookOwner.ok, true);
    if (!webhookOwner.ok) return;

    const processing = await verifyRetrievedStripeCheckoutSessionForDtrUser(
      session,
      webhookOwner.ownerUserId,
      validLookup,
    );
    assert.equal(processing.valid, true);

    const fulfillment = read('lib/m55/dtrCoreCheckoutFulfillment.ts');
    const verifier = read('lib/m55/verifyStripeCheckoutSessionForDtr.ts');
    assert.match(fulfillment, /resolveCheckoutPurchaseContextOwner\(session\)/);
    assert.match(verifier, /resolveCheckoutPurchaseContextOwner\(session, lookup\)/);
    assert.doesNotMatch(fulfillment, /const userId = session\.client_reference_id/);
    assert.doesNotMatch(verifier, /session\.client_reference_id !== userId/);
  });
});

describe('checkout privacy and idempotency invariants', () => {
  it('keeps client_reference_id opaque, payment mode, and quantity one', () => {
    const checkout = read('app/api/purchase/checkout/route.ts');
    assert.match(checkout, /mode: 'payment'/);
    assert.match(checkout, /quantity: 1/);
    assert.match(checkout, /client_reference_id: purchaseContextId/);
    assert.doesNotMatch(checkout, /client_reference_id: userId/);
  });

  it('keeps metadata opaque and free of personalization fields', () => {
    const metadata = buildOpaqueStripeCheckoutMetadata({
      productId: 'dtr_core_full_v1',
      purchaseContextId: PURCHASE_CONTEXT_ID,
      opaqueUserRef: '0123456789abcdef0123456789abcdef',
      inputVersion: 'pis-v1',
      engineVersionCandidate: 'engine-v2',
    });
    assert.deepEqual(Object.keys(metadata).sort(), [
      'engineVersionCandidate',
      'fulfillmentVersion',
      'inputVersion',
      'metadataVersion',
      'opaqueUserRef',
      'productId',
      'purchaseContextId',
    ]);
    const serialized = JSON.stringify(metadata);
    assert.doesNotMatch(
      serialized,
      /user_|clerk|birth|nickname|email|free\.|paid\.|theme|trait|selector|fingerprint/i,
    );
    assert.equal(serialized.includes('stored-server-side'), false);
  });

  it('preserves one-session idempotency and duplicate guards', () => {
    const fulfillment = read('lib/m55/dtrCoreCheckoutFulfillment.ts');
    assert.match(fulfillment, /\.eq\('checkout_session_id', checkoutSessionId\)/);
    assert.match(fulfillment, /insertFulfillmentErr\.code === '23505'/);
    assert.match(fulfillment, /onConflict: 'user_id,product_id'/);
    assert.match(fulfillment, /upsertDtrReportSnapshotAtFulfillment/);
  });
});
