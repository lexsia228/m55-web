import Stripe from 'stripe';
import { isM55ProductionRuntime } from './runtimeEnvironment';
import {
  evaluateIsolatedSupabaseAlignmentV1,
  listIsolatedSupabaseAlignmentChecklistV1,
} from './r8IsolatedSupabaseAlignment';
import type { NormalizedProviderCapabilityEventV1 } from './providerWebhookEventContract';

export type ProviderStripeWebhookIngressModeV1 = 'DISABLED' | 'ISOLATED_TEST';

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

const ALLOWED_CONNECT_WEBHOOK_TYPES = new Set([
  'account.updated',
  'capability.updated',
  'account.application.deauthorized',
]);

export type VerifiedConnectWebhookParseResultV1 =
  | { ok: false; reason: 'SIGNATURE_INVALID' | 'MALFORMED_PAYLOAD' | 'EVENT_TYPE_UNSUPPORTED' | 'ACCOUNT_UNRESOLVED' }
  | {
      ok: true;
      stripeEventId: string;
      eventType: string;
      accountId: string;
      accountIdSuffix: string;
      idempotencyKey: string;
      livemode: boolean;
    };

export function parseVerifiedStripeConnectWebhookEventV1(
  event: Stripe.Event,
): VerifiedConnectWebhookParseResultV1 {
  if (event.livemode === true) {
    return { ok: false, reason: 'MALFORMED_PAYLOAD' };
  }
  if (!ALLOWED_CONNECT_WEBHOOK_TYPES.has(event.type)) {
    return { ok: false, reason: 'EVENT_TYPE_UNSUPPORTED' };
  }
  const accountId = extractConnectAccountIdFromStripeEventV1(event);
  if (!accountId) return { ok: false, reason: 'ACCOUNT_UNRESOLVED' };
  return {
    ok: true,
    stripeEventId: event.id,
    eventType: event.type,
    accountId,
    accountIdSuffix: accountId.slice(-8),
    idempotencyKey: `stripe_evt:${event.id}`,
    livemode: event.livemode === true,
  };
}

function extractConnectAccountIdFromStripeEventV1(event: Stripe.Event): string | null {
  const obj = event.data?.object as { id?: string; account?: string } | undefined;
  if (!obj) return null;
  if (typeof obj.id === 'string' && obj.id.startsWith('acct_')) return obj.id;
  if (typeof obj.account === 'string' && obj.account.startsWith('acct_')) return obj.account;
  return null;
}

export function buildNormalizedCapabilityEventFromVerifiedWebhookV1(
  parsed: Extract<VerifiedConnectWebhookParseResultV1, { ok: true }>,
): NormalizedProviderCapabilityEventV1 {
  return {
    providerEventId: parsed.idempotencyKey,
    stripeEventId: parsed.stripeEventId,
    eventType: parsed.eventType,
    accountIdSuffix: parsed.accountIdSuffix,
    receivedAtUtc: new Date(),
    idempotencyKey: parsed.idempotencyKey,
    snapshotAfter: null,
    capabilityDowngrade: parsed.eventType === 'account.application.deauthorized',
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
  const alignment = evaluateIsolatedSupabaseAlignmentV1(env);
  if (!alignment.ok) {
    return { ok: false, httpStatus: 503, checklist: listIsolatedSupabaseAlignmentChecklistV1(env) };
  }
  return { ok: true };
}
