import assert from 'node:assert/strict';
import pg from 'pg';
import { after, before, describe, it } from 'node:test';

import {
  PAIR_P5_POST_PROBE_SQL,
  pairP5FulfillRpcPublicExecuteAclGrantCountSql,
  pairP5IdentityLinksPublicTableAclGrantCountSql,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';

type SafetyEvaluation =
  | { ok: true; url: string; redactedTarget: string }
  | { ok: false; reason: string };

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DENY_URL_PATTERNS = ['supabase.co', 'pooler.supabase.com', 'm55-soul', 'production', 'preview'] as const;

function evaluateLocalDatabaseSafety(): SafetyEvaluation {
  const rawUrl = process.env.M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL;
  if (!rawUrl) {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL is not set' };
  }
  if (process.env.M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION !== 'YES') {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION must be exactly YES' };
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
  return { ok: true, url: rawUrl, redactedTarget: hostname };
}

const safety = evaluateLocalDatabaseSafety();

describe('pair P5 POST probe PUBLIC ACL SQL contract', () => {
  it('does not reference PUBLIC as a pg_roles name in privilege helpers', () => {
    assert.equal(PAIR_P5_POST_PROBE_SQL.includes("has_function_privilege('PUBLIC'"), false);
    assert.equal(PAIR_P5_POST_PROBE_SQL.includes("has_table_privilege('PUBLIC'"), false);
    assert.equal(PAIR_P5_POST_PROBE_SQL.includes("('PUBLIC')"), false);
    assert.ok(PAIR_P5_POST_PROBE_SQL.includes('pg_catalog.aclexplode'));
    assert.ok(pairP5IdentityLinksPublicTableAclGrantCountSql().includes('acl.grantee = 0'));
    assert.ok(pairP5FulfillRpcPublicExecuteAclGrantCountSql().includes("acl.privilege_type = 'EXECUTE'"));
  });
});

if (!safety.ok) {
  describe('pair P5 POST probe PUBLIC ACL — disposable PG skipped', () => {
    it('documents skip when local disposable PG is unavailable', () => {
      assert.ok(safety.reason.length > 0);
    });
  });
} else {
  const client = new pg.Client({ connectionString: safety.url });

  before(async () => {
    await client.connect();
  });

  after(async () => {
    await client.end();
  });

  describe('pair P5 POST probe PUBLIC ACL — disposable PG regression', () => {
    it('counts PUBLIC table ACL grants via aclexplode without SQLSTATE 42704', async () => {
      await client.query('BEGIN');
      try {
        await client.query(
          `CREATE TABLE public.m55_pair_p5_acl_probe_links (id int primary key)`,
        );
        const tableOidSql =
          "(SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'm55_pair_p5_acl_probe_links' AND c.relkind = 'r')";
        const countSql = `(SELECT count(*)::int FROM pg_catalog.pg_class c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) AS acl WHERE c.oid = ${tableOidSql} AND acl.grantee = 0 AND acl.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'))`;
        const none = await client.query(`SELECT ${countSql} AS c`);
        assert.equal(none.rows[0]?.c, 0);
        await client.query('GRANT SELECT ON public.m55_pair_p5_acl_probe_links TO PUBLIC');
        const withPublic = await client.query(`SELECT ${countSql} AS c`);
        assert.ok(Number(withPublic.rows[0]?.c) >= 1);
        await client.query('ROLLBACK');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });

    it('counts PUBLIC function EXECUTE via aclexplode without SQLSTATE 42704', async () => {
      await client.query('BEGIN');
      try {
        await client.query(
          `CREATE OR REPLACE FUNCTION public.m55_pair_p5_acl_probe_fn() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$`,
        );
        const countSql = `(SELECT count(*)::int FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS acl WHERE p.oid = to_regprocedure('public.m55_pair_p5_acl_probe_fn()') AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE')`;
        const baseline = await client.query(`SELECT ${countSql} AS c`);
        const baselineCount = Number(baseline.rows[0]?.c);
        await client.query('GRANT EXECUTE ON FUNCTION public.m55_pair_p5_acl_probe_fn() TO PUBLIC');
        const withPublic = await client.query(`SELECT ${countSql} AS c`);
        assert.ok(Number(withPublic.rows[0]?.c) > baselineCount);
        await client.query('ROLLBACK');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });

    it('executes full POST probe SQL without role PUBLIC errors', async () => {
      await client.query('BEGIN');
      try {
        const result = await client.query(PAIR_P5_POST_PROBE_SQL);
        assert.ok(result.rows.length >= 1);
        await client.query('ROLLBACK');
      } catch (error) {
        await client.query('ROLLBACK');
        const code =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: string }).code)
            : '';
        assert.notEqual(code, '42704');
        throw error;
      }
    });
  });
}
