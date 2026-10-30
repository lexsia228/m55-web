import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateIsolatedSupabaseAlignmentV1,
  extractSupabaseProjectRefFromHttpUrlV1,
  extractSupabaseProjectRefFromPostgresUrlV1,
} from './r8IsolatedSupabaseAlignment.ts';

describe('R8 isolated Supabase alignment', () => {
  it('extracts matching project refs from app and direct postgres URLs', () => {
    const ref = 'abcdefghijklmnopqrst';
    assert.equal(
      extractSupabaseProjectRefFromHttpUrlV1(`https://${ref}.supabase.co`),
      ref,
    );
    assert.equal(
      extractSupabaseProjectRefFromPostgresUrlV1(`postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`),
      ref,
    );
  });

  it('fails closed when isolated postgres project ref mismatches app URL', () => {
    const result = evaluateIsolatedSupabaseAlignmentV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'https://aaaaaaaaaaaaaaaa.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:x@db.bbbbbbbbbbbbbbbb.supabase.co:5432/postgres',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'ISOLATED_DATABASE_PROJECT_MISMATCH');
  });

  it('allows loopback postgres when declared project ref matches app', () => {
    const ref = 'cccccccccccccccc';
    const result = evaluateIsolatedSupabaseAlignmentV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:x@127.0.0.1:54329/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, true);
  });

  it('blocks production runtime', () => {
    const result = evaluateIsolatedSupabaseAlignmentV1({
      VERCEL_ENV: 'production',
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'x',
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:x@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'PRODUCTION_RUNTIME_BLOCKED');
  });
});
