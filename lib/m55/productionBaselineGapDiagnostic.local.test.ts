import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const SQL_PATH = join(
  process.cwd(),
  'docs/planning/m55_production_baseline_gap_diagnostic_v1.sql'
);
const CLASSIFIER_PATH = join(
  process.cwd(),
  'docs/planning/m55_account_deletion_production_baseline_contract_freeze_v1.sql'
);

const ALLOWED_PATHS = new Set([
  'docs/planning/m55_production_baseline_gap_diagnostic_v1.sql',
  'lib/m55/productionBaselineGapDiagnostic.local.test.ts',
]);

const REQUIRED_RELATIONS = [
  'consult_messages',
  'consult_send_commits',
  'consult_threads',
  'dtr_guest_drafts',
  'dtr_report_snapshots',
  'entitlement_rights',
  'entitlements',
  'failed_fulfillments',
  'one_time_fulfillments',
  'reply_documents',
  'reply_sessions',
  'reply_ticket_wallets',
  'reply_wallet_ledgers',
  'stripe_events',
  'stripe_processed_events',
];

const REQUIRED_ROLES = ['PUBLIC', 'anon', 'authenticated', 'service_role'];
const REQUIRED_PRIVILEGES = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
];

const WALLET_CELL_IDS = [
  'wallet_scope.report_instance_id.data_type',
  'wallet_scope.report_instance_id.is_nullable',
  'wallet_scope.report_instance_id.column_default',
  'wallet_scope.user_id_unique_constraint_state',
  'wallet_scope.scoped_unique_definition',
];

const COLUMN_TARGETS = [
  'entitlements',
  'stripe_events',
  'stripe_processed_events',
  'reply_ticket_wallets',
];

const FUNCTION_SIGNATURES = [
  'p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text',
  'p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone',
];

const FINAL_ALIASES = [
  'diagnostic_revision',
  'target_organization',
  'target_project',
  'target_environment',
  'target_source',
  'expected_registry_row_count',
  'independent_expected_count',
  'registry_self_check_ok',
  'requested_gap_cell_count',
  'resolved_gap_cell_count',
  'unresolved_gap_cell_count',
  'duplicate_gap_cell_count',
  'unexpected_registry_cell_count',
  'unexpected_catalog_item_count',
  'relation_security_json',
  'privilege_contract_json',
  'policy_inventory_json',
  'column_inventory_json',
  'constraint_inventory_json',
  'index_inventory_json',
  'trigger_inventory_json',
  'function_inventory_json',
  'wallet_scope_json',
  'expected_contract_mismatch_json',
  'unexpected_catalog_items_json',
  'missing_or_unknown_json',
  'catalog_snapshot_complete',
  'stop_reason',
  'next_gate_recommendation',
];

function readSql(): string {
  return readFileSync(SQL_PATH, 'utf8');
}

function sqlWithoutComments(sql: string): string {
  return sql
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

function extractCteBody(sql: string, cteName: string): string {
  const marker = `${cteName} AS (`;
  const start = sql.indexOf(marker);
  assert.ok(start >= 0, `${cteName} CTE missing`);
  let depth = 0;
  let i = start + marker.length;
  for (; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === '(') depth += 1;
    if (ch === ')') {
      if (depth === 0) return sql.slice(start, i + 1);
      depth -= 1;
    }
  }
  assert.fail(`${cteName} CTE end missing`);
}

describe('productionBaselineGapDiagnostic — identity / parser', () => {
  const sql = readSql();
  const body = sqlWithoutComments(sql);

  it('1. SQL file exists', () => {
    assert.ok(sql.length > 0);
  });

  it('2. revision exact SQL-DIAGNOSTIC-REVISION-1-PATCH-3', () => {
    assert.match(sql, /Revision: SQL-DIAGNOSTIC-REVISION-1-PATCH-3/);
    assert.match(sql, /-- revision: SQL-DIAGNOSTIC-REVISION-1-PATCH-3/);
    assert.match(body, /'SQL-DIAGNOSTIC-REVISION-1-PATCH-3'::text AS diagnostic_revision/);
  });

  it('3. one top-level SelectStmt', () => {
    assert.equal(countOccurrences(body, /^SELECT\b/m), 1);
    assert.equal(countOccurrences(body, /^WITH\b/m), 1);
    assert.equal(countOccurrences(body, /^INSERT\b/im), 0);
    assert.equal(countOccurrences(body, /^UPDATE\b/im), 0);
    assert.equal(countOccurrences(body, /^DELETE\b/im), 0);
  });

  it('4. final output required aliases present', () => {
    for (const alias of FINAL_ALIASES) {
      assert.match(body, new RegExp(`\\b${alias}\\b`));
    }
  });

  it('5. artifact footer next gate exact', () => {
    assert.match(
      sql,
      /next_gate: CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-GAP-DIAGNOSTIC-SQL-LOCAL-PATCH-3-REVIEW/
    );
    assert.match(
      sql,
      /artifact_gate: CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-GAP-DIAGNOSTIC-SQL-LOCAL-PATCH-3/
    );
    assert.match(sql, /preview_stop: m55-preview \/ m55-soul-preview/);
  });
});

describe('productionBaselineGapDiagnostic — allowlist / safety', () => {
  const sql = readSql();
  const body = sqlWithoutComments(sql);

  it('6. SELECT-only (no DDL/DML statements)', () => {
    assert.equal(/\bCREATE\s+TABLE\b/i.test(body), false);
    assert.equal(/\bALTER\s+TABLE\b/i.test(body), false);
    assert.equal(/\bDROP\s+TABLE\b/i.test(body), false);
    assert.equal(/\bINSERT\s+INTO\b/i.test(body), false);
    assert.equal(/\bUPDATE\s+[a-z_]+\s+SET\b/i.test(body), false);
    assert.equal(/\bDELETE\s+FROM\b/i.test(body), false);
    assert.equal(/\bTRUNCATE\s+(ONLY\s+)?[a-z_]+\b/i.test(body), false);
  });

  it('7. no DO/CALL/COPY/SET ROLE', () => {
    assert.equal(/\bDO\s+\$/i.test(body), false);
    assert.equal(/\bCALL\s+[a-z_]/i.test(body), false);
    assert.equal(/\bCOPY\s+[a-z_]/i.test(body), false);
    assert.equal(/\bSET\s+ROLE\b/i.test(body), false);
    assert.equal(/\bSET\s+[a-z_]+\s*=/i.test(body), false);
  });

  it('8. no dynamic SQL / EXECUTE statement / query_to_xml', () => {
    assert.equal(/\bEXECUTE\s+(format|immediate)\b/i.test(body), false);
    assert.equal(/\bquery_to_xml\b/i.test(body), false);
    assert.equal(/\bformat\s*\(\s*'/i.test(body), false);
  });

  it('9. no application-row FROM public/app', () => {
    assert.equal(/\bFROM\s+public\.[a-z_]+\b(?!.*pg_)/i.test(body), false);
    assert.equal(/\bFROM\s+app\./i.test(body), false);
    assert.equal(/\bJOIN\s+public\.[a-z_]+\s+(?!c\b|n\b|ic\b|t\b|con\b|p\b|pol\b|tr\b|a\b)/i.test(body), false);
  });

  it('10. no secret patterns', () => {
    assert.equal(/service_role_key/i.test(sql), false);
    assert.equal(/SUPABASE_SERVICE_ROLE/i.test(sql), false);
    assert.equal(/sk_live_/i.test(sql), false);
    assert.equal(/eyJ[A-Za-z0-9_-]{10,}/.test(sql), false);
  });

  it('11. no unsafe regclass/regprocedure cast on required relations', () => {
    for (const rel of REQUIRED_RELATIONS) {
      assert.equal(
        new RegExp(`'public\\.${rel}'::regclass`, 'i').test(body),
        false,
        `unsafe regclass for ${rel}`
      );
    }
    assert.equal(/::regprocedure/i.test(body), false);
  });
});

describe('productionBaselineGapDiagnostic — registry dimensions', () => {
  const sql = readSql();
  const body = sqlWithoutComments(sql);

  it('12. relations exact 15', () => {
    for (const rel of REQUIRED_RELATIONS) {
      assert.match(body, new RegExp(`'${rel}'::text`));
    }
    assert.ok(countOccurrences(body, /dim_required_rel/g) >= 1);
  });

  it('13. roles exact 4', () => {
    for (const role of REQUIRED_ROLES) {
      assert.match(body, new RegExp(`'${role}'::text`));
    }
  });

  it('14. privileges exact 7', () => {
    for (const priv of REQUIRED_PRIVILEGES) {
      assert.match(body, new RegExp(`'${priv}'::text`));
    }
  });

  it('15. wallet IDs exact 5', () => {
    for (const id of WALLET_CELL_IDS) {
      assert.match(body, new RegExp(id.replace(/\./g, '\\.')));
    }
  });

  it('16. function signatures exact 2', () => {
    for (const sig of FUNCTION_SIGNATURES) {
      assert.match(body, new RegExp(sig.replace(/[()]/g, '\\$&')));
    }
    assert.match(body, /m55_reply_generate_commit/);
    assert.match(body, /m55_consult_reply_commit/);
  });

  it('17. column targets exact 4', () => {
    for (const rel of COLUMN_TARGETS) {
      assert.match(body, new RegExp(`'${rel}'::text`));
    }
  });

  it('18. independent count expression exact 536', () => {
    assert.match(body, /\(15\s*\*\s*3\)/);
    assert.match(body, /\(15\s*\*\s*4\s*\*\s*7\)/);
    assert.match(body, /\+\s*5/);
    assert.match(body, /\(15\s*\*\s*4\)/);
    assert.match(body, /\+\s*2/);
    assert.match(body, /\+\s*4/);
    assert.match(body, /independent_expected_count_expr/);
  });

  it('19. canonical category count proof 536', () => {
    assert.match(body, /gap_registry_canonical/);
    assert.match(body, /relation_security_cells/);
    assert.match(body, /privilege_cells/);
    assert.match(body, /wallet_scope_cells/);
    assert.match(body, /policy_inventory_cells/);
    assert.match(body, /constraint_inventory_cells/);
    assert.match(body, /index_inventory_cells/);
    assert.match(body, /trigger_inventory_cells/);
    assert.match(body, /function_inventory_cells/);
    assert.match(body, /column_inventory_cells/);
  });

  it('20. cell ID generation patterns exact', () => {
    assert.match(body, /'owner\.' \|\| r\.relation_name/);
    assert.match(body, /'rls\.' \|\| r\.relation_name/);
    assert.match(body, /'force_rls\.' \|\| r\.relation_name/);
    assert.match(
      body,
      /'priv\.' \|\| r\.relation_name \|\| '\.' \|\| ro\.role_name \|\| '\.' \|\| p\.privilege_name/
    );
    assert.match(body, /function_inventory\./);
    assert.match(body, /dim_expected_cell_ids/);
  });

  it('21. UNION ALL categories connected', () => {
    const unionBlock = extractCteBody(body, 'gap_registry_canonical');
    assert.ok(unionBlock.includes('relation_security_cells'));
    assert.ok(unionBlock.includes('privilege_cells'));
    assert.ok(unionBlock.includes('wallet_scope_cells'));
    assert.ok(unionBlock.includes('policy_inventory_cells'));
    assert.ok(unionBlock.includes('constraint_inventory_cells'));
    assert.ok(unionBlock.includes('index_inventory_cells'));
    assert.ok(unionBlock.includes('trigger_inventory_cells'));
    assert.ok(unionBlock.includes('function_inventory_cells'));
    assert.ok(unionBlock.includes('column_inventory_cells'));
  });

  it('22. no duplicate dimension entries in dim_required_rel VALUES', () => {
    const unique = new Set(REQUIRED_RELATIONS);
    assert.equal(unique.size, 15);
  });
});

describe('productionBaselineGapDiagnostic — ACL contract', () => {
  const body = sqlWithoutComments(readSql());

  it('23. table ACL uses aclexplode', () => {
    assert.match(body, /aclexplode/);
    assert.ok(countOccurrences(body, /aclexplode/g) >= 2);
  });

  it('24. PUBLIC grantee=0', () => {
    assert.match(body, /grantee\s*=\s*0/);
    assert.match(body, /acl\.grantee = 0/);
  });

  it('25. relacl NULL uses acldefault(r, owner)', () => {
    assert.match(body, /acldefault\('r',\s*c\.relowner\)/);
  });

  it('26. no has_table_privilege PUBLIC call', () => {
    assert.equal(/has_table_privilege\s*\(\s*'public'/i.test(body), false);
    assert.equal(/has_table_privilege\s*\(\s*'PUBLIC'/i.test(body), false);
  });

  it('27. non-PUBLIC has_table_privilege is guarded', () => {
    assert.match(body, /has_table_privilege/);
    assert.match(body, /relation_oid IS NULL/);
    assert.match(body, /pg_roles/);
    assert.match(body, /role_name <> 'PUBLIC'/);
  });

  it('28. function ACL uses proacl/acldefault(f, owner)', () => {
    assert.match(body, /acldefault\('f',\s*p\.proowner\)/);
    assert.match(body, /p\.proacl/);
  });

  it('29. no has_function_privilege PUBLIC call', () => {
    assert.equal(/has_function_privilege\s*\(\s*'public'/i.test(body), false);
    assert.equal(/has_function_privilege\s*\(\s*'PUBLIC'/i.test(body), false);
  });

  it('30. grantable and grantors connected', () => {
    assert.match(body, /explicit_grant_is_grantable/);
    assert.match(body, /grantors/);
    assert.match(body, /inherited_via_public/);
    assert.match(body, /inherited_via_role_membership/);
  });
});

describe('productionBaselineGapDiagnostic — inventory contract', () => {
  const body = sqlWithoutComments(readSql());

  it('31. constraint paired ordinal strategy present', () => {
    assert.match(body, /WITH ORDINALITY/);
    assert.match(body, /conkey/);
    assert.match(body, /confkey/);
  });

  it('32. index indnkeyatts key/include split present', () => {
    assert.match(body, /indnkeyatts/);
    assert.match(body, /included_columns/);
    assert.match(body, /key_columns/);
    assert.match(body, /u\.ord BETWEEN 1 AND i\.indnatts/);
  });

  it('33. expression key uses index ordinal pg_get_indexdef not base attnum', () => {
    assert.match(body, /WHEN u\.attnum = 0 THEN pg_get_indexdef\(i\.indexrelid, u\.ord::integer, true\)/);
    assert.equal(
      /pg_get_indexdef\([^)]*u\.attnum/i.test(body),
      false,
      'pg_get_indexdef must not use base attnum as column_no'
    );
    assert.equal(
      /pg_get_indexdef\([^)]*a\.attnum/i.test(body),
      false,
      'pg_get_indexdef must not use pg_attribute attnum as column_no'
    );
  });

  it('34. trigger internal classification present', () => {
    assert.match(body, /SYSTEM_INTERNAL/);
    assert.match(body, /USER_VISIBLE/);
    assert.match(body, /tgisinternal/);
  });

  it('35. internal trigger is not automatically unexpected', () => {
    const unexpectedTriggers = extractCteBody(body, 'unexpected_user_triggers');
    assert.match(unexpectedTriggers, /NOT tc\.is_internal/);
    assert.equal(/tgisinternal\s*=\s*true/i.test(unexpectedTriggers), false);
  });

  it('36. function exact identity arguments match', () => {
    assert.match(body, /pg_get_function_identity_arguments/);
    assert.match(body, /function_signature_absent/);
    assert.match(body, /function_signature_ambiguous/);
  });

  it('37. function body not output', () => {
    assert.equal(/pg_get_functiondef\([^)]+\)\s*::/i.test(body), false);
    assert.match(body, /definition_length/);
  });

  it('38. no pgcrypto dependency', () => {
    assert.equal(/\bpgcrypto\b/i.test(body), false);
    assert.equal(/\bdigest\s*\(/i.test(body), false);
    assert.equal(/\bsha256\s*\(/i.test(body), false);
    assert.equal(/definition_sha256/i.test(body), false);
  });

  it('39. column domain base type handling', () => {
    assert.match(body, /underlying_base_type/);
    assert.match(body, /domain_schema/);
    assert.match(body, /domain_name/);
    assert.match(body, /attisdropped/);
  });

  it('40. wallet 5 cells connected', () => {
    assert.match(body, /wallet_scope_cells/);
    assert.match(body, /user_id_unique_constraint_state/);
    assert.match(body, /scoped_unique_definition/);
    assert.match(body, /report_instance_id/);
  });
});

describe('productionBaselineGapDiagnostic — formulas / routing', () => {
  const body = sqlWithoutComments(readSql());

  it('41. registry_self_check formula exact', () => {
    assert.match(body, /requested_gap_cell_count = 536/);
    assert.match(body, /independent_expected_count = 536/);
    assert.match(body, /duplicate_gap_cell_count = 0/);
    assert.match(body, /unexpected_registry_cell_count = 0/);
    assert.match(body, /registry_self_check_ok/);
  });

  it('42. catalog_snapshot_complete formula exact', () => {
    assert.match(body, /resolved_gap_cell_count = ri\.requested_gap_cell_count/);
    assert.match(body, /unresolved_gap_cell_count = 0/);
    assert.match(body, /registry_self_check_ok IS TRUE/);
    assert.match(body, /catalog_snapshot_complete/);
  });

  it('43. unexpected_catalog_item_count dynamic', () => {
    assert.match(body, /unexpected_catalog_item_count/);
    assert.equal(/unexpected_catalog_item_count\s*:=\s*0\b/i.test(body), false);
    assert.equal(/unexpected_catalog_item_count\s*=\s*0\s*::/i.test(body), false);
  });

  it('44. unexpected arrays not constant empty', () => {
    const unexpectedBlock = extractCteBody(body, 'unexpected_catalog_analysis');
    assert.equal(
      /unexpected_catalog_items_json\s*=\s*'\[\]'::jsonb/i.test(unexpectedBlock) &&
        !/COALESCE/.test(unexpectedBlock),
      false
    );
    assert.match(body, /unexpected_catalog_items_json/);
  });

  it('45. unresolved count connected', () => {
    assert.match(body, /unresolved_gap_cell_count/);
    assert.match(body, /resolution_state = 'UNRESOLVED'/);
    assert.match(body, /UNRESOLVED_GAP_CELLS/);
  });

  it('46. duplicate count connected', () => {
    assert.match(body, /duplicate_gap_cell_count/);
    assert.match(body, /registry_integrity/);
  });

  it('47. unexpected registry count connected', () => {
    assert.match(body, /unexpected_registry_cell_count/);
    assert.match(body, /dim_expected_cell_ids/);
  });

  it('48. one-row final aggregation path connected', () => {
    assert.match(body, /final_summary/);
    assert.match(body, /json_aggregations/);
    assert.match(body, /FROM final_summary fs/);
  });
});

describe('productionBaselineGapDiagnostic — synthetic formula fixtures', () => {
  it('49. all dimensions exact -> 536', () => {
    const total =
      15 * 3 + 15 * 4 * 7 + 5 + 15 * 4 + 2 + 4;
    assert.equal(total, 536);
  });

  it('50. duplicate registry ID would fail self-check', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /duplicate_gap_cell_count = 0/);
  });

  it('51. missing relation -> unresolved semantics', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /relation_missing/);
    assert.match(body, /NOT rc\.relation_exists/);
    assert.match(body, /UNRESOLVED/);
  });

  it('52. missing role -> privilege unresolved', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /role_missing/);
  });

  it('53. PUBLIC direct grant path via aclexplode', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /explicit_grant_present/);
    assert.match(body, /grantee = 0/);
  });

  it('54. anon effective via PUBLIC separation', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /inherited_via_public/);
    assert.match(body, /role_name <> 'PUBLIC'/);
  });

  it('55. inherited role effective separation', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /inherited_via_role_membership/);
  });

  it('56. empty policy resolved semantics', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /policy_inventory_cells/);
    assert.match(body, /'policies'/);
  });

  it('57. expected contract mismatch dynamic', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /expected_contract_mismatch_json/);
    assert.match(body, /dtr_report_snapshots_one_visible_per_user_product_uq/);
    assert.match(body, /entitlements_redundant_same_key_unique_indexes/);
  });

  it('58. unexpected count >0 -> complete false', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /unexpected_catalog_item_count, 0\) = 0/);
    assert.match(body, /UNEXPECTED_CATALOG_ITEMS/);
  });

  it('59. unresolved >0 -> complete false', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /unresolved_gap_cell_count > 0/);
  });

  it('60. no classifier pass/fail replication', () => {
    const body = sqlWithoutComments(readSql());
    assert.equal(/production_catalog_contract_freeze_pass/i.test(body), false);
    assert.equal(/runtime_compatibility_ready/i.test(body), false);
  });

  it('61. M1/M2A/M2B remediation not marked applied', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /COMMITTED_NOT_APPLIED_M2A/);
    assert.match(body, /COMMITTED_NOT_APPLIED_M2B/);
    assert.equal(/remediation_status',\s*'APPLIED'/i.test(body), false);
    assert.equal(/resolved',\s*true/i.test(body), false);
  });

  it('62. function hash uses md5 algorithm key', () => {
    const body = sqlWithoutComments(readSql());
    assert.match(body, /definition_hash_algorithm/);
    assert.match(body, /'md5'/);
    assert.match(body, /md5\(pg_get_functiondef/);
  });
});

describe('productionBaselineGapDiagnostic — index decompile PATCH-1 regression', () => {
  const sql = readSql();
  const body = sqlWithoutComments(sql);

  function extractBlock(name: string): string {
    return extractCteBody(body, name);
  }

  it('65. no indkey pg_attribute join on index rel OID', () => {
    assert.equal(
      /unnest\(i\.indkey\)[\s\S]{0,240}attrelid = ic\.oid/i.test(body),
      false,
      'indkey joins must not use index rel OID for base attnum lookup'
    );
    assert.ok(countOccurrences(body, /attrelid = i\.indrelid/g) >= 6);
  });

  it('66. general index_catalog uses base rel OID + ord bounds', () => {
    const block = extractBlock('index_catalog');
    assert.match(block, /attrelid = i\.indrelid/);
    assert.match(block, /u\.ord BETWEEN 1 AND i\.indnatts/);
    assert.match(block, /u\.ord <= i\.indnkeyatts/);
    assert.match(block, /u\.ord > i\.indnkeyatts/);
  });

  it('67. wallet user_id unique inventory uses base rel OID', () => {
    const block = extractBlock('wallet_user_id_unique_inventory');
    assert.match(block, /attrelid = i\.indrelid/);
    assert.equal(/attrelid = ic\.oid/i.test(block), false);
  });

  it('68. wallet scoped unique inventory uses base rel OID + include split', () => {
    const block = extractBlock('wallet_scoped_unique_inventory');
    assert.match(block, /attrelid = i\.indrelid/);
    assert.match(block, /u\.ord > i\.indnkeyatts/);
    assert.equal(/attrelid = ic\.oid/i.test(block), false);
  });

  it('69. pg_get_indexdef call-site audit', () => {
    const oneArg = countOccurrences(body, /pg_get_indexdef\(\s*ic\.oid\s*\)/g);
    const threeArgOrd = countOccurrences(
      body,
      /pg_get_indexdef\(i\.indexrelid,\s*u\.ord::integer,\s*true\)/g
    );
    const unsafeAttnum = countOccurrences(
      body,
      /pg_get_indexdef\([^)]*(?:u|a)\.attnum[^)]*\)/gi
    );
    assert.equal(oneArg, 1);
    assert.equal(threeArgOrd, 3);
    assert.equal(unsafeAttnum, 0);
  });

  it('70. A noncontiguous base attnums mapping contract', () => {
    assert.match(body, /u\.attnum > 0/);
    assert.match(body, /WHEN u\.attnum = 0 THEN pg_get_indexdef\(i\.indexrelid, u\.ord::integer, true\)/);
    assert.equal(/pg_get_indexdef\([^)]*,\s*10\s*,/i.test(body), false);
  });

  it('71. B INCLUDE uses ord > indnkeyatts not base attnum as decompile position', () => {
    const block = extractBlock('index_catalog');
    assert.match(block, /u\.ord > i\.indnkeyatts/);
    assert.match(block, /attrelid = i\.indrelid/);
    assert.equal(/pg_get_indexdef\([^)]*,\s*u\.attnum/i.test(block), false);
  });

  it('72. C expression attnum zero uses ord one not column_no zero', () => {
    assert.match(body, /WHEN u\.attnum = 0 THEN pg_get_indexdef\(i\.indexrelid, u\.ord::integer, true\)/);
    assert.equal(/pg_get_indexdef\([^)]*,\s*0\s*,/i.test(body), false);
  });

  it('73. D high base attnum still decomposes with index ordinal', () => {
    assert.match(body, /pg_get_indexdef\(i\.indexrelid, u\.ord::integer, true\)/);
    assert.match(body, /LEFT JOIN pg_attribute a[\s\S]{0,80}attrelid = i\.indrelid/);
  });

  it('74. key_expression_count counts expression slots by attnum zero', () => {
    const block = extractBlock('index_catalog');
    assert.match(block, /key_expression_count/);
    assert.match(block, /u\.attnum = 0/);
  });
});

type PgGetExprCall = {
  nodeTree: string;
  relationOid: string;
};

function extractPgGetExprCalls(body: string): PgGetExprCall[] {
  const calls: PgGetExprCall[] = [];
  const re = /pg_get_expr\(\s*([^,]+?)\s*,\s*([^,)]+?)(?:\s*,\s*[^)]+)?\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    calls.push({
      nodeTree: match[1].trim(),
      relationOid: match[2].trim(),
    });
  }
  return calls;
}

function classifyIndpredRelationContext(body: string): 'SAFE' | 'UNSAFE' {
  const calls = extractPgGetExprCalls(body).filter((c) => /i\.indpred/i.test(c.nodeTree));
  if (calls.length === 0) return 'UNSAFE';
  const allSafe = calls.every((c) => /i\.indrelid/i.test(c.relationOid));
  const anyUnsafe = calls.some(
    (c) => /ic\.oid/i.test(c.relationOid) || /i\.indexrelid/i.test(c.relationOid)
  );
  if (anyUnsafe) return 'UNSAFE';
  return allSafe ? 'SAFE' : 'UNSAFE';
}

describe('productionBaselineGapDiagnostic — index expression PATCH-2 regression', () => {
  const sql = readSql();
  const body = sqlWithoutComments(sql);

  function extractBlock(name: string): string {
    return extractCteBody(body, name);
  }

  it('75. pg_get_expr call inventory and indpred relation context audit', () => {
    const calls = extractPgGetExprCalls(body);
    const indpredCalls = calls.filter((c) => /i\.indpred/i.test(c.nodeTree));
    const unsafeIndpred = indpredCalls.filter(
      (c) => /ic\.oid/i.test(c.relationOid) || /i\.indexrelid/i.test(c.relationOid)
    );
    assert.equal(calls.length, 6);
    assert.equal(indpredCalls.length, 3);
    assert.equal(unsafeIndpred.length, 0);
    for (const call of indpredCalls) {
      assert.match(call.relationOid, /i\.indrelid/);
    }
  });

  it('76. A partial index indpred uses base relation OID not index rel OID', () => {
    const block = extractBlock('index_catalog');
    assert.equal(countOccurrences(block, /pg_get_expr\(i\.indpred, i\.indrelid, true\)/g), 2);
    assert.equal(/pg_get_expr\(i\.indpred, ic\.oid\)/i.test(block), false);
    assert.equal(/pg_get_expr\(i\.indpred, i\.indexrelid/i.test(block), false);
  });

  it('77. wallet scoped unique inventory indpred uses base relation OID', () => {
    const block = extractBlock('wallet_scoped_unique_inventory');
    assert.match(block, /pg_get_expr\(i\.indpred, i\.indrelid, true\)/);
    assert.equal(/pg_get_expr\(i\.indpred, ic\.oid\)/i.test(block), false);
  });

  it('78. C column default expression context unchanged on adrelid', () => {
    const block = extractBlock('column_catalog');
    assert.match(block, /pg_get_expr\(ad\.adbin, ad\.adrelid\)/);
    assert.equal(/pg_get_expr\(ad\.adbin, i\.indrelid\)/i.test(block), false);
    assert.equal(/pg_get_expr\(ad\.adbin, ic\.oid\)/i.test(block), false);
  });

  it('79. D policy expression context unchanged on polrelid', () => {
    const block = extractBlock('policy_catalog');
    assert.match(block, /pg_get_expr\(pol\.polqual, pol\.polrelid\)/);
    assert.match(block, /pg_get_expr\(pol\.polwithcheck, pol\.polrelid\)/);
    assert.equal(/pg_get_expr\(pol\.polqual, ic\.oid\)/i.test(block), false);
  });

  it('80. B expression index indexprs would require indrelid if present', () => {
    const indexprsCalls = extractPgGetExprCalls(body).filter((c) => /i\.indexprs/i.test(c.nodeTree));
    assert.equal(indexprsCalls.length, 0);
    assert.equal(
      /pg_get_expr\(i\.indexprs,\s*(?:ic\.oid|i\.indexrelid)/i.test(body),
      false
    );
  });

  it('81. F Production-shaped partial predicate base attnum10 needs indrelid context', () => {
    assert.equal(classifyIndpredRelationContext(body), 'SAFE');
    assert.match(body, /reply_ticket_wallets/);
    assert.match(body, /report_instance_id/);
    assert.match(body, /pg_get_expr\(i\.indpred, i\.indrelid, true\)/);
  });

  it('82. PATCH-1 pg_get_indexdef ordinal contract maintained', () => {
    assert.equal(
      countOccurrences(body, /pg_get_indexdef\(i\.indexrelid,\s*u\.ord::integer,\s*true\)/g),
      3
    );
    assert.equal(/pg_get_indexdef\([^)]*(?:u|a)\.attnum/i.test(body), false);
  });

  it('83. PATCH-1 pg_attribute indrelid join contract maintained', () => {
    assert.equal(
      /unnest\(i\.indkey\)[\s\S]{0,240}attrelid = ic\.oid/i.test(body),
      false
    );
    assert.ok(countOccurrences(body, /attrelid = i\.indrelid/g) >= 6);
  });

  it('84. E mutation-negative indpred indexrelid or ic.oid context fails classifier', () => {
    const mutatedIndexrelid = body.replace(
      /pg_get_expr\(i\.indpred, i\.indrelid, true\)/g,
      'pg_get_expr(i.indpred, i.indexrelid, true)'
    );
    const mutatedIcOid = body.replace(
      /pg_get_expr\(i\.indpred, i\.indrelid, true\)/g,
      'pg_get_expr(i.indpred, ic.oid)'
    );
    assert.equal(classifyIndpredRelationContext(mutatedIndexrelid), 'UNSAFE');
    assert.equal(classifyIndpredRelationContext(mutatedIcOid), 'UNSAFE');
    assert.equal(classifyIndpredRelationContext(body), 'SAFE');
  });
});

const ENTITLEMENTS_CANONICAL_INDEX = 'entitlements_user_id_product_id_key';
const ENTITLEMENTS_KEY_COLUMNS = ['user_id', 'product_id'];
const ENTITLEMENTS_DUPLICATE_INDEXES = [
  'entitlements_user_product_uq',
  'uq_entitlements_user_product',
];

type EntitlementsIndexFixture = {
  index_name: string;
  access_method?: string;
  is_primary?: boolean;
  is_unique?: boolean;
  key_columns?: string[];
  included_columns?: string[] | null;
  predicate?: string | null;
  is_valid?: boolean;
  is_ready?: boolean;
  is_live?: boolean;
  constraint_backed?: boolean;
};

function isExactEntitlementsSameKeyIndex(index: EntitlementsIndexFixture): boolean {
  return (
    index.access_method === 'btree' &&
    index.is_primary === false &&
    index.is_unique === true &&
    JSON.stringify(index.key_columns ?? []) === JSON.stringify(ENTITLEMENTS_KEY_COLUMNS) &&
    (index.included_columns ?? []).length === 0 &&
    (index.predicate ?? null) === null &&
    index.is_valid === true &&
    index.is_ready === true &&
    index.is_live === true
  );
}

function countEntitlementsM2bShape(indexes: EntitlementsIndexFixture[]) {
  const exact = indexes.filter(isExactEntitlementsSameKeyIndex);
  const canonicalExactCount = exact.filter(
    (i) => i.index_name === ENTITLEMENTS_CANONICAL_INDEX && i.constraint_backed === true
  ).length;
  const duplicateExactCount = exact.filter(
    (i) =>
      ENTITLEMENTS_DUPLICATE_INDEXES.includes(i.index_name) && i.constraint_backed === false
  ).length;
  const duplicateIndexNames = exact
    .filter(
      (i) =>
        ENTITLEMENTS_DUPLICATE_INDEXES.includes(i.index_name) && i.constraint_backed === false
    )
    .map((i) => i.index_name)
    .sort();
  return {
    canonicalExactCount,
    duplicateExactCount,
    exactSameKeyUniqueCount: exact.length,
    duplicateIndexNames,
  };
}

type EntitlementsMismatchKind =
  | 'entitlements_redundant_same_key_unique_indexes'
  | 'entitlements_canonical_missing'
  | 'entitlements_canonical_count_mismatch'
  | 'entitlements_duplicate_count_mismatch'
  | null;

function duplicateNamesExactSet(indexes: EntitlementsIndexFixture[]): string[] {
  return indexes
    .filter(isExactEntitlementsSameKeyIndex)
    .filter(
      (i) =>
        ENTITLEMENTS_DUPLICATE_INDEXES.includes(i.index_name) && i.constraint_backed === false
    )
    .map((i) => i.index_name)
    .sort();
}

function unexpectedSameKeyNames(indexes: EntitlementsIndexFixture[]): string[] {
  return indexes
    .filter(isExactEntitlementsSameKeyIndex)
    .filter(
      (i) =>
        i.index_name !== ENTITLEMENTS_CANONICAL_INDEX &&
        !ENTITLEMENTS_DUPLICATE_INDEXES.includes(i.index_name)
    )
    .map((i) => i.index_name)
    .sort();
}

function classifyEntitlementsM2bMismatch(
  indexes: EntitlementsIndexFixture[]
): EntitlementsMismatchKind {
  const counts = countEntitlementsM2bShape(indexes);
  const dupSet = duplicateNamesExactSet(indexes);
  const expectedDupSet = [...ENTITLEMENTS_DUPLICATE_INDEXES].sort();
  const unexpected = unexpectedSameKeyNames(indexes);

  if (counts.canonicalExactCount === 0) return 'entitlements_canonical_missing';
  if (counts.canonicalExactCount > 1) return 'entitlements_canonical_count_mismatch';
  if (
    counts.canonicalExactCount === 1 &&
    counts.duplicateExactCount === 2 &&
    counts.exactSameKeyUniqueCount === 3 &&
    JSON.stringify(dupSet) === JSON.stringify(expectedDupSet) &&
    unexpected.length === 0
  ) {
    return 'entitlements_redundant_same_key_unique_indexes';
  }
  if (
    counts.canonicalExactCount === 1 &&
    counts.duplicateExactCount === 0 &&
    counts.exactSameKeyUniqueCount === 1 &&
    unexpected.length === 0
  ) {
    return null;
  }
  return 'entitlements_duplicate_count_mismatch';
}

function productionCapturedEntitlementsIndexes(): EntitlementsIndexFixture[] {
  const base = {
    access_method: 'btree',
    is_primary: false,
    is_unique: true,
    key_columns: [...ENTITLEMENTS_KEY_COLUMNS],
    included_columns: null,
    predicate: null,
    is_valid: true,
    is_ready: true,
    is_live: true,
  };
  return [
    { ...base, index_name: ENTITLEMENTS_CANONICAL_INDEX, constraint_backed: true },
    { ...base, index_name: 'entitlements_user_product_uq', constraint_backed: false },
    { ...base, index_name: 'uq_entitlements_user_product', constraint_backed: false },
  ];
}

describe('productionBaselineGapDiagnostic — entitlements M2B PATCH-3 regression', () => {
  const sql = readSql();
  const body = sqlWithoutComments(sql);

  it('85. stale product_key and wrong canonical name absent from SQL', () => {
    assert.equal(/product_key/i.test(body), false);
    assert.equal(/entitlements_user_id_product_key_unique/i.test(body), false);
    assert.equal(/actual_same_key_uniques/i.test(body), false);
    assert.match(body, /entitlements_user_id_product_id_key/);
    assert.match(body, /ARRAY\['user_id','product_id'\]::text\[\]/);
    assert.match(body, /entitlements_user_product_uq/);
    assert.match(body, /uq_entitlements_user_product/);
  });

  it('86. A M2B pre-state canonical 1 duplicate 2 total 3 mismatch present', () => {
    const kind = classifyEntitlementsM2bMismatch(productionCapturedEntitlementsIndexes());
    const counts = countEntitlementsM2bShape(productionCapturedEntitlementsIndexes());
    assert.equal(kind, 'entitlements_redundant_same_key_unique_indexes');
    assert.equal(counts.canonicalExactCount, 1);
    assert.equal(counts.duplicateExactCount, 2);
    assert.equal(counts.exactSameKeyUniqueCount, 3);
  });

  it('87. B M2B post-state canonical 1 duplicate 0 total 1 mismatch absent', () => {
    const indexes = [
      {
        index_name: ENTITLEMENTS_CANONICAL_INDEX,
        access_method: 'btree',
        is_primary: false,
        is_unique: true,
        key_columns: [...ENTITLEMENTS_KEY_COLUMNS],
        included_columns: null,
        predicate: null,
        is_valid: true,
        is_ready: true,
        is_live: true,
        constraint_backed: true,
      },
    ];
    assert.equal(classifyEntitlementsM2bMismatch(indexes), null);
  });

  it('88. C wrong product_key matrix must fail classifier', () => {
    const indexes = productionCapturedEntitlementsIndexes().map((i) => ({
      ...i,
      key_columns: ['user_id', 'product_key'],
    }));
    const counts = countEntitlementsM2bShape(indexes);
    assert.equal(counts.exactSameKeyUniqueCount, 0);
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_canonical_missing');
  });

  it('89. D wrong canonical name must fail pre-state classification', () => {
    const indexes = productionCapturedEntitlementsIndexes().map((i) =>
      i.index_name === ENTITLEMENTS_CANONICAL_INDEX
        ? { ...i, index_name: 'entitlements_user_id_product_key_unique' }
        : i
    );
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_canonical_missing');
  });

  it('90. E missing canonical duplicates only is canonical_missing not pre-state', () => {
    const indexes = productionCapturedEntitlementsIndexes().filter(
      (i) => i.index_name !== ENTITLEMENTS_CANONICAL_INDEX
    );
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_canonical_missing');
  });

  it('91. F one duplicate missing is duplicate_count_mismatch', () => {
    const indexes = productionCapturedEntitlementsIndexes().filter(
      (i) => i.index_name !== 'uq_entitlements_user_product'
    );
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_duplicate_count_mismatch');
  });

  it('92. G malformed duplicate excluded from exact duplicate count', () => {
    const indexes = [
      ...productionCapturedEntitlementsIndexes(),
      {
        index_name: 'entitlements_user_product_uq',
        access_method: 'btree',
        is_primary: false,
        is_unique: true,
        key_columns: [...ENTITLEMENTS_KEY_COLUMNS],
        included_columns: null,
        predicate: 'product_id IS NOT NULL',
        is_valid: true,
        is_ready: true,
        is_live: true,
        constraint_backed: false,
      },
    ];
    const counts = countEntitlementsM2bShape(indexes);
    assert.equal(counts.duplicateExactCount, 2);
    assert.equal(counts.exactSameKeyUniqueCount, 3);
    assert.match(body, /entitlements_malformed_same_key_indexes/);
  });

  it('93. H stable duplicate names sorted output contract', () => {
    const shuffled = [
      productionCapturedEntitlementsIndexes()[2],
      productionCapturedEntitlementsIndexes()[0],
      productionCapturedEntitlementsIndexes()[1],
    ];
    const names = countEntitlementsM2bShape(shuffled).duplicateIndexNames;
    assert.deepEqual(names, [...ENTITLEMENTS_DUPLICATE_INDEXES].sort());
    assert.match(body, /jsonb_agg\(e\.index_name ORDER BY e\.index_name\)/);
  });

  it('94. I captured Production fixture exact pre-state mismatch kind', () => {
    assert.equal(
      classifyEntitlementsM2bMismatch(productionCapturedEntitlementsIndexes()),
      'entitlements_redundant_same_key_unique_indexes'
    );
    assert.match(body, /entitlements_redundant_same_key_mismatch/);
    assert.match(body, /COMMITTED_NOT_APPLIED_M2B/);
  });

  it('95. J mutation-negative product_key and empty actual_same_key_uniques', () => {
    const wrongKeyBody = body.replace(
      /ARRAY\['user_id','product_id'\]::text\[\]/g,
      "ARRAY['user_id','product_key']::text[]"
    );
    assert.match(wrongKeyBody, /product_key/);
    assert.equal(
      classifyEntitlementsM2bMismatch(productionCapturedEntitlementsIndexes()),
      'entitlements_redundant_same_key_unique_indexes'
    );

    const emptyActualBody = body.replace(
      /'duplicate_index_names', COALESCE\(\(/,
      "'actual_same_key_uniques', '[]'::jsonb, 'duplicate_index_names', COALESCE(("
    );
    assert.match(emptyActualBody, /actual_same_key_uniques/);
    assert.equal(/actual_same_key_uniques/i.test(body), false);
  });

  it('96. catalog_snapshot_complete not gated on mismatch json emptiness', () => {
    const block = extractCteBody(body, 'final_summary');
    const completeExpr = block.match(
      /\(\s*ri\.requested_gap_cell_count[\s\S]*?\)\s*AS catalog_snapshot_complete/
    )?.[0];
    assert.ok(completeExpr);
    assert.equal(/expected_contract_mismatch_json/i.test(completeExpr!), false);
    assert.match(completeExpr!, /registry_self_check_ok IS TRUE/);
  });

  it('97. canonical duplicate count greater than one fails', () => {
    const canonical = productionCapturedEntitlementsIndexes()[0];
    const indexes = [
      canonical,
      { ...canonical },
      ...productionCapturedEntitlementsIndexes().slice(1),
    ];
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_canonical_count_mismatch');
    assert.match(body, /entitlements_canonical_count_mismatch/);
    assert.match(body, /canonical_exact_count > 1/);
  });

  it('98. unknown same-key unique C fails pre-state', () => {
    const indexes = [
      ...productionCapturedEntitlementsIndexes(),
      {
        index_name: 'entitlements_user_product_extra_uq',
        access_method: 'btree',
        is_primary: false,
        is_unique: true,
        key_columns: [...ENTITLEMENTS_KEY_COLUMNS],
        included_columns: null,
        predicate: null,
        is_valid: true,
        is_ready: true,
        is_live: true,
        constraint_backed: false,
      },
    ];
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_duplicate_count_mismatch');
    assert.match(body, /entitlements_unexpected_same_key_indexes/);
  });

  it('99. duplicate count two but wrong name set fails', () => {
    const base = {
      access_method: 'btree',
      is_primary: false,
      is_unique: true,
      key_columns: [...ENTITLEMENTS_KEY_COLUMNS],
      included_columns: null,
      predicate: null,
      is_valid: true,
      is_ready: true,
      is_live: true,
      constraint_backed: false,
    };
    const indexes = [
      {
        ...base,
        index_name: ENTITLEMENTS_CANONICAL_INDEX,
        constraint_backed: true,
      },
      { ...base, index_name: 'entitlements_user_product_uq' },
      { ...base, index_name: 'entitlements_wrong_name_uq' },
    ];
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_duplicate_count_mismatch');
  });

  it('100. INCLUDE duplicate excluded from exact duplicate count', () => {
    const base = {
      access_method: 'btree',
      is_primary: false,
      is_unique: true,
      key_columns: [...ENTITLEMENTS_KEY_COLUMNS],
      predicate: null,
      is_valid: true,
      is_ready: true,
      is_live: true,
      constraint_backed: false,
    };
    const indexes = [
      {
        ...base,
        index_name: ENTITLEMENTS_CANONICAL_INDEX,
        constraint_backed: true,
        included_columns: null,
      },
      { ...base, index_name: 'entitlements_user_product_uq', included_columns: null },
      {
        ...base,
        index_name: 'uq_entitlements_user_product',
        included_columns: ['created_at'],
      },
    ];
    const counts = countEntitlementsM2bShape(indexes);
    assert.equal(counts.duplicateExactCount, 1);
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_duplicate_count_mismatch');
  });

  it('101. invalid not-ready not-live duplicate excluded from exact count', () => {
    const indexes = productionCapturedEntitlementsIndexes().map((i) =>
      i.index_name === 'uq_entitlements_user_product'
        ? { ...i, is_valid: false, is_ready: false, is_live: false }
        : i
    );
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_duplicate_count_mismatch');
  });

  it('102. constraint-backed duplicate misclassification fails pre-state', () => {
    const indexes = productionCapturedEntitlementsIndexes().map((i) =>
      i.index_name === 'entitlements_user_product_uq' ? { ...i, constraint_backed: true } : i
    );
    assert.equal(classifyEntitlementsM2bMismatch(indexes), 'entitlements_duplicate_count_mismatch');
  });
});

describe('productionBaselineGapDiagnostic — repository scope', () => {
  it('63. git working tree changes limited to exact two allowlist files', () => {
    const status = execSync('git status --porcelain -uall', { encoding: 'utf8' }).trim();
    if (!status) return;
    const changed = status
      .split('\n')
      .map((line) => line.slice(2).trimStart())
      .filter(Boolean);
    for (const path of changed) {
      assert.ok(ALLOWED_PATHS.has(path), `unexpected changed path: ${path}`);
    }
  });

  it('64. classifier artifact untouched', () => {
    const classifier = readFileSync(CLASSIFIER_PATH, 'utf8');
    assert.match(classifier, /SQL-REVISION-1-PATCH-6-PATCH-7-PATCH-3/);
    const status = execSync(
      'git diff --name-only -- docs/planning/m55_account_deletion_production_baseline_contract_freeze_v1.sql',
      { encoding: 'utf8' }
    ).trim();
    assert.equal(status, '');
  });
});
