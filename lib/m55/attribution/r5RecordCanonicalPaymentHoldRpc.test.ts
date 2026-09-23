import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { M55_R5_PURCHASE_LOCK_MIGRATION_FILENAME } from './r5PurchaseAttemptContract';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const { buildRecordCanonicalPaymentHoldRpcParamsV1 } = await import(
  './r5RecordCanonicalPaymentHoldRpc'
);

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations', M55_R5_PURCHASE_LOCK_MIGRATION_FILENAME),
  'utf8',
);
const WEBHOOK = readFileSync(join(process.cwd(), 'app/api/stripe/webhook/route.ts'), 'utf8');

describe('r5RecordCanonicalPaymentHoldRpc', () => {
  it('uses the dedicated hold writer without verified-session requirement', () => {
    const params = buildRecordCanonicalPaymentHoldRpcParamsV1({
      stripeCanonicalEventId: 'evt_1',
      paymentIntentId: 'pi_1',
      canonicalEventCreatedAtMs: 1,
      verifiedCheckoutSessionId: null,
      metadataPurchaseAttemptId: null,
      resolvedPurchaseAttemptId: null,
      reasonCode: 'PI_LOOKUP_ZERO',
      providerCorrelationState: 'PROVIDER_ZERO',
    });
    assert.equal(params.p_verified_checkout_session_id, null);
    assert.match(SQL, /p_verified_checkout_session_id text/);
    assert.match(SQL, /outcome', 'CONVERGED'/);
    assert.match(SQL, /outcome', 'HOLD_RECONCILE'/);
  });

  it('webhook persist-then-stripe_events-500 path is source-visible', () => {
    assert.match(WEBHOOK, /callRecordCanonicalPaymentHoldRpcV1/);
    assert.match(WEBHOOK, /insertPaymentIntentSucceededStripeEventV1/);
    const handler = WEBHOOK.slice(WEBHOOK.indexOf('async function handlePaymentIntentSucceededR5b'));
    assert.match(handler, /status: 500/);
  });
});
