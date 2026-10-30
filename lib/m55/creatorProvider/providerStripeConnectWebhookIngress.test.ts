import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  parseVerifiedStripeConnectWebhookEventV1,
  resolveProviderStripeWebhookIngressModeV1,
  verifyStripeConnectWebhookSignatureV1,
} from './providerStripeConnectWebhookIngress.ts';

function signStripePayload(secret: string, payload: string, timestamp: number): string {
  const signed = createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${signed}`;
}

describe('R8 isolated Stripe Connect webhook ingress', () => {
  it('keeps production ingress disabled', () => {
    assert.equal(
      resolveProviderStripeWebhookIngressModeV1({ VERCEL_ENV: 'production', NODE_ENV: 'production' }),
      'DISABLED',
    );
    assert.equal(
      resolveProviderStripeWebhookIngressModeV1({
        VERCEL_ENV: 'development',
        M55_R8_ISOLATED_STRIPE_CONNECT_WEBHOOK_ENABLED: 'true',
      }),
      'ISOLATED_TEST',
    );
  });

  it('rejects invalid signatures', () => {
    const result = verifyStripeConnectWebhookSignatureV1({
      rawBody: '{"id":"evt_test"}',
      signatureHeader: 't=1,v1=deadbeef',
      webhookSecret: 'whsec_test_secret',
    });
    assert.equal(result.ok, false);
  });

  it('accepts signed account.updated test events and dedupes by stripe event id', () => {
    const secret = 'whsec_test_secret';
    const payload = JSON.stringify({
      id: 'evt_test_account_updated',
      object: 'event',
      type: 'account.updated',
      livemode: false,
      data: { object: { id: 'acct_test1234567890' } },
    });
    const ts = Math.floor(Date.now() / 1000);
    const verified = verifyStripeConnectWebhookSignatureV1({
      rawBody: payload,
      signatureHeader: signStripePayload(secret, payload, ts),
      webhookSecret: secret,
    });
    assert.equal(verified.ok, true);
    if (!verified.ok) return;
    const parsed = parseVerifiedStripeConnectWebhookEventV1(verified.event);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.idempotencyKey, 'stripe_evt:evt_test_account_updated');
    assert.equal(parsed.accountIdSuffix, '34567890');
  });

  it('rejects livemode events', () => {
    const parsed = parseVerifiedStripeConnectWebhookEventV1({
      id: 'evt_live',
      type: 'account.updated',
      livemode: true,
      data: { object: { id: 'acct_live123' } },
    } as any);
    assert.equal(parsed.ok, false);
  });
});
