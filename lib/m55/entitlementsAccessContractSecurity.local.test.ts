import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const MIGRATION_FILENAME =
  '20260615000004_m55_entitlements_and_rights_access_security_v1.sql';
const MIGRATION = join(process.cwd(), 'supabase/migrations', MIGRATION_FILENAME);

const M2_INDEX_NAMES = [
  'entitlements_user_product_uq',
  'uq_entitlements_user_product',
  'uq_entitlement_rights_user_key',
];

const FORBIDDEN_PATTERNS = [
  /INSERT\s+INTO\s+public\.entitlements\b/i,
  /INSERT\s+INTO\s+public\.entitlement_rights\b/i,
  /UPDATE\s+public\.entitlements\b/i,
  /UPDATE\s+public\.entitlement_rights\b/i,
  /DELETE\s+FROM\s+public\.entitlements\b/i,
  /DELETE\s+FROM\s+public\.entitlement_rights\b/i,
  /TRUNCATE\s+public\.entitlements\b/i,
  /TRUNCATE\s+public\.entitlement_rights\b/i,
  /DROP\s+TABLE\b/i,
  /CREATE\s+TABLE\b/i,
  /ALTER\s+TABLE\b/i,
  /DROP\s+INDEX\b/i,
  /CREATE\s+INDEX\b/i,
  /ALTER\s+POLICY\b/i,
  /CREATE\s+POLICY\b/i,
  /ALTER\s+OWNER\b/i,
  /DISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i,
  /FORCE\s+ROW\s+LEVEL\s+SECURITY\b/i,
  /auth\.uid\s*\(/i,
  /NOTIFY\s+pgrst\b/i,
];

function readMigration(): string {
  return readFileSync(MIGRATION, 'utf8');
}

function doBlockBody(sql: string): string {
  const start = sql.indexOf('DO $m55$');
  const end = sql.indexOf('$m55$;', start);
  assert.ok(start >= 0, 'DO $m55$ block missing');
  assert.ok(end > start, 'DO $m55$ block end missing');
  return sql.slice(start, end);
}

function doBodyWithoutComments(sql: string): string {
  return doBlockBody(sql)
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

function countOccurrences(haystack: string, needle: string | RegExp): number {
  if (typeof needle === 'string') {
    let count = 0;
    let pos = 0;
    while (true) {
      const idx = haystack.indexOf(needle, pos);
      if (idx < 0) break;
      count += 1;
      pos = idx + needle.length;
    }
    return count;
  }
  const matches = haystack.match(needle);
  return matches ? matches.length : 0;
}

describe('entitlementsAccessContractSecurity — migration file contract', () => {
  const sql = readMigration();
  const body = doBodyWithoutComments(sql);

  it('1. migration filename exact', () => {
    assert.ok(MIGRATION.endsWith(MIGRATION_FILENAME));
  });

  it('2. target relations exact two tables', () => {
    assert.match(body, /REVOKE ALL PRIVILEGES ON TABLE public\.entitlements/);
    assert.match(body, /REVOKE ALL PRIVILEGES ON TABLE public\.entitlement_rights/);
    assert.match(body, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.entitlements/);
    assert.match(body, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.entitlement_rights/);
    assert.equal(countOccurrences(body, /ON TABLE public\./g), 4);
    assert.equal(countOccurrences(body, /TABLE public\.(entitlements|entitlement_rights)/g), 4);
  });

  it('3. REVOKE grantees PUBLIC anon authenticated', () => {
    assert.match(body, /REVOKE ALL PRIVILEGES[\s\S]*FROM PUBLIC, anon, authenticated/);
    assert.equal(countOccurrences(body, 'FROM PUBLIC, anon, authenticated'), 2);
  });

  it('4. both relations REVOKE ALL PRIVILEGES', () => {
    assert.match(
      body,
      /REVOKE ALL PRIVILEGES ON TABLE public\.entitlements[\s\S]*FROM PUBLIC, anon, authenticated/
    );
    assert.match(
      body,
      /REVOKE ALL PRIVILEGES ON TABLE public\.entitlement_rights[\s\S]*FROM PUBLIC, anon, authenticated/
    );
  });

  it('5. service_role core four GRANT statements', () => {
    assert.match(
      body,
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.entitlements TO service_role/
    );
    assert.match(
      body,
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.entitlement_rights TO service_role/
    );
    assert.equal(
      countOccurrences(body, 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE'),
      2
    );
  });

  it('6. exact policy name in DROP and precondition', () => {
    assert.ok(body.includes('Enable read access for all users'));
    assert.match(
      body,
      /DROP POLICY "Enable read access for all users" ON public\.entitlements/
    );
    assert.match(body, /v_policy_name IS DISTINCT FROM 'Enable read access for all users'/);
  });

  it('7. policy command SELECT exact (polcmd r)', () => {
    assert.match(body, /v_policy_cmd IS DISTINCT FROM 'r'/);
  });

  it('8. PERMISSIVE exact', () => {
    assert.match(body, /v_policy_permissive IS DISTINCT FROM true/);
    assert.match(body, /policy is not PERMISSIVE/);
  });

  it('9. PUBLIC-only role exact (polroles ARRAY[0::oid])', () => {
    assert.match(body, /v_policy_roles IS DISTINCT FROM ARRAY\[0::oid\]/);
    assert.match(body, /policy roles are not PUBLIC-only/);
  });

  it('10. USING true normalization', () => {
    assert.match(body, /regexp_replace\(/);
    assert.match(body, /v_policy_qual_norm IS DISTINCT FROM 'true'/);
    assert.ok(body.includes("'[[:space:]()]'"));
  });

  it('11. WITH CHECK NULL', () => {
    assert.match(body, /v_policy_withcheck IS NOT NULL/);
    assert.match(body, /policy WITH CHECK is not NULL/);
  });

  it('12. unexpected entitlements policy count rejected', () => {
    assert.match(body, /unexpected entitlements policy count/);
    assert.match(body, /v_entitlements_policy_count = 0/);
    assert.match(body, /v_entitlements_policy_count = 1/);
  });

  it('13. entitlement_rights policy presence rejected', () => {
    assert.match(body, /entitlement_rights policy count must be 0/);
    assert.match(body, /v_rights_policy_count <> 0/);
  });

  it('14. RLS true and FORCE false pre/post', () => {
    assert.match(body, /v_entitlements_rls IS DISTINCT FROM true/);
    assert.match(body, /v_entitlements_force IS DISTINCT FROM false/);
    assert.match(body, /v_rights_rls IS DISTINCT FROM true/);
    assert.match(body, /v_rights_force IS DISTINCT FROM false/);
    assert.match(body, /v_post_rls IS DISTINCT FROM true/);
    assert.match(body, /v_post_force IS DISTINCT FROM false/);
  });

  it('15. service_role BYPASSRLS pre/post', () => {
    assert.match(body, /rolbypassrls/);
    assert.match(body, /service_role\.rolbypassrls is not true/);
    assert.equal(countOccurrences(body, 'v_service_role_bypass IS DISTINCT FROM true'), 2);
  });

  it('16. anon/auth 28 effective privilege checks via has_table_privilege loops', () => {
    assert.match(body, /v_roles text\[\] := ARRAY\['anon', 'authenticated'\]/);
    assert.match(
      body,
      /'SELECT', 'INSERT', 'UPDATE', 'DELETE',\s*'TRUNCATE', 'REFERENCES', 'TRIGGER'/
    );
    assert.match(body, /has_table_privilege\(v_role_name, v_entitlements_oid, v_privilege_name\)/);
    assert.match(body, /has_table_privilege\(v_role_name, v_rights_oid, v_privilege_name\)/);
    assert.match(body, /still has % on public\.entitlements/);
    assert.match(body, /still has % on public\.entitlement_rights/);
  });

  it('17. PUBLIC ACL via aclexplode grantee zero', () => {
    assert.match(body, /aclexplode\(/);
    assert.match(body, /acl\.grantee = 0/);
    assert.match(body, /PUBLIC ACL remains on public\.entitlements/);
    assert.match(body, /PUBLIC ACL remains on public\.entitlement_rights/);
  });

  it('18. service_role core postcondition has_table_privilege', () => {
    assert.match(
      body,
      /has_table_privilege\('service_role', v_entitlements_oid, v_privilege_name\)/
    );
    assert.match(
      body,
      /has_table_privilege\('service_role', v_rights_oid, v_privilege_name\)/
    );
    assert.match(body, /service_role missing % on public\.entitlements/);
    assert.match(body, /service_role missing % on public\.entitlement_rights/);
  });

  it('19. relation owner column constraint index invariants', () => {
    assert.match(body, /v_entitlements_oid/);
    assert.match(body, /v_rights_oid/);
    assert.match(body, /v_entitlements_columns/);
    assert.match(body, /v_rights_columns/);
    assert.match(body, /v_entitlements_constraints/);
    assert.match(body, /v_rights_constraints/);
    assert.match(body, /v_entitlements_indexes/);
    assert.match(body, /v_rights_indexes/);
    assert.match(body, /relation OID changed/);
    assert.match(body, /owner OID changed/);
    assert.match(body, /column count changed/);
    assert.match(body, /constraint count changed/);
    assert.match(body, /index count changed/);
  });

  it('20. no application-row DML schema/index mutation or NOTIFY', () => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.equal(
        pattern.test(body),
        false,
        `forbidden pattern found in DO body: ${pattern}`
      );
    }
  });

  it('21. no M2 index names', () => {
    for (const name of M2_INDEX_NAMES) {
      assert.equal(sql.includes(name), false, `M2 index name must not appear: ${name}`);
    }
  });
});

describe('entitlementsAccessContractSecurity — transaction structure', () => {
  const sql = readMigration();

  it('single BEGIN DO COMMIT without TEMP TABLE', () => {
    assert.equal(countOccurrences(sql, /^BEGIN;/m), 1);
    assert.equal(countOccurrences(sql, /^COMMIT;/m), 1);
    assert.equal(countOccurrences(sql, 'DO $m55$'), 1);
    assert.equal(countOccurrences(sql, '$m55$;'), 1);
    assert.equal(/CREATE\s+TEMP\s+TABLE/i.test(sql), false);
  });

  it('header documents purpose and production evidence', () => {
    assert.match(sql, /service-role-only access contract/i);
    assert.match(sql, /public\.entitlements and public\.entitlement_rights/);
    assert.match(sql, /entitlement_rights policy count zero/);
  });
});

describe('entitlementsAccessContractSecurity — repository scope', () => {
  it('git working tree changes limited to allowlist two files', () => {
    const status = execSync('git status --porcelain -uall', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();

    const lines = status.length > 0 ? status.split('\n') : [];
    const paths = lines.map((line) => line.slice(3).trim());
    const allowed = new Set([
      `supabase/migrations/${MIGRATION_FILENAME}`,
      'lib/m55/entitlementsAccessContractSecurity.local.test.ts',
    ]);

    assert.equal(paths.length, allowed.size, `unexpected git status lines:\n${status}`);
    for (const path of paths) {
      assert.ok(allowed.has(path), `unexpected changed path: ${path}`);
    }
  });

  it('runtime and classifier artifacts unchanged in git diff', () => {
    const diffNames = execSync('git diff --name-only', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    assert.equal(diffNames, '', 'tracked files must not be modified');

    const runtimeProbe = execSync(
      'git diff --name-only -- app lib docs/planning',
      { cwd: process.cwd(), encoding: 'utf8' }
    ).trim();
    assert.equal(runtimeProbe, '', 'runtime/classifier paths must not be modified');

    const untrackedRuntime = execSync(
      'git ls-files --others --exclude-standard -- app lib docs/planning',
      { cwd: process.cwd(), encoding: 'utf8' }
    )
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
    const allowedUntracked = new Set(['lib/m55/entitlementsAccessContractSecurity.local.test.ts']);
    for (const path of untrackedRuntime) {
      assert.ok(allowedUntracked.has(path), `unexpected untracked runtime path: ${path}`);
    }
  });
});
