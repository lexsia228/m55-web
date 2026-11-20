import Stripe from 'stripe';
import {
  classifyStripeConnectRuntime,
  buildJpRecipientAccountCreateParamsV1,
  buildRecipientOnboardingLinkParamsV1,
  mapV2CoreAccountToProviderSnapshotV1,
} from './stripeConnectV2Semantics';
import { isM55ProductionRuntime } from './runtimeEnvironment';
import { createFakeStripeConnectAdapter } from './stripeConnectAdapterFake';

export type { StripeConnectAdapter, StripeConnectAdapterMode } from './stripeConnectAdapterTypes';
export {
  resetFakeStripeConnectAdapterForTests,
  fakeStripeCompleteOnboardingForTests,
  createFakeStripeConnectAdapter,
} from './stripeConnectAdapterFake';
import type { StripeConnectAdapter } from './stripeConnectAdapterTypes';

export { classifyStripeConnectRuntime, M55_STRIPE_CONNECT_V2_DOC_REFERENCES } from './stripeConnectV2Semantics';

let _connectStripe: Stripe | null = null;

function resolveConnectSecretKey(): string | null {
  const classification = classifyStripeConnectRuntime();
  if (!classification.secretKeyPresent) return null;
  const raw =
    process.env.M55_STRIPE_CONNECT_SECRET_KEY?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    '';
  return raw || null;
}

export function getStripeConnectClient(): Stripe {
  const secret = resolveConnectSecretKey();
  if (!secret) throw new Error('ENV_MISSING:STRIPE_CONNECT_SECRET_KEY');
  if (!_connectStripe) {
    _connectStripe = new Stripe(secret);
  }
  return _connectStripe;
}

function createDisabledStripeConnectAdapter(reason: StripeConnectAdapter['mode']): StripeConnectAdapter {
  return {
    mode: reason,
    async createConnectedAccountStub() {
      throw new Error(
        reason === 'LIVE_BLOCKED' ? 'LIVE_STRIPE_CONNECT_BLOCKED_R8_A' : 'PROVIDER_ADAPTER_DISABLED',
      );
    },
    async createAccountOnboardingLink() {
      throw new Error(
        reason === 'LIVE_BLOCKED' ? 'LIVE_STRIPE_CONNECT_BLOCKED_R8_A' : 'PROVIDER_ADAPTER_DISABLED',
      );
    },
    async retrieveAccountSnapshot() {
      throw new Error(
        reason === 'LIVE_BLOCKED' ? 'LIVE_STRIPE_CONNECT_BLOCKED_R8_A' : 'PROVIDER_ADAPTER_DISABLED',
      );
    },
  };
}

export function createTestSandboxStripeConnectAdapter(stripe: Stripe): StripeConnectAdapter {
  return {
    mode: 'TEST_SANDBOX',
    async createConnectedAccountStub({ economicIdentityId, idempotencyKey, contactEmail, payeeType }) {
      const params = buildJpRecipientAccountCreateParamsV1({ economicIdentityId, contactEmail, payeeType });
      const account = await stripe.v2.core.accounts.create(params, { idempotencyKey });
      if (!account.id) throw new Error('STRIPE_ACCOUNT_CREATE_INCOMPLETE');
      if (account.livemode !== false) {
        throw new Error('LIVE_STRIPE_CONNECT_BLOCKED_R8_A');
      }
      return { accountId: account.id };
    },
    async createAccountOnboardingLink({ accountId, refreshUrl, returnUrl }) {
      const params = buildRecipientOnboardingLinkParamsV1({ accountId, refreshUrl, returnUrl });
      const link = await stripe.v2.core.accountLinks.create(params);
      if (!link.url) throw new Error('STRIPE_ACCOUNT_LINK_INCOMPLETE');
      return {
        url: link.url,
        expiresAtMs: link.expires_at ? Date.parse(link.expires_at) : Date.now() + 30 * 60 * 1000,
      };
    },
    async retrieveAccountSnapshot(accountId) {
      const account = await stripe.v2.core.accounts.retrieve(accountId, {
        include: ['configuration.recipient', 'requirements'],
      });
      if (account.livemode !== false) {
        throw new Error('LIVE_STRIPE_CONNECT_BLOCKED_R8_A');
      }
      return mapV2CoreAccountToProviderSnapshotV1(account);
    },
  };
}

/**
 * Operational default is fail-closed DISABLED until explicit test-mode enablement + sk_test_* key.
 * FAKE is only for unit tests via M55_STRIPE_CONNECT_ADAPTER=FAKE or injected adapter option.
 */
export function resolveStripeConnectAdapter(options?: { stripe?: Stripe }): StripeConnectAdapter {
  if (isM55ProductionRuntime()) {
    const classification = classifyStripeConnectRuntime();
    if (classification.secretKeyMode === 'live') {
      return createDisabledStripeConnectAdapter('LIVE_BLOCKED');
    }
    return createDisabledStripeConnectAdapter('DISABLED');
  }

  const classification = classifyStripeConnectRuntime();
  if (classification.fakeAdapterForced) {
    return createFakeStripeConnectAdapter();
  }
  if (classification.secretKeyMode === 'live') {
    return createDisabledStripeConnectAdapter('LIVE_BLOCKED');
  }
  if (classification.secretKeyMode === 'invalid') {
    return createDisabledStripeConnectAdapter('DISABLED');
  }
  if (classification.secretKeyMode === 'test' && classification.testModeExplicitlyEnabled) {
    try {
      const stripe = options?.stripe ?? getStripeConnectClient();
      return createTestSandboxStripeConnectAdapter(stripe);
    } catch {
      return createDisabledStripeConnectAdapter('DISABLED');
    }
  }
  return createDisabledStripeConnectAdapter('DISABLED');
}

export function assertSafeRedirectUrl(candidate: string, allowedOrigin: string): string | null {
  try {
    const url = new URL(candidate);
    const allowed = new URL(allowedOrigin);
    if (url.username || url.password) return null;
    if (url.protocol !== allowed.protocol) return null;
    if (url.hostname !== allowed.hostname) return null;
    const urlPort = url.port || (url.protocol === 'https:' ? '443' : '80');
    const allowedPort = allowed.port || (allowed.protocol === 'https:' ? '443' : '80');
    if (urlPort !== allowedPort) return null;
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null;
    }
    if (!url.pathname.startsWith('/creator/')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveCreatorProviderPublicOrigin(): string {
  const raw =
    process.env.M55_PUBLIC_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export function buildCreatorPortalProviderReturnUrl(sessionId: string): string {
  const origin = resolveCreatorProviderPublicOrigin();
  const url = new URL('/creator/portal', origin);
  url.searchParams.set('provider', 'return');
  url.searchParams.set('session', sessionId);
  return url.toString();
}

/** Stripe link return target only — no DB session; completion requires startCreatorProviderOnboardingV1 session. */
export function buildCreatorPortalProviderReturnUrlWithoutSessionV1(): string {
  const origin = resolveCreatorProviderPublicOrigin();
  const url = new URL('/creator/portal', origin);
  url.searchParams.set('provider', 'return');
  return url.toString();
}

export function buildCreatorPortalProviderRefreshUrl(): string {
  const origin = resolveCreatorProviderPublicOrigin();
  return new URL('/creator/portal', origin).toString();
}
