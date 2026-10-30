import Stripe from 'stripe';
import { isM55ProductionRuntime } from './runtimeEnvironment';
import {
  evaluateIsolatedSupabaseAlignmentStructuralV1,
  listIsolatedSupabaseAlignmentChecklistV1,
} from './r8IsolatedSupabaseAlignment';
import type { NormalizedProviderCapabilityEventV1 } from './providerWebhookEventContract';

export type ProviderStripeWebhookIngressModeV1 = 'DISABLED' | 'ISOLATED_TEST';

export type StripeConnectWebhookApiGenerationV1 = 'v1_connect' | 'v2_core';

/** Production ingress remains DISABLED; isolated test uses env gate + alignment. */
export function resolveProviderStripeWebhookIngressModeV1(
  env: NodeJS.ProcessEnv = process.env,
): ProviderStripeWebhookIngressModeV1 {
  if (isM55ProductionRuntime(env)) return 'DISABLED';
  if (env.M55_R8_ISOLATED_STRIPE_CONNECT_WEBHOOK_ENABLED === 'true') return 'ISOLATED_TEST';
  return 'DISABLED';
}

export function listProviderStripeWebhookIngressBlockersV1(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (resolveProviderStripeWebhookIngressModeV1(env) !== 'ISOLATED_TEST') {
    return ['Set M55_R8_ISOLATED_STRIPE_CONNECT_WEBHOOK_ENABLED=true (non-Production only)'];
  }
  const alignment = listIsolatedSupabaseAlignmentChecklistV1(env);
  if (alignment.length > 0) return alignment;
  const secret =
    env.M55_R8_STRIPE_CONNECT_WEBHOOK_SECRET?.trim() || env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim() || '';
  if (!secret) {
    return ['Set M55_R8_STRIPE_CONNECT_WEBHOOK_SECRET (Stripe test webhook signing secret)'];
  }
  if (env.M55_STRIPE_CONNECT_TESTMODE_ENABLED !== 'true') {
    return ['Set M55_STRIPE_CONNECT_TESTMODE_ENABLED=true'];
  }
  return [];
}

const ALLOWED_V1_CONNECT_WEBHOOK_TYPES = new Set([
  'account.updated',
  'capability.updated',
  'account.application.deauthorized',
]);

/** Accounts v2 / thin events — do not parse with v1 object shape. */
const ALLOWED_V2_CORE_CONNECT_WEBHOOK_TYPES = new Set([
  'v2.core.account.updated',
  'v2.core.account[configuration.recipient].updated',
  'v2.core.account[requirements].updated',
  'v2.core.account[configuration.recipient].capability_status_updated',
]);

export type VerifiedConnectWebhookParseResultV1 =
  | { ok: false; reason: 'SIGNATURE_INVALID' | 'MALFORMED_PAYLOAD' | 'EVENT_TYPE_UNSUPPORTED' | 'ACCOUNT_UNRESOLVED' }
  | {
      ok: true;
      stripeEventId: string;
      eventType: string;
      apiGeneration: StripeConnectWebhookApiGenerationV1;
      accountId: string;
      accountIdSuffix: string;
      idempotencyKey: string;
      livemode: boolean;
      thinEvent: boolean;
    };

export function classifyConnectWebhookEventTypeV1(eventType: string): StripeConnectWebhookApiGenerationV1 | null {
  if (eventType.startsWith('v2.core.')) return 'v2_core';
  if (ALLOWED_V1_CONNECT_WEBHOOK_TYPES.has(eventType)) return 'v1_connect';
  return null;
}

export function parseVerifiedStripeConnectWebhookEventV1(
  event: Stripe.Event,
): VerifiedConnectWebhookParseResultV1 {
  if (event.livemode === true) {
    return { ok: false, reason: 'MALFORMED_PAYLOAD' };
  }

  const generation = classifyConnectWebhookEventTypeV1(event.type);
  if (!generation) {
    return { ok: false, reason: 'EVENT_TYPE_UNSUPPORTED' };
  }

  if (generation === 'v2_core' && !ALLOWED_V2_CORE_CONNECT_WEBHOOK_TYPES.has(event.type)) {
    return { ok: false, reason: 'EVENT_TYPE_UNSUPPORTED' };
  }
  if (generation === 'v1_connect' && !ALLOWED_V1_CONNECT_WEBHOOK_TYPES.has(event.type)) {
    return { ok: false, reason: 'EVENT_TYPE_UNSUPPORTED' };
  }

  const accountId = extractConnectAccountIdFromStripeEventV1(event, generation);
  if (!accountId) return { ok: false, reason: 'ACCOUNT_UNRESOLVED' };

  const thinEvent = generation === 'v2_core';

  return {
    ok: true,
    stripeEventId: event.id,
    eventType: event.type,
    apiGeneration: generation,
    accountId,
    accountIdSuffix: accountId.slice(-8),
    idempotencyKey: `stripe_evt:${event.id}`,
    livemode: event.livemode === true,
    thinEvent,
  };
}

function extractConnectAccountIdFromStripeEventV1(
  event: Stripe.Event,
  generation: StripeConnectWebhookApiGenerationV1,
): string | null {
  const obj = event.data?.object as Record<string, unknown> | undefined;
  if (!obj) return null;

  if (generation === 'v2_core') {
    const related = obj.related_object as { id?: string; type?: string } | undefined;
    if (typeof related?.id === 'string' && related.id.startsWith('acct_')) {
      return related.id;
    }
    if (typeof obj.id === 'string' && obj.id.startsWith('acct_')) {
      return obj.id;
    }
    return null;
  }

  if (typeof obj.id === 'string' && obj.id.startsWith('acct_')) return obj.id;
  if (typeof obj.account === 'string' && obj.account.startsWith('acct_')) return obj.account;
  return null;
}

export function buildNormalizedCapabilityEventFromVerifiedWebhookV1(
  parsed: Extract<VerifiedConnectWebhookParseResultV1, { ok: true }>,
): NormalizedProviderCapabilityEventV1 {
  const downgradeTypes = new Set([
    'account.application.deauthorized',
    'v2.core.account[configuration.recipient].capability_status_updated',
  ]);
  return {
    providerEventId: parsed.idempotencyKey,
    stripeEventId: parsed.stripeEventId,
    eventType: parsed.eventType,
    accountIdSuffix: parsed.accountIdSuffix,
    receivedAtUtc: new Date(),
    idempotencyKey: parsed.idempotencyKey,
    snapshotAfter: null,
    capabilityDowngrade:
      downgradeTypes.has(parsed.eventType) ||
      (parsed.apiGeneration === 'v1_connect' && parsed.eventType === 'account.application.deauthorized'),
  };
}

export function verifyStripeConnectWebhookSignatureV1(input: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
  stripe?: Stripe;
}): { ok: true; event: Stripe.Event } | { ok: false; reason: 'SIGNATURE_INVALID' } {
  if (!input.signatureHeader) return { ok: false, reason: 'SIGNATURE_INVALID' };
  try {
    const stripe = input.stripe ?? new Stripe('sk_test_placeholder');
    const event = stripe.webhooks.constructEvent(
      input.rawBody,
      input.signatureHeader,
      input.webhookSecret,
    );
    return { ok: true, event };
  } catch {
    return { ok: false, reason: 'SIGNATURE_INVALID' };
  }
}

export function canAcceptIsolatedConnectWebhookRequestV1(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true } | { ok: false; httpStatus: 503; checklist: string[] } {
  const checklist = listProviderStripeWebhookIngressBlockersV1(env);
  if (checklist.length > 0) {
    return { ok: false, httpStatus: 503, checklist };
  }
  const alignment = evaluateIsolatedSupabaseAlignmentStructuralV1(env);
  if (!alignment.ok) {
    return { ok: false, httpStatus: 503, checklist: listIsolatedSupabaseAlignmentChecklistV1(env) };
  }
  return { ok: true };
}

export type ConnectWebhookHttpDispositionV1 =
  | { status: 200; body: Record<string, unknown> }
  | { status: 400; body: { error: string } }
  | { status: 422; body: { error: string } }
  | { status: 503; body: { error: string; retryable?: boolean } };

/** Maps persist outcome to Stripe-retry-safe HTTP (no success without DB receipt). */
export function mapConnectWebhookPersistResultToHttpV1(
  handled:
    | { ok: true; duplicate: boolean; accountIdSuffix: string; eventType: string; apiGeneration: StripeConnectWebhookApiGenerationV1; thinEvent: boolean }
    | { ok: false; reason: 'ACCOUNT_UNBOUND' | 'DB_UNAVAILABLE' | 'MALFORMED' },
): ConnectWebhookHttpDispositionV1 {
  if (!handled.ok) {
    if (handled.reason === 'ACCOUNT_UNBOUND') {
      return { status: 503, body: { error: 'ACCOUNT_UNBOUND', retryable: true } };
    }
    if (handled.reason === 'DB_UNAVAILABLE') {
      return { status: 503, body: { error: 'STORAGE_UNAVAILABLE', retryable: true } };
    }
    return { status: 422, body: { error: 'EVENT_REJECTED' } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      duplicate: handled.duplicate,
      accountIdSuffix: handled.accountIdSuffix,
      eventType: handled.eventType,
      apiGeneration: handled.apiGeneration,
      thinEvent: handled.thinEvent,
      persisted: true,
      snapshotSyncApplied: false,
      snapshotSyncProven: false,
    },
  };
}
