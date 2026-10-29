import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeInvoiceRegistrationNumber,
  parseClientIdempotencyKey,
  validateTaxProfileInputV1,
} from './contract.ts';
import { evaluateCreatorProviderPayoutReadinessV1, isProviderPayoutReadinessGreenV1 } from './providerPayoutReadiness.ts';

describe('R8-A tax profile contract', () => {
  it('accepts registered invoice with T-number', () => {
    const result = validateTaxProfileInputV1({
      payeeType: 'INDIVIDUAL',
      invoiceRegistrationStatus: 'REGISTERED',
      invoiceRegistrationNumberIfAny: 't1234567890123',
    });
    assert.equal(result.ok, true);
    assert.equal(normalizeInvoiceRegistrationNumber('t1234567890123'), 'T1234567890123');
  });

  it('rejects invoice number when not registered', () => {
    const result = validateTaxProfileInputV1({
      payeeType: 'INDIVIDUAL',
      invoiceRegistrationStatus: 'NOT_REGISTERED',
      invoiceRegistrationNumberIfAny: 'T1234567890123',
    });
    assert.equal(result.ok, false);
  });

  it('parses bounded idempotency keys', () => {
    assert.equal(parseClientIdempotencyKey('  key-1.test_ok  '), 'key-1.test_ok');
    assert.equal(parseClientIdempotencyKey('bad key'), null);
  });
});

describe('R8-A provider readiness green', () => {
  const taxProfile = {
    schemaVersion: '2026-10-29-v1' as const,
    taxResidency: 'JAPAN_RESIDENT' as const,
    payeeType: 'INDIVIDUAL' as const,
    invoiceRegistrationStatus: 'NOT_REGISTERED' as const,
    invoiceRegistrationNumberIfAny: null,
    withholdingClassification: 'ORDINARY_JP_AFFILIATE_V1_ZERO' as const,
    taxProfileEffectiveAt: '2026-10-29T00:00:00.000Z',
    v1JapanResidentAttested: true as const,
    v1Age18PlusAttested: true as const,
  };

  it('requires full binding, link_state, snapshot, and tax', () => {
    assert.equal(
      isProviderPayoutReadinessGreenV1(
        'PAYOUTS_CAPABILITY_ACTIVE',
        {
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          transfersCapability: 'active',
          requirementsCurrentlyDueCount: 0,
        },
        { stripeAccountId: 'acct_1', taxProfile },
      ),
      true,
    );
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1({
        stripeAccountId: 'acct_1',
        linkState: 'ONBOARDING_LINK_ISSUED',
        snapshot: {
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          transfersCapability: 'inactive',
          requirementsCurrentlyDueCount: 2,
        },
        taxProfile,
      }),
      false,
    );
  });
});
