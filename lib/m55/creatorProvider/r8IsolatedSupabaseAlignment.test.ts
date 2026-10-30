import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateIsolatedSupabaseAlignmentStructuralV1,
  extractSupabaseProjectRefFromHttpUrlV1,
  extractSupabaseProjectRefFromServiceRoleJwtV1,
  parsePostgresSupabaseConnectionV1,
  probeSupabaseServiceRoleReadOnlyV1,
} from './r8IsolatedSupabaseAlignment.ts';

function fakeServiceRoleJwt(projectRef: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ ref: projectRef, role: 'service_role' })).toString(
    'base64url',
  );
  return `${header}.${payload}.testsignature`;
}

describe('R8 isolated Supabase alignment', () => {
  it('extracts matching project refs from app, direct postgres, and pooler username', () => {
    const ref = 'abcdefghijklmnopqrst';
    assert.equal(
      extractSupabaseProjectRefFromHttpUrlV1(`https://${ref}.supabase.co`),
      ref,
    );
    const direct = parsePostgresSupabaseConnectionV1(
      `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
    );
    assert.equal(direct.projectRef, ref);
    assert.equal(direct.connectionKind, 'supabase_direct');

    const pooler = parsePostgresSupabaseConnectionV1(
      `postgresql://postgres.${ref}:x@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
    );
    assert.equal(pooler.projectRef, ref);
    assert.equal(pooler.connectionKind, 'supabase_pooler_session');
  });

  it('requires Human-confirmed project ref and matching service-role JWT ref', () => {
    const ref = 'aaaaaaaaaaaaaaaa';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwt(ref),
      M55_R8_ISOLATED_DATABASE_URL: `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, true);
  });

  it('fails closed when service role JWT ref mismatches app URL', () => {
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'https://aaaaaaaaaaaaaaaa.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwt('bbbbbbbbbbbbbbbb'),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:x@db.aaaaaaaaaaaaaaaa.supabase.co:5432/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaa',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'SERVICE_ROLE_JWT_REF_MISMATCH');
  });

  it('fails closed when pooler username ref mismatches Human ref', () => {
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'https://aaaaaaaaaaaaaaaa.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwt('aaaaaaaaaaaaaaaa'),
      M55_R8_ISOLATED_DATABASE_URL:
        'postgresql://postgres.bbbbbbbbbbbbbbbb:x@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaa',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'ISOLATED_DATABASE_PROJECT_MISMATCH');
  });

  it('probe rejects 401 without logging secrets', async () => {
    const probe = await probeSupabaseServiceRoleReadOnlyV1({
      supabaseHttpUrl: 'https://abcdefghijklmnopqrst.supabase.co',
      serviceRoleKey: fakeServiceRoleJwt('abcdefghijklmnopqrst'),
      fetchImpl: async () => new Response('', { status: 401 }),
    });
    assert.equal(probe.ok, false);
    if (!probe.ok) assert.equal(probe.reason, 'SERVICE_ROLE_PROBE_FAILED');
  });

  it('blocks production runtime', () => {
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'production',
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwt('abcdefghijklmnopqrst'),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:x@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'PRODUCTION_RUNTIME_BLOCKED');
  });
});
