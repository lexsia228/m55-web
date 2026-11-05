import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateIsolatedSupabaseAlignmentStructuralV1,
  evaluateIsolatedSupabaseAlignmentLiveV1,
  extractSupabaseProjectRefFromHttpUrlV1,
  extractSupabaseProjectRefFromServiceRoleJwtV1,
  classifySupabaseServiceRoleKeyFormatV1,
  buildSupabaseServiceRoleRestProbeHeadersV1,
  loadM55R8IsolatedAlignmentEnvV1,
  applyIsolatedStripeSmokeEnvToProcessV1,
  listIsolatedStripeSmokeCredentialsFileMissingV1,
  listIsolatedStripeSmokeShellBlockedChecklistV1,
  parsePostgresSupabaseConnectionV1,
  parseSupabaseAppHttpUrlV1,
  probeSupabaseServiceRoleReadOnlyV1,
  probeIsolatedPostgresReadOnlyV1,
} from './r8IsolatedSupabaseAlignment.ts';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
    if (result.ok) {
      assert.equal(result.serviceRoleKeyFormat, 'supabase_jwt');
      assert.equal(result.serviceRoleJwtRefMatched, true);
    }
  });

  it('accepts sb_secret service role keys without JWT ref parsing at structural stage', () => {
    const ref = 'aaaaaaaaaaaaaaaa';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_example_redacted',
      M55_R8_ISOLATED_DATABASE_URL: `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.serviceRoleKeyFormat, 'sb_secret');
      assert.equal(result.serviceRoleJwtRefMatched, false);
    }
    assert.equal(classifySupabaseServiceRoleKeyFormatV1('sb_secret_x'), 'sb_secret');
    assert.equal(extractSupabaseProjectRefFromServiceRoleJwtV1('sb_secret_x'), null);
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

  it('probe rejects 401 and 404 without logging secrets', async () => {
    const probe401 = await probeSupabaseServiceRoleReadOnlyV1({
      supabaseHttpUrl: 'https://abcdefghijklmnopqrst.supabase.co',
      serviceRoleKey: fakeServiceRoleJwt('abcdefghijklmnopqrst'),
      fetchImpl: async () => new Response('', { status: 401 }),
    });
    assert.equal(probe401.ok, false);
    if (!probe401.ok) assert.equal(probe401.reason, 'SERVICE_ROLE_PROBE_FAILED');

    const probe404 = await probeSupabaseServiceRoleReadOnlyV1({
      supabaseHttpUrl: 'https://abcdefghijklmnopqrst.supabase.co',
      serviceRoleKey: fakeServiceRoleJwt('abcdefghijklmnopqrst'),
      fetchImpl: async () => new Response('', { status: 404 }),
    });
    assert.equal(probe404.ok, false);
    if (!probe404.ok) assert.equal(probe404.reason, 'SERVICE_ROLE_PROBE_FAILED');
  });

  it('REST probe headers: sb_secret uses apikey only; JWT adds Bearer', async () => {
    const secretHeaders = buildSupabaseServiceRoleRestProbeHeadersV1('sb_secret_example');
    assert.equal(secretHeaders.apikey, 'sb_secret_example');
    assert.equal(secretHeaders.Authorization, undefined);

    const jwtHeaders = buildSupabaseServiceRoleRestProbeHeadersV1(fakeServiceRoleJwt('aaaaaaaaaaaaaaaa'));
    assert.ok(jwtHeaders.Authorization?.startsWith('Bearer '));

    let seen: Record<string, string> = {};
    await probeSupabaseServiceRoleReadOnlyV1({
      supabaseHttpUrl: 'https://aaaaaaaaaaaaaaaa.supabase.co',
      serviceRoleKey: 'sb_secret_no_bearer',
      fetchImpl: async (_url, init) => {
        seen = (init?.headers ?? {}) as Record<string, string>;
        return new Response('', { status: 200 });
      },
    });
    assert.equal(seen.Authorization, undefined);
    assert.equal(seen.apikey, 'sb_secret_no_bearer');
  });

  it('isolated alignment env loader reads dedicated file only', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm55-r8-env-'));
    const ref = 'dddddddddddddddd';
    const envBody = [
      `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
      'SUPABASE_SERVICE_ROLE_KEY=sb_secret_from_file',
      `M55_R8_ISOLATED_DATABASE_URL=postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      `M55_R8_ISOLATED_SUPABASE_PROJECT_REF=${ref}`,
    ].join('\n');
    writeFileSync(join(dir, '.env.m55-r8-isolated.local'), envBody, 'utf8');

    const loaded = loadM55R8IsolatedAlignmentEnvV1(dir, {});
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.env.NEXT_PUBLIC_SUPABASE_URL, `https://${ref}.supabase.co`);
    assert.equal(loaded.env.SUPABASE_SERVICE_ROLE_KEY, 'sb_secret_from_file');
    assert.equal(loaded.envFile, '.env.m55-r8-isolated.local');

    const missing = loadM55R8IsolatedAlignmentEnvV1(dir, {
      M55_R8_ISOLATED_ENV_FILE: '.env.missing-isolated.local',
    });
    assert.equal(missing.ok, false);
  });

  it('live alignment requires REST and Postgres READ probes (sb_secret path)', async () => {
    const ref = 'cccccccccccccccc';
    const env = {
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_probe_only',
      M55_R8_ISOLATED_DATABASE_URL: `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    };
    const live = await evaluateIsolatedSupabaseAlignmentLiveV1(env, {
      fetchImpl: async () => new Response('', { status: 200 }),
      postgresQueryImpl: async () => ({ rows: [{ present: true }] }),
    });
    assert.equal(live.ok, true);
    if (live.ok) assert.equal(live.serviceRoleKeyFormat, 'sb_secret');
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

  it('accepts local Supabase full stack when API :54321, Postgres :54322, and Human ref match JWT', () => {
    const ref = 'localstackproject1';
    const localApi = parseSupabaseAppHttpUrlV1('http://127.0.0.1:54321');
    assert.equal(localApi.kind, 'local_stack');
    const localPg = parsePostgresSupabaseConnectionV1(
      'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    );
    assert.equal(localPg.connectionKind, 'supabase_local_stack');

    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwt(ref),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.postgresConnectionKind, 'supabase_local_stack');
      assert.equal(result.supabaseProjectRefSuffix, ref.slice(-6));
    }
  });

  it('fails closed when local API is declared but Postgres is not local stack port', () => {
    const ref = 'localstackproject1';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwt(ref),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'ISOLATED_DATABASE_PROJECT_MISMATCH');
  });

  it('Postgres READ probe requires R8 provider table on local stack (not SELECT 1 only)', async () => {
    const probe = await probeIsolatedPostgresReadOnlyV1({
      connectionUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      connectionKind: 'supabase_local_stack',
      postgresQueryImpl: async () => ({ rows: [{ present: false }] }),
    });
    assert.equal(probe.ok, false);
    if (!probe.ok) assert.equal(probe.reason, 'POSTGRES_IDENTITY_NOT_VERIFIED');
  });

  it('isolated env loader passes optional Stripe smoke keys from the same file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm55-r8-env-smoke-'));
    const ref = 'eeeeeeeeeeeeeeee';
    const envBody = [
      `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
      'SUPABASE_SERVICE_ROLE_KEY=sb_secret_from_file',
      `M55_R8_ISOLATED_DATABASE_URL=postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      `M55_R8_ISOLATED_SUPABASE_PROJECT_REF=${ref}`,
      'M55_STRIPE_CONNECT_TESTMODE_ENABLED=true',
      'M55_PUBLIC_ORIGIN=http://localhost:3000',
    ].join('\n');
    writeFileSync(join(dir, '.env.m55-r8-isolated.local'), envBody, 'utf8');

    const loaded = loadM55R8IsolatedAlignmentEnvV1(dir, {});
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.env.M55_STRIPE_CONNECT_TESTMODE_ENABLED, 'true');
    assert.equal(loaded.env.M55_PUBLIC_ORIGIN, 'http://localhost:3000');
  });

  it('isolated env loader does not force development runtime when file omits NODE_ENV', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm55-r8-env-node-'));
    const ref = 'ffffffffffffffff';
    writeFileSync(
      join(dir, '.env.m55-r8-isolated.local'),
      [
        `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
        'SUPABASE_SERVICE_ROLE_KEY=sb_secret_from_file',
        `M55_R8_ISOLATED_DATABASE_URL=postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
        `M55_R8_ISOLATED_SUPABASE_PROJECT_REF=${ref}`,
      ].join('\n'),
      'utf8',
    );
    const loaded = loadM55R8IsolatedAlignmentEnvV1(dir, {});
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.env.NODE_ENV, undefined);
    assert.equal(loaded.env.VERCEL_ENV, undefined);
  });

  it('stripe smoke shell gate blocks Production before isolated file load', () => {
    const blocked = listIsolatedStripeSmokeShellBlockedChecklistV1({
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
    });
    assert.ok(blocked.length > 0);
    assert.match(blocked.join(' '), /Production runtime/);
  });

  it('stripe smoke requires credentials in isolated file (no shell fallback)', () => {
    const missing = listIsolatedStripeSmokeCredentialsFileMissingV1(
      {},
      '.env.m55-r8-isolated.local',
    );
    assert.ok(missing.some((line) => line.includes('shell fallback prohibited')));
  });

  it('applyIsolatedStripeSmokeEnvToProcessV1 does not assign NODE_ENV or VERCEL_ENV', () => {
    const priorNode = process.env.NODE_ENV;
    const priorVercel = process.env.VERCEL_ENV;
    try {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';
      applyIsolatedStripeSmokeEnvToProcessV1({
        NODE_ENV: 'development',
        VERCEL_ENV: 'development',
        M55_PUBLIC_ORIGIN: 'http://localhost:3000',
      });
      assert.equal(process.env.NODE_ENV, 'production');
      assert.equal(process.env.VERCEL_ENV, 'production');
    } finally {
      if (priorNode !== undefined) process.env.NODE_ENV = priorNode;
      else delete process.env.NODE_ENV;
      if (priorVercel !== undefined) process.env.VERCEL_ENV = priorVercel;
      else delete process.env.VERCEL_ENV;
    }
  });
});
