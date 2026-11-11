import 'server-only';
import { clerkClient } from '@clerk/nextjs/server';
import {
  isCreatorReferralCapabilityPermittedV1,
  resolveCreatorContextFromSession,
  type ResolvedCreatorContext,
} from '../creatorDashboard/creatorContext';
import { buildPublicReadinessSnapshotV1 } from './readinessModel';
import { loadTaxProfileV1, upsertTaxProfileV1 } from './taxProfileRepository';
import {
  getProviderEventStoreSingletonV1,
  isProviderDowngradeActiveV1,
} from './providerWebhookEventContract';
import {
  appendProviderOnboardingEventV1,
  bindStripeAccountIdV1,
  createOnboardingSessionV1,
  ensureProviderAccountCreationRowV1,
  loadProviderAccountByEconomicIdentityV1,
  markOnboardingSessionCompletedV1,
  recordOnboardingLinkIssuedV1,
  syncProviderSnapshotV1,
  verifyOnboardingSessionOwnedAndPendingV1,
} from './providerAccountRepository';
import { isR8AProviderPlaneEditableV1 } from './providerEligibility';
import { stableProviderCreateIdempotencyKeyV1 } from './providerAccountBindingLogic';
import {
  assertSafeRedirectUrl,
  buildCreatorPortalProviderRefreshUrl,
  buildCreatorPortalProviderReturnUrl,
  resolveCreatorProviderPublicOrigin,
  resolveStripeConnectAdapter,
  type StripeConnectAdapter,
} from './stripeConnectAdapter';
import { parseClientIdempotencyKey, type R8PublicReadinessSnapshotV1, type R8TaxProfileInputV1 } from './contract';
import {
  isTaxProfileEligibleForProviderPayoutReadinessV1,
  isTaxProfileRecordWellFormedV1,
} from './providerPayoutReadinessPredicate';

export type ProviderStatusBundleV1 = {
  readiness: R8PublicReadinessSnapshotV1;
  taxProfile: Awaited<ReturnType<typeof loadTaxProfileV1>>;
  onboardingUrl: string | null;
  adapterMode: StripeConnectAdapter['mode'];
};

async function resolveCreatorContactEmail(clerkUserId: string): Promise<string | null> {
  try {
    const user = await (await clerkClient()).users.getUser(clerkUserId);
    const primary = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
    return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

function mapProviderAdapterError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : '';
  if (message === 'PROVIDER_ADAPTER_DISABLED' || message === 'LIVE_STRIPE_CONNECT_BLOCKED_R8_A') {
    return 'PROVIDER_ADAPTER_DISABLED';
  }
  if (message === 'CREATOR_CONTACT_EMAIL_REQUIRED') {
    return 'CREATOR_CONTACT_EMAIL_REQUIRED';
  }
  if (message === 'CORPORATION_STRIPE_NOT_SUPPORTED_V1') {
    return 'CORPORATION_STRIPE_NOT_SUPPORTED_V1';
  }
  if (message === 'PROVIDER_ACCOUNT_BINDING_CONFLICT') {
    return 'PROVIDER_ACCOUNT_BINDING_CONFLICT';
  }
  return 'PROVIDER_ONBOARDING_UNAVAILABLE';
}

async function complianceBlocksReferral(ctx: Extract<ResolvedCreatorContext, { ok: true }>): Promise<boolean> {
  if (ctx.profileStatus !== 'ACTIVE') return false;
  try {
    const permitted = await isCreatorReferralCapabilityPermittedV1(
      ctx.creatorEconomicIdentityId,
      ctx.profileStatus,
    );
    return !permitted;
  } catch {
    throw new Error('PROVIDER_STATUS_UNAVAILABLE');
  }
}

export async function buildProviderStatusBundleV1(options?: {
  refreshProvider?: boolean;
  returnSessionId?: string | null;
  adapter?: StripeConnectAdapter;
}): Promise<
  | { ok: false; error: 'UNAUTHORIZED' | 'CREATOR_PROFILE_REQUIRED' | 'PORTAL_UNAVAILABLE' }
  | { ok: true; bundle: ProviderStatusBundleV1 }
> {
  const ctx = await resolveCreatorContextFromSession();
  if (!ctx.ok) return ctx;

  const adapter = options?.adapter ?? resolveStripeConnectAdapter();
  const taxProfile = await loadTaxProfileV1(ctx.creatorEconomicIdentityId);
  const taxProfileReady = isTaxProfileRecordWellFormedV1(taxProfile);
  let providerRow = await loadProviderAccountByEconomicIdentityV1(ctx.creatorEconomicIdentityId);

  const sessionId = options?.returnSessionId?.trim() || null;
  const shouldPollProvider =
    options?.refreshProvider === true ||
    (sessionId != null && sessionId.length > 0);

  if (shouldPollProvider && providerRow?.stripeAccountId) {
    const sessionPending =
      sessionId != null && sessionId.length > 0
        ? await verifyOnboardingSessionOwnedAndPendingV1({
            creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
            sessionId,
          })
        : false;
    const mayPollProvider = options?.refreshProvider === true || sessionPending;
    if (mayPollProvider) {
      try {
        const snapshot = await adapter.retrieveAccountSnapshot(providerRow.stripeAccountId);
        providerRow = await syncProviderSnapshotV1({
          creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
          stripeAccountId: providerRow.stripeAccountId,
          snapshot,
        });
        await appendProviderOnboardingEventV1({
          creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
          eventType: 'PROVIDER_SNAPSHOT_SYNCED',
          idempotencyKey: `sync:${providerRow.lastSyncedAt ?? Date.now()}:${providerRow.stripeAccountId}`,
          payloadRedacted: { linkState: providerRow.linkState },
        });
        if (sessionPending && sessionId) {
          await markOnboardingSessionCompletedV1({
            creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
            sessionId,
          });
        }
      } catch {
        // Fail-closed: redirect alone does not complete onboarding.
      }
    }
  }

  const complianceHold = await complianceBlocksReferral(ctx);
  const providerDowngradeActive = isProviderDowngradeActiveV1(
    getProviderEventStoreSingletonV1(),
    ctx.creatorEconomicIdentityId,
  );
  const readiness = buildPublicReadinessSnapshotV1({
    profileStatus: ctx.profileStatus,
    r7ReferralIssueEligible: ctx.r7ReferralIssueEligible,
    complianceBlocksReferral: complianceHold,
    taxProfileReady,
    taxProfile,
    linkState: providerRow?.linkState ?? 'NOT_STARTED',
    providerSnapshot: providerRow?.lastProviderSnapshot ?? null,
    stripeAccountId: providerRow?.stripeAccountId ?? null,
    providerLastSyncedAt: providerRow?.lastSyncedAt ?? null,
    providerDowngradeActive,
    v1JapanBlocked: false,
  });

  return {
    ok: true,
    bundle: {
      readiness,
      taxProfile,
      onboardingUrl: null,
      adapterMode: adapter.mode,
    },
  };
}

export async function saveCreatorTaxProfileForSessionV1(
  input: R8TaxProfileInputV1,
): Promise<
  | { ok: false; error: 'UNAUTHORIZED' | 'CREATOR_PROFILE_REQUIRED' | 'FORBIDDEN' | 'TAX_PROFILE_INVALID' | 'TAX_PROFILE_UNAVAILABLE' }
  | { ok: true; taxProfile: Awaited<ReturnType<typeof upsertTaxProfileV1>> }
> {
  const ctx = await resolveCreatorContextFromSession();
  if (!ctx.ok) {
    return { ok: false, error: ctx.error === 'PORTAL_UNAVAILABLE' ? 'TAX_PROFILE_UNAVAILABLE' : ctx.error };
  }
  if (!isR8AProviderPlaneEditableV1(ctx.profileStatus)) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  try {
    const taxProfile = await upsertTaxProfileV1(ctx.creatorEconomicIdentityId, input);
    return { ok: true, taxProfile };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (message === 'TAX_PROFILE_INVALID' || message === 'V1_ELIGIBILITY_BLOCKED') {
      return { ok: false, error: 'TAX_PROFILE_INVALID' };
    }
    return { ok: false, error: 'TAX_PROFILE_UNAVAILABLE' };
  }
}

export async function startCreatorProviderOnboardingV1(body: {
  action: 'START' | 'RESUME';
  idempotencyKey: string;
  adapter?: StripeConnectAdapter;
}): Promise<
  | { ok: false; error: string }
  | { ok: true; onboardingUrl: string; sessionId: string; reused: boolean }
> {
  const ctx = await resolveCreatorContextFromSession();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!isR8AProviderPlaneEditableV1(ctx.profileStatus)) return { ok: false, error: 'FORBIDDEN' };

  const clientKey = parseClientIdempotencyKey(body.idempotencyKey);
  if (!clientKey) return { ok: false, error: 'INVALID_INPUT' };

  const taxProfile = await loadTaxProfileV1(ctx.creatorEconomicIdentityId);
  if (!taxProfile) return { ok: false, error: 'TAX_PROFILE_REQUIRED' };
  if (taxProfile.payeeType === 'CORPORATION') {
    return { ok: false, error: 'CORPORATION_STRIPE_NOT_SUPPORTED_V1' };
  }
  if (!isTaxProfileEligibleForProviderPayoutReadinessV1(taxProfile)) {
    return { ok: false, error: 'TAX_PROFILE_INVALID' };
  }

  if (ctx.profileStatus === 'ACTIVE') {
    const complianceHold = await complianceBlocksReferral(ctx);
    if (complianceHold) return { ok: false, error: 'COMPLIANCE_HOLD' };
  }

  const adapter = body.adapter ?? resolveStripeConnectAdapter();
  const origin = resolveCreatorProviderPublicOrigin();
  const refreshUrl = assertSafeRedirectUrl(buildCreatorPortalProviderRefreshUrl(), origin);
  if (!refreshUrl) return { ok: false, error: 'ORIGIN_MISCONFIGURED' };

  const createKey = stableProviderCreateIdempotencyKeyV1(ctx.creatorEconomicIdentityId);
  let providerRow = await ensureProviderAccountCreationRowV1(ctx.creatorEconomicIdentityId);
  if (!providerRow.stripeAccountId) {
    const contactEmail = await resolveCreatorContactEmail(ctx.clerkUserId);
    if (!contactEmail) {
      return { ok: false, error: 'CREATOR_CONTACT_EMAIL_REQUIRED' };
    }
    try {
      const stub = await adapter.createConnectedAccountStub({
        economicIdentityId: ctx.creatorEconomicIdentityId,
        idempotencyKey: createKey,
        contactEmail,
        payeeType: taxProfile.payeeType,
      });
      providerRow = await bindStripeAccountIdV1({
        creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
        stripeAccountId: stub.accountId,
      });
      await appendProviderOnboardingEventV1({
        creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
        eventType: 'PROVIDER_ACCOUNT_STUB',
        idempotencyKey: createKey,
        payloadRedacted: { accountIdSuffix: stub.accountId.slice(-6) },
      });
    } catch (cause) {
      return { ok: false, error: mapProviderAdapterError(cause) };
    }
  }

  const { sessionId, reused } = await createOnboardingSessionV1({
    creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
    clientIdempotencyKey: clientKey,
    returnPath: '/creator/portal',
  });

  const returnUrl = assertSafeRedirectUrl(buildCreatorPortalProviderReturnUrl(sessionId), origin);
  if (!returnUrl || !providerRow.stripeAccountId) {
    return { ok: false, error: 'ORIGIN_MISCONFIGURED' };
  }

  try {
    const link = await adapter.createAccountOnboardingLink({
      accountId: providerRow.stripeAccountId,
      refreshUrl,
      returnUrl,
    });
    await recordOnboardingLinkIssuedV1({
      creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
      sessionId,
    });
    await appendProviderOnboardingEventV1({
      creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
      eventType: body.action === 'RESUME' ? 'ONBOARDING_LINK_RESUME' : 'ONBOARDING_LINK_START',
      idempotencyKey: `link:${sessionId}:${clientKey}`,
      payloadRedacted: { sessionId },
    });
    return { ok: true, onboardingUrl: link.url, sessionId, reused };
  } catch (cause) {
    return { ok: false, error: mapProviderAdapterError(cause) };
  }
}
