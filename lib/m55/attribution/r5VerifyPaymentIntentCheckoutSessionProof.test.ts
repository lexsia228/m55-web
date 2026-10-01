import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { verifyPaymentIntentCheckoutSessionProofV1 } from './r5VerifyPaymentIntentCheckoutSessionProof';
import { M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY } from './r5PurchaseAttemptContract';

describe('r5VerifyPaymentIntentCheckoutSessionProof', () => {
  it('lists checkout sessions by payment_intent with limit 2', async () => {
    const calls: unknown[] = [];
    const proof = await verifyPaymentIntentCheckoutSessionProofV1({
      stripe: {
        checkout: {
          sessions: {
            list: async (args: unknown) => {
              calls.push(args);
              return { data: [] };
            },
          },
        },
      } as any,
      paymentIntentId: 'pi_1',
    });
    assert.deepEqual(calls, [{ payment_intent: 'pi_1', limit: 2 }]);
    assert.equal(proof.status, 'PI_LOOKUP_ZERO');
  });

  it('returns MULTIPLE at two sessions and NEVER treats metadata as PI↔session proof', async () => {
    const proof = await verifyPaymentIntentCheckoutSessionProofV1({
      stripe: {
        checkout: {
          sessions: {
            list: async () => ({
              data: [
                {
                  id: 'cs_1',
                  mode: 'payment',
                  metadata: { m55_pa: '11111111-2222-3333-4444-555555555555' },
                  amount_total: 1000,
                  currency: 'jpy',
                  automatic_tax: { enabled: false },
                  total_details: { amount_discount: 0, amount_tax: 0 },
                },
                {
                  id: 'cs_2',
                  mode: 'payment',
                  metadata: { m55_pa: '11111111-2222-3333-4444-555555555555' },
                  amount_total: 1000,
                  currency: 'jpy',
                  automatic_tax: { enabled: false },
                  total_details: { amount_discount: 0, amount_tax: 0 },
                },
              ],
            }),
          },
        },
      } as any,
      paymentIntentId: 'pi_1',
      paymentIntentMetadata: {
        [M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY]: '11111111-2222-3333-4444-555555555555',
      },
    });
    assert.equal(proof.status, 'PI_LOOKUP_MULTIPLE');
  });

  it('rejects non-payment sessions and verifies a single payment-mode session with economics', async () => {
    const notPayment = await verifyPaymentIntentCheckoutSessionProofV1({
      stripe: {
        checkout: {
          sessions: {
            list: async () => ({ data: [{ id: 'cs_sub', mode: 'subscription' }] }),
          },
        },
      } as any,
      paymentIntentId: 'pi_1',
    });
    assert.equal(notPayment.status, 'SESSION_NOT_PAYMENT');

    const verified = await verifyPaymentIntentCheckoutSessionProofV1({
      stripe: {
        checkout: {
          sessions: {
            list: async () => ({
              data: [
                {
                  id: 'cs_ok',
                  mode: 'payment',
                  metadata: { m55_pa: '11111111-2222-3333-4444-555555555555' },
                  amount_total: 1480,
                  currency: 'jpy',
                  automatic_tax: { enabled: true, status: 'complete' },
                  total_details: { amount_discount: 0, amount_tax: 134 },
                },
              ],
            }),
          },
        },
      } as any,
      paymentIntentId: 'pi_1',
    });
    assert.equal(verified.status, 'PROVIDER_VERIFIED');
    if (verified.status === 'PROVIDER_VERIFIED') {
      assert.equal(verified.checkoutSessionId, 'cs_ok');
      assert.equal(verified.metadataPurchaseAttemptId, '11111111-2222-3333-4444-555555555555');
      assert.equal(verified.sessionAmountTotal, 1480);
      assert.equal(verified.sessionCurrency, 'jpy');
      assert.ok(verified.automaticTax);
      assert.equal(verified.automaticTax.enabled, true);
      assert.equal(verified.automaticTax.status, 'complete');
      assert.ok(verified.totalDetails);
      assert.equal(verified.totalDetails.amount_discount, 0);
      assert.equal(verified.totalDetails.amount_tax, 134);
    }
  });

  it('maps provider list throw to transport failure without claiming proof', async () => {
    const proof = await verifyPaymentIntentCheckoutSessionProofV1({
      stripe: {
        checkout: {
          sessions: {
            list: async () => {
              throw new Error('stripe_down');
            },
          },
        },
      } as any,
      paymentIntentId: 'pi_1',
    });
    assert.equal(proof.status, 'PROVIDER_TRANSPORT_FAILURE');
  });
});
