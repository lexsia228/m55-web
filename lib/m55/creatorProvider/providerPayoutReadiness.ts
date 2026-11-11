import type {
  R8ProviderAccountSnapshotV1,
  R8StripeLinkStateV1,
  R8TaxProfileRecordV1,
} from './contract';
import { evaluateCreatorProviderPayoutReadinessV1 } from './providerPayoutReadinessPredicate';

/** @deprecated Prefer evaluateCreatorProviderPayoutReadinessV1 with full context. */
export function isProviderPayoutReadinessGreenV1(
  linkState: R8StripeLinkStateV1,
  snapshot: R8ProviderAccountSnapshotV1 | null,
  context?: {
    stripeAccountId?: string | null;
    taxProfile?: R8TaxProfileRecordV1 | null;
  },
): boolean {
  return evaluateCreatorProviderPayoutReadinessV1({
    stripeAccountId: context?.stripeAccountId ?? null,
    linkState,
    snapshot,
    taxProfile: context?.taxProfile ?? null,
  });
}

export {
  evaluateCreatorProviderPayoutReadinessV1,
  deriveProviderLinkStateFromSnapshotSyncV1,
  isProviderSnapshotFieldsGreenV1,
  isProviderSnapshotWellFormedV1,
  isTaxProfileEligibleForProviderPayoutReadinessV1,
  type CreatorProviderPayoutReadinessInputV1,
} from './providerPayoutReadinessPredicate';
