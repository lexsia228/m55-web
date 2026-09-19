import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';
import {
  M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME,
  touchEventKeyHexToByteaBuffer,
} from './r5TouchSchemaContract';

const R4_MIGRATION = '20260914000000_m55_creator_distribution_foundation_v1.sql';
const S1_MIGRATION = M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME;

const DENY_URL_PATTERNS = [
  'supabase.co',
  'pooler.supabase.com',
  'm55-soul',
  'm55-soul-core',
  'production',
  'preview',
] as const;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const REQUIRED_ROLES = ['anon', 'authenticated', 'service_role'] as const;

export type SafetyEvaluation =
  | { ok: true; url: string; redactedTarget: string }
  | { ok: false; reason: string };

export let LOCAL_DB_SECURITY_PROOF_EXECUTED = false;
export let LOCAL_DB_SECURITY_PROOF_RESULT: 'PASS' | 'FAIL' | 'NOT_RUN' = 'NOT_RUN';
export let LOCAL_DB_SECURITY_PROOF_SKIP_COUNT = 0;

function markProofFailure(): void {
  LOCAL_DB_SECURITY_PROOF_RESULT = 'FAIL';
}

function proofIt(name: string, fn: () => Promise<void>): void {
  it(name, async () => {
    try {
      await fn();
    } catch (error) {
      markProofFailure();
      throw error;
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<unparseable-url>';
  }
}

export function evaluateLocalDatabaseSafety(): SafetyEvaluation {
  const rawUrl = process.env.M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL;
  const allowMutation = process.env.M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION;

  if (!rawUrl) {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL is not set' };
  }
  if (allowMutation !== 'YES') {
    return {
      ok: false,
      reason: 'M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION must be exactly YES',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL is not parseable' };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!LOOPBACK_HOSTS.has(hostname)) {
    return { ok: false, reason: `database host must be loopback only; got ${hostname}` };
  }

  const lowerUrl = rawUrl.toLowerCase();
  for (const pattern of DENY_URL_PATTERNS) {
    if (lowerUrl.includes(pattern)) {
      return { ok: false, reason: `database URL contains denied pattern: ${pattern}` };
    }
  }

  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, '')).toLowerCase();
  if (dbName.includes('production') || dbName.includes('preview')) {
    return { ok: false, reason: 'database name contains denied production/preview marker' };
  }

  return {
    ok: true,
    url: rawUrl,
    redactedTarget: redactDatabaseUrl(rawUrl),
  };
}

async function applyMigrationInTransaction(client: pg.Client, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function tableExists(client: pg.Client, tableName: string): Promise<boolean> {
  const result = await client.query(
    `select 1
     from information_schema.tables
     where table_schema = 'public' and table_name = $1`,
    [tableName],
  );
  return result.rowCount === 1;
}

async function requiredRolesExist(client: pg.Client): Promise<boolean> {
  const result = await client.query(
    `select rolname
     from pg_roles
     where rolname = any($1::text[])`,
    [REQUIRED_ROLES],
  );
  return result.rowCount === REQUIRED_ROLES.length;
}

async function expectPgError(
  fn: () => Promise<unknown>,
  matcher: RegExp,
): Promise<void> {
  try {
    await fn();
    assert.fail(`expected error matching ${matcher}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, matcher);
  }
}

function sha256LowerHex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function uniqueTouchKeyHex(): string {
  return createHash('sha256').update(randomUUID()).digest('hex').slice(0, 32);
}

type FixtureIds = {
  profileId: string;
  economicIdentityId: string;
  linkId: string;
  buyerSubjectId: string;
};

type ProfileIds = {
  profileId: string;
  economicIdentityId: string;
};

async function insertCreatorProfileOnly(client: pg.Client, suffix: string): Promise<ProfileIds> {
  const clerkUserId = `creator_${suffix}`.slice(0, 128);
  const application = await client.query(
    `insert into public.m55_creator_applications (
       clerk_user_id, application_source, age_18_plus_attested, japan_resident_attested,
       content_focus_safe, terms_version, terms_accepted_at, status
     ) values ($1, 'PUBLIC_APPLICATION', true, true, 'test focus', '2026-09-13-v1', now(), 'APPROVED_PENDING_ACTIVATION')
     returning id`,
    [clerkUserId],
  );
  const applicationId = application.rows[0].id as string;

  const profile = await client.query(
    `insert into public.m55_creator_profiles (
       clerk_user_id, originating_application_id, creator_code,
       first_final_approved_at, terms_version, terms_accepted_at
     ) values ($1, $2, $3, now(), '2026-09-13-v1', now())
     returning id, economic_identity_id`,
    [clerkUserId, applicationId, `cr_${suffix}`.slice(0, 40)],
  );

  return {
    profileId: profile.rows[0].id as string,
    economicIdentityId: profile.rows[0].economic_identity_id as string,
  };
}

async function insertBuyerSubject(
  client: pg.Client,
  digest: string,
  identityState = 'ACTIVE',
): Promise<string> {
  const result = await client.query(
    `insert into public.m55_attribution_buyer_subjects (
       clerk_subject_lookup_digest, identity_state
     ) values ($1, $2)
     returning id`,
    [digest, identityState],
  );
  return result.rows[0].id as string;
}

async function insertCreatorFixture(client: pg.Client, suffix: string): Promise<FixtureIds> {
  const profile = await insertCreatorProfileOnly(client, suffix);

  const link = await client.query(
    `insert into public.m55_creator_referral_links (
       creator_profile_id, creator_economic_identity_id, token_version, token_digest, ingest_state
     ) values ($1, $2, 'v1', $3, 'ACTIVE')
     returning id`,
    [profile.profileId, profile.economicIdentityId, sha256LowerHex(`token-${suffix}`)],
  );

  const buyerSubjectId = await insertBuyerSubject(client, sha256LowerHex(`buyer-${suffix}`));

  return {
    profileId: profile.profileId,
    economicIdentityId: profile.economicIdentityId,
    linkId: link.rows[0].id as string,
    buyerSubjectId,
  };
}

async function insertTouch(
  client: pg.Client,
  args: {
    buyerSubjectId: string;
    linkId: string;
    economicIdentityId: string;
    touchKeyHex: string;
    fingerprint: string;
    qualifiedTouchAtMs?: number;
    qualifiedActionKind?: string;
    trackingVersion?: string;
    attributionVersion?: string;
    touchKeyBytes?: Buffer;
  },
): Promise<string> {
  const touchKeyBytes = args.touchKeyBytes ?? touchEventKeyHexToByteaBuffer(args.touchKeyHex);
  const result = await client.query(
    `insert into public.m55_creator_qualified_touches (
       buyer_subject_id, creator_referral_link_id, creator_economic_identity_id,
       tracking_lane, qualified_touch_at_ms, touch_event_key_bytes, payload_fingerprint,
       qualified_action_kind, tracking_contract_version, attribution_policy_version
     ) values ($1, $2, $3, 'CREATOR', $4, $5, $6, $7, $8, $9)
     returning id`,
    [
      args.buyerSubjectId,
      args.linkId,
      args.economicIdentityId,
      args.qualifiedTouchAtMs ?? 1_700_000_000_000,
      touchKeyBytes,
      args.fingerprint,
      args.qualifiedActionKind ?? 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
      args.trackingVersion ?? 'v1',
      args.attributionVersion ?? 'v1',
    ],
  );
  return result.rows[0].id as string;
}

const safety = evaluateLocalDatabaseSafety();

if (!safety.ok) {
  describe('r5TouchSchemaSecurity.local — safety refusal', () => {
    it('refuses mutation-capable proof when safety predicate fails', () => {
      markProofFailure();
      LOCAL_DB_SECURITY_PROOF_SKIP_COUNT += 1;
      throw new Error(`SAFETY_REFUSAL: ${safety.reason}`);
    });
  });
} else {
  const adminClient = new pg.Client({ connectionString: safety.url });

  before(async () => {
    try {
      await adminClient.connect();
      const rolesOk = await requiredRolesExist(adminClient);
      if (!rolesOk) {
        throw new Error('SAFETY_REFUSAL: required roles anon/authenticated/service_role are missing');
      }

      if (!(await tableExists(adminClient, 'm55_creator_profiles'))) {
        await applyMigrationInTransaction(adminClient, R4_MIGRATION);
      }
      assert.equal(await tableExists(adminClient, 'm55_creator_profiles'), true);

      if (!(await tableExists(adminClient, 'm55_creator_referral_links'))) {
        await applyMigrationInTransaction(adminClient, S1_MIGRATION);
      }
      assert.equal(await tableExists(adminClient, 'm55_creator_referral_links'), true);
      assert.equal(await tableExists(adminClient, 'm55_attribution_buyer_subjects'), true);
      assert.equal(await tableExists(adminClient, 'm55_creator_qualified_touches'), true);

      LOCAL_DB_SECURITY_PROOF_EXECUTED = true;
    } catch (error) {
      markProofFailure();
      throw error;
    }
  });

  after(async () => {
    try {
      await adminClient.end();
    } finally {
      if (
        LOCAL_DB_SECURITY_PROOF_RESULT !== 'FAIL' &&
        LOCAL_DB_SECURITY_PROOF_EXECUTED &&
        LOCAL_DB_SECURITY_PROOF_RESULT === 'NOT_RUN'
      ) {
        LOCAL_DB_SECURITY_PROOF_RESULT = 'PASS';
      }
    }
  });

  describe('r5TouchSchemaSecurity.local — catalog and privileges', () => {
    proofIt('has RLS enabled and FORCE RLS disabled', async () => {
      const result = await adminClient.query(
        `select c.relname, c.relrowsecurity, c.relforcerowsecurity
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname in (
             'm55_creator_referral_links',
             'm55_attribution_buyer_subjects',
             'm55_creator_qualified_touches'
           )`,
      );
      assert.equal(result.rowCount, 3);
      for (const row of result.rows) {
        assert.equal(row.relrowsecurity, true);
        assert.equal(row.relforcerowsecurity, false);
      }
    });

    proofIt('denies anon/authenticated DML and allows service_role access', async () => {
      for (const role of ['anon', 'authenticated'] as const) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const) {
          const result = await adminClient.query(
            `select has_table_privilege($1, 'public.m55_creator_referral_links', $2) as links,
                    has_table_privilege($1, 'public.m55_attribution_buyer_subjects', $2) as subjects,
                    has_table_privilege($1, 'public.m55_creator_qualified_touches', $2) as touches`,
            [role, privilege],
          );
          assert.equal(result.rows[0].links, false);
          assert.equal(result.rows[0].subjects, false);
          assert.equal(result.rows[0].touches, false);
        }
      }

      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const) {
        const result = await adminClient.query(
          `select has_table_privilege('service_role', 'public.m55_creator_referral_links', $1) as links,
                  has_table_privilege('service_role', 'public.m55_attribution_buyer_subjects', $1) as subjects,
                  has_table_privilege('service_role', 'public.m55_creator_qualified_touches', $1) as touches`,
          [privilege],
        );
        assert.equal(result.rows[0].links, true);
        assert.equal(result.rows[0].subjects, true);
        assert.equal(result.rows[0].touches, true);
      }
    });

    proofIt('blocks anon/authenticated runtime DML via SET ROLE', async () => {
      for (const role of ['anon', 'authenticated'] as const) {
        const roleClient = new pg.Client({ connectionString: safety.url });
        await roleClient.connect();
        try {
          await roleClient.query(`set role ${role}`);
          await expectPgError(
            () => roleClient.query(`select 1 from public.m55_creator_referral_links limit 1`),
            /permission denied/i,
          );
          await expectPgError(
            () => roleClient.query(`select 1 from public.m55_attribution_buyer_subjects limit 1`),
            /permission denied/i,
          );
          await expectPgError(
            () =>
              roleClient.query(
                `insert into public.m55_creator_referral_links (
                   creator_profile_id, creator_economic_identity_id, token_digest, ingest_state
                 ) values ($1, $2, $3, 'ACTIVE')`,
                [randomUUID(), randomUUID(), sha256LowerHex(`role-${role}`)],
              ),
            /permission denied/i,
          );
        } finally {
          await roleClient.end();
        }
      }
    });

    proofIt('allows service_role runtime INSERT/SELECT through RLS-enabled tables', async () => {
      const profile = await insertCreatorProfileOnly(adminClient, `service-role-${randomUUID()}`);
      const serviceClient = new pg.Client({ connectionString: safety.url });
      await serviceClient.connect();

      try {
        await serviceClient.query('set role service_role');
        const currentUser = await serviceClient.query('select current_user');
        assert.equal(currentUser.rows[0].current_user, 'service_role');

        const tokenDigest = sha256LowerHex(`service-role-token-${randomUUID()}`);
        const subjectDigest = sha256LowerHex(`service-role-buyer-${randomUUID()}`);
        const subject = await serviceClient.query(
          `insert into public.m55_attribution_buyer_subjects (
             clerk_subject_lookup_digest, identity_state
           ) values ($1, 'ACTIVE')
           returning id`,
          [subjectDigest],
        );
        const buyerSubjectId = subject.rows[0].id as string;

        const link = await serviceClient.query(
          `insert into public.m55_creator_referral_links (
             creator_profile_id, creator_economic_identity_id, token_version, token_digest, ingest_state
           ) values ($1, $2, 'v1', $3, 'ACTIVE')
           returning id`,
          [profile.profileId, profile.economicIdentityId, tokenDigest],
        );
        const linkId = link.rows[0].id as string;

        const touchKeyHex = uniqueTouchKeyHex();
        const touchId = await insertTouch(serviceClient, {
          buyerSubjectId,
          linkId,
          economicIdentityId: profile.economicIdentityId,
          touchKeyHex,
          fingerprint: sha256LowerHex(`service-role-payload-${randomUUID()}`),
        });

        const evidence = await serviceClient.query(
          `select t.id, t.buyer_subject_id, l.id as link_id, s.clerk_subject_lookup_digest
           from public.m55_creator_qualified_touches t
           join public.m55_creator_referral_links l on l.id = t.creator_referral_link_id
           join public.m55_attribution_buyer_subjects s on s.id = t.buyer_subject_id
           where t.id = $1`,
          [touchId],
        );
        assert.equal(evidence.rowCount, 1);
        assert.equal(evidence.rows[0].link_id, linkId);
        assert.equal(evidence.rows[0].buyer_subject_id, buyerSubjectId);
        assert.equal(evidence.rows[0].clerk_subject_lookup_digest, subjectDigest);
      } finally {
        await serviceClient.end();
      }
    });
  });

  describe('r5TouchSchemaSecurity.local — identity and immutability', () => {
    proofIt('rejects link profile/economic mismatch', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      await expectPgError(
        () =>
          adminClient.query(
            `insert into public.m55_creator_referral_links (
               creator_profile_id, creator_economic_identity_id, token_version, token_digest, ingest_state
             ) values ($1, $2, 'v1', $3, 'ACTIVE')`,
            [fixture.profileId, randomUUID(), sha256LowerHex('mismatch-token')],
          ),
        /REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH/,
      );
    });

    proofIt('rejects touch/link economic identity mismatch', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: fixture.buyerSubjectId,
            linkId: fixture.linkId,
            economicIdentityId: randomUUID(),
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: sha256LowerHex('payload-mismatch'),
          }),
        /violates foreign key constraint|m55_r5_attribution_touch_link_creator_fk/i,
      );
    });

    proofIt('rejects touch with nonexistent buyer_subject_id', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: randomUUID(),
            linkId: fixture.linkId,
            economicIdentityId: fixture.economicIdentityId,
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: sha256LowerHex('payload-missing-subject'),
          }),
        /violates foreign key constraint/i,
      );
    });

    proofIt('rejects touch UPDATE and DELETE', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      const touchId = await insertTouch(adminClient, {
        buyerSubjectId: fixture.buyerSubjectId,
        linkId: fixture.linkId,
        economicIdentityId: fixture.economicIdentityId,
        touchKeyHex: uniqueTouchKeyHex(),
        fingerprint: sha256LowerHex('payload-immutable'),
      });

      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_creator_qualified_touches set buyer_subject_id = $2 where id = $1`,
            [touchId, randomUUID()],
          ),
        /QUALIFIED_TOUCH_APPEND_ONLY/,
      );
      await expectPgError(
        () => adminClient.query(`delete from public.m55_creator_qualified_touches where id = $1`, [touchId]),
        /QUALIFIED_TOUCH_APPEND_ONLY/,
      );
    });

    proofIt('rejects immutable link identity rewrite', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_creator_referral_links set token_digest = $1 where id = $2`,
            [sha256LowerHex('new-digest'), fixture.linkId],
          ),
        /REFERRAL_LINK_IDENTITY_IMMUTABLE/,
      );
    });
  });

  describe('r5TouchSchemaSecurity.local — lifecycle and negatives', () => {
    proofIt('retires once, rejects reactivation and retired_at rewrite', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      await adminClient.query(
        `update public.m55_creator_referral_links
         set ingest_state = 'RETIRED_OR_REVOKED', retired_at = now()
         where id = $1`,
        [fixture.linkId],
      );

      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_creator_referral_links
             set ingest_state = 'ACTIVE', retired_at = null
             where id = $1`,
            [fixture.linkId],
          ),
        /REFERRAL_LINK_REACTIVATION_FORBIDDEN/,
      );

      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_creator_referral_links
             set retired_at = now() + interval '1 minute'
             where id = $1`,
            [fixture.linkId],
          ),
        /REFERRAL_LINK_RETIRED_AT_IMMUTABLE/,
      );
    });

    proofIt('rejects retired_at before created_at', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_creator_referral_links
             set ingest_state = 'RETIRED_OR_REVOKED',
                 retired_at = created_at - interval '1 second'
             where id = $1`,
            [fixture.linkId],
          ),
        /REFERRAL_LINK_RETIRED_AT_BEFORE_CREATED_AT|check constraint/i,
      );
    });

    proofIt('rejects new touch on retired link while preserving historical touch', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      const touchId = await insertTouch(adminClient, {
        buyerSubjectId: fixture.buyerSubjectId,
        linkId: fixture.linkId,
        economicIdentityId: fixture.economicIdentityId,
        touchKeyHex: uniqueTouchKeyHex(),
        fingerprint: sha256LowerHex('payload-history'),
      });

      await adminClient.query(
        `update public.m55_creator_referral_links
         set ingest_state = 'RETIRED_OR_REVOKED', retired_at = now()
         where id = $1`,
        [fixture.linkId],
      );

      const historical = await adminClient.query(
        `select id from public.m55_creator_qualified_touches where id = $1`,
        [touchId],
      );
      assert.equal(historical.rowCount, 1);

      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: fixture.buyerSubjectId,
            linkId: fixture.linkId,
            economicIdentityId: fixture.economicIdentityId,
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: sha256LowerHex('payload-retired'),
          }),
        /LINK_NOT_ACTIVE_FOR_NEW_TOUCH/,
      );
    });

    proofIt('rejects v2 versions and invalid qualified action', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      await expectPgError(
        () =>
          adminClient.query(
            `insert into public.m55_creator_referral_links (
               creator_profile_id, creator_economic_identity_id, token_digest, token_version, ingest_state
             ) values ($1, $2, $3, 'v2', 'ACTIVE')`,
            [fixture.profileId, fixture.economicIdentityId, sha256LowerHex('v2-token')],
          ),
        /check constraint/i,
      );

      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: fixture.buyerSubjectId,
            linkId: fixture.linkId,
            economicIdentityId: fixture.economicIdentityId,
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: sha256LowerHex('payload-bad-action'),
            qualifiedActionKind: 'UNAUTHENTICATED_LANDING_ALONE',
          }),
        /check constraint/i,
      );
    });

    proofIt('rejects invalid timestamps, touch key length, and uppercase digests', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());

      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: fixture.buyerSubjectId,
            linkId: fixture.linkId,
            economicIdentityId: fixture.economicIdentityId,
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: sha256LowerHex('payload-neg-ts'),
            qualifiedTouchAtMs: -1,
          }),
        /check constraint/i,
      );

      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: fixture.buyerSubjectId,
            linkId: fixture.linkId,
            economicIdentityId: fixture.economicIdentityId,
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: sha256LowerHex('payload-big-ts'),
            qualifiedTouchAtMs: 9007199254740992,
          }),
        /check constraint/i,
      );

      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: fixture.buyerSubjectId,
            linkId: fixture.linkId,
            economicIdentityId: fixture.economicIdentityId,
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: sha256LowerHex('payload-bad-key'),
            touchKeyBytes: Buffer.alloc(15),
          }),
        /check constraint/i,
      );

      await expectPgError(
        () =>
          adminClient.query(
            `insert into public.m55_creator_referral_links (
               creator_profile_id, creator_economic_identity_id, token_version, token_digest, ingest_state
             ) values ($1, $2, 'v1', $3, 'ACTIVE')`,
            [fixture.profileId, fixture.economicIdentityId, 'A'.repeat(64)],
          ),
        /check constraint/i,
      );

      await expectPgError(
        () =>
          insertTouch(adminClient, {
            buyerSubjectId: fixture.buyerSubjectId,
            linkId: fixture.linkId,
            economicIdentityId: fixture.economicIdentityId,
            touchKeyHex: uniqueTouchKeyHex(),
            fingerprint: 'B'.repeat(64),
          }),
        /check constraint/i,
      );
    });

    proofIt('rejects link delete with touch history and allows delete without touches', async () => {
      const withTouch = await insertCreatorFixture(adminClient, randomUUID());
      await insertTouch(adminClient, {
        buyerSubjectId: withTouch.buyerSubjectId,
        linkId: withTouch.linkId,
        economicIdentityId: withTouch.economicIdentityId,
        touchKeyHex: uniqueTouchKeyHex(),
        fingerprint: sha256LowerHex('payload-delete-guard'),
      });

      await expectPgError(
        () => adminClient.query(`delete from public.m55_creator_referral_links where id = $1`, [withTouch.linkId]),
        /REFERRAL_LINK_HAS_TOUCH_HISTORY/,
      );

      const withoutTouch = await insertCreatorFixture(adminClient, randomUUID());
      const deleted = await adminClient.query(
        `delete from public.m55_creator_referral_links where id = $1 returning id`,
        [withoutTouch.linkId],
      );
      assert.equal(deleted.rowCount, 1);
    });
  });

  describe('r5TouchSchemaSecurity.local — buyer-subject lifecycle', () => {
    proofIt('accepts ACTIVE insert and rejects DELETED insert plus invalid digests', async () => {
      const activeId = await insertBuyerSubject(adminClient, sha256LowerHex(`active-${randomUUID()}`));
      const active = await adminClient.query(
        `select identity_state, deleted_at from public.m55_attribution_buyer_subjects where id = $1`,
        [activeId],
      );
      assert.equal(active.rows[0].identity_state, 'ACTIVE');
      assert.equal(active.rows[0].deleted_at, null);

      await expectPgError(
        () => insertBuyerSubject(adminClient, sha256LowerHex(`deleted-insert-${randomUUID()}`), 'DELETED'),
        /BUYER_SUBJECT_INSERT_MUST_BE_ACTIVE/,
      );
      await expectPgError(
        () => insertBuyerSubject(adminClient, 'A'.repeat(64)),
        /BUYER_SUBJECT_DIGEST_FORMAT_INVALID|check constraint/i,
      );
      await expectPgError(
        () => insertBuyerSubject(adminClient, 'a'.repeat(63)),
        /BUYER_SUBJECT_DIGEST_FORMAT_INVALID|check constraint/i,
      );
    });

    proofIt('rejects duplicate digest and identity rewrites', async () => {
      const digest = sha256LowerHex(`dup-${randomUUID()}`);
      const subjectId = await insertBuyerSubject(adminClient, digest);

      await expectPgError(
        () => insertBuyerSubject(adminClient, digest),
        /duplicate key value|unique constraint/i,
      );
      await expectPgError(
        () =>
          adminClient.query(`update public.m55_attribution_buyer_subjects set id = $1 where id = $2`, [
            randomUUID(),
            subjectId,
          ]),
        /BUYER_SUBJECT_IDENTITY_IMMUTABLE/,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_attribution_buyer_subjects set clerk_subject_lookup_digest = $1 where id = $2`,
            [sha256LowerHex(`rewrite-${randomUUID()}`), subjectId],
          ),
        /BUYER_SUBJECT_IDENTITY_IMMUTABLE/,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_attribution_buyer_subjects set created_at = now() + interval '1 minute' where id = $1`,
            [subjectId],
          ),
        /BUYER_SUBJECT_IDENTITY_IMMUTABLE/,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_attribution_buyer_subjects set identity_state = 'ACTIVE' where id = $1`,
            [subjectId],
          ),
        /BUYER_SUBJECT_ACTIVE_MUTATION_FORBIDDEN/,
      );
    });

    proofIt('assigns deleted_at on ACTIVE to DELETED and then forbids rewrite, reactivation, and DELETE', async () => {
      const subjectId = await insertBuyerSubject(adminClient, sha256LowerHex(`lifecycle-${randomUUID()}`));

      await adminClient.query(
        `update public.m55_attribution_buyer_subjects
         set identity_state = 'DELETED', deleted_at = created_at - interval '1 hour'
         where id = $1`,
        [subjectId],
      );

      const after = await adminClient.query(
        `select identity_state, deleted_at, created_at
         from public.m55_attribution_buyer_subjects where id = $1`,
        [subjectId],
      );
      assert.equal(after.rows[0].identity_state, 'DELETED');
      assert.ok(after.rows[0].deleted_at);
      const deletedAtMs = new Date(after.rows[0].deleted_at).getTime();
      const createdAtMs = new Date(after.rows[0].created_at).getTime();
      assert.equal(Number.isNaN(deletedAtMs), false);
      assert.equal(deletedAtMs >= createdAtMs, true);
      assert.equal(deletedAtMs - createdAtMs < 60_000, true);

      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_attribution_buyer_subjects
             set identity_state = 'ACTIVE', deleted_at = null
             where id = $1`,
            [subjectId],
          ),
        /BUYER_SUBJECT_REACTIVATION_FORBIDDEN/,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_attribution_buyer_subjects
             set deleted_at = now() + interval '1 minute'
             where id = $1`,
            [subjectId],
          ),
        /BUYER_SUBJECT_DELETED_AT_IMMUTABLE/,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_attribution_buyer_subjects set identity_state = 'DELETED' where id = $1`,
            [subjectId],
          ),
        /BUYER_SUBJECT_DELETED_REWRITE_FORBIDDEN/,
      );
      await expectPgError(
        () => adminClient.query(`delete from public.m55_attribution_buyer_subjects where id = $1`, [subjectId]),
        /BUYER_SUBJECT_DELETE_FORBIDDEN/,
      );
    });

    proofIt('keeps a DELETED tombstone UNIQUE so the same digest cannot resurrect', async () => {
      const digest = sha256LowerHex(`tombstone-${randomUUID()}`);
      const subjectId = await insertBuyerSubject(adminClient, digest);
      await adminClient.query(
        `update public.m55_attribution_buyer_subjects set identity_state = 'DELETED' where id = $1`,
        [subjectId],
      );

      await expectPgError(
        () => insertBuyerSubject(adminClient, digest),
        /duplicate key value|unique constraint/i,
      );

      const rows = await adminClient.query(
        `select id, identity_state
         from public.m55_attribution_buyer_subjects
         where clerk_subject_lookup_digest = $1`,
        [digest],
      );
      assert.equal(rows.rowCount, 1);
      assert.equal(rows.rows[0].id, subjectId);
      assert.equal(rows.rows[0].identity_state, 'DELETED');
    });
  });

  describe('r5TouchSchemaSecurity.local — concurrency', () => {
    proofIt('Case A: trigger lock blocks retirement until touch COMMIT', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      const touchClient = new pg.Client({ connectionString: safety.url });
      const retireClient = new pg.Client({ connectionString: safety.url });
      await touchClient.connect();
      await retireClient.connect();

      try {
        await touchClient.query('BEGIN');
        await insertTouch(touchClient, {
          buyerSubjectId: fixture.buyerSubjectId,
          linkId: fixture.linkId,
          economicIdentityId: fixture.economicIdentityId,
          touchKeyHex: uniqueTouchKeyHex(),
          fingerprint: sha256LowerHex('payload-case-a'),
        });

        let retireUpdateCompleted = false;
        const retirePromise = (async () => {
          await retireClient.query('BEGIN');
          await retireClient.query(
            `update public.m55_creator_referral_links
             set ingest_state = 'RETIRED_OR_REVOKED', retired_at = now()
             where id = $1`,
            [fixture.linkId],
          );
          retireUpdateCompleted = true;
          await retireClient.query('COMMIT');
        })();

        await sleep(100);
        assert.equal(retireUpdateCompleted, false, 'retirement UPDATE must not complete before touch COMMIT');

        const activeDuringTouchTxn = await adminClient.query(
          `select ingest_state from public.m55_creator_referral_links where id = $1`,
          [fixture.linkId],
        );
        assert.equal(activeDuringTouchTxn.rows[0].ingest_state, 'ACTIVE');

        await touchClient.query('COMMIT');
        await retirePromise;
        assert.equal(retireUpdateCompleted, true, 'retirement UPDATE must complete after touch COMMIT');

        const link = await adminClient.query(
          `select ingest_state from public.m55_creator_referral_links where id = $1`,
          [fixture.linkId],
        );
        assert.equal(link.rows[0].ingest_state, 'RETIRED_OR_REVOKED');
      } finally {
        await touchClient.end();
        await retireClient.end();
      }
    });

    proofIt('Case B: retirement blocks touch until COMMIT, then touch rejects', async () => {
      const fixture = await insertCreatorFixture(adminClient, randomUUID());
      const retireClient = new pg.Client({ connectionString: safety.url });
      const touchClient = new pg.Client({ connectionString: safety.url });
      await retireClient.connect();
      await touchClient.connect();

      try {
        await retireClient.query('BEGIN');
        await retireClient.query(
          `update public.m55_creator_referral_links
           set ingest_state = 'RETIRED_OR_REVOKED', retired_at = now()
           where id = $1`,
          [fixture.linkId],
        );

        let touchSettled = false;
        const touchPromise = insertTouch(touchClient, {
          buyerSubjectId: fixture.buyerSubjectId,
          linkId: fixture.linkId,
          economicIdentityId: fixture.economicIdentityId,
          touchKeyHex: uniqueTouchKeyHex(),
          fingerprint: sha256LowerHex('payload-case-b'),
        })
          .then(() => {
            touchSettled = true;
          })
          .catch((error) => {
            touchSettled = true;
            throw error;
          });

        await sleep(100);
        assert.equal(touchSettled, false, 'touch INSERT must remain pending before retirement COMMIT');

        await retireClient.query('COMMIT');

        await expectPgError(async () => {
          await touchPromise;
        }, /LINK_NOT_ACTIVE_FOR_NEW_TOUCH/);
        assert.equal(touchSettled, true, 'touch INSERT must settle only after retirement COMMIT');
      } finally {
        await retireClient.end();
        await touchClient.end();
      }
    });
  });
}
