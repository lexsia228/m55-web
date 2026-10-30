import 'server-only';
import {
  loadCreatorEconomicIdentityByStripeAccountIdV1,
  appendProviderOnboardingEventV1,
} from './providerAccountRepository';
import {
  buildNormalizedCapabilityEventFromVerifiedWebhookV1,
  parseVerifiedStripeConnectWebhookEventV1,
  type VerifiedConnectWebhookParseResultV1,
} from './providerStripeConnectWebhookIngress';
import {
  ingestNormalizedProviderCapabilityEventV1,
  getProviderEventStoreSingletonV1,
} from './providerWebhookEventContract';

export type PersistConnectWebhookResultV1 =
  | { ok: true; duplicate: boolean; accountIdSuffix: string; eventType: string }
  | { ok: false; reason: 'ACCOUNT_UNBOUND' | 'DB_UNAVAILABLE' | 'MALFORMED' };

export async function persistIsolatedStripeConnectWebhookEventV1(
  parsed: Extract<VerifiedConnectWebhookParseResultV1, { ok: true }>,
): Promise<PersistConnectWebhookResultV1> {
  const creatorEconomicIdentityId = await loadCreatorEconomicIdentityByStripeAccountIdV1(parsed.accountId);
  if (!creatorEconomicIdentityId) {
    return { ok: false, reason: 'ACCOUNT_UNBOUND' };
  }

  let duplicate = false;
  try {
    const outcome = await appendProviderOnboardingEventV1({
      creatorEconomicIdentityId,
      eventType: 'STRIPE_CONNECT_WEBHOOK_RECEIVED',
      idempotencyKey: parsed.idempotencyKey,
      payloadRedacted: {
        stripeEventId: parsed.stripeEventId,
        eventType: parsed.eventType,
        accountIdSuffix: parsed.accountIdSuffix,
      },
    });
    duplicate = outcome === 'duplicate';
  } catch {
    return { ok: false, reason: 'DB_UNAVAILABLE' };
  }

  const normalized = buildNormalizedCapabilityEventFromVerifiedWebhookV1(parsed);
  const mem = ingestNormalizedProviderCapabilityEventV1(
    getProviderEventStoreSingletonV1(),
    creatorEconomicIdentityId,
    normalized,
  );
  if (!mem.ok) return { ok: false, reason: 'MALFORMED' };

  return {
    ok: true,
    duplicate: duplicate || mem.duplicate,
    accountIdSuffix: parsed.accountIdSuffix,
    eventType: parsed.eventType,
  };
}

export async function handleVerifiedStripeConnectWebhookEventV1(
  event: import('stripe').Event,
): Promise<PersistConnectWebhookResultV1> {
  const parsed = parseVerifiedStripeConnectWebhookEventV1(event);
  if (!parsed.ok) {
    if (parsed.reason === 'ACCOUNT_UNRESOLVED') return { ok: false, reason: 'ACCOUNT_UNBOUND' };
    return { ok: false, reason: 'MALFORMED' };
  }
  return persistIsolatedStripeConnectWebhookEventV1(parsed);
}
