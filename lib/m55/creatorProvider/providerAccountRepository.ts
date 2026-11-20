import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  resolveStripeAccountBindingV1,
  stableProviderCreateIdempotencyKeyV1,
} from './providerAccountBindingLogic';
import {
  type R8ProviderAccountSnapshotV1,
  type R8StripeLinkStateV1,
  redactProviderSnapshotForStorage,
} from './contract';
import { decideOnboardingSessionCreateV1 } from './providerOnboardingSessionLogic';
import { deriveProviderLinkStateFromSnapshotSyncV1 } from './providerPayoutReadinessPredicate';

export type ProviderAccountRowV1 = {
  id: string;
  creatorEconomicIdentityId: string;
  stripeAccountId: string | null;
  linkState: R8StripeLinkStateV1;
  createIdempotencyKey: string;
  lastOnboardingSessionId: string | null;
  lastProviderSnapshot: R8ProviderAccountSnapshotV1 | null;
  lastSyncedAt: string | null;
  lastErrorCode: string | null;
};

type DbRow = {
  id: string;
  creator_economic_identity_id: string;
  stripe_account_id: string | null;
  link_state: string;
  create_idempotency_key: string;
  last_onboarding_session_id: string | null;
  last_provider_snapshot: R8ProviderAccountSnapshotV1 | null;
  last_synced_at: string | null;
  last_error_code: string | null;
};

function mapRow(row: DbRow): ProviderAccountRowV1 {
  return {
    id: row.id,
    creatorEconomicIdentityId: row.creator_economic_identity_id,
    stripeAccountId: row.stripe_account_id,
    linkState: row.link_state as R8StripeLinkStateV1,
    createIdempotencyKey: row.create_idempotency_key,
    lastOnboardingSessionId: row.last_onboarding_session_id,
    lastProviderSnapshot: row.last_provider_snapshot,
    lastSyncedAt: row.last_synced_at,
    lastErrorCode: row.last_error_code,
  };
}

const SELECT_FIELDS =
  'id,creator_economic_identity_id,stripe_account_id,link_state,create_idempotency_key,last_onboarding_session_id,last_provider_snapshot,last_synced_at,last_error_code';

export async function loadProviderAccountByEconomicIdentityV1(
  creatorEconomicIdentityId: string,
): Promise<ProviderAccountRowV1 | null> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .select(SELECT_FIELDS)
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .maybeSingle();
  if (error) throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
  if (!data) return null;
  return mapRow(data as DbRow);
}

export async function loadCreatorEconomicIdentityByStripeAccountIdV1(
  stripeAccountId: string,
): Promise<string | null> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .select('creator_economic_identity_id')
    .eq('stripe_account_id', stripeAccountId)
    .maybeSingle();
  if (error) throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
  if (!data?.creator_economic_identity_id) return null;
  return data.creator_economic_identity_id as string;
}

export async function appendProviderOnboardingEventV1(input: {
  creatorEconomicIdentityId: string;
  eventType: string;
  idempotencyKey: string;
  payloadRedacted?: Record<string, unknown>;
}): Promise<'inserted' | 'duplicate'> {
  const db = getSupabaseAdmin() as any;
  const { error } = await db.from('m55_r8_provider_onboarding_events_v1').insert({
    creator_economic_identity_id: input.creatorEconomicIdentityId,
    event_type: input.eventType,
    idempotency_key: input.idempotencyKey,
    payload_redacted: input.payloadRedacted ?? {},
  });
  if (!error) return 'inserted';
  const code = String((error as { code?: string }).code ?? '');
  const message = String(error.message ?? '');
  if (code === '23505' || message.includes('duplicate')) return 'duplicate';
  throw new Error('PROVIDER_EVENT_APPEND_FAILED');
}

export async function ensureProviderAccountCreationRowV1(
  creatorEconomicIdentityId: string,
): Promise<ProviderAccountRowV1> {
  const db = getSupabaseAdmin() as any;
  const createIdempotencyKey = stableProviderCreateIdempotencyKeyV1(creatorEconomicIdentityId);
  const existing = await loadProviderAccountByEconomicIdentityV1(creatorEconomicIdentityId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .insert({
      creator_economic_identity_id: creatorEconomicIdentityId,
      stripe_account_id: null,
      link_state: 'NOT_STARTED',
      create_idempotency_key: createIdempotencyKey,
      updated_at: now,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    const raced = await loadProviderAccountByEconomicIdentityV1(creatorEconomicIdentityId);
    if (raced) return raced;
    throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
  }
  if (!data) throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
  return mapRow(data as DbRow);
}

export async function bindStripeAccountIdV1(input: {
  creatorEconomicIdentityId: string;
  stripeAccountId: string;
}): Promise<ProviderAccountRowV1> {
  const row = await loadProviderAccountByEconomicIdentityV1(input.creatorEconomicIdentityId);
  if (!row) throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');

  const decision = resolveStripeAccountBindingV1({
    existingStripeAccountId: row.stripeAccountId,
    incomingStripeAccountId: input.stripeAccountId,
  });
  if (!decision.ok) throw new Error(decision.error);
  if (decision.action === 'noop') return row;

  const db = getSupabaseAdmin() as any;
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .update({
      stripe_account_id: input.stripeAccountId,
      link_state: 'ACCOUNT_STUB',
      updated_at: now,
    })
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .is('stripe_account_id', null)
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    const current = await loadProviderAccountByEconomicIdentityV1(input.creatorEconomicIdentityId);
    if (current?.stripeAccountId === input.stripeAccountId) return current;
    if (current?.stripeAccountId && current.stripeAccountId !== input.stripeAccountId) {
      throw new Error('PROVIDER_ACCOUNT_BINDING_CONFLICT');
    }
    throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
  }
  return mapRow(data as DbRow);
}

/** @deprecated use ensureProviderAccountCreationRowV1 + bindStripeAccountIdV1 */
export async function upsertProviderAccountStubV1(input: {
  creatorEconomicIdentityId: string;
  createIdempotencyKey: string;
  stripeAccountId: string;
}): Promise<ProviderAccountRowV1> {
  await ensureProviderAccountCreationRowV1(input.creatorEconomicIdentityId);
  return bindStripeAccountIdV1({
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    stripeAccountId: input.stripeAccountId,
  });
}

export async function recordOnboardingLinkIssuedV1(input: {
  creatorEconomicIdentityId: string;
  sessionId: string;
}): Promise<void> {
  const db = getSupabaseAdmin() as any;
  const now = new Date().toISOString();
  const { error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .update({
      link_state: 'ONBOARDING_LINK_ISSUED',
      last_onboarding_session_id: input.sessionId,
      last_onboarding_url_issued_at: now,
      updated_at: now,
    })
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId);
  if (error) throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
}

export async function syncProviderSnapshotV1(input: {
  creatorEconomicIdentityId: string;
  stripeAccountId: string;
  snapshot: R8ProviderAccountSnapshotV1;
}): Promise<ProviderAccountRowV1> {
  const redacted = redactProviderSnapshotForStorage(input.snapshot);
  const now = new Date().toISOString();
  const linkState = deriveProviderLinkStateFromSnapshotSyncV1(redacted);

  const db = getSupabaseAdmin() as any;
  const current = await loadProviderAccountByEconomicIdentityV1(input.creatorEconomicIdentityId);
  if (current?.stripeAccountId && current.stripeAccountId !== input.stripeAccountId) {
    throw new Error('PROVIDER_ACCOUNT_BINDING_CONFLICT');
  }

  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .update({
      link_state: linkState,
      last_provider_snapshot: redacted,
      last_synced_at: now,
      last_error_code: null,
      updated_at: now,
    })
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .eq('stripe_account_id', input.stripeAccountId)
    .select(SELECT_FIELDS)
    .single();
  if (error || !data) throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
  return mapRow(data as DbRow);
}

export async function createOnboardingSessionV1(input: {
  creatorEconomicIdentityId: string;
  clientIdempotencyKey: string;
  returnPath: string;
  ttlMs?: number;
}): Promise<{ sessionId: string; reused: boolean }> {
  const db = getSupabaseAdmin() as any;
  const existing = await db
    .from('m55_r8_provider_onboarding_sessions_v1')
    .select('id,status,expires_at')
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .eq('client_idempotency_key', input.clientIdempotencyKey)
    .maybeSingle();

  const decision = decideOnboardingSessionCreateV1({
    existingStatus: (existing.data?.status as 'PENDING' | 'COMPLETED' | 'EXPIRED' | undefined) ?? null,
  });

  if (decision.action === 'reuse') {
    if (new Date(existing.data!.expires_at as string).getTime() < Date.now()) {
      await db
        .from('m55_r8_provider_onboarding_sessions_v1')
        .update({ status: 'EXPIRED' })
        .eq('id', existing.data!.id);
      throw new Error('ONBOARDING_SESSION_IDEMPOTENCY_EXHAUSTED');
    }
    return { sessionId: existing.data!.id as string, reused: true };
  }

  if (decision.action === 'reject') {
    throw new Error('ONBOARDING_SESSION_IDEMPOTENCY_EXHAUSTED');
  }

  const expiresAt = new Date(Date.now() + (input.ttlMs ?? 60 * 60 * 1000)).toISOString();
  const { data, error } = await db
    .from('m55_r8_provider_onboarding_sessions_v1')
    .insert({
      creator_economic_identity_id: input.creatorEconomicIdentityId,
      client_idempotency_key: input.clientIdempotencyKey,
      status: 'PENDING',
      return_path: input.returnPath,
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error('ONBOARDING_SESSION_UNAVAILABLE');
  return { sessionId: data.id as string, reused: false };
}

export async function verifyOnboardingSessionOwnedAndPendingV1(input: {
  creatorEconomicIdentityId: string;
  sessionId: string;
}): Promise<boolean> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_provider_onboarding_sessions_v1')
    .select('id,status,expires_at')
    .eq('id', input.sessionId)
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .maybeSingle();
  if (error || !data) return false;
  if (data.status !== 'PENDING') return false;
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    await db
      .from('m55_r8_provider_onboarding_sessions_v1')
      .update({ status: 'EXPIRED' })
      .eq('id', input.sessionId);
    return false;
  }
  return true;
}

export async function markOnboardingSessionCompletedV1(input: {
  creatorEconomicIdentityId: string;
  sessionId: string;
}): Promise<void> {
  const db = getSupabaseAdmin() as any;
  await db
    .from('m55_r8_provider_onboarding_sessions_v1')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', input.sessionId)
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .eq('status', 'PENDING');
}

export async function completeOnboardingSessionIfOwnedV1(input: {
  creatorEconomicIdentityId: string;
  sessionId: string;
}): Promise<boolean> {
  const ok = await verifyOnboardingSessionOwnedAndPendingV1(input);
  if (!ok) return false;
  await markOnboardingSessionCompletedV1(input);
  return true;
}
