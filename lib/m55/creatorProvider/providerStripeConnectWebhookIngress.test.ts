import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  mapConnectWebhookPersistResultToHttpV1,
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
  });

  it('rejects invalid signatures', () => {
    const result = verifyStripeConnectWebhookSignatureV1({
      rawBody: '{"id":"evt_test"}',
      signatureHeader: 't=1,v1=deadbeef',
      webhookSecret: 'whsec_test_secret',
    });
    assert.equal(result.ok, false);
  });

  it('parses signed v1 connect events separately from v2 core thin events', () => {
    const secret = 'whsec_test_secret';
    const v1Payload = JSON.stringify({
      id: 'evt_v1_account_updated',
      object: 'event',
      type: 'account.updated',
      livemode: false,
      data: { object: { id: 'acct_test1234567890' } },
    });
    const ts = Math.floor(Date.now() / 1000);
    const v1Verified = verifyStripeConnectWebhookSignatureV1({
      rawBody: v1Payload,
      signatureHeader: signStripePayload(secret, v1Payload, ts),
      webhookSecret: secret,
    });
    assert.equal(v1Verified.ok, true);
    if (!v1Verified.ok) return;
    const v1Parsed = parseVerifiedStripeConnectWebhookEventV1(v1Verified.event);
    assert.equal(v1Parsed.ok, true);
    if (!v1Parsed.ok) return;
    assert.equal(v1Parsed.apiGeneration, 'v1_connect');
    assert.equal(v1Parsed.thinEvent, false);

    const v2Parsed = parseVerifiedStripeConnectWebhookEventV1({
      id: 'evt_v2_req',
      type: 'v2.core.account[requirements].updated',
      livemode: false,
      related_object: { id: 'acct_0000000012345678', type: 'v2.core.account' },
      data: { object: {} },
    } as any);
    assert.equal(v2Parsed.ok, true);
    if (!v2Parsed.ok) return;
    assert.equal(v2Parsed.apiGeneration, 'v2_core');
    assert.equal(v2Parsed.thinEvent, true);
    assert.equal(v2Parsed.accountIdSuffix, '12345678');
    assert.equal(v2Parsed.stripeEventId, 'evt_v2_req');

    const nestedOnly = parseVerifiedStripeConnectWebhookEventV1({
      id: 'evt_v2_nested_only',
      type: 'v2.core.account.updated',
      livemode: false,
      data: {
        object: {
          related_object: { id: 'acct_nestedonly123456', type: 'v2.core.account' },
        },
      },
    } as any);
    assert.equal(nestedOnly.ok, false);
    if (!nestedOnly.ok) assert.equal(nestedOnly.reason, 'ACCOUNT_UNRESOLVED');
  });

  it('does not return HTTP 200 when persistence did not succeed', () => {
    const unbound = mapConnectWebhookPersistResultToHttpV1({ ok: false, reason: 'ACCOUNT_UNBOUND' });
    assert.equal(unbound.status, 503);
    const db = mapConnectWebhookPersistResultToHttpV1({ ok: false, reason: 'DB_UNAVAILABLE' });
    assert.equal(db.status, 503);
    const ok = mapConnectWebhookPersistResultToHttpV1({
      ok: true,
      duplicate: true,
      accountIdSuffix: 'abcd1234',
      eventType: 'v2.core.account.updated',
      apiGeneration: 'v2_core',
      thinEvent: true,
    });
    assert.equal(ok.status, 200);
    assert.equal((ok.body as { persisted?: boolean }).persisted, true);
    assert.equal((ok.body as { snapshotSyncProven?: boolean }).snapshotSyncProven, false);
  });
});
