import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { R8ProviderAccountSnapshotV1, R8TaxProfileRecordV1 } from './contract.ts';
import {
  evaluateCreatorProviderPayoutReadinessV1,
  isProviderSnapshotWellFormedV1,
} from './providerPayoutReadinessPredicate.ts';

const greenSnapshot: R8ProviderAccountSnapshotV1 = {
  detailsSubmitted: true,
  chargesEnabled: true,
  payoutsEnabled: true,
  transfersCapability: 'active',
  requirementsCurrentlyDueCount: 0,
};

const eligibleTax: R8TaxProfileRecordV1 = {
  schemaVersion: '2026-10-29-v1',
  taxResidency: 'JAPAN_RESIDENT',
  payeeType: 'INDIVIDUAL',
  invoiceRegistrationStatus: 'NOT_REGISTERED',
  invoiceRegistrationNumberIfAny: null,
  withholdingClassification: 'ORDINARY_JP_AFFILIATE_V1_ZERO',
  taxProfileEffectiveAt: '2026-10-29T00:00:00.000Z',
  v1JapanResidentAttested: true,
  v1Age18PlusAttested: true,
};

function baseInput(
  overrides: Partial<Parameters<typeof evaluateCreatorProviderPayoutReadinessV1>[0]> = {},
) {
  return {
    stripeAccountId: 'acct_test_1',
    linkState: 'PAYOUTS_CAPABILITY_ACTIVE' as const,
    snapshot: greenSnapshot,
    taxProfile: eligibleTax,
    ...overrides,
  };
}

describe('evaluateCreatorProviderPayoutReadinessV1 — fail-closed', () => {
  it('passes when binding, link_state, snapshot, and tax align', () => {
    assert.equal(evaluateCreatorProviderPayoutReadinessV1(baseInput()), true);
  });

  it('denies stale green snapshot when link_state is BLOCKED', () => {
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(baseInput({ linkState: 'BLOCKED' })),
      false,
    );
  });

  it('denies stale green snapshot when link_state is ERROR', () => {
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(baseInput({ linkState: 'ERROR' })),
      false,
    );
  });

  it('denies when link_state is NOT_STARTED despite green snapshot', () => {
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(baseInput({ linkState: 'NOT_STARTED' })),
      false,
    );
  });

  it('denies provider green without tax profile', () => {
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(baseInput({ taxProfile: null })),
      false,
    );
  });

  it('denies without bound stripe account id', () => {
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(baseInput({ stripeAccountId: null })),
      false,
    );
  });

  it('denies malformed snapshot JSON shapes', () => {
    assert.equal(isProviderSnapshotWellFormedV1(null), false);
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(
        baseInput({
          snapshot: {
            ...greenSnapshot,
            requirementsCurrentlyDueCount: Number.NaN,
          },
        }),
      ),
      false,
    );
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(
        baseInput({
          snapshot: { ...(greenSnapshot as object), transfersCapability: 'active' } as R8ProviderAccountSnapshotV1,
        }),
      ),
      true,
    );
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(
        baseInput({
          snapshot: {
            detailsSubmitted: true,
            chargesEnabled: true,
            payoutsEnabled: true,
            transfersCapability: 'unknown',
            requirementsCurrentlyDueCount: 0,
          },
        }),
      ),
      false,
    );
  });

  it('denies when requirementsCurrentlyDueCount > 0', () => {
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(
        baseInput({
          snapshot: { ...greenSnapshot, requirementsCurrentlyDueCount: 1 },
        }),
      ),
      false,
    );
  });

  it('denies corporation tax profile for v1 stripe plane', () => {
    assert.equal(
      evaluateCreatorProviderPayoutReadinessV1(
        baseInput({
          taxProfile: { ...eligibleTax, payeeType: 'CORPORATION' },
        }),
      ),
      false,
    );
  });
});
