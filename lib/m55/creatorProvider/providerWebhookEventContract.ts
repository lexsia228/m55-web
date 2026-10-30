import type { R8ProviderAccountSnapshotV1 } from './contract';

/** Normalized provider webhook/event shape — Accounts v2 field proof still required before live ingress. */
export type NormalizedProviderCapabilityEventV1 = {
  providerEventId: string;
  stripeEventId: string;
  eventType: string;
  accountIdSuffix: string;
  receivedAtUtc: Date;
  idempotencyKey: string;
  snapshotAfter: R8ProviderAccountSnapshotV1 | null;
  capabilityDowngrade: boolean;
};

export type ProviderWebhookIngressModeV1 = 'DISABLED' | 'FIXTURE_ONLY';

export const R8_C_PROVIDER_WEBHOOK_INGRESS_MODE: ProviderWebhookIngressModeV1 = 'DISABLED';

export type ProviderEventStoreV1 = {
  processedIdempotencyKeys: Set<string>;
  downgradeByEconomicIdentity: Map<string, { active: boolean; reason: string; eventId: string }>;
};

export function createProviderEventStoreV1(): ProviderEventStoreV1 {
  return {
    processedIdempotencyKeys: new Set(),
    downgradeByEconomicIdentity: new Map(),
  };
}

export function ingestNormalizedProviderCapabilityEventV1(
  store: ProviderEventStoreV1,
  creatorEconomicIdentityId: string,
  event: NormalizedProviderCapabilityEventV1,
): { ok: true; duplicate: boolean } | { ok: false; reason: 'MALFORMED_EVENT' } {
  if (!event.providerEventId || !event.idempotencyKey || !event.stripeEventId) {
    return { ok: false, reason: 'MALFORMED_EVENT' };
  }
  if (store.processedIdempotencyKeys.has(event.idempotencyKey)) {
    return { ok: true, duplicate: true };
  }
  store.processedIdempotencyKeys.add(event.idempotencyKey);
  if (event.capabilityDowngrade) {
    store.downgradeByEconomicIdentity.set(creatorEconomicIdentityId, {
      active: true,
      reason: event.eventType,
      eventId: event.providerEventId,
    });
  }
  return { ok: true, duplicate: false };
}

export function isProviderDowngradeActiveV1(
  store: ProviderEventStoreV1,
  creatorEconomicIdentityId: string,
): boolean {
  return store.downgradeByEconomicIdentity.get(creatorEconomicIdentityId)?.active === true;
}

export function clearProviderDowngradeForTestsV1(
  store: ProviderEventStoreV1,
  creatorEconomicIdentityId: string,
): void {
  store.downgradeByEconomicIdentity.delete(creatorEconomicIdentityId);
}

let singletonStore: ProviderEventStoreV1 | null = null;

export function getProviderEventStoreSingletonV1(): ProviderEventStoreV1 {
  if (!singletonStore) singletonStore = createProviderEventStoreV1();
  return singletonStore;
}

export function resetProviderEventStoreSingletonForTestsV1(): void {
  singletonStore = createProviderEventStoreV1();
}

/** Fixture-only event for unit tests — not live Stripe semantics. */
export function fixtureProviderPayoutCapabilityRevokedEventV1(): NormalizedProviderCapabilityEventV1 {
  return {
    providerEventId: 'pevt_fixture_revoked_1',
    stripeEventId: 'evt_fixture_revoked_1',
    eventType: 'FIXTURE_CAPABILITY_REVOKED',
    accountIdSuffix: 'fake01',
    receivedAtUtc: new Date('2026-10-30T00:00:00.000Z'),
    idempotencyKey: 'pevt:fixture:revoked:1',
    snapshotAfter: {
      detailsSubmitted: true,
      chargesEnabled: false,
      payoutsEnabled: false,
      transfersCapability: 'inactive',
      requirementsCurrentlyDueCount: 1,
    },
    capabilityDowngrade: true,
  };
}
