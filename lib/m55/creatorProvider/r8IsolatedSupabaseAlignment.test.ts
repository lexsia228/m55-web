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
  parseSupabaseServiceRoleJwtV1,
  probeSupabaseServiceRoleReadOnlyV1,
  probeIsolatedPostgresReadOnlyV1,
  evaluateIsolatedSupabaseLocalStackVerificationLiveV1,
  probeLocalSupabaseStackTopologyV1,
  probeLocalStackServiceRoleAuthorizationV1,
  probeLocalStackApiReachabilityV1,
  probeLocalStackPostgresReachabilityV1,
  probeLocalStackDockerHostBindingV1,
  probeLocalStackDockerNetworkIdentityV1,
  parseLocalStackContainerStackProjectIdV1,
  M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1,
  M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1,
  M55_R8_LOCAL_STACK_AUTH_ADMIN_USERS_PROBE_PATH_V1,
  M55_R8_LOCAL_STACK_NON_SERVICE_ROLE_PROBE_KEY_V1,
  type LocalStackDockerBindingEvidenceV1,
  type LocalStackDockerHostPortBindingV1,
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

function fakeServiceRoleJwtWithoutRef(role = 'service_role'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64url');
  return `${header}.${payload}.testsignature`;
}

function fakeServiceRoleJwtWithRawRef(ref: unknown, role = 'service_role'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ ref, role })).toString('base64url');
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
      assert.equal(result.humanProjectRefConfirmed, true);
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
      assert.equal(result.humanProjectRefConfirmed, true);
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
    if (live.ok) {
      assert.equal(live.serviceRoleKeyFormat, 'sb_secret');
      assert.equal(live.humanProjectRefConfirmed, true);
    }
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
      assert.equal(result.serviceRoleJwtRefMatched, true);
      assert.equal(result.localStackServiceRoleJwtRefAbsent, undefined);
      assert.equal(result.humanProjectRefConfirmed, true);
    }
  });

  it('accepts local_stack service_role JWT without ref claim (structural only; live REST required)', () => {
    const ref = 'localstackproject1';
    const jwt = fakeServiceRoleJwtWithoutRef('service_role');
    const parsed = parseSupabaseServiceRoleJwtV1(jwt);
    assert.equal(parsed?.refClaimAbsent, true);
    assert.equal(parsed?.role, 'service_role');

    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: jwt,
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.serviceRoleJwtRefMatched, false);
      assert.equal(result.localStackServiceRoleJwtRefAbsent, true);
      assert.equal(result.humanProjectRefConfirmed, false);
    }
  });

  it('rejects hosted JWT ref with uppercase letters (no casefold)', () => {
    const ref = 'aaaaaaaaaaaaaaaa';
    const upper = ref.toUpperCase();
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithRawRef(upper),
      M55_R8_ISOLATED_DATABASE_URL: `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'SERVICE_ROLE_JWT_REF_UNRESOLVED');
  });

  it('rejects hosted JWT ref with surrounding whitespace (no trim)', () => {
    const ref = 'aaaaaaaaaaaaaaaa';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithRawRef(`  ${ref}  `),
      M55_R8_ISOLATED_DATABASE_URL: `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'SERVICE_ROLE_JWT_REF_UNRESOLVED');
  });

  it('treats empty JWT ref claim as invalid, not absent', () => {
    const parsed = parseSupabaseServiceRoleJwtV1(fakeServiceRoleJwtWithRawRef(''));
    assert.equal(parsed?.refClaimAbsent, false);
    assert.equal(parsed?.ref, null);

    const ref = 'localstackproject1';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithRawRef(''),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'SERVICE_ROLE_JWT_REF_UNRESOLVED');
  });

  it('fails closed when hosted JWT omits ref claim', () => {
    const ref = 'aaaaaaaaaaaaaaaa';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithoutRef('service_role'),
      M55_R8_ISOLATED_DATABASE_URL: `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'SERVICE_ROLE_JWT_REF_UNRESOLVED');
  });

  it('fails closed when local_stack JWT without ref is not service_role', () => {
    const ref = 'localstackproject1';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithoutRef('anon'),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'SERVICE_ROLE_JWT_REF_UNRESOLVED');
  });

  it('rejects malformed service_role JWT at structural stage', () => {
    const ref = 'localstackproject1';
    const result = evaluateIsolatedSupabaseAlignmentStructuralV1({
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJ.not-json.test',
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'SUPABASE_SERVICE_ROLE_KEY_UNRECOGNIZED');
  });

  it('live alignment fails closed when local JWT has no ref — probes prove connectivity only', async () => {
    const ref = 'localstackproject1';
    const env = {
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithoutRef('service_role'),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    };
    const live = await evaluateIsolatedSupabaseAlignmentLiveV1(env, {
      fetchImpl: async (url) => {
        assert.equal(String(url), 'http://127.0.0.1:54321/rest/v1/');
        return new Response('', { status: 200 });
      },
      postgresQueryImpl: async () => ({ rows: [{ present: true }] }),
    });
    assert.equal(live.ok, false);
    if (!live.ok) assert.equal(live.reason, 'HUMAN_PROJECT_REF_NOT_JWT_VERIFIED');
  });

  it('live REST failure fails ref-absent local_stack even when structural passes', async () => {
    const ref = 'localstackproject1';
    const env = {
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithoutRef('service_role'),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
    };
    const live = await evaluateIsolatedSupabaseAlignmentLiveV1(env, {
      fetchImpl: async () => new Response('', { status: 401 }),
      postgresQueryImpl: async () => ({ rows: [{ present: true }] }),
    });
    assert.equal(live.ok, false);
    if (!live.ok) assert.equal(live.reason, 'SERVICE_ROLE_PROBE_FAILED');
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

  const LOCAL_STACK_ID = 'm55_r8_isolated_stack_20261105';
  const LOCAL_STACK_DOCKER_NETWORK = 'm55_r8_isolated_net_20261105';
  const LOCAL_STACK_DOCKER_NETWORK_ID = '6d4f8c0a3f2e1b0958473625141a0b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8';

  type LocalStackVerificationEnvFixtureV1 = {
    VERCEL_ENV: 'development';
    NODE_ENV: 'development';
    NEXT_PUBLIC_SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    M55_R8_ISOLATED_DATABASE_URL: string;
    M55_R8_ISOLATED_SUPABASE_PROJECT_REF: string;
    [M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1]: string;
    [M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1]: string;
  };

  type LocalStackVerificationEnvKeyV1 =
    | typeof M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1
    | typeof M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1;

  function asAlignmentProcessEnvV1(fixture: Record<string, string>): NodeJS.ProcessEnv {
    return fixture as NodeJS.ProcessEnv;
  }

  function buildLocalStackVerificationFixtureV1(
    stackProjectId = LOCAL_STACK_ID,
  ): LocalStackVerificationEnvFixtureV1 {
    return {
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwtWithoutRef('service_role'),
      M55_R8_ISOLATED_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: 'localstackproject1',
      [M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1]: stackProjectId,
      [M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1]: LOCAL_STACK_DOCKER_NETWORK,
    };
  }

  function localStackVerificationEnv(stackProjectId = LOCAL_STACK_ID): NodeJS.ProcessEnv {
    return asAlignmentProcessEnvV1(buildLocalStackVerificationFixtureV1(stackProjectId));
  }

  function localStackVerificationEnvOmitKeyV1(
    key: LocalStackVerificationEnvKeyV1,
    stackProjectId = LOCAL_STACK_ID,
  ): NodeJS.ProcessEnv {
    const { [key]: _omitted, ...rest } = buildLocalStackVerificationFixtureV1(stackProjectId);
    return asAlignmentProcessEnvV1(rest);
  }

  function hostedEnvWithLocalStackDockerKeysV1(ref: string): NodeJS.ProcessEnv {
    const fixture = {
      VERCEL_ENV: 'development',
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleJwt(ref),
      M55_R8_ISOLATED_DATABASE_URL: `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
      M55_R8_ISOLATED_SUPABASE_PROJECT_REF: ref,
      [M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1]: LOCAL_STACK_ID,
      [M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1]: LOCAL_STACK_DOCKER_NETWORK,
    } satisfies Record<string, string>;
    return asAlignmentProcessEnvV1(fixture);
  }

  function isolatedStackDockerEvidence(
    stackProjectId = LOCAL_STACK_ID,
    overrides: Partial<{
      kongHostPort: number;
      kongContainerPort: number;
      dbHostPort: number;
      dbContainerPort: number;
      kongHostIp: string;
      dbHostIp: string;
      kongExtraHostPorts: LocalStackDockerHostPortBindingV1[];
      dbExtraHostPorts: LocalStackDockerHostPortBindingV1[];
      networkName: string;
      networkId: string;
      authNetworkId: string;
      authNetworkName: string;
      kongRunning: boolean;
      emptyNetworkId: boolean;
      extraNetworkOnKong: boolean;
    }> = {},
  ): LocalStackDockerBindingEvidenceV1 {
    const networkName = overrides.networkName ?? LOCAL_STACK_DOCKER_NETWORK;
    const networkId = overrides.emptyNetworkId
      ? ''
      : (overrides.networkId ?? LOCAL_STACK_DOCKER_NETWORK_ID);
    const authNetworkName = overrides.authNetworkName ?? networkName;
    const authNetworkId =
      overrides.authNetworkId ?? (overrides.emptyNetworkId ? '' : networkId);
    const netAttach = (name: string, id: string) => [{ networkName: name, networkId: id }];
    const mkPort = (
      hostPort: number,
      containerPort: number,
      hostIp: string,
      protocol: 'tcp' | 'udp' = 'tcp',
    ): LocalStackDockerHostPortBindingV1 => ({
      hostIp,
      hostPort,
      containerPort,
      protocol,
    });
    const kongPorts: LocalStackDockerHostPortBindingV1[] = [
      mkPort(
        overrides.kongHostPort ?? 54321,
        overrides.kongContainerPort ?? 8000,
        overrides.kongHostIp ?? '127.0.0.1',
      ),
      ...(overrides.kongExtraHostPorts ?? []),
    ];
    const dbPorts: LocalStackDockerHostPortBindingV1[] = [
      mkPort(
        overrides.dbHostPort ?? 54322,
        overrides.dbContainerPort ?? 5432,
        overrides.dbHostIp ?? '127.0.0.1',
      ),
      ...(overrides.dbExtraHostPorts ?? []),
    ];
    const mk = (role: 'kong' | 'db' | 'auth') => ({
      name: `supabase_${role}_${stackProjectId}`,
      stateRunning: role === 'kong' ? (overrides.kongRunning ?? true) : true,
      hostPorts: role === 'kong' ? kongPorts : role === 'db' ? dbPorts : [],
      networks:
        role === 'auth'
          ? netAttach(authNetworkName, authNetworkId)
          : overrides.extraNetworkOnKong && role === 'kong'
            ? [
                ...netAttach(networkName, networkId),
                { networkName: 'supabase_network_default', networkId: 'default-net-id' },
              ]
            : netAttach(networkName, networkId),
    });
    return {
      stackProjectId,
      kong: mk('kong'),
      db: mk('db'),
      auth: mk('auth'),
    };
  }

  function dockerBindingProbe(
    evidence: LocalStackDockerBindingEvidenceV1,
    expectedDockerNetworkName = LOCAL_STACK_DOCKER_NETWORK,
    stackProjectId = LOCAL_STACK_ID,
  ) {
    return probeLocalStackDockerHostBindingV1({
      stackProjectId,
      expectedDockerNetworkName,
      evidence,
    });
  }

  function inspectDockerBindingFactory(evidence: LocalStackDockerBindingEvidenceV1) {
    return async (stackProjectId: string) =>
      stackProjectId === evidence.stackProjectId ? evidence : null;
  }

  function adminUsersProbeFetch(input: {
    unauthenticatedStatus: number;
    serviceRoleStatus: number;
    genericKeyStatus?: number;
    restV1AnonStatus?: number;
    restV1AuthStatus?: number;
  }): typeof fetch {
    return (async (url, init) => {
      const target = String(url);
      if (target.includes('/rest/v1')) {
        const headers = init?.headers;
        let apikey = '';
        if (headers instanceof Headers) apikey = headers.get('apikey') ?? '';
        else if (headers && typeof headers === 'object') {
          apikey = (headers as Record<string, string>).apikey ?? '';
        }
        if (apikey) {
          return new Response('', { status: input.restV1AuthStatus ?? 200 });
        }
        return new Response('', { status: input.restV1AnonStatus ?? 401 });
      }
      if (!target.includes(M55_R8_LOCAL_STACK_AUTH_ADMIN_USERS_PROBE_PATH_V1)) {
        return new Response('', { status: 404 });
      }
      const headers = init?.headers;
      let apikey = '';
      if (headers instanceof Headers) apikey = headers.get('apikey') ?? '';
      else if (headers && typeof headers === 'object') {
        apikey = (headers as Record<string, string>).apikey ?? '';
      }
      if (!apikey) return new Response('', { status: input.unauthenticatedStatus });
      if (apikey === M55_R8_LOCAL_STACK_NON_SERVICE_ROLE_PROBE_KEY_V1) {
        return new Response('', { status: input.genericKeyStatus ?? 401 });
      }
      return new Response('', { status: input.serviceRoleStatus });
    }) as typeof fetch;
  }

  function authAwareFetch(anonStatus: number, authStatus: number): typeof fetch {
    return adminUsersProbeFetch({
      unauthenticatedStatus: anonStatus,
      serviceRoleStatus: authStatus,
      restV1AuthStatus: authStatus,
    });
  }

  it('parseLocalStackContainerStackProjectIdV1 handles underscore stack project_id suffixes', () => {
    const parsed = parseLocalStackContainerStackProjectIdV1(`supabase_db_${LOCAL_STACK_ID}`);
    assert.deepEqual(parsed, { role: 'db', stackProjectId: LOCAL_STACK_ID });
  });

  it('local stack verification passes with Docker binding, API, postgres, and service-role authorization', async () => {
    const docker = isolatedStackDockerEvidence();
    const result = await evaluateIsolatedSupabaseLocalStackVerificationLiveV1(
      localStackVerificationEnv(),
      {
        inspectLocalStackDockerBindingImpl: inspectDockerBindingFactory(docker),
        fetchImpl: authAwareFetch(401, 200),
        postgresQueryImpl: async () => ({ rows: [{ local_stack_reachability: 1 }] }),
      },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.verificationKind, 'LOCAL_STACK_READ_PROBE');
    assert.equal(result.projectRefIdentity, 'UNVERIFIED');
    assert.equal(result.humanProjectRefConfirmed, false);
    assert.equal(result.localStackServiceRoleJwtRefAbsent, true);
    assert.equal(result.checks.stackTopologyVerified, true);
    assert.equal(result.checks.serviceRoleAuthorized, true);
  });

  it('local stack verification fails when Docker topology evidence is missing required roles', () => {
    const probe = probeLocalSupabaseStackTopologyV1({
      stackProjectId: LOCAL_STACK_ID,
      containerNames: [`supabase_db_${LOCAL_STACK_ID}`],
    });
    assert.equal(probe.ok, false);
    if (probe.ok) return;
    assert.equal(probe.reason, 'LOCAL_STACK_TOPOLOGY_UNVERIFIED');
  });

  it('local stack verification fails when API and DB containers bind to different stack project_id values', () => {
    const probe = probeLocalSupabaseStackTopologyV1({
      stackProjectId: LOCAL_STACK_ID,
      containerNames: [
        `supabase_db_${LOCAL_STACK_ID}`,
        `supabase_kong_other_stack_project1`,
        `supabase_auth_${LOCAL_STACK_ID}`,
      ],
    });
    assert.equal(probe.ok, false);
    if (probe.ok) return;
    assert.equal(probe.reason, 'LOCAL_STACK_TOPOLOGY_UNVERIFIED');
  });

  it('fails when container names match but Kong host port binding is wrong', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, { kongHostPort: 54399 });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
    if (!probe.ok) assert.equal(probe.reason, 'LOCAL_STACK_BINDING_MISMATCH');
  });

  it('fails when Kong host 54321 maps to a non-8000 container port', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, { kongContainerPort: 8001 });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
    if (!probe.ok) assert.equal(probe.reason, 'LOCAL_STACK_BINDING_MISMATCH');
  });

  it('fails when Postgres host 54322 maps to a non-5432 container port', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, { dbContainerPort: 5433 });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
    if (!probe.ok) assert.equal(probe.reason, 'LOCAL_STACK_BINDING_MISMATCH');
  });

  it('fails when Postgres host port is not 54322', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, { dbHostPort: 5432 });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
    if (!probe.ok) assert.equal(probe.reason, 'LOCAL_STACK_BINDING_MISMATCH');
  });

  it('rejects 0.0.0.0 Kong publish even when 127.0.0.1 binding also exists', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, {
      kongExtraHostPorts: [
        { hostIp: '0.0.0.0', hostPort: 54321, containerPort: 8000, protocol: 'tcp' },
      ],
    });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
  });

  it('rejects empty HostIp and IPv6 loopback publishes', () => {
    for (const hostIp of ['', '::']) {
      const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, { kongHostIp: hostIp });
      const probe = dockerBindingProbe(evidence);
      assert.equal(probe.ok, false);
    }
  });

  it('rejects non-tcp protocol on Kong API port binding', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, {
      kongExtraHostPorts: [
        { hostIp: '127.0.0.1', hostPort: 54321, containerPort: 8000, protocol: 'udp' },
      ],
    });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
  });

  it('fails when expected Docker network name does not match container attachment', () => {
    const evidence = isolatedStackDockerEvidence();
    const probe = dockerBindingProbe(evidence, 'wrong_network_name');
    assert.equal(probe.ok, false);
  });

  it('fails when network name matches but NetworkID differs across containers', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, {
      authNetworkId: 'different-network-id-abcdef',
    });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
  });

  it('fails when containers share an arbitrary network id but not the expected network name', () => {
    const shared = 'shared-but-wrong-name-id';
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, {
      networkName: 'other_net_name',
      authNetworkName: 'other_net_name',
      networkId: shared,
      authNetworkId: shared,
    });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
  });

  it('fails when network metadata is missing or empty NetworkID', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, { emptyNetworkId: true });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
    const identity = probeLocalStackDockerNetworkIdentityV1({
      expectedNetworkName: LOCAL_STACK_DOCKER_NETWORK,
      kong: evidence.kong,
      db: evidence.db,
      auth: evidence.auth,
    });
    assert.equal(identity.ok, false);
  });

  it('fails when Kong container is stopped despite matching name', () => {
    const evidence = isolatedStackDockerEvidence(LOCAL_STACK_ID, { kongRunning: false });
    const probe = dockerBindingProbe(evidence);
    assert.equal(probe.ok, false);
    if (!probe.ok) assert.equal(probe.reason, 'LOCAL_STACK_TOPOLOGY_UNVERIFIED');
  });

  it('fails when Docker network env is missing', async () => {
    const result = await evaluateIsolatedSupabaseLocalStackVerificationLiveV1(
      localStackVerificationEnvOmitKeyV1(M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1),
      {
      inspectLocalStackDockerBindingImpl: inspectDockerBindingFactory(
        isolatedStackDockerEvidence(),
      ),
      fetchImpl: authAwareFetch(401, 200),
        postgresQueryImpl: async () => ({ rows: [{ local_stack_reachability: 1 }] }),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'LOCAL_STACK_STACK_DOCKER_NETWORK_MISSING');
  });

  it('rejects non-service-role sentinel responses that are 5xx or 302', async () => {
    for (const genericKeyStatus of [500, 302]) {
      const auth = await probeLocalStackServiceRoleAuthorizationV1({
        supabaseHttpUrl: 'http://127.0.0.1:54321',
        serviceRoleKey: fakeServiceRoleJwtWithoutRef('service_role'),
        fetchImpl: adminUsersProbeFetch({
          unauthenticatedStatus: 401,
          genericKeyStatus,
          serviceRoleStatus: 200,
        }),
      });
      assert.equal(auth.ok, false);
    }
  });

  it('local stack verification fails on binding mismatch within declared stack containers', async () => {
    const docker = isolatedStackDockerEvidence();
    docker.kong.name = `supabase_kong_other_stack`;
    const result = await evaluateIsolatedSupabaseLocalStackVerificationLiveV1(
      localStackVerificationEnv(),
      {
        inspectLocalStackDockerBindingImpl: inspectDockerBindingFactory(docker),
        fetchImpl: authAwareFetch(401, 200),
        postgresQueryImpl: async () => ({ rows: [{ local_stack_reachability: 1 }] }),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'LOCAL_STACK_BINDING_MISMATCH');
  });

  it('rejects anonymously open GoTrue admin users (no service-role authorization proof)', async () => {
    const auth = await probeLocalStackServiceRoleAuthorizationV1({
      supabaseHttpUrl: 'http://127.0.0.1:54321',
      serviceRoleKey: fakeServiceRoleJwtWithoutRef('service_role'),
      fetchImpl: adminUsersProbeFetch({ unauthenticatedStatus: 200, serviceRoleStatus: 200 }),
    });
    assert.equal(auth.ok, false);
    if (!auth.ok) assert.equal(auth.reason, 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED');
  });

  it('rejects generic API key success without GoTrue admin service-role authorization', async () => {
    const fetchImpl = adminUsersProbeFetch({
      unauthenticatedStatus: 401,
      genericKeyStatus: 200,
      serviceRoleStatus: 401,
    });
    const auth = await probeLocalStackServiceRoleAuthorizationV1({
      supabaseHttpUrl: 'http://127.0.0.1:54321',
      serviceRoleKey: fakeServiceRoleJwtWithoutRef('service_role'),
      fetchImpl,
    });
    assert.equal(auth.ok, false);
  });

  it('JWT role self-declaration alone does not satisfy service-role authorization probe', async () => {
    const auth = await probeLocalStackServiceRoleAuthorizationV1({
      supabaseHttpUrl: 'http://127.0.0.1:54321',
      serviceRoleKey: fakeServiceRoleJwtWithoutRef('service_role'),
      fetchImpl: authAwareFetch(401, 401),
    });
    assert.equal(auth.ok, false);
  });

  it('API reachability fails closed on 5xx and redirects for unauthenticated admin probe', async () => {
    for (const status of [500, 302]) {
      const reach = await probeLocalStackApiReachabilityV1({
        supabaseHttpUrl: 'http://127.0.0.1:54321',
        fetchImpl: async () => new Response('', { status }),
      });
      assert.equal(reach.ok, false);
    }
  });

  it('Postgres reachability fails on zero rows, multiple rows, and wrong values', async () => {
    for (const rows of [[], [{ local_stack_reachability: 1 }, { local_stack_reachability: 1 }], [{ local_stack_reachability: 0 }]]) {
      const probe = await probeLocalStackPostgresReachabilityV1({
        connectionUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        postgresQueryImpl: async () => ({ rows }),
      });
      assert.equal(probe.ok, false);
    }
  });

  it('local stack verification fails without injectable Docker inspect evidence', async () => {
    const result = await evaluateIsolatedSupabaseLocalStackVerificationLiveV1(
      localStackVerificationEnv(),
      {
        fetchImpl: authAwareFetch(401, 200),
        postgresQueryImpl: async () => ({ rows: [{ local_stack_reachability: 1 }] }),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'LOCAL_STACK_TOPOLOGY_UNVERIFIED');
  });

  it('local stack verification is not applicable on hosted Supabase URLs', async () => {
    const ref = 'aaaaaaaaaaaaaaaa';
    const result = await evaluateIsolatedSupabaseLocalStackVerificationLiveV1(
      hostedEnvWithLocalStackDockerKeysV1(ref),
      {
        inspectLocalStackDockerBindingImpl: inspectDockerBindingFactory(
          isolatedStackDockerEvidence(),
        ),
        fetchImpl: authAwareFetch(401, 200),
        postgresQueryImpl: async () => ({ rows: [{ local_stack_reachability: 1 }] }),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'LOCAL_STACK_VERIFICATION_NOT_APPLICABLE');
  });

  it('local stack verification fails closed when stack project_id env is missing', async () => {
    const result = await evaluateIsolatedSupabaseLocalStackVerificationLiveV1(
      localStackVerificationEnvOmitKeyV1(M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1),
      {
      inspectLocalStackDockerBindingImpl: inspectDockerBindingFactory(
        isolatedStackDockerEvidence(),
      ),
      fetchImpl: authAwareFetch(401, 200),
        postgresQueryImpl: async () => ({ rows: [{ local_stack_reachability: 1 }] }),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'LOCAL_STACK_STACK_PROJECT_ID_MISSING');
  });

  it('identity LIVE probe still fails closed for ref-absent local JWT after REST and Postgres success', async () => {
    const live = await evaluateIsolatedSupabaseAlignmentLiveV1(localStackVerificationEnv(), {
      fetchImpl: authAwareFetch(401, 200),
      postgresQueryImpl: async () => ({ rows: [{ present: true }] }),
    });
    assert.equal(live.ok, false);
    if (!live.ok) assert.equal(live.reason, 'HUMAN_PROJECT_REF_NOT_JWT_VERIFIED');
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
