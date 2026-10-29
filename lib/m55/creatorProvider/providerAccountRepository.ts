import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  type R8ProviderAccountSnapshotV1,
  type R8StripeLinkStateV1,
  isProviderPayoutReadinessGreenV1,
  redactProviderSnapshotForStorage,
} from './contract';

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

export async function appendProviderOnboardingEventV1(input: {
  creatorEconomicIdentityId: string;
  eventType: string;
  idempotencyKey: string;
  payloadRedacted?: Record<string, unknown>;
}): Promise<void> {
  const db = getSupabaseAdmin() as any;
  const { error } = await db.from('m55_r8_provider_onboarding_events_v1').insert({
    creator_economic_identity_id: input.creatorEconomicIdentityId,
    event_type: input.eventType,
    idempotency_key: input.idempotencyKey,
    payload_redacted: input.payloadRedacted ?? {},
  });
  if (error && !String(error.message ?? '').includes('duplicate')) {
    throw new Error('PROVIDER_EVENT_APPEND_FAILED');
  }
}

export async function upsertProviderAccountStubV1(input: {
  creatorEconomicIdentityId: string;
  createIdempotencyKey: string;
  stripeAccountId: string;
}): Promise<ProviderAccountRowV1> {
  const db = getSupabaseAdmin() as any;
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .upsert(
      {
        creator_economic_identity_id: input.creatorEconomicIdentityId,
        stripe_account_id: input.stripeAccountId,
        link_state: 'ACCOUNT_STUB',
        create_idempotency_key: input.createIdempotencyKey,
        updated_at: now,
      },
      { onConflict: 'creator_economic_identity_id' },
    )
    .select(SELECT_FIELDS)
    .single();
  if (error || !data) throw new Error('PROVIDER_ACCOUNT_UNAVAILABLE');
  return mapRow(data as DbRow);
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
  const green = isProviderPayoutReadinessGreenV1('ONBOARDING_LINK_ISSUED', redacted);
  const linkState: R8StripeLinkStateV1 = green
    ? 'PAYOUTS_CAPABILITY_ACTIVE'
    : redacted.detailsSubmitted
      ? 'PROVIDER_DETAILS_SUBMITTED'
      : 'ONBOARDING_LINK_ISSUED';

  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .update({
      stripe_account_id: input.stripeAccountId,
      link_state: linkState,
      last_provider_snapshot: redacted,
      last_synced_at: now,
      last_error_code: null,
      updated_at: now,
    })
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
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
  if (existing.data?.id && existing.data.status === 'PENDING') {
    return { sessionId: existing.data.id as string, reused: true };
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

export async function completeOnboardingSessionIfOwnedV1(input: {
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
  await db
    .from('m55_r8_provider_onboarding_sessions_v1')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', input.sessionId);
  return true;
}
