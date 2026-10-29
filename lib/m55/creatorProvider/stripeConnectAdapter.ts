import type { R8ProviderAccountSnapshotV1 } from './contract';

export type StripeConnectAdapterMode = 'FAKE' | 'LIVE_BLOCKED';

export type StripeConnectAdapter = {
  mode: StripeConnectAdapterMode;
  createConnectedAccountStub(input: {
    economicIdentityId: string;
    idempotencyKey: string;
  }): Promise<{ accountId: string }>;
  createAccountOnboardingLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string; expiresAtMs: number }>;
  retrieveAccountSnapshot(accountId: string): Promise<R8ProviderAccountSnapshotV1>;
};

const fakeAccounts = new Map<string, R8ProviderAccountSnapshotV1>();

function fakeAccountIdForEconomicIdentity(economicIdentityId: string, idempotencyKey: string): string {
  const digest = Buffer.from(`${economicIdentityId}:${idempotencyKey}`).toString('hex').slice(0, 24);
  return `acct_fake_r8a_${digest}`;
}

export function resetFakeStripeConnectAdapterForTests(): void {
  fakeAccounts.clear();
}

export function createFakeStripeConnectAdapter(): StripeConnectAdapter {
  return {
    mode: 'FAKE',
    async createConnectedAccountStub({ economicIdentityId, idempotencyKey }) {
      const accountId = fakeAccountIdForEconomicIdentity(economicIdentityId, idempotencyKey);
      if (!fakeAccounts.has(accountId)) {
        fakeAccounts.set(accountId, {
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          transfersCapability: 'inactive',
          requirementsCurrentlyDueCount: 1,
        });
      }
      return { accountId };
    },
    async createAccountOnboardingLink({ accountId }) {
      if (!fakeAccounts.has(accountId)) {
        throw new Error('FAKE_ACCOUNT_NOT_FOUND');
      }
      return {
        url: `https://connect.stripe.com/setup/s/fake/${accountId}`,
        expiresAtMs: Date.now() + 30 * 60 * 1000,
      };
    },
    async retrieveAccountSnapshot(accountId) {
      const snapshot = fakeAccounts.get(accountId);
      if (!snapshot) {
        throw new Error('FAKE_ACCOUNT_NOT_FOUND');
      }
      return { ...snapshot };
    },
  };
}

/** Test helper — simulates successful hosted onboarding without live Stripe. */
export function fakeStripeCompleteOnboardingForTests(accountId: string): void {
  fakeAccounts.set(accountId, {
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    transfersCapability: 'active',
    requirementsCurrentlyDueCount: 0,
  });
}

/**
 * Live adapter is intentionally blocked for R8-A local work.
 * Accounts v2 Connect mapping must follow current Stripe docs:
 * https://docs.stripe.com/connect/accounts-v2
 * https://docs.stripe.com/connect/accounts-v2/connected-account-configuration
 * Authorized sandbox proof only — never default-on in this gate.
 */
export function createLiveStripeConnectAdapterBlocked(): StripeConnectAdapter {
  return {
    mode: 'LIVE_BLOCKED',
    async createConnectedAccountStub() {
      throw new Error('LIVE_STRIPE_CONNECT_BLOCKED_R8_A');
    },
    async createAccountOnboardingLink() {
      throw new Error('LIVE_STRIPE_CONNECT_BLOCKED_R8_A');
    },
    async retrieveAccountSnapshot() {
      throw new Error('LIVE_STRIPE_CONNECT_BLOCKED_R8_A');
    },
  };
}

export function resolveStripeConnectAdapter(): StripeConnectAdapter {
  if (process.env.M55_STRIPE_CONNECT_LIVE_ACCOUNT_CREATION === 'true') {
    return createLiveStripeConnectAdapterBlocked();
  }
  return createFakeStripeConnectAdapter();
}

export function assertSafeRedirectUrl(candidate: string, allowedOrigin: string): string | null {
  try {
    const url = new URL(candidate);
    const allowed = new URL(allowedOrigin);
    if (url.origin !== allowed.origin) return null;
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null;
    if (url.username || url.password || url.port) return null;
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

export function buildCreatorPortalProviderRefreshUrl(): string {
  const origin = resolveCreatorProviderPublicOrigin();
  return new URL('/creator/portal', origin).toString();
}
