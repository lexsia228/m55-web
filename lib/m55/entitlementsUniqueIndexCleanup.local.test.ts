import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const MIGRATION_FILENAME = '20260615000006_m55_entitlements_unique_index_cleanup_v1.sql';
const M1_MIGRATION_FILENAME =
  '20260615000004_m55_entitlements_and_rights_access_security_v1.sql';
const MIGRATION = join(process.cwd(), 'supabase/migrations', MIGRATION_FILENAME);
const M1_MIGRATION = join(process.cwd(), 'supabase/migrations', M1_MIGRATION_FILENAME);
const M1_TEST = join(process.cwd(), 'lib/m55/entitlementsAccessContractSecurity.local.test.ts');
const FULFILLMENT = join(process.cwd(), 'lib/m55/dtrCoreCheckoutFulfillment.ts');

const ALLOWED_PATHS = new Set([
  'supabase/migrations/20260615000005_m55_dtr_visible_report_uniqueness_v1.sql',
  `supabase/migrations/${MIGRATION_FILENAME}`,
  'lib/m55/dtrVisibleReportUniqueness.local.test.ts',
  'lib/m55/entitlementsUniqueIndexCleanup.local.test.ts',
]);

const FORBIDDEN_DO_PATTERNS = [
  /INSERT\s+INTO\s+public\.entitlements\b/i,
  /UPDATE\s+public\.entitlements\b/i,
  /DELETE\s+FROM\s+public\.entitlements\b/i,
  /TRUNCATE\s+public\.entitlements\b/i,
  /DROP\s+TABLE\b/i,
  /CREATE\s+TABLE\b/i,
  /ALTER\s+TABLE\b/i,
  /DROP\s+CONSTRAINT\b/i,
  /CREATE\s+INDEX\b/i,
  /CREATE\s+POLICY\b/i,
  /DROP\s+POLICY\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /NOTIFY\s+pgrst\b/i,
  /CASCADE\b/i,
  /DROP\s+INDEX\s+IF\s+EXISTS/i,
  /DROP\s+CONSTRAINT\s+IF\s+EXISTS/i,
  /FOR\s+\w+\s+IN/i,
  /EXECUTE\s+format/i,
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

describe('entitlementsUniqueIndexCleanup — migration file contract', () => {
  const sql = readMigration();
  const body = doBodyWithoutComments(sql);

  it('1. migration filename exact', () => {
    assert.ok(MIGRATION.endsWith(MIGRATION_FILENAME));
  });

  it('2. single BEGIN DO COMMIT without TEMP TABLE', () => {
    assert.equal(countOccurrences(sql, /^BEGIN;/m), 1);
    assert.equal(countOccurrences(sql, /^COMMIT;/m), 1);
    assert.equal(countOccurrences(sql, 'DO $m55$'), 1);
    assert.equal(countOccurrences(sql, '$m55$;'), 1);
    assert.equal(/CREATE\s+TEMP\s+TABLE/i.test(sql), false);
  });

  it('3. exact relation only', () => {
    assert.match(body, /public\.entitlements/);
    assert.equal(countOccurrences(body, /public\.dtr_report_snapshots/g), 0);
    assert.equal(countOccurrences(body, /public\.entitlement_rights/g), 0);
  });

  it('4. exact duplicate index two names only', () => {
    assert.ok(body.includes('entitlements_user_product_uq'));
    assert.ok(body.includes('uq_entitlements_user_product'));
  });

  it('5. DROP INDEX exact two statements', () => {
    assert.equal(countOccurrences(body, /DROP\s+INDEX\s+public\.entitlements_user_product_uq/gi), 1);
    assert.equal(countOccurrences(body, /DROP\s+INDEX\s+public\.uq_entitlements_user_product/gi), 1);
    assert.equal(countOccurrences(body, /DROP\s+INDEX/gi), 2);
  });

  it('6. no DDL IF EXISTS', () => {
    assert.equal(/DROP\s+INDEX\s+IF\s+EXISTS/i.test(body), false);
    assert.equal(/DROP\s+CONSTRAINT\s+IF\s+EXISTS/i.test(body), false);
  });

  it('7. no CASCADE', () => {
    assert.equal(/CASCADE/i.test(body), false);
  });

  it('8. no DROP CONSTRAINT', () => {
    assert.equal(/DROP\s+CONSTRAINT/i.test(body), false);
  });

  it('9. canonical constraint maintained in pre/post', () => {
    assert.ok(body.includes('entitlements_user_id_product_id_key'));
    assert.match(body, /canonical constraint entitlements_user_id_product_id_key missing/);
    assert.match(body, /postcondition failed: canonical constraint missing/);
  });

  it('10. canonical backing index not dropped', () => {
    assert.match(body, /v_canonical_con_ind_oid/);
    assert.match(body, /canonical constraint backing index shape mismatch/);
    assert.match(body, /canonical backing index full shape mismatch after mutation/);
    assert.equal(
      countOccurrences(
        body,
        /DROP\s+INDEX\s+[\w.]*entitlements_user_id_product_id_key/gi
      ),
      0
    );
  });

  it('11. same-key exact pre/post name set checks', () => {
    assert.match(body, /v_pre_same_key_index_names/);
    assert.match(body, /v_post_same_key_index_names/);
    assert.match(body, /entitlements_user_id_product_id_key/);
    assert.match(body, /entitlements_user_product_uq/);
    assert.match(body, /uq_entitlements_user_product/);
    assert.match(body, /same-key index name set is %, expected \{entitlements_user_id_product_id_key\}/);
  });

  it('23. canonical backing index pre/post indislive inspection', () => {
    assert.match(body, /v_canonical_con_ind_oid[\s\S]*i\.indislive/);
    assert.match(body, /canonical backing index full shape mismatch after mutation/);
    assert.equal(countOccurrences(body, /i\.indislive/g), 4);
  });

  it('24. duplicate indexes indislive inspection', () => {
    assert.match(body, /entitlements_user_product_uq[\s\S]*i\.indislive/);
    assert.match(body, /uq_entitlements_user_product[\s\S]*i\.indislive/);
  });

  it('25. pg_am btree contract for canonical and duplicates', () => {
    assert.match(body, /JOIN pg_am am/);
    assert.match(body, /am\.amname = 'btree'/);
    assert.equal(countOccurrences(body, /am\.amname = 'btree'/g), 6);
  });

  it('26. indnatts and indnkeyatts exact on canonical and duplicates', () => {
    assert.equal(countOccurrences(body, /i\.indnatts = 2/g), 6);
    assert.equal(countOccurrences(body, /i\.indnkeyatts = 2/g), 6);
  });

  it('27. pre exact name set three indexes asserted', () => {
    assert.match(
      body,
      /v_pre_same_key_index_names IS DISTINCT FROM ARRAY\[\s*'entitlements_user_id_product_id_key',\s*'entitlements_user_product_uq',\s*'uq_entitlements_user_product'\s*\]::text\[\]/
    );
  });

  it('28. post exact name set one index asserted', () => {
    assert.match(
      body,
      /v_post_same_key_index_names IS DISTINCT FROM ARRAY\[\s*'entitlements_user_id_product_id_key'\s*\]::text\[\]/
    );
  });

  it('29. canonical postcondition revalidates full btree shape', () => {
    assert.match(body, /canonical backing index full shape mismatch after mutation/);
    assert.match(body, /ic\.relkind = 'i'[\s\S]*am\.amname = 'btree'[\s\S]*i\.indislive/);
    assert.match(body, /i\.indpred IS NULL[\s\S]*user_id', 'product_id/);
  });

  it('30. duplicate indexes nonconstraint btree shape preconditions', () => {
    assert.match(body, /duplicate index entitlements_user_product_uq missing or shape mismatch/);
    assert.match(body, /duplicate index uq_entitlements_user_product missing or shape mismatch/);
    assert.match(body, /NOT EXISTS[\s\S]*c2\.conindid = ic\.oid[\s\S]*contype IN \('u', 'p'\)/);
  });

  it('12. FK count zero precondition', () => {
    assert.match(body, /v_fk_target_count/);
    assert.match(body, /referencing FK count is %, expected 0/);
  });

  it('13. relation owner column constraint index invariants', () => {
    assert.match(body, /v_relation_oid/);
    assert.match(body, /v_owner_oid/);
    assert.match(body, /v_column_count/);
    assert.match(body, /v_constraint_count/);
    assert.match(body, /v_index_count/);
    assert.match(body, /relation OID changed/);
    assert.match(body, /owner OID changed/);
    assert.match(body, /column count changed/);
    assert.match(body, /constraint count changed/);
    assert.match(body, /index count changed from % to %, expected %/);
    assert.match(body, /v_constraint_names/);
    assert.match(body, /v_unrelated_index_names/);
  });

  it('14. no application-row DML or NOTIFY', () => {
    for (const pattern of FORBIDDEN_DO_PATTERNS) {
      assert.equal(pattern.test(body), false, `forbidden pattern in DO body: ${pattern}`);
    }
    assert.equal(/NOTIFY\s+pgrst/i.test(body), false);
  });

  it('15. no generic fallback DROP', () => {
    assert.equal(/EXECUTE\s+format/i.test(body), false);
    assert.equal(/FOR\s+\w+\s+IN/i.test(body), false);
  });

  it('16. header documents purpose and onConflict compatibility', () => {
    assert.match(sql, /entitlements_user_id_product_id_key/);
    assert.match(sql, /entitlements_user_product_uq/);
    assert.match(sql, /uq_entitlements_user_product/);
    assert.match(sql, /onConflict: user_id,product_id/);
  });
});

describe('entitlementsUniqueIndexCleanup — runtime dependency contract', () => {
  const runtime = readFileSync(FULFILLMENT, 'utf8');

  it('17. onConflict user_id,product_id maintained', () => {
    assert.match(runtime, /from\('entitlements'\)\.upsert\(/);
    assert.match(runtime, /onConflict:\s*'user_id,product_id'/);
  });

  it('18. runtime file unchanged in git diff', () => {
    const diffNames = execSync('git diff --name-only -- lib/m55/dtrCoreCheckoutFulfillment.ts', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    assert.equal(diffNames, '');
  });

  it('19. M1 migration unchanged in git diff', () => {
    const diffNames = execSync(`git diff --name-only -- supabase/migrations/${M1_MIGRATION_FILENAME}`, {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    assert.equal(diffNames, '');
    assert.ok(readFileSync(M1_MIGRATION, 'utf8').includes('service-role-only access contract'));
  });

  it('20. M1 dedicated test unchanged in git diff', () => {
    const diffNames = execSync('git diff --name-only -- lib/m55/entitlementsAccessContractSecurity.local.test.ts', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    assert.equal(diffNames, '');
    assert.ok(readFileSync(M1_TEST, 'utf8').includes('entitlementsAccessContractSecurity'));
  });
});

describe('entitlementsUniqueIndexCleanup — repository scope', () => {
  it('git working tree changes limited to allowlist four files', () => {
    const status = execSync('git status --porcelain -uall', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();

    const lines = status.length > 0 ? status.split('\n') : [];
    const paths = lines.map((line) => line.slice(3).trim());

    assert.equal(paths.length, ALLOWED_PATHS.size, `unexpected git status lines:\n${status}`);
    for (const path of paths) {
      assert.ok(ALLOWED_PATHS.has(path), `unexpected changed path: ${path}`);
    }
  });

  it('tracked runtime and classifier artifacts unchanged', () => {
    const diffNames = execSync('git diff --name-only', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    assert.equal(diffNames, '', 'tracked files must not be modified');

    const runtimeProbe = execSync('git diff --name-only -- app lib docs/planning', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    assert.equal(runtimeProbe, '', 'runtime/classifier paths must not be modified');

    const untrackedRuntime = execSync(
      'git ls-files --others --exclude-standard -- app lib docs/planning',
      { cwd: process.cwd(), encoding: 'utf8' }
    )
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    for (const path of untrackedRuntime) {
      assert.ok(ALLOWED_PATHS.has(path), `unexpected untracked path: ${path}`);
    }
  });
});
