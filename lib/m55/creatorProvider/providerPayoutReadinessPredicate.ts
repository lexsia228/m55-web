import {
  R8_A_STRIPE_LINK_STATES,
  R8_A_TAX_PROFILE_SCHEMA_VERSION,
  R8_A_WITHHOLDING_CLASSIFICATIONS,
  type R8ProviderAccountSnapshotV1,
  type R8StripeLinkStateV1,
  type R8TaxProfileRecordV1,
  validateTaxProfileInputV1,
} from './contract';

/**
 * Fail-closed Creator provider payout readiness (Operating Model §8).
 *
 * JS authority for UI, referral gate, and sync-derived link_state alignment.
 * Future SQL in docs/planning MUST mirror `evaluateCreatorProviderPayoutReadinessV1` exactly.
 *
 * Not covered here (documented R8-C acceptance gap): webhook-driven revocation,
 * proactive freshness polling, or provider-side capability downgrade after sync.
 */

export type CreatorProviderPayoutReadinessInputV1 = {
  stripeAccountId: string | null;
  linkState: R8StripeLinkStateV1;
  snapshot: R8ProviderAccountSnapshotV1 | null;
  taxProfile: R8TaxProfileRecordV1 | null;
};

const TRANSFERS_CAPABILITIES = new Set(['inactive', 'pending', 'active', 'unknown']);

export function isProviderSnapshotWellFormedV1(value: unknown): value is R8ProviderAccountSnapshotV1 {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (typeof s.detailsSubmitted !== 'boolean') return false;
  if (typeof s.chargesEnabled !== 'boolean') return false;
  if (typeof s.payoutsEnabled !== 'boolean') return false;
  if (typeof s.transfersCapability !== 'string') return false;
  if (!TRANSFERS_CAPABILITIES.has(s.transfersCapability)) return false;
  if (typeof s.requirementsCurrentlyDueCount !== 'number') return false;
  if (!Number.isFinite(s.requirementsCurrentlyDueCount) || s.requirementsCurrentlyDueCount < 0) return false;
  return true;
}

export function isProviderSnapshotFieldsGreenV1(snapshot: R8ProviderAccountSnapshotV1): boolean {
  return (
    snapshot.detailsSubmitted &&
    snapshot.payoutsEnabled &&
    snapshot.transfersCapability === 'active' &&
    snapshot.requirementsCurrentlyDueCount === 0
  );
}

export function isTaxProfileEligibleForProviderPayoutReadinessV1(
  taxProfile: R8TaxProfileRecordV1 | null,
): boolean {
  if (!taxProfile) return false;
  if (taxProfile.schemaVersion !== R8_A_TAX_PROFILE_SCHEMA_VERSION) return false;
  if (taxProfile.taxResidency !== 'JAPAN_RESIDENT') return false;
  if (taxProfile.v1JapanResidentAttested !== true || taxProfile.v1Age18PlusAttested !== true) return false;
  if (!R8_A_WITHHOLDING_CLASSIFICATIONS.includes(taxProfile.withholdingClassification)) return false;
  if (validateTaxProfileInputV1(taxProfile).ok !== true) return false;
  if (taxProfile.payeeType === 'CORPORATION') return false;
  return true;
}

export function evaluateCreatorProviderPayoutReadinessV1(
  input: CreatorProviderPayoutReadinessInputV1,
): boolean {
  const accountId = input.stripeAccountId?.trim() ?? '';
  if (!accountId) return false;
  if (!R8_A_STRIPE_LINK_STATES.includes(input.linkState)) return false;
  if (input.linkState !== 'PAYOUTS_CAPABILITY_ACTIVE') return false;
  if (!isProviderSnapshotWellFormedV1(input.snapshot)) return false;
  if (!isProviderSnapshotFieldsGreenV1(input.snapshot)) return false;
  if (!isTaxProfileEligibleForProviderPayoutReadinessV1(input.taxProfile)) return false;
  return true;
}

export function deriveProviderLinkStateFromSnapshotSyncV1(
  snapshot: R8ProviderAccountSnapshotV1,
): R8StripeLinkStateV1 {
  if (!isProviderSnapshotWellFormedV1(snapshot)) return 'ERROR';
  if (isProviderSnapshotFieldsGreenV1(snapshot)) return 'PAYOUTS_CAPABILITY_ACTIVE';
  if (snapshot.detailsSubmitted) return 'PROVIDER_DETAILS_SUBMITTED';
  return 'ONBOARDING_LINK_ISSUED';
}
