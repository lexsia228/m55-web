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
  });

  it('fail-closes stripe_events insert after R5 claim and returns 500 on transport', () => {
    assert.match(WEBHOOK, /insertPaymentIntentSucceededStripeEventV1/);
    assert.match(WEBHOOK, /event_type: 'payment_intent.succeeded'/);
    assert.match(WEBHOOK, /PROVIDER_TRANSPORT_FAILURE/);
    const handler = WEBHOOK.slice(WEBHOOK.indexOf('async function handlePaymentIntentSucceededR5b'));
    assert.match(handler, /status: 500/);
    assert.equal(handler.includes('as Stripe.Checkout.Session'), false);
  });

  it('does not skip R5 solely because stripe_events already exists', () => {
    assert.match(WEBHOOK, /r5CanonicalClaimExistsV1/);
    assert.match(WEBHOOK, /if \(existing\) \{\s*const claimed = await r5CanonicalClaimExistsV1/s);
  });

  it('does not invent Event.created or rescue locks in buyer fulfillment', () => {
    assert.match(FULFILL, /must not invent Event.created/);
    assert.match(FULFILL, /must not rescue or rewrite/);
    assert.match(REPLY_LANE, /do not rewrite locked winners/);
  });
});
