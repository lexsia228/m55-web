import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const MIGRATION_FILENAME = '20260615000005_m55_dtr_visible_report_uniqueness_v1.sql';
const MIGRATION = join(process.cwd(), 'supabase/migrations', MIGRATION_FILENAME);
const DTR_DRAFT_DB = join(process.cwd(), 'lib/m55/dtrDraftDb.ts');

const ALLOWED_PATHS = new Set([
  `supabase/migrations/${MIGRATION_FILENAME}`,
  'supabase/migrations/20260615000006_m55_entitlements_unique_index_cleanup_v1.sql',
  'lib/m55/dtrVisibleReportUniqueness.local.test.ts',
  'lib/m55/entitlementsUniqueIndexCleanup.local.test.ts',
]);

const FORBIDDEN_DO_PATTERNS = [
  /INSERT\s+INTO\s+public\.dtr_report_snapshots\b/i,
  /UPDATE\s+public\.dtr_report_snapshots\b/i,
  /DELETE\s+FROM\s+public\.dtr_report_snapshots\b/i,
  /TRUNCATE\s+public\.dtr_report_snapshots\b/i,
  /DROP\s+TABLE\b/i,
  /CREATE\s+TABLE\b/i,
  /ALTER\s+COLUMN\b/i,
  /DROP\s+INDEX\b/i,
  /CREATE\s+INDEX\b/i,
  /CREATE\s+POLICY\b/i,
  /DROP\s+POLICY\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /NOTIFY\s+pgrst\b/i,
  /CASCADE\b/i,
  /DROP\s+CONSTRAINT\s+IF\s+EXISTS/i,
  /DROP\s+INDEX\s+IF\s+EXISTS/i,
  /dtr_report_snapshots_user_id_product_id_key/,
  /FOR\s+\w+\s+IN[\s\S]*DROP\s+CONSTRAINT/i,
  /EXECUTE\s+format\([\s\S]*DROP\s+CONSTRAINT/i,
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

describe('dtrVisibleReportUniqueness — migration file contract', () => {
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
    assert.match(body, /public\.dtr_report_snapshots/);
    assert.equal(countOccurrences(body, /public\.entitlements/g), 0);
    assert.equal(countOccurrences(body, /public\.entitlement_rights/g), 0);
  });

  it('4. exact constraint name only to DROP', () => {
    assert.ok(body.includes('dtr_report_snapshots_user_product_key'));
    assert.equal(body.includes('dtr_report_snapshots_user_id_product_id_key'), false);
  });

  it('5. ALTER TABLE DROP CONSTRAINT exact one statement', () => {
    assert.equal(
      countOccurrences(
        body,
        /ALTER\s+TABLE\s+public\.dtr_report_snapshots\s+DROP\s+CONSTRAINT\s+dtr_report_snapshots_user_product_key/gi
      ),
      1
    );
  });

  it('6. no DDL IF EXISTS', () => {
    assert.equal(/DROP\s+CONSTRAINT\s+IF\s+EXISTS/i.test(body), false);
    assert.equal(/DROP\s+INDEX\s+IF\s+EXISTS/i.test(body), false);
  });

  it('7. no CASCADE', () => {
    assert.equal(/CASCADE/i.test(body), false);
  });

  it('8. no DROP INDEX', () => {
    assert.equal(/DROP\s+INDEX/i.test(body), false);
  });

  it('9. partial UNIQUE name used for maintain verification', () => {
    assert.ok(body.includes('dtr_report_snapshots_one_visible_per_user_product_uq'));
    assert.match(body, /partial unique index dtr_report_snapshots_one_visible_per_user_product_uq missing/);
  });

  it('10. partial UNIQUE is not dropped', () => {
    assert.equal(
      countOccurrences(
        body,
        /DROP\s+(?:CONSTRAINT|INDEX)\s+[\w.]*dtr_report_snapshots_one_visible_per_user_product_uq/gi
      ),
      0
    );
  });

  it('11. same-key exact pre/post name set checks', () => {
    assert.match(body, /v_pre_same_key_index_names/);
    assert.match(body, /v_post_same_key_index_names/);
    assert.match(body, /dtr_report_snapshots_one_visible_per_user_product_uq/);
    assert.match(body, /dtr_report_snapshots_user_product_key/);
    assert.match(body, /same-key index name set is %, expected \{dtr_report_snapshots_one_visible_per_user_product_uq\}/);
  });

  it('23. migration references indislive for partial index access', () => {
    assert.match(body, /i\.indislive/);
    assert.match(body, /v_partial_index_live/);
    assert.match(body, /partial unique index is not valid\/ready\/live/);
  });

  it('24. partial live variable sourced from indislive not duplicate indisvalid', () => {
    assert.match(body, /i\.indisvalid,\s*i\.indisready,\s*i\.indislive/);
    assert.equal(
      /i\.indisvalid,\s*i\.indisready,\s*i\.indisvalid/.test(body),
      false,
      'old false-green indisvalid triple must be absent'
    );
  });

  it('25. pg_am btree contract for global and partial indexes', () => {
    assert.match(body, /JOIN pg_am am/);
    assert.match(body, /am\.amname = 'btree'/);
    assert.equal(countOccurrences(body, /am\.amname = 'btree'/g), 5);
  });

  it('26. same-key inventory uses pg_index without predicate filter', () => {
    const preInventoryStart = body.indexOf('INTO v_pre_same_key_index_names');
    const preInventoryEnd = body.indexOf('IF v_pre_same_key_index_names IS DISTINCT FROM', preInventoryStart);
    assert.ok(preInventoryStart >= 0, 'pre same-key inventory SELECT missing');
    assert.ok(preInventoryEnd > preInventoryStart, 'pre same-key inventory IF missing');
    const preInventoryBlock = body.slice(preInventoryStart, preInventoryEnd);
    assert.match(preInventoryBlock, /FROM pg_class ic/);
    assert.match(preInventoryBlock, /JOIN pg_index i/);
    assert.equal(
      /i\.indpred/.test(preInventoryBlock),
      false,
      'pre same-key inventory must not filter by predicate presence'
    );
  });

  it('27. pre exact name set two indexes asserted', () => {
    assert.match(
      body,
      /v_pre_same_key_index_names IS DISTINCT FROM ARRAY\[\s*'dtr_report_snapshots_one_visible_per_user_product_uq',\s*'dtr_report_snapshots_user_product_key'\s*\]::text\[\]/
    );
  });

  it('28. post exact name set one index asserted', () => {
    assert.match(
      body,
      /v_post_same_key_index_names IS DISTINCT FROM ARRAY\[\s*'dtr_report_snapshots_one_visible_per_user_product_uq'\s*\]::text\[\]/
    );
  });

  it('29. partial postcondition revalidates full btree shape', () => {
    assert.match(body, /postcondition failed: partial unique index full shape mismatch after mutation/);
    assert.match(body, /am\.amname = 'btree'[\s\S]*user_hidden_atisnull/);
    assert.match(body, /i\.indislive[\s\S]*NOT EXISTS[\s\S]*pg_constraint c2/);
    assert.match(body, /indnkeyatts = 2/);
    assert.match(body, /indnatts = 2/);
  });

  it('30. global backing index precondition includes live btree shape', () => {
    assert.match(body, /global constraint backing index shape mismatch/);
    assert.match(body, /v_global_con_ind_oid[\s\S]*am\.amname = 'btree'[\s\S]*i\.indislive/);
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
    assert.match(body, /constraint count changed from % to %, expected %/);
    assert.match(body, /index count changed from % to %, expected %/);
    assert.match(body, /v_unrelated_constraint_names/);
    assert.match(body, /v_unrelated_index_names/);
  });

  it('14. no application-row DML or NOTIFY', () => {
    for (const pattern of FORBIDDEN_DO_PATTERNS) {
      assert.equal(pattern.test(body), false, `forbidden pattern in DO body: ${pattern}`);
    }
  });

  it('15. no generic fallback DROP', () => {
    assert.equal(/EXECUTE\s+format/i.test(body), false);
    assert.equal(/FOR\s+\w+\s+IN/i.test(body), false);
  });

  it('16. header documents purpose and production evidence', () => {
    assert.match(sql, /dtr_report_snapshots_user_product_key/);
    assert.match(sql, /dtr_report_snapshots_one_visible_per_user_product_uq/);
    assert.match(sql, /INSERT-only/);
  });
});

describe('dtrVisibleReportUniqueness — runtime dependency contract', () => {
  const runtime = readFileSync(DTR_DRAFT_DB, 'utf8');
  const upsertBlock = runtime.slice(runtime.indexOf('upsertDtrReportSnapshotAtFulfillment'));

  it('17. snapshot write path uses insert', () => {
    assert.match(upsertBlock, /\.insert\(insertRow\)/);
  });

  it('18. snapshot write path has no upsert', () => {
    assert.equal(upsertBlock.includes('.upsert('), false);
  });

  it('19. snapshot write path has no onConflict', () => {
    assert.equal(upsertBlock.includes('onConflict'), false);
  });

  it('20. 23505 handling maintained', () => {
    assert.ok(upsertBlock.includes("error.code === '23505'"));
  });

  it('21. visible reread marker maintained', () => {
    assert.ok(upsertBlock.includes('getVisibleDtrReportSnapshot'));
  });

  it('22. runtime file unchanged in git diff', () => {
    const diffNames = execSync('git diff --name-only -- lib/m55/dtrDraftDb.ts', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    assert.equal(diffNames, '');
  });
});

describe('dtrVisibleReportUniqueness — repository scope', () => {
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
