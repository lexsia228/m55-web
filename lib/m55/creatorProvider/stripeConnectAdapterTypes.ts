import type { R8ProviderAccountSnapshotV1 } from './contract';

export type StripeConnectAdapterMode =
  | 'DISABLED'
  | 'TEST_SANDBOX'
  | 'FAKE'
  | 'LIVE_BLOCKED';

export type StripeConnectAdapter = {
  mode: StripeConnectAdapterMode;
  createConnectedAccountStub(input: {
    economicIdentityId: string;
    idempotencyKey: string;
    contactEmail: string;
    payeeType: 'INDIVIDUAL' | 'CORPORATION';
  }): Promise<{ accountId: string }>;
  createAccountOnboardingLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string; expiresAtMs: number }>;
  retrieveAccountSnapshot(accountId: string): Promise<R8ProviderAccountSnapshotV1>;
};
