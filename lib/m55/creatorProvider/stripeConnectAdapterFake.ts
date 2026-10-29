import type { R8ProviderAccountSnapshotV1 } from './contract';
import type { StripeConnectAdapter } from './stripeConnectAdapterTypes';

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

/** Test helper — simulates successful hosted onboarding without network Stripe. */
export function fakeStripeCompleteOnboardingForTests(accountId: string): void {
  fakeAccounts.set(accountId, {
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    transfersCapability: 'active',
    requirementsCurrentlyDueCount: 0,
  });
}
