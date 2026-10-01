import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const WEBHOOK = readFileSync(join(process.cwd(), 'app/api/stripe/webhook/route.ts'), 'utf8');
const FULFILL = readFileSync(
  join(process.cwd(), 'lib/m55/dtrCoreCheckoutFulfillment.ts'),
  'utf8',
);
const REPLY_LANE = readFileSync(
  join(process.cwd(), 'lib/m55/reply/replyTicketWebhookLane.ts'),
  'utf8',
);

describe('r5PurchaseWebhookCanonical', () => {
  it('handles payment_intent.succeeded before the non-member soft-200 filter', () => {
    const piIdx = WEBHOOK.indexOf("event.type === 'payment_intent.succeeded'");
    const nonMemberIdx = WEBHOOK.indexOf('ONE_TIME_KEY_EVENTS.has');
    assert.equal(piIdx > 0 && piIdx < nonMemberIdx, true);
    assert.match(WEBHOOK, /handlePaymentIntentSucceededR5b/);
    assert.match(WEBHOOK, /verifyPaymentIntentCheckoutSessionProofV1/);
    assert.match(WEBHOOK, /callRecordCanonicalPaymentRpcV1/);
    assert.match(WEBHOOK, /callRecordCanonicalPaymentHoldRpcV1/);
    assert.match(WEBHOOK, /callRecordPurchaseMoneyEvidenceRpcV1/);
  });

  it('fail-closes stripe_events insert after R5 claim and returns 500 on transport', () => {
    assert.match(WEBHOOK, /insertPaymentIntentSucceededStripeEventV1/);
    assert.match(WEBHOOK, /event_type: 'payment_intent.succeeded'/);
    assert.match(WEBHOOK, /PROVIDER_TRANSPORT_FAILURE/);
    const handler = WEBHOOK.slice(WEBHOOK.indexOf('async function handlePaymentIntentSucceededR5b'));
    assert.match(handler, /status: 500/);
    assert.equal(handler.includes('as Stripe.Checkout.Session'), false);
  });

  it('routes every payment_intent.succeeded through the R5+R6 handler', () => {
    assert.match(
      WEBHOOK,
      /if \(event\.type === 'payment_intent\.succeeded'\) \{\s*return handlePaymentIntentSucceededR5b\(event, db\);\s*\}/s,
    );
    assert.match(WEBHOOK, /loadPurchaseMoneySnapshotByCanonicalIdentityV1/);
    assert.match(WEBHOOK, /validateCompletedMoneyReplayV1/);
    assert.match(WEBHOOK, /normalizePurchaseMoneyEvidenceFromProofV1/);
  });

  it('completes money only after canonical success and never from hold outcomes', () => {
    const handler = WEBHOOK.slice(WEBHOOK.indexOf('async function handlePaymentIntentSucceededR5b'));
    assert.match(handler, /if \(snapshot\?\.money\)/);
    assert.match(handler, /recorded\.outcome === 'HOLD_RECONCILE'/);
    assert.match(handler, /recorded\.outcome === 'NO_R5_BINDING'/);
    assert.match(handler, /await callRecordPurchaseMoneyEvidenceRpcV1/);
    assert.match(handler, /MONEY_PAYLOAD_CONFLICT/);
    assert.match(handler, /EVIDENCE_NOT_FOUND/);
  });

  it('loads money snapshot before Stripe acquisition and fail-closes snapshot read errors', () => {
    const handler = WEBHOOK.slice(WEBHOOK.indexOf('async function handlePaymentIntentSucceededR5b'));
    const snapshotIdx = handler.indexOf('loadPurchaseMoneySnapshotByCanonicalIdentityV1');
    const stripeIdx = handler.indexOf('getStripe()');
    assert.equal(snapshotIdx > 0 && snapshotIdx < stripeIdx, true);
    assert.match(handler, /PURCHASE_MONEY_SNAPSHOT_READ_FAILED/);
    assert.match(
      handler,
      /error\.message === M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED[\s\S]*status: 500/,
    );
    assert.equal(handler.indexOf('verifyPaymentIntentCheckoutSessionProofV1') > stripeIdx, true);
  });

  it('does not invent Event.created or rescue locks in buyer fulfillment', () => {
    assert.match(FULFILL, /must not invent Event.created/);
    assert.match(FULFILL, /must not rescue or rewrite/);
    assert.match(REPLY_LANE, /do not rewrite locked winners/);
  });
});
