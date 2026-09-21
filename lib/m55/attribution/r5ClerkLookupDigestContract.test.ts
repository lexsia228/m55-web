import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { deriveAttributionBuyerSubjectLookupDigestV1 } from './r5TouchSchemaContract';
import { M55_R5_ATTRIBUTION_BUYER_SUBJECT_LOOKUP_PURPOSE_V1 } from './r5TouchSchemaContract';
import {
  M55_R5_CLERK_LOOKUP_DIGEST_SQL_NAME,
  M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME,
} from './r5PurchaseAttemptLockContract';

const MIGRATION = join(
  process.cwd(),
  'supabase/migrations',
  M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME,
);

const FIXED_CLERK_VECTORS = [
  'user_2abcClerkVector0001',
  'user_2abcClerkVector0002',
  'clerk_user_fixed_vector_3',
] as const;

describe('r5ClerkLookupDigestContract', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('mirrors the TS purpose namespace, NUL separator, UTF-8 encoding, and sha256', () => {
    assert.equal(
      M55_R5_ATTRIBUTION_BUYER_SUBJECT_LOOKUP_PURPOSE_V1,
      'm55.r5.attribution.buyer_subject.clerk_lookup.v1',
    );
    assert.match(sql, new RegExp(`create function public\\.${M55_R5_CLERK_LOOKUP_DIGEST_SQL_NAME}\\(p_clerk_user_id text\\)`));
    assert.match(
      sql,
      /convert_to\(\s*'m55\.r5\.attribution\.buyer_subject\.clerk_lookup\.v1',\s*'UTF8'\s*\)/,
    );
    assert.match(sql, /decode\('00', 'hex'\)/);
    assert.match(sql, /convert_to\(p_clerk_user_id, 'UTF8'\)/);
    assert.match(sql, /extensions\.digest\(/);
    assert.match(sql, /'sha256'/);
    assert.match(sql, /encode\(\s*extensions\.digest\([\s\S]*?,\s*'sha256'\s*\)\s*,\s*'hex'\s*\)/);
    assert.doesNotMatch(sql, /E'\\000'/);
    assert.doesNotMatch(sql, /md5/i);
    assert.doesNotMatch(sql, /digest\([^)]*'sha1'/);
  });

  it('produces stable TS vectors for valid Clerk ids', () => {
    const expected = {
      user_2abcClerkVector0001:
        '2822115c783d181a9e0751894260541ec8a7ccce6c0d6cec332771f6294c1012',
      user_2abcClerkVector0002:
        '41255f09c559211577b4ed2be5fd9d61fb6b275df1e7ebce143803caf3fdcd6e',
      clerk_user_fixed_vector_3:
        '9691713791f2b4d97d80033de635785a40f1e5c5c9bf77e604102c9f8f9ce5c2',
    } as const;
    for (const clerkUserId of FIXED_CLERK_VECTORS) {
      const digest = deriveAttributionBuyerSubjectLookupDigestV1(clerkUserId);
      assert.equal(digest, expected[clerkUserId]);
      assert.equal(deriveAttributionBuyerSubjectLookupDigestV1(clerkUserId), digest);
    }
  });
});
