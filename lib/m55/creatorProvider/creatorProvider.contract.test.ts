import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isProviderPayoutReadinessGreenV1,
  normalizeInvoiceRegistrationNumber,
  parseClientIdempotencyKey,
  validateTaxProfileInputV1,
} from './contract.ts';

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
  it('requires full capability snapshot', () => {
    assert.equal(
      isProviderPayoutReadinessGreenV1('PAYOUTS_CAPABILITY_ACTIVE', {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        transfersCapability: 'active',
        requirementsCurrentlyDueCount: 0,
      }),
      true,
    );
    assert.equal(
      isProviderPayoutReadinessGreenV1('ONBOARDING_LINK_ISSUED', {
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        transfersCapability: 'inactive',
        requirementsCurrentlyDueCount: 2,
      }),
      false,
    );
  });
});
