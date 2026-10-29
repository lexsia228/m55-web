import type Stripe from 'stripe';
import type { R8ProviderAccountSnapshotV1 } from './contract';

/**
 * Pinned Stripe Connect Accounts v2 semantics for M55 Creator recipients (JP affiliate payouts plane).
 * Docs (authoritative — do not guess field names outside these references):
 * - https://docs.stripe.com/connect/accounts-v2
 * - https://docs.stripe.com/connect/accounts-v2/connected-account-configuration
 * - https://docs.stripe.com/api/v2/core/accounts/create
 * - https://docs.stripe.com/api/v2/core/account_links/create (SDK: stripe.v2.core.accountLinks.create)
 *
 * SDK: stripe@^20.4.0 — uses `/v2/core/accounts` and `/v2/core/account_links`.
 * Do not silently change Stripe-Version; inherit platform default from the secret key’s dashboard unless
 * Human pins a version for Connect sandbox proof.
 */
export const M55_STRIPE_CONNECT_V2_DOC_REFERENCES = [
  'https://docs.stripe.com/connect/accounts-v2',
  'https://docs.stripe.com/connect/accounts-v2/connected-account-configuration',
  'https://docs.stripe.com/api/v2/core/accounts/create',
  'https://docs.stripe.com/api/account_links/create',
] as const;

export type StripeConnectRuntimeClassification = {
  secretKeyPresent: boolean;
  secretKeyMode: 'absent' | 'test' | 'live' | 'invalid';
  testModeExplicitlyEnabled: boolean;
  fakeAdapterForced: boolean;
};

export function classifyStripeConnectRuntime(env: NodeJS.ProcessEnv = process.env): StripeConnectRuntimeClassification {
  const raw =
    env.M55_STRIPE_CONNECT_SECRET_KEY?.trim() ||
    env.STRIPE_SECRET_KEY?.trim() ||
    '';
  const fakeAdapterForced = env.M55_STRIPE_CONNECT_ADAPTER === 'FAKE';
  const testModeExplicitlyEnabled = env.M55_STRIPE_CONNECT_TESTMODE_ENABLED === 'true';
  if (!raw) {
    return {
      secretKeyPresent: false,
      secretKeyMode: 'absent',
      testModeExplicitlyEnabled,
      fakeAdapterForced,
    };
  }
  if (raw.startsWith('sk_test_')) {
    return {
      secretKeyPresent: true,
      secretKeyMode: 'test',
      testModeExplicitlyEnabled,
      fakeAdapterForced,
    };
  }
  if (raw.startsWith('sk_live_')) {
    return {
      secretKeyPresent: true,
      secretKeyMode: 'live',
      testModeExplicitlyEnabled,
      fakeAdapterForced,
    };
  }
  return {
    secretKeyPresent: true,
    secretKeyMode: 'invalid',
    testModeExplicitlyEnabled,
    fakeAdapterForced,
  };
}

export function buildJpRecipientAccountCreateParamsV1(input: {
  economicIdentityId: string;
  contactEmail: string;
}): Stripe.V2.Core.AccountCreateParams {
  return {
    contact_email: input.contactEmail,
    display_name: `M55 Creator ${input.economicIdentityId.slice(0, 8)}`,
    dashboard: 'express',
    identity: {
      country: 'jp',
      entity_type: 'individual',
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    defaults: {
      currency: 'jpy',
      // Express + platform liability (Rev4 platform-responsible negative balance classification).
      responsibilities: {
        fees_collector: 'application',
        losses_collector: 'application',
      },
    },
    metadata: {
      m55_economic_identity_id: input.economicIdentityId,
      m55_connect_plane: 'r8_a_recipient_v1',
    },
    include: ['configuration.recipient', 'requirements', 'identity'],
  };
}

export function buildRecipientOnboardingLinkParamsV1(input: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Stripe.V2.Core.AccountLinkCreateParams {
  return {
    account: input.accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
        collection_options: {
          fields: 'currently_due',
          future_requirements: 'omit',
        },
      },
    },
  };
}

function mapCapabilityStatus(
  status: string | undefined,
): R8ProviderAccountSnapshotV1['transfersCapability'] {
  if (status === 'active') return 'active';
  if (status === 'pending') return 'pending';
  if (status === 'restricted' || status === 'unsupported') return 'inactive';
  return 'unknown';
}

export function mapV2CoreAccountToProviderSnapshotV1(
  account: Stripe.V2.Core.Account,
): R8ProviderAccountSnapshotV1 {
  const stripeBalance = account.configuration?.recipient?.capabilities?.stripe_balance;
  const transfersStatus = stripeBalance?.stripe_transfers?.status;
  const payoutsStatus = stripeBalance?.payouts?.status;
  const entries = account.requirements?.entries ?? [];
  const minDeadlineStatus = account.requirements?.summary?.minimum_deadline?.status;
  const requirementsCurrentlyDueCount =
    minDeadlineStatus === 'currently_due' || minDeadlineStatus === 'past_due'
      ? Math.max(entries.length, 1)
      : entries.filter((entry) => entry.minimum_deadline?.status === 'currently_due').length;

  const detailsSubmitted =
    entries.length === 0 ||
    (minDeadlineStatus !== 'currently_due' && minDeadlineStatus !== 'past_due');

  return {
    detailsSubmitted,
    chargesEnabled: transfersStatus === 'active',
    payoutsEnabled: payoutsStatus === 'active',
    transfersCapability: mapCapabilityStatus(transfersStatus),
    requirementsCurrentlyDueCount,
  };
}
