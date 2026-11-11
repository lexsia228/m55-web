import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTaxProfileRowV1 } from './taxProfileRowMapping.ts';
import { isTaxProfileEligibleForProviderPayoutReadinessV1 } from './providerPayoutReadinessPredicate.ts';

const validRow = {
  creator_economic_identity_id: '11111111-1111-4111-8111-111111111111',
  schema_version: '2026-10-29-v1',
  tax_residency: 'JAPAN_RESIDENT',
  payee_type: 'INDIVIDUAL',
  invoice_registration_status: 'NOT_REGISTERED',
  invoice_registration_number: null,
  withholding_classification: 'ORDINARY_JP_AFFILIATE_V1_ZERO',
  tax_profile_effective_at: '2026-10-29T00:00:00.000Z',
  v1_japan_resident_attested: true,
  v1_age_18_plus_attested: true,
};

describe('parseTaxProfileRowV1 — fail-closed', () => {
  it('maps a valid persisted row without coercion', () => {
    const record = parseTaxProfileRowV1(validRow);
    assert.ok(record);
    assert.equal(record?.withholdingClassification, 'ORDINARY_JP_AFFILIATE_V1_ZERO');
    assert.equal(isTaxProfileEligibleForProviderPayoutReadinessV1(record), true);
  });

  it('rejects false japan attestation (no sanitize-to-true)', () => {
    const record = parseTaxProfileRowV1({ ...validRow, v1_japan_resident_attested: false });
    assert.equal(record, null);
  });

  it('rejects false age attestation', () => {
    const record = parseTaxProfileRowV1({ ...validRow, v1_age_18_plus_attested: false });
    assert.equal(record, null);
  });

  it('rejects wrong schema version', () => {
    assert.equal(parseTaxProfileRowV1({ ...validRow, schema_version: 'legacy' }), null);
  });

  it('rejects non-Japan residency', () => {
    assert.equal(parseTaxProfileRowV1({ ...validRow, tax_residency: 'NON_JP' }), null);
  });

  it('rejects unsupported withholding classification', () => {
    assert.equal(
      parseTaxProfileRowV1({ ...validRow, withholding_classification: 'OTHER' }),
      null,
    );
  });
});
