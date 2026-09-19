import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { M55_ATTRIBUTION_POLICY_CONTRACT_VERSION } from '../contracts/m55AttributionPolicyContract';
import { M55_CREATOR_TRACKING_CONTRACT_VERSION } from '../contracts/m55CreatorTrackingContract';
import {
  deriveAttributionBuyerSubjectLookupDigestV1,
  isPersistableQualifiedActionKind,
  isSha256LowerHex64,
  M55_R5_ATTRIBUTION_BUYER_SUBJECT_LOOKUP_PURPOSE_V1,
  M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION,
  M55_R5_TOUCH_SCHEMA_MAX_SAFE_INTEGER_MS,
  M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME,
  M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS,
  M55_R5_TOUCH_SCHEMA_TOKEN_VERSION,
  M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION,
  parseQualifiedTouchAtMsForSchema,
  parseTouchEventKeyBytesForSchema,
  touchEventKeyHexToByteaBuffer,
} from './r5TouchSchemaContract';

const MIGRATION = join(
  process.cwd(),
  'supabase/migrations',
  M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME,
);

function readMigration(): string {
  return readFileSync(MIGRATION, 'utf8');
}

describe('r5TouchSchemaContract — imported version authority', () => {
  it('re-exports frozen contract versions as v1', () => {
    assert.equal(M55_CREATOR_TRACKING_CONTRACT_VERSION, 'v1');
    assert.equal(M55_ATTRIBUTION_POLICY_CONTRACT_VERSION, 'v1');
    assert.equal(M55_R5_TOUCH_SCHEMA_TOKEN_VERSION, 'v1');
    assert.equal(M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION, 'v1');
    assert.equal(M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION, 'v1');
  });
});

describe('r5TouchSchemaContract — digest and touch key helpers', () => {
  const validDigest = 'a'.repeat(64);
  const validTouchKey = '0123456789abcdef0123456789abcdef';

  it('accepts SHA-256 lowercase 64-hex digests', () => {
    assert.equal(isSha256LowerHex64(validDigest), true);
  });

  it('rejects uppercase digest', () => {
    assert.equal(isSha256LowerHex64('A'.repeat(64)), false);
  });

  it('rejects wrong-length digest', () => {
    assert.equal(isSha256LowerHex64('a'.repeat(63)), false);
  });

  it('rejects non-hex digest', () => {
    assert.equal(isSha256LowerHex64(`${'a'.repeat(63)}g`), false);
  });

  it('converts valid 32-lowercase-hex touch key to 16 bytes', () => {
    const parsed = parseTouchEventKeyBytesForSchema(validTouchKey);
    assert.equal(parsed.ok, true);
    const buffer = touchEventKeyHexToByteaBuffer(validTouchKey);
    assert.equal(buffer.length, 16);
  });

  it('rejects uppercase touch key', () => {
    assert.equal(parseTouchEventKeyBytesForSchema(validTouchKey.toUpperCase()).ok, false);
  });

  it('rejects wrong-length touch key', () => {
    assert.equal(parseTouchEventKeyBytesForSchema('abc').ok, false);
  });

  it('rejects non-hex touch key', () => {
    assert.equal(parseTouchEventKeyBytesForSchema(`${validTouchKey.slice(0, 31)}g`).ok, false);
  });

  it('accepts only the two persistable qualified actions', () => {
    for (const action of M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS) {
      assert.equal(isPersistableQualifiedActionKind(action), true);
    }
    assert.equal(isPersistableQualifiedActionKind('UNAUTHENTICATED_LANDING_ALONE'), false);
    assert.equal(isPersistableQualifiedActionKind('OLD_COOKIE_REREAD_ALONE'), false);
  });

  it('enforces MAX_SAFE_INTEGER timestamp bound via schema helper', () => {
    assert.equal(parseQualifiedTouchAtMsForSchema(M55_R5_TOUCH_SCHEMA_MAX_SAFE_INTEGER_MS).ok, true);
    assert.equal(
      parseQualifiedTouchAtMsForSchema(M55_R5_TOUCH_SCHEMA_MAX_SAFE_INTEGER_MS + 1).ok,
      false,
    );
    assert.equal(parseQualifiedTouchAtMsForSchema(-1).ok, false);
  });
});

describe('r5TouchSchemaContract — buyer-subject lookup digest', () => {
  const knownClerkUserId = 'user_test_123';
  const knownDigest = '00f2252fa838a293c6e52ca04c026870a71ded81ad2925220fc14e3e6bdfb822';

  it('pins the frozen lookup purpose string', () => {
    assert.equal(
      M55_R5_ATTRIBUTION_BUYER_SUBJECT_LOOKUP_PURPOSE_V1,
      'm55.r5.attribution.buyer_subject.clerk_lookup.v1',
    );
  });

  it('matches the independent known vector for user_test_123', () => {
    assert.equal(deriveAttributionBuyerSubjectLookupDigestV1(knownClerkUserId), knownDigest);
  });

  it('rejects empty Clerk userId', () => {
    assert.throws(() => deriveAttributionBuyerSubjectLookupDigestV1(''), /INVALID_CLERK_USER_ID/);
  });

  it('rejects leading whitespace without trimming', () => {
    assert.throws(
      () => deriveAttributionBuyerSubjectLookupDigestV1(' user_test_123'),
      /INVALID_CLERK_USER_ID/,
    );
  });

  it('rejects trailing whitespace without trimming', () => {
    assert.throws(
      () => deriveAttributionBuyerSubjectLookupDigestV1('user_test_123 '),
      /INVALID_CLERK_USER_ID/,
    );
  });

  it('rejects length 129', () => {
    assert.throws(
      () => deriveAttributionBuyerSubjectLookupDigestV1('a'.repeat(129)),
      /INVALID_CLERK_USER_ID/,
    );
  });

  it('accepts length 128 and returns 64 lowercase hex', () => {
    const digest = deriveAttributionBuyerSubjectLookupDigestV1('b'.repeat(128));
    assert.equal(isSha256LowerHex64(digest), true);
    assert.equal(digest, digest.toLowerCase());
    assert.equal(digest.length, 64);
  });

  it('is deterministic for repeated valid input', () => {
    const first = deriveAttributionBuyerSubjectLookupDigestV1(knownClerkUserId);
    const second = deriveAttributionBuyerSubjectLookupDigestV1(knownClerkUserId);
    assert.equal(first, second);
    assert.equal(first, knownDigest);
  });
});

describe('r5TouchSchemaContract — migration SQL contract', () => {
  const sql = readMigration();

  it('contains MAX_SAFE_INTEGER bound', () => {
    assert.match(sql, /9007199254740991/);
  });

  it('contains composite FK name and columns', () => {
    assert.match(sql, /constraint m55_r5_attribution_touch_link_creator_fk/i);
    assert.match(sql, /foreign key \(creator_referral_link_id, creator_economic_identity_id\)/i);
    assert.match(sql, /references public\.m55_creator_referral_links \(id, creator_economic_identity_id\)/i);
  });

  it('contains tie index keyed by buyer_subject_id then exact bytea order', () => {
    assert.match(
      sql,
      /create index m55_r5_attribution_qualified_touches_buyer_tie_v1\s+on public\.m55_creator_qualified_touches \(\s*buyer_subject_id,\s*qualified_touch_at_ms desc,\s*touch_event_key_bytes asc\s*\)/i,
    );
    assert.doesNotMatch(sql, /buyer_clerk_user_id/);
  });

  it('contains link lifecycle trigger', () => {
    assert.match(sql, /m55_r5_attribution_referral_link_lifecycle_trg/i);
    assert.match(sql, /before update on public\.m55_creator_referral_links/i);
  });

  it('contains touch append-only trigger', () => {
    assert.match(sql, /m55_r5_attribution_qualified_touch_immutable_trg/i);
    assert.match(sql, /QUALIFIED_TOUCH_APPEND_ONLY/);
  });

  it('contains attached delete guard trigger', () => {
    assert.match(sql, /m55_r5_attribution_referral_link_delete_guard_trg/i);
    assert.match(sql, /before delete on public\.m55_creator_referral_links/i);
    assert.match(sql, /REFERRAL_LINK_HAS_TOUCH_HISTORY/);
  });

  it('enables RLS without FORCE RLS', () => {
    assert.match(sql, /enable row level security/i);
    assert.doesNotMatch(sql, /force row level security/i);
  });

  it('revokes client/PUBLIC and grants service_role', () => {
    assert.match(sql, /revoke all on public\.m55_creator_referral_links from public, anon, authenticated/i);
    assert.match(sql, /revoke all on public\.m55_attribution_buyer_subjects from public, anon, authenticated/i);
    assert.match(sql, /revoke all on public\.m55_creator_qualified_touches from public, anon, authenticated/i);
    assert.match(sql, /grant all on public\.m55_creator_referral_links to service_role/i);
    assert.match(sql, /grant all on public\.m55_attribution_buyer_subjects to service_role/i);
    assert.match(sql, /grant all on public\.m55_creator_qualified_touches to service_role/i);
  });

  it('contains v1 fail-closed version CHECKs', () => {
    assert.match(sql, /token_version = 'v1'/i);
    assert.match(sql, /tracking_contract_version = 'v1'/i);
    assert.match(sql, /attribution_policy_version = 'v1'/i);
  });

  it('contains serialized touch admission FOR UPDATE OF l', () => {
    assert.match(sql, /for update of l/i);
    assert.match(sql, /LINK_NOT_ACTIVE_FOR_NEW_TOUCH/);
  });

  it('defines buyer-subject registry without raw Clerk ID', () => {
    assert.match(sql, /create table public\.m55_attribution_buyer_subjects/i);
    assert.match(sql, /buyer_subject_id uuid not null references public\.m55_attribution_buyer_subjects\(id\) on delete restrict/i);
    assert.doesNotMatch(sql, /buyer_clerk_user_id/);
    assert.doesNotMatch(sql, /clerk_user_id/);
  });

  it('requires 64 lowercase hex digest and ACTIVE/DELETED state CHECK', () => {
    assert.match(sql, /clerk_subject_lookup_digest text not null check \(clerk_subject_lookup_digest ~ '\^\[0-9a-f\]\{64\}\$'\)/i);
    assert.match(
      sql,
      /\(identity_state = 'ACTIVE' and deleted_at is null\)\s+or \(\s*identity_state = 'DELETED'\s+and deleted_at is not null\s+and deleted_at >= created_at\s*\)/i,
    );
  });

  it('uses a global digest UNIQUE covering ACTIVE and DELETED', () => {
    assert.match(
      sql,
      /create unique index m55_r5_attribution_buyer_subjects_clerk_subject_lookup_digest_uq\s+on public\.m55_attribution_buyer_subjects \(clerk_subject_lookup_digest\);/i,
    );
    assert.doesNotMatch(
      sql,
      /m55_r5_attribution_buyer_subjects_clerk_subject_lookup_digest_uq[\s\S]*where identity_state/i,
    );
  });

  it('contains buyer-subject insert, lifecycle, and delete-guard triggers', () => {
    assert.match(sql, /m55_r5_attribution_buyer_subject_insert_validate_trg/i);
    assert.match(sql, /before insert on public\.m55_attribution_buyer_subjects/i);
    assert.match(sql, /BUYER_SUBJECT_INSERT_MUST_BE_ACTIVE/);
    assert.match(sql, /m55_r5_attribution_buyer_subject_lifecycle_trg/i);
    assert.match(sql, /before update on public\.m55_attribution_buyer_subjects/i);
    assert.match(sql, /new\.deleted_at := clock_timestamp\(\);/i);
    assert.match(sql, /BUYER_SUBJECT_REACTIVATION_FORBIDDEN/);
    assert.match(sql, /BUYER_SUBJECT_DELETED_AT_IMMUTABLE/);
    assert.match(sql, /m55_r5_attribution_buyer_subject_delete_guard_trg/i);
    assert.match(sql, /before delete on public\.m55_attribution_buyer_subjects/i);
    assert.match(sql, /BUYER_SUBJECT_DELETE_FORBIDDEN/);
  });

  it('enables RLS on all three S1 tables and grants buyer-subject trigger execute', () => {
    assert.match(sql, /alter table public\.m55_creator_referral_links enable row level security/i);
    assert.match(sql, /alter table public\.m55_attribution_buyer_subjects enable row level security/i);
    assert.match(sql, /alter table public\.m55_creator_qualified_touches enable row level security/i);
    assert.match(
      sql,
      /revoke all on function public\.m55_r5_attribution_buyer_subject_insert_validate_v1\(\) from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /revoke all on function public\.m55_r5_attribution_buyer_subject_lifecycle_v1\(\) from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /revoke all on function public\.m55_r5_attribution_buyer_subject_delete_guard_v1\(\) from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.m55_r5_attribution_buyer_subject_insert_validate_v1\(\) to service_role/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.m55_r5_attribution_buyer_subject_lifecycle_v1\(\) to service_role/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.m55_r5_attribution_buyer_subject_delete_guard_v1\(\) to service_role/i,
    );
  });

  it('does not introduce SQL digest derivation or pgcrypto', () => {
    assert.doesNotMatch(sql, /pgcrypto/i);
    assert.doesNotMatch(sql, /digest\s*\(/i);
  });
});
