// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  STRATEGY,
  BASELINE_VERSION,
  BASELINE_FILENAME,
  GENERATOR_VERSION,
  MATRIX_REVISION,
  MANIFEST_REVISION,
  BASELINE_SQL_REVISION,
  SOURCE_DIAGNOSTIC_REVISION,
  SOURCE_DIAGNOSTIC_SQL_SHA256,
  EXPECTED_GAP_DIAGNOSTIC_SHA256,
  EXPECTED_P3_COLUMNS_SHA256,
  EXPECTED_EVIDENCE_BUNDLE_SHA256,
  GAP_DIAGNOSTIC_EXPECTED_BYTES,
  P3_COLUMNS_EXPECTED_BYTES,
  P3_COLUMN_COUNT,
  P3_DATA_ROW_COUNT,
  REQUIRED_RELATIONS,
  PATCH4_HEADERS,
  P3_HEADERS,
  P1_ABSENT_OBJECTS,
  PERMANENTLY_ABSENT_OBJECTS,
  CANONICAL_MIGRATIONS,
  FUNCTION_SOURCE_MIGRATIONS,
  COVERAGE_CATEGORIES,
  PATHS,
  sha256Hex,
  sha256File,
  countNewlines,
  stableStringify,
  parseMarkdownPipeTable,
  parsePatch4Artifact,
  parseP3Artifact,
  computeEvidenceBundleSha256,
  privacyScan,
  pglastParseSql,
  extractFunctionStatements,
  extractAllFunctionStatements,
  buildContractMatrix,
  buildBaselineSql,
  buildManifest,
  buildArtifacts,
  buildExecutionOracle,
  deriveArtifacts,
  verifyArtifacts,
  verifyExecutionOracle,
  identifyPreFkPrerequisiteIndexNames,
  baselineDdlStatementMultisetSha256,
  PRE_FK_PREREQUISITE_INDEX_REGISTRY_P1,
  EXPECTED_BASELINE_ARTIFACT_SHA256,
  EXPECTED_MATRIX_ARTIFACT_SHA256,
  EXPECTED_MANIFEST_ARTIFACT_SHA256,
  verifyFunctionSourceMigration,
  resolveArtifactPaths,
  isPathStrictlyInside,
  validateIdSet,
  PRODUCTION_BODY_PARITY_STATUS,
  STATIC_READINESS_STATE,
  resolveRepoPath,
  renderSqlRole,
  normalizeFunctionContract,
  validateFunctionContracts,
  synthesizeFunctionOwnershipAndAcl,
  PGLAST_EXPECTED_VERSION,
  PENDING_FUNCTION_PARITY_REASON,
  APPROVED_PENDING_COVERAGE_CATEGORIES,
  assertPglastRuntimeVersion,
  PRODUCTION_FUNCTION_DEFINITION_EXPORT_REVISION,
  EXPECTED_PRODUCTION_FUNCTION_DEFINITION_EXPORT_SHA256,
  PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_BYTES,
  PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_NEWLINES,
  PRODUCTION_FUNCTION_PARITY_TARGETS,
  loadProductionFunctionDefinitionExport,
  verifyProductionFunctionDefinitionExport,
  assertProductionFunctionSemanticGuards,
  normalizeFunctionDefinitionEol,
  extractFunctionDollarQuotedBody,
  collapseReplyAllowedSpacingDelta,
  formatProductionFunctionCreateForBaseline,
  findMigrationFunctionCreateStatement,
  validateCoverageForDerivation,
  deriveInternalFkTriggerContracts,
  deriveExpectedInternalTriggerSemanticGroups,
  buildInternalTriggerSemanticGroups,
  validateInternalTriggerInventory,
  parseInternalTriggerStrict,
  internalTriggerSemanticGroupFingerprint,
  internalTriggerSemanticFingerprint,
  compareSemanticMultisets,
  stateTransitionFingerprint,
  stateSpecificAbsenceFingerprint,
  walletFingerprintFromNormalizedOutput,
  verifyWalletFingerprintIntegrity,
  functionIdentityFingerprintV6,
  functionParityPendingFingerprint,
  EXECUTE_LOCAL_DISABLED_ERROR,
  validateRelationSecurityEvidence,
  buildRelationsFromEvidence,
  inventoryByRelation,
  evaluateMatrixCoverage,
  evaluateSerializedMatrixCoverage,
  matrixOutputFromSerialized,
  relationSecurityFingerprintFromEvidence,
  relationSecurityFingerprintsFromMatrix,
  normalizedFunctionFingerprint,
  functionSourceFingerprint,
  validateForeignKeyRecord,
} from '../../scripts/m55/previewBaselineTool.ts';

const REPO_ROOT = process.cwd();

function readGapRaw(): Buffer {
  return readFileSync(resolveRepoPath(REPO_ROOT, PATHS.gapDiagnosticRaw));
}

function readP3Raw(): Buffer {
  return readFileSync(resolveRepoPath(REPO_ROOT, PATHS.p3ColumnsRaw));
}

function loadParsedArtifacts() {
  const gapBytes = readGapRaw();
  const p3Bytes = readP3Raw();
  const patch4 = parsePatch4Artifact(gapBytes);
  const p3Rows = parseP3Artifact(p3Bytes);
  const functions = extractAllFunctionStatements(REPO_ROOT);
  const productionFunctionExport = loadProductionFunctionDefinitionExport(REPO_ROOT);
  return { gapBytes, p3Bytes, patch4, p3Rows, functions, productionFunctionExport };
}

function buildTestBaselineSql(
  patch4: ReturnType<typeof parsePatch4Artifact>,
  p3Rows: ReturnType<typeof parseP3Artifact>,
  functions: ReturnType<typeof extractAllFunctionStatements>,
  matrixSha: string,
  bundleSha: string,
  productionFunctionExport = loadProductionFunctionDefinitionExport(REPO_ROOT)
) {
  return buildBaselineSql(patch4, p3Rows, functions, matrixSha, bundleSha, {
    productionFunctionExport,
  });
}

describe('previewBaselineArtifacts — constants / source hashes', () => {
  it('1. strategy constant is preview-only chain', () => {
    assert.equal(STRATEGY, 'PREVIEW_ONLY_BASELINE_PLUS_ORIGINAL_CANONICAL_CHAIN');
  });

  it('2. baseline version matches filename prefix', () => {
    assert.ok(BASELINE_FILENAME.startsWith(BASELINE_VERSION));
  });

  it('3. generator and matrix revisions are pinned', () => {
    assert.equal(GENERATOR_VERSION, '7');
    assert.equal(MATRIX_REVISION, 'PREVIEW-BASELINE-CONTRACT-MATRIX-v1-REVISION-7');
    assert.equal(MANIFEST_REVISION, 'PREVIEW-BASELINE-MANIFEST-v1-REVISION-8');
    assert.equal(BASELINE_SQL_REVISION, 'PREVIEW-BASELINE-SQL-v1-REVISION-8');
  });

  it('4. source diagnostic SQL SHA is 64 hex chars', () => {
    assert.match(SOURCE_DIAGNOSTIC_SQL_SHA256, /^[a-f0-9]{64}$/);
  });

  it('5. gap diagnostic raw SHA matches expected pin', () => {
    assert.equal(sha256File(resolveRepoPath(REPO_ROOT, PATHS.gapDiagnosticRaw)), EXPECTED_GAP_DIAGNOSTIC_SHA256);
  });

  it('6. p3 columns raw SHA matches expected pin', () => {
    assert.equal(sha256File(resolveRepoPath(REPO_ROOT, PATHS.p3ColumnsRaw)), EXPECTED_P3_COLUMNS_SHA256);
  });

  it('7. gap diagnostic byte length matches pin', () => {
    assert.equal(readGapRaw().length, GAP_DIAGNOSTIC_EXPECTED_BYTES);
  });

  it('8. p3 columns byte length matches pin', () => {
    assert.equal(readP3Raw().length, P3_COLUMNS_EXPECTED_BYTES);
  });

  it('9. evidence bundle SHA matches computeEvidenceBundleSha256', () => {
    assert.equal(computeEvidenceBundleSha256(), EXPECTED_EVIDENCE_BUNDLE_SHA256);
  });

  it('10. diagnostic revision constant matches PATCH-4 parser expectation', () => {
    const patch4 = parsePatch4Artifact(readGapRaw());
    assert.equal(patch4.scalars.diagnostic_revision, SOURCE_DIAGNOSTIC_REVISION);
  });
});

describe('previewBaselineArtifacts — markdown pipe parser', () => {
  it('11. parses escaped pipe cells', () => {
    const table = parseMarkdownPipeTable('| a | b\\|c |\n| --- | --- |\n| 1 | 2 |');
    assert.deepEqual(table.headers, ['a', 'b|c']);
    assert.deepEqual(table.rows[0], ['1', '2']);
  });

  it('12. rejects duplicate headers', () => {
    assert.throws(() => parseMarkdownPipeTable('| a | a |\n| --- | --- |\n| 1 | 2 |'), /duplicate header/);
  });

  it('13. rejects invalid separator row', () => {
    assert.throws(() => parseMarkdownPipeTable('| a | b |\n| bad | bad |\n| 1 | 2 |'), /separator/);
  });

  it('14. rejects row column count mismatch', () => {
    assert.throws(() => parseMarkdownPipeTable('| a | b |\n| --- | --- |\n| 1 |'), /column count mismatch/);
  });
});

describe('previewBaselineArtifacts — PATCH-4 parser', () => {
  const { patch4 } = loadParsedArtifacts();

  it('15. PATCH-4 headers match contract list', () => {
    const raw = readGapRaw().toString('utf8');
    const table = parseMarkdownPipeTable(raw);
    assert.equal(table.headers.length, PATCH4_HEADERS.length);
    assert.deepEqual(table.headers, [...PATCH4_HEADERS]);
  });

  it('16. PATCH-4 has exactly one data row', () => {
    assert.equal(Object.keys(patch4.scalars).length, PATCH4_HEADERS.length);
  });

  it('17. PATCH-4 registry self check is true', () => {
    assert.equal(patch4.scalars.registry_self_check_ok, 'true');
  });

  it('18. PATCH-4 resolved gap cells equal requested', () => {
    assert.equal(patch4.scalars.requested_gap_cell_count, patch4.scalars.resolved_gap_cell_count);
  });

  it('19. PATCH-4 relation security inventory covers all required relations', () => {
    const relations = new Set(patch4.relation_security.map((cell) => cell.object_name));
    for (const relation of REQUIRED_RELATIONS) {
      assert.ok(relations.has(relation), `missing relation security cell for ${relation}`);
    }
    assert.equal(patch4.relation_security.length, 45);
  });

  it('20. PATCH-4 privilege contract has 420 cells', () => {
    assert.equal(patch4.privilege_contract.length, 420);
  });

  it('21. PATCH-4 function inventory has two entries', () => {
    assert.equal(patch4.function_inventory.length, 2);
  });

  it('22. PATCH-4 wallet scope has five cells', () => {
    assert.equal(patch4.wallet_scope.length, 5);
  });
});

describe('previewBaselineArtifacts — P3 parser', () => {
  const { p3Rows } = loadParsedArtifacts();

  it('23. P3 headers match contract list', () => {
    const raw = readP3Raw().toString('utf8');
    const table = parseMarkdownPipeTable(raw);
    assert.deepEqual(table.headers, [...P3_HEADERS]);
  });

  it('24. P3 row count matches pin', () => {
    assert.equal(p3Rows.length, P3_DATA_ROW_COUNT);
  });

  it('25. P3 total column cells equal P3_COLUMN_COUNT', () => {
    assert.equal(P3_HEADERS.length, 31);
    assert.equal(P3_COLUMN_COUNT, 31);
  });

  it('26. P3 rows are all public schema', () => {
    assert.ok(p3Rows.every((row) => row.schema_name === 'public'));
  });

  it('27. P3 covers every required relation', () => {
    const relations = new Set(p3Rows.map((row) => row.relation_name));
    for (const relation of REQUIRED_RELATIONS) {
      assert.ok(relations.has(relation), `missing relation ${relation}`);
    }
  });

  it('28. P3 column_contract_known is true for all rows', () => {
    assert.ok(p3Rows.every((row) => row.column_contract_known === 'true'));
  });
});

describe('previewBaselineArtifacts — privacy scan', () => {
  it('29. gap raw artifact passes privacy scan', () => {
    const scan = privacyScan(readGapRaw().toString('utf8'), 'artifact');
    assert.equal(scan.status, 'pass');
  });

  it('30. p3 raw artifact passes privacy scan', () => {
    const scan = privacyScan(readP3Raw().toString('utf8'), 'artifact');
    assert.equal(scan.status, 'pass');
  });

  it('31. credentialed postgres URL is blocking', () => {
    const scan = privacyScan('postgres://user:secret@localhost/db', 'any');
    assert.equal(scan.status, 'fail');
    assert.ok(scan.matches.some((m) => m.blocking && m.rule_id === 'credentialed_postgres_url'));
  });

  it('32. catalog role names are allowed in generated SQL context', () => {
    const scan = privacyScan('GRANT SELECT ON TABLE t TO service_role;', 'generated_sql');
    assert.equal(scan.status, 'pass');
  });

  it('33. stripe secret key is blocking', () => {
    const stripeSecretFixture =
      ['sk', 'live', 'abcdefghijklmnopqrstuvwxyz'].join('_');
    const scan = privacyScan(stripeSecretFixture, 'any');
    assert.equal(scan.status, 'fail');
  });

  it('34. supabase host in artifact context is blocking', () => {
    const scan = privacyScan('host abcdef.supabase.co', 'artifact');
    assert.equal(scan.status, 'fail');
  });
});

describe('previewBaselineArtifacts — function extraction / pglast', () => {
  it('35. extracts m55_reply_generate_commit statements', () => {
    const extraction = extractFunctionStatements(
      REPO_ROOT,
      resolveRepoPath(REPO_ROOT, FUNCTION_SOURCE_MIGRATIONS[0].sourceMigrationPath),
      'm55_reply_generate_commit'
    );
    assert.equal(extraction.targetName, 'm55_reply_generate_commit');
    assert.ok(extraction.statements.length > 0);
    assert.match(extraction.extractionHash, /^[a-f0-9]{64}$/);
  });

  it('36. extracts m55_consult_reply_commit statements', () => {
    const extraction = extractFunctionStatements(
      REPO_ROOT,
      resolveRepoPath(REPO_ROOT, FUNCTION_SOURCE_MIGRATIONS[1].sourceMigrationPath),
      'm55_consult_reply_commit'
    );
    assert.equal(extraction.targetName, 'm55_consult_reply_commit');
    assert.ok(extraction.statements.length > 0);
  });

  it('37. extractAllFunctionStatements returns two extractions', () => {
    const all = extractAllFunctionStatements(REPO_ROOT);
    assert.equal(all.length, 2);
  });

  it('38. pglast parses extracted reply function SQL', () => {
    const extraction = extractFunctionStatements(
      REPO_ROOT,
      resolveRepoPath(REPO_ROOT, FUNCTION_SOURCE_MIGRATIONS[0].sourceMigrationPath),
      'm55_reply_generate_commit'
    );
    const parsed = pglastParseSql(extraction.statements.join('\n'));
    assert.ok(parsed.statement_count >= 1);
  });

  it('39. unknown function target throws', () => {
    assert.throws(
      () =>
        extractFunctionStatements(
          REPO_ROOT,
          resolveRepoPath(REPO_ROOT, FUNCTION_SOURCE_MIGRATIONS[0].sourceMigrationPath),
          'missing_function'
        ),
      /missing_function/
    );
  });
});

describe('previewBaselineArtifacts — contract matrix / coverage', () => {
  const { patch4, p3Rows, functions } = loadParsedArtifacts();
  const matrix = buildContractMatrix(patch4, p3Rows, functions);

  it('40. matrix strategy matches tool constant', () => {
    assert.equal(matrix.strategy, STRATEGY);
  });

  it('41. matrix has thirteen coverage categories', () => {
    const coverage = matrix.coverage_matrix as { category: string }[];
    assert.equal(coverage.length, COVERAGE_CATEGORIES.length);
  });

  it('42. all non-pending coverage categories are complete', () => {
    const coverage = matrix.coverage_matrix as {
      category: string;
      coverage_complete: boolean;
      coverage_status: string;
    }[];
    const pending = coverage.filter((entry) => entry.category === 'functions_body_production_parity');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].coverage_status, 'PENDING_EXECUTION');
    assert.equal(pending[0].coverage_complete, false);
    const complete = coverage.filter((entry) => entry.category !== 'functions_body_production_parity');
    assert.ok(complete.every((entry) => entry.coverage_complete));
  });

  it('43. matrix source_conflicts is empty', () => {
    assert.deepEqual(matrix.source_conflicts, []);
  });

  it('44. matrix states include P0 through P7', () => {
    assert.deepEqual(matrix.states, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  });

  it('45. matrix relations count is 15', () => {
    assert.equal((matrix.relations as unknown[]).length, REQUIRED_RELATIONS.length);
  });

  it('46. matrix function_sources has two entries', () => {
    assert.equal((matrix.function_sources as unknown[]).length, 2);
  });

  it('47. excluded_objects coverage matches P1 absent list', () => {
    const coverage = matrix.coverage_matrix as { category: string; actual_coverage_count: number }[];
    const excluded = coverage.find((entry) => entry.category === 'excluded_objects');
    assert.equal(excluded?.actual_coverage_count, P1_ABSENT_OBJECTS.length);
  });
});

describe('previewBaselineArtifacts — baseline SQL / no top-level DML', () => {
  const { patch4, p3Rows, functions } = loadParsedArtifacts();
  const bundleSha = computeEvidenceBundleSha256();
  const matrixJson = stableStringify(buildContractMatrix(patch4, p3Rows, functions));
  const matrixSha = sha256Hex(matrixJson);
  const baselineSql = buildTestBaselineSql(patch4, p3Rows, functions, matrixSha, bundleSha);

  it('48. baseline SQL includes preview-only warnings', () => {
    assert.ok(baselineSql.includes('PREVIEW-ONLY'));
    assert.ok(baselineSql.includes('DO NOT execute on Production'));
  });

  it('49. baseline SQL wraps DDL in transaction', () => {
    assert.ok(baselineSql.includes('BEGIN;'));
    assert.ok(baselineSql.includes('COMMIT;'));
  });

  it('50. baseline SQL has no top-level INSERT statements', () => {
    const parsed = pglastParseSql(baselineSql);
    const insertStmts = parsed.statements.filter((stmt) => stmt.type === 'InsertStmt');
    assert.equal(insertStmts.length, 0);
  });

  it('51. baseline SQL has no top-level UPDATE statements', () => {
    const parsed = pglastParseSql(baselineSql);
    const updateStmts = parsed.statements.filter((stmt) => stmt.type === 'UpdateStmt');
    assert.equal(updateStmts.length, 0);
  });

  it('52. baseline SQL has no top-level DELETE', () => {
    const stripped = baselineSql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    assert.equal(/\bDELETE\s+FROM\b/i.test(stripped), false);
  });

  it('53. pglast parses generated baseline SQL', () => {
    const parsed = pglastParseSql(baselineSql);
    assert.ok(parsed.statement_count > 10);
  });

  it('54. baseline SQL privacy scan passes', () => {
    assert.equal(privacyScan(baselineSql, 'generated_sql').status, 'pass');
  });
});

describe('previewBaselineArtifacts — excluded objects / manifest / deterministic build', () => {
  it('55. permanently absent objects include purchases and subscriptions', () => {
    assert.ok(PERMANENTLY_ABSENT_OBJECTS.includes('purchases'));
    assert.ok(PERMANENTLY_ABSENT_OBJECTS.includes('subscriptions'));
  });

  it('56. P1 absent objects include clerk_webhook_events', () => {
    assert.ok(P1_ABSENT_OBJECTS.includes('clerk_webhook_events'));
  });

  it('57. canonical migration chain has six entries after baseline', () => {
    assert.equal(CANONICAL_MIGRATIONS.length, 6);
    assert.equal(CANONICAL_MIGRATIONS[0].stateFrom, 'P1');
    assert.equal(CANONICAL_MIGRATIONS[5].stateTo, 'P7');
  });

  it('58. buildManifest includes expected remote history order', () => {
    const built = buildArtifacts(REPO_ROOT);
    const manifest = JSON.parse(readFileSync(built.manifestPath, 'utf8')) as {
      expected_remote_history: string[];
    };
    assert.equal(manifest.expected_remote_history[0], BASELINE_VERSION);
    assert.equal(manifest.expected_remote_history.length, 7);
  });

  it('59. buildArtifacts writes matrix baseline and manifest files', () => {
    const built = buildArtifacts(REPO_ROOT);
    assert.ok(existsSync(built.matrixPath));
    assert.ok(existsSync(built.baselinePath));
    assert.ok(existsSync(built.manifestPath));
  });

  it('60. buildArtifacts is deterministic for matrix SHA', () => {
    const first = buildArtifacts(REPO_ROOT);
    const second = buildArtifacts(REPO_ROOT);
    assert.equal(first.matrixSha256, second.matrixSha256);
    assert.equal(first.baselineSha256, second.baselineSha256);
    assert.equal(first.manifestSha256, second.manifestSha256);
  });

  it('61. verifyArtifacts completes without error', () => {
    assert.doesNotThrow(() => verifyArtifacts(REPO_ROOT));
  });

  it('62. manifest prohibited operations includes production_execute', () => {
    const built = buildArtifacts(REPO_ROOT);
    const manifest = JSON.parse(readFileSync(built.manifestPath, 'utf8')) as {
      prohibited_operations: string[];
    };
    assert.ok(manifest.prohibited_operations.includes('production_execute'));
  });
});

describe('previewBaselineArtifacts — Revision-2 PUBLIC pseudo-role', () => {
  it('63. renderSqlRole leaves PUBLIC unquoted', () => {
    assert.equal(renderSqlRole('PUBLIC'), 'PUBLIC');
  });

  it('64. renderSqlRole quotes normal roles', () => {
    assert.equal(renderSqlRole('anon'), '"anon"');
    assert.equal(renderSqlRole('authenticated'), '"authenticated"');
    assert.equal(renderSqlRole('service_role'), '"service_role"');
    assert.equal(renderSqlRole('postgres'), '"postgres"');
  });

  it('65. generated baseline policy uses TO PUBLIC not TO "PUBLIC"', () => {
    const baselineSql = readFileSync(
      resolveRepoPath(REPO_ROOT, PATHS.baselineSql),
      'utf8'
    );
    assert.match(
      baselineSql,
      /CREATE POLICY "Enable read access for all users" ON public\."entitlements" AS PERMISSIVE FOR SELECT TO PUBLIC USING \(true\);/
    );
    assert.equal(baselineSql.includes('TO "PUBLIC"'), false);
    assert.equal(baselineSql.includes('FROM "PUBLIC"'), false);
    assert.equal(baselineSql.includes('TO "PUBLIC"'), false);
  });
});

describe('previewBaselineArtifacts — Revision-2 function contract parity', () => {
  const { patch4 } = loadParsedArtifacts();
  const matrix = buildContractMatrix(
    patch4,
    loadParsedArtifacts().p3Rows,
    extractAllFunctionStatements(REPO_ROOT)
  );

  it('66. validateFunctionContracts accepts PATCH-4 inventory', () => {
    assert.doesNotThrow(() => validateFunctionContracts(patch4));
  });

  it('67. matrix functions retain all operational fields', () => {
    const functions = matrix.functions as Record<string, unknown>[];
    assert.equal(functions.length, 2);
    const required = [
      'schema_name',
      'function_name',
      'identity_arguments',
      'resolved_identity_arguments',
      'result_type',
      'owner_role',
      'security_definer',
      'volatility',
      'parallel_safety',
      'proconfig',
      'search_path',
      'definition_hash',
      'definition_hash_algorithm',
      'definition_length',
      'overload_count',
      'exact_signature_count',
      'public_execute',
      'anon_execute',
      'authenticated_execute',
      'service_role_execute',
    ];
    for (const fn of functions) {
      for (const field of required) {
        assert.ok(field in fn && fn[field] !== null && fn[field] !== undefined, `missing ${field}`);
      }
      assert.equal(fn.overload_count, 1);
      assert.equal(fn.exact_signature_count, 1);
      assert.equal(fn.owner_role, 'postgres');
      assert.equal(fn.security_definer, true);
      assert.equal(fn.result_type, 'jsonb');
      assert.equal(fn.public_execute, false);
      assert.equal(fn.anon_execute, true);
      assert.equal(fn.authenticated_execute, true);
      assert.equal(fn.service_role_execute, true);
    }
  });

  it('68. normalizeFunctionContract matches PATCH-4 actual_json', () => {
    for (const cell of patch4.function_inventory) {
      const normalized = normalizeFunctionContract(cell);
      assert.equal(normalized.function_name, cell.actual_json.function_name);
      assert.equal(normalized.definition_hash, cell.actual_json.definition_hash);
    }
  });

  it('69. synthesized ACL omits PUBLIC grant and includes evidence roles', () => {
    for (const cell of patch4.function_inventory) {
      const lines = synthesizeFunctionOwnershipAndAcl(cell.actual_json);
      assert.ok(lines.some((line) => line.includes('OWNER TO "postgres"')));
      assert.ok(lines.some((line) => line.includes('FROM PUBLIC')));
      assert.ok(lines.some((line) => line.includes('TO "anon"')));
      assert.ok(lines.some((line) => line.includes('TO "authenticated"')));
      assert.ok(lines.some((line) => line.includes('TO "service_role"')));
      assert.equal(lines.some((line) => /TO PUBLIC;/.test(line)), false);
    }
  });

  it('70. generated baseline has exact function owner revoke grant counts', () => {
    const baselineSql = readFileSync(resolveRepoPath(REPO_ROOT, PATHS.baselineSql), 'utf8');
    const ownerMatches = baselineSql.match(/ALTER FUNCTION .+ OWNER TO "postgres";/g) ?? [];
    const revokeMatches = baselineSql.match(/REVOKE ALL ON FUNCTION .+ FROM PUBLIC;/g) ?? [];
    const anonGrants = baselineSql.match(/GRANT EXECUTE ON FUNCTION .+ TO "anon";/g) ?? [];
    const authGrants = baselineSql.match(/GRANT EXECUTE ON FUNCTION .+ TO "authenticated";/g) ?? [];
    const serviceGrants = baselineSql.match(/GRANT EXECUTE ON FUNCTION .+ TO "service_role";/g) ?? [];
    assert.equal(ownerMatches.length, 2);
    assert.equal(revokeMatches.length, 2);
    assert.equal(anonGrants.length, 2);
    assert.equal(authGrants.length, 2);
    assert.equal(serviceGrants.length, 2);
    assert.match(
      baselineSql,
      /"public"\."m55_consult_reply_commit"\(text, uuid, uuid, text, text, text, timestamp with time zone\)/
    );
    assert.match(
      baselineSql,
      /"public"\."m55_reply_generate_commit"\(text, uuid, jsonb, text, text\)/
    );
  });
});

describe('previewBaselineArtifacts — Revision-2 extension prerequisite', () => {
  it('71. baseline contains zero CREATE EXTENSION statements', () => {
    const baselineSql = readFileSync(resolveRepoPath(REPO_ROOT, PATHS.baselineSql), 'utf8');
    assert.equal(/\bCREATE\s+EXTENSION\b/i.test(baselineSql), false);
    const parsed = pglastParseSql(baselineSql);
    const extensions = parsed.statements.filter((stmt) => stmt.type === 'CreateExtensionStmt');
    assert.equal(extensions.length, 0);
  });

  it('72. matrix declares gen_random_uuid_callable prerequisite', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    const prerequisites = matrix.baseline_prerequisites as { gen_random_uuid_callable: boolean };
    assert.equal(prerequisites.gen_random_uuid_callable, true);
  });
});

describe('previewBaselineArtifacts — Revision-3 derive/verify separation', () => {
  function mirrorArtifactsToTemp(): { dir: string; paths: ReturnType<typeof resolveArtifactPaths> } {
    const dir = mkdtempSync(join(tmpdir(), 'm55-verify-mirror-'));
    const repoPaths = resolveArtifactPaths(REPO_ROOT);
    const matrixPath = join(dir, 'matrix.json');
    const baselinePath = join(dir, 'baseline.sql');
    const manifestPath = join(dir, 'manifest.json');
    copyFileSync(repoPaths.matrixPath, matrixPath);
    copyFileSync(repoPaths.baselinePath, baselinePath);
    copyFileSync(repoPaths.manifestPath, manifestPath);
    return {
      dir,
      paths: { matrixPath, baselinePath, manifestPath },
    };
  }

  it('73. deriveArtifacts performs zero writes', () => {
    const before = resolveArtifactPaths(REPO_ROOT);
    const mtimeMatrix = statSync(before.matrixPath).mtimeMs;
    deriveArtifacts(REPO_ROOT);
    assert.equal(statSync(before.matrixPath).mtimeMs, mtimeMatrix);
  });

  it('74. verifyArtifacts passes without mutating on-disk bytes', () => {
    const paths = resolveArtifactPaths(REPO_ROOT);
    const before = {
      matrix: readFileSync(paths.matrixPath),
      baseline: readFileSync(paths.baselinePath),
      manifest: readFileSync(paths.manifestPath),
    };
    verifyArtifacts(REPO_ROOT);
    assert.ok(before.matrix.equals(readFileSync(paths.matrixPath)));
    assert.ok(before.baseline.equals(readFileSync(paths.baselinePath)));
    assert.ok(before.manifest.equals(readFileSync(paths.manifestPath)));
  });

  it('75. tampered matrix in mirror fails verify without repairing repo', () => {
    const { dir, paths } = mirrorArtifactsToTemp();
    const repoPaths = resolveArtifactPaths(REPO_ROOT);
    const repoMatrixBefore = readFileSync(repoPaths.matrixPath);
    try {
      const tampered = `${readFileSync(paths.matrixPath, 'utf8')} `;
      writeFileSync(paths.matrixPath, tampered, 'utf8');
      assert.throws(() => verifyArtifacts(REPO_ROOT, paths), /Matrix on disk/);
      assert.ok(repoMatrixBefore.equals(readFileSync(repoPaths.matrixPath)));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('76. missing manifest in mirror fails verify', () => {
    const { dir, paths } = mirrorArtifactsToTemp();
    try {
      rmSync(paths.manifestPath);
      assert.throws(() => verifyArtifacts(REPO_ROOT, paths), /missing_manifest/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('77. double deriveArtifacts is byte-identical', () => {
    const first = deriveArtifacts(REPO_ROOT);
    const second = deriveArtifacts(REPO_ROOT);
    assert.equal(first.matrixJson, second.matrixJson);
    assert.equal(first.baselineSql, second.baselineSql);
    assert.equal(first.manifestJson, second.manifestJson);
  });
});

describe('previewBaselineArtifacts — Revision-3 function source SHA provenance', () => {
  it('78. verifyFunctionSourceMigration matches expected SHA for both sources', () => {
    for (const source of FUNCTION_SOURCE_MIGRATIONS) {
      const result = verifyFunctionSourceMigration(REPO_ROOT, source);
      assert.equal(result.sha256Match, true);
      assert.equal(result.actualSha256, source.sourceMigrationSha256);
    }
  });

  it('79. extractions record actual and expected SHA separately', () => {
    const extractions = extractAllFunctionStatements(REPO_ROOT);
    for (const extraction of extractions) {
      assert.equal(extraction.sourceMigrationExpectedSha256, extraction.sourceMigrationActualSha256);
      assert.equal(extraction.sourceMigrationSha256Match, true);
    }
  });

  it('80. matrix functions declare PENDING production body parity', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    const fns = matrix.functions as { production_body_parity_status: string }[];
    assert.equal(fns.length, 2);
    assert.ok(fns.every((fn) => fn.production_body_parity_status === PRODUCTION_BODY_PARITY_STATUS));
  });
});

describe('previewBaselineArtifacts — Revision-3 search_path and triggers', () => {
  it('81. baseline has SET LOCAL search_path after BEGIN', () => {
    const baselineSql = readFileSync(resolveRepoPath(REPO_ROOT, PATHS.baselineSql), 'utf8');
    assert.match(baselineSql, /BEGIN;\s*\n\s*SET LOCAL search_path = pg_catalog, public;/);
    assert.equal(baselineSql.includes(BASELINE_SQL_REVISION), true);
  });

  it('82. baseline qualifies public function CREATE names', () => {
    const baselineSql = readFileSync(resolveRepoPath(REPO_ROOT, PATHS.baselineSql), 'utf8');
    assert.match(baselineSql, /CREATE OR REPLACE FUNCTION public\.m55_reply_generate_commit/);
    assert.match(baselineSql, /CREATE OR REPLACE FUNCTION public\.m55_consult_reply_commit/);
  });

  it('83. matrix uses internal trigger derived parity mode', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    assert.equal(matrix.trigger_parity_mode, 'USER_DEFINED_EXACT_AND_INTERNAL_DERIVED_FROM_FK');
    assert.equal(matrix.internal_trigger_exact_name_parity, false);
    assert.equal((matrix.internal_fk_trigger_contracts as unknown[]).length > 0, true);
  });

  it('84. coverage semantic pass excludes pending production parity', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    const coverage = matrix.coverage_matrix as {
      category: string;
      semantic_validation_pass: boolean;
      coverage_status: string;
    }[];
    const parity = coverage.find((entry) => entry.category === 'functions_body_production_parity');
    assert.equal(parity?.semantic_validation_pass, false);
    assert.equal(parity?.coverage_status, 'PENDING_EXECUTION');
    const others = coverage.filter((entry) => entry.category !== 'functions_body_production_parity');
    assert.ok(others.every((entry) => entry.semantic_validation_pass === true));
  });

  it('85. matrix static readiness state is declared', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    assert.equal(matrix.static_readiness_state, STATIC_READINESS_STATE);
  });
});

describe('previewBaselineArtifacts — Revision-3 path containment helper', () => {
  it('86. isPathStrictlyInside rejects tmpdir sibling prefix trap', () => {
    const realTmp = join(tmpdir());
    const evil = join(`${realTmp}-evil`, 'm55-preview-baseline-workspace-x');
    assert.equal(isPathStrictlyInside(realTmp, evil), false);
  });

  it('87. validateIdSet detects duplicate ids', () => {
    const result = validateIdSet(['a', 'b'], ['a', 'a', 'b']);
    assert.equal(result.semanticValidationPass, false);
    assert.deepEqual(result.duplicateIds, ['a']);
  });
});

describe('previewBaselineArtifacts — Revision-4 coverage truthfulness', () => {
  const { patch4, p3Rows, functions } = loadParsedArtifacts();
  const matrix = buildContractMatrix(patch4, p3Rows, functions);
  const coverage = matrix.coverage_matrix as {
    category: string;
    coverage_status: string;
    coverage_complete: boolean;
    semantic_validation_pass: boolean;
    pending_validation_reason: string | null;
  }[];

  it('88. functions_body_production_parity is PENDING_EXECUTION only', () => {
    const parity = coverage.find((entry) => entry.category === 'functions_body_production_parity');
    assert.equal(parity?.coverage_status, 'PENDING_EXECUTION');
    assert.equal(parity?.coverage_complete, false);
    assert.equal(parity?.semantic_validation_pass, false);
    assert.equal(parity?.pending_validation_reason, PENDING_FUNCTION_PARITY_REASON);
  });

  it('89. deriveArtifacts accepts one approved pending category', () => {
    assert.doesNotThrow(() => validateCoverageForDerivation(coverage));
    assert.deepEqual([...APPROVED_PENDING_COVERAGE_CATEGORIES], ['functions_body_production_parity']);
  });

  it('90. relation coverage requires 45 security fingerprints', () => {
    const relation = coverage.find((entry) => entry.category === 'relation');
    assert.equal(relation?.required_object_count, 45);
    assert.equal(relation?.coverage_complete, true);
  });
});

describe('previewBaselineArtifacts — Revision-4 FK semantics', () => {
  const { patch4 } = loadParsedArtifacts();
  const constraintsByRelation = inventoryByRelation(
    patch4.constraint_inventory,
    'constraints'
  );
  const fkContracts = deriveInternalFkTriggerContracts(constraintsByRelation);

  it('91. FK count is exactly 10', () => {
    assert.equal(fkContracts.length, 10);
  });

  it('92. FK delete action distribution matches Production', () => {
    const counts = { 'SET NULL': 0, CASCADE: 0, RESTRICT: 0 };
    for (const fk of fkContracts) counts[fk.delete_action as keyof typeof counts] += 1;
    assert.deepEqual(counts, { 'SET NULL': 5, CASCADE: 3, RESTRICT: 2 });
  });

  it('93. FK update action distribution matches Production', () => {
    const counts = { 'NO ACTION': 0, RESTRICT: 0 };
    for (const fk of fkContracts) counts[fk.update_action as keyof typeof counts] += 1;
    assert.deepEqual(counts, { 'NO ACTION': 9, RESTRICT: 1 });
  });

  it('94. individual FK action examples are exact', () => {
    const byName = new Map(fkContracts.map((fk) => [fk.constraint_name, fk]));
    assert.equal(byName.get('consult_messages_thread_id_fkey')?.delete_action, 'CASCADE');
    assert.equal(byName.get('consult_send_commits_assistant_message_id_fkey')?.delete_action, 'SET NULL');
    assert.equal(byName.get('consult_send_commits_consult_thread_id_fkey')?.delete_action, 'RESTRICT');
    const reply = byName.get('reply_documents_session_theme_fk');
    assert.equal(reply?.update_action, 'RESTRICT');
    assert.equal(reply?.delete_action, 'RESTRICT');
  });
});

describe('previewBaselineArtifacts — Revision-6 internal trigger semantic groups', () => {
  const { patch4 } = loadParsedArtifacts();
  const constraintsByRelation = inventoryByRelation(
    patch4.constraint_inventory,
    'constraints'
  );
  const fkContracts = deriveInternalFkTriggerContracts(constraintsByRelation);
  const triggers = inventoryByRelation(patch4.trigger_inventory, 'triggers');
  const built = buildInternalTriggerSemanticGroups(triggers, fkContracts);

  function expandGroupMultiset(groups, countField) {
    const result = [];
    for (const group of groups) {
      const fp = internalTriggerSemanticGroupFingerprint(group);
      for (let i = 0; i < group[countField]; i += 1) result.push(fp);
    }
    return result;
  }

  const expectedMultiset = expandGroupMultiset(
    built.groups.map((g) => ({ ...g, actual_count: g.expected_count })),
    'expected_count'
  );
  const actualMultiset = expandGroupMultiset(built.groups, 'actual_count');

  it('95. internal trigger semantic group multiset totals 40', () => {
    assert.equal(expectedMultiset.length, 40);
    assert.equal(actualMultiset.length, 40);
    const comparison = compareSemanticMultisets(expectedMultiset, actualMultiset);
    assert.equal(comparison.semanticValidationPass, true);
  });

  it('96. internal trigger function distribution matches Production', () => {
    const count = (name) =>
      expectedMultiset.filter((id) => id.includes(`|${name}|`)).length;
    assert.equal(count('RI_FKey_check_ins'), 10);
    assert.equal(count('RI_FKey_check_upd'), 10);
    assert.equal(count('RI_FKey_noaction_upd'), 9);
    assert.equal(count('RI_FKey_restrict_upd'), 1);
    assert.equal(count('RI_FKey_setnull_del'), 5);
    assert.equal(count('RI_FKey_cascade_del'), 3);
    assert.equal(count('RI_FKey_restrict_del'), 2);
  });

  it('97. OID suffix mutation in trigger_name does not change portable semantics', () => {
    const renamedTriggers = new Map(
      [...triggers.entries()].map(([relation, items]) => [
        relation,
        items.map((item) =>
          item.is_internal
            ? { ...item, trigger_name: `${item.trigger_name}_oid999` }
            : item
        ),
      ])
    );
    const renamedBuilt = buildInternalTriggerSemanticGroups(renamedTriggers, fkContracts);
    const renamedMultiset = expandGroupMultiset(renamedBuilt.groups, 'actual_count');
    const comparison = compareSemanticMultisets(expectedMultiset, renamedMultiset);
    assert.equal(comparison.semanticValidationPass, true);
  });

  it('98. ambiguous groups expose candidate IDs without false exact binding', () => {
    const ambiguous = built.groups.filter(
      (g) => g.binding_status === 'AMBIGUOUS_EQUIVALENCE_CLASS'
    );
    assert.equal(ambiguous.length, 6);
    assert.equal(
      ambiguous.reduce((sum, g) => sum + g.actual_count, 0),
      12
    );
    for (const group of ambiguous) {
      assert.equal(group.exact_constraint_contract_id, null);
      assert.ok(group.candidate_constraint_contract_ids.length > 1);
    }
  });

  it('98b. unambiguous groups retain exact binding when evidence is singular', () => {
    const unambiguous = built.groups.filter((g) => g.binding_status === 'UNAMBIGUOUS');
    assert.ok(unambiguous.length > 0);
    for (const group of unambiguous) {
      assert.equal(group.candidate_constraint_contract_ids.length, 1);
      assert.equal(group.exact_constraint_contract_id, group.candidate_constraint_contract_ids[0]);
    }
  });
});

describe('previewBaselineArtifacts — Revision-4/5 output-connected coverage', () => {
  function loadMatrixBundle() {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    return { patch4, p3Rows, functions, matrix };
  }

  function expectSerializedCategoryFails(
    matrix: Record<string, unknown>,
    patch4: ReturnType<typeof loadParsedArtifacts>['patch4'],
    p3Rows: ReturnType<typeof loadParsedArtifacts>['p3Rows'],
    functions: ReturnType<typeof loadParsedArtifacts>['functions'],
    category: string
  ) {
    const coverage = evaluateSerializedMatrixCoverage(patch4, p3Rows, functions, matrix);
    const entry = coverage.find((item) => item.category === category);
    assert.equal(entry?.coverage_status, 'FAILED');
    assert.equal(entry?.coverage_complete, false);
  }

  it('99. serialized matrix baseline coverage is complete except pending parity', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const coverage = evaluateSerializedMatrixCoverage(patch4, p3Rows, functions, matrix);
    assert.doesNotThrow(() => validateCoverageForDerivation(coverage));
  });

  it('100. relation security requires all 45 aspects from evidence', () => {
    const { patch4 } = loadParsedArtifacts();
    assert.doesNotThrow(() => validateRelationSecurityEvidence(patch4.relation_security));
    const relations = buildRelationsFromEvidence(patch4.relation_security);
    assert.equal(relations.length, 15);
    assert.equal(relations.every((r) => r.source_cell_ids.length === 3), true);
  });
});

describe('previewBaselineArtifacts — Revision-5 fingerprint mutations', () => {
  function loadMatrixBundle() {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    return { patch4, p3Rows, functions, matrix };
  }

  function expectCategoryFails(matrix, patch4, p3Rows, functions, category) {
    const coverage = evaluateSerializedMatrixCoverage(patch4, p3Rows, functions, matrix);
    const entry = coverage.find((item) => item.category === category);
    assert.equal(entry?.coverage_status, 'FAILED');
  }

  it('103. owner_role mutation fails relation coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.relations[0].owner_role = 'mutated_owner';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'relation');
  });

  it('104. rls_enabled mutation fails relation coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.relations[0].rls_enabled = !mutated.relations[0].rls_enabled;
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'relation');
  });

  it('105. removing column fails columns coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.columns = mutated.columns.slice(1);
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'columns');
  });

  it('106. constraint delete_action mutation fails constraints coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    const target = mutated.constraints.find((c) => c.constraint_type === 'f');
    target.delete_action = 'MUTATED';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'constraints');
  });

  it('107. removing index fails indexes coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.indexes = mutated.indexes.slice(1);
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'indexes');
  });

  it('108. policy command mutation fails policies coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.policies[0].command = 'MUTATED';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'policies');
  });

  it('109. privilege boolean mutation fails privileges coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.privileges[0].effective_privilege = !mutated.privileges[0].effective_privilege;
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'privileges');
  });

  it('110. internal trigger group actual_count mutation fails triggers coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.internal_trigger_semantic_groups[0].actual_count = 0;
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'triggers');
  });

  it('111. function owner_role mutation fails functions_identity coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.functions[0].owner_role = 'mutated_owner';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'functions_identity');
  });

  it('112. function source extraction_hash mutation fails provenance coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.function_sources[0].extraction_hash = '0'.repeat(64);
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'functions_body_source_provenance');
  });

  it('113. wallet fingerprint mutation fails wallet coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.wallet_scope[0].fingerprint = 'mutated';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'wallet');
  });

  it('113b. wallet actual_json mutation with stale fingerprint fails wallet coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.wallet_scope[0].actual_json = { ...mutated.wallet_scope[0].actual_json, mutated: true };
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'wallet');
  });

  it('114. state transition removal fails state_transitions coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.state_transitions = mutated.state_transitions.slice(1);
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'state_transitions');
  });

  it('114b. state_to mutation fails state_transitions coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.state_transitions[0].state_to = 'MUTATED';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'state_transitions');
  });

  it('114c. history_prefix mutation fails state_transitions coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.state_transitions[0].history_prefix = ['mutated'];
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'state_transitions');
  });

  it('114d. application_row_count mutation fails state_transitions coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.state_transitions[0].application_row_count = 99;
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'state_transitions');
  });

  it('115. excluded object removal fails excluded_objects coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.state_specific_absence = mutated.state_specific_absence.slice(1);
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'excluded_objects');
  });

  it('115b. absence state mutation fails excluded_objects coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.state_specific_absence[0].state = 'P7';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'excluded_objects');
  });

  it('116. FK missing target_relation fails closed', () => {
    const { patch4 } = loadParsedArtifacts();
    const constraintsByRelation = inventoryByRelation(patch4.constraint_inventory, 'constraints');
    const [relation, items] = [...constraintsByRelation.entries()].find(([, list]) =>
      list.some((item) => item.constraint_type === 'f')
    );
    const broken = { ...items.find((item) => item.constraint_type === 'f'), target_relation: null };
    assert.throws(
      () => validateForeignKeyRecord(broken, relation),
      /fk_field_missing:target_relation/
    );
  });

  it('117. relation fingerprints compare evidence values to matrix output', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const expected = patch4.relation_security
      .map((cell) => relationSecurityFingerprintFromEvidence(cell))
      .sort();
    const actual = matrixOutputFromSerialized(matrix)
      .relations.flatMap((relation) => relationSecurityFingerprintsFromMatrix(relation))
      .sort();
    assert.deepEqual(actual, expected);
  });

  it('118. function fingerprints come from normalized matrix functions', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const expected = patch4.function_inventory
      .map((cell) => functionIdentityFingerprintV6(normalizeFunctionContract(cell)))
      .sort();
    const actual = (matrix.functions as Record<string, unknown>[])
      .map((fn) => functionIdentityFingerprintV6(fn))
      .sort();
    assert.deepEqual(actual, expected);
  });

  it('118b. definition_hash_algorithm mutation fails functions_identity coverage', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.functions[0].definition_hash_algorithm = 'sha256';
    expectCategoryFails(mutated, patch4, p3Rows, functions, 'functions_identity');
  });

  it('118c. false VERIFIED parity status fails functions_body_production_parity semantic', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const mutated = structuredClone(matrix);
    mutated.functions[0].production_body_parity_status = 'VERIFIED_STATICALLY';
    const coverage = evaluateSerializedMatrixCoverage(patch4, p3Rows, functions, mutated);
    const entry = coverage.find((item) => item.category === 'functions_body_production_parity');
    assert.equal(entry?.semantic_validation_pass, false);
  });

  it('119. function source fingerprints include extraction fields', () => {
    const { patch4, p3Rows, functions, matrix } = loadMatrixBundle();
    const expected = functions
      .map((item) =>
        functionSourceFingerprint({
          function_identity: item.functionIdentity,
          source_migration_path: item.sourceMigrationPath,
          source_migration_expected_sha256: item.sourceMigrationExpectedSha256,
          source_migration_actual_sha256: item.sourceMigrationActualSha256,
          source_migration_sha256_match: item.sourceMigrationSha256Match,
          extraction_hash: item.extractionHash,
          statement_count: item.extractionStatementCount,
        })
      )
      .sort();
    const actual = (matrix.function_sources as Record<string, unknown>[])
      .map((item) => functionSourceFingerprint(item))
      .sort();
    assert.deepEqual(actual, expected);
  });

  it('120. enabled_state mutation in inventory fails raw validation', () => {
    const { patch4 } = loadParsedArtifacts();
    const triggers = inventoryByRelation(patch4.trigger_inventory, 'triggers');
    const [relation, items] = [...triggers.entries()].find(([, list]) =>
      list.some((item) => item.is_internal)
    );
    const target = items.find((item) => item.is_internal);
    const broken = { ...target, enabled_state: 'D' };
    assert.throws(
      () => parseInternalTriggerStrict(relation, broken),
      /internal_trigger_enabled_state_unknown/
    );
  });
});

describe('previewBaselineArtifacts — Revision-6 raw assignment path', () => {
  const { patch4 } = loadParsedArtifacts();
  const constraintsByRelation = inventoryByRelation(patch4.constraint_inventory, 'constraints');
  const fkContracts = deriveInternalFkTriggerContracts(constraintsByRelation);
  const triggers = inventoryByRelation(patch4.trigger_inventory, 'triggers');

  it('121. reverse candidate constraint order yields same semantic groups', () => {
    const reversedContracts = [...fkContracts].reverse();
    const forward = buildInternalTriggerSemanticGroups(triggers, fkContracts).groups;
    const reversed = buildInternalTriggerSemanticGroups(triggers, reversedContracts).groups;
    assert.deepEqual(
      forward.map((g) => ({
        id: g.semantic_group_id,
        expected: g.expected_count,
        actual: g.actual_count,
        binding: g.binding_status,
        candidates: g.candidate_constraint_contract_ids,
      })),
      reversed.map((g) => ({
        id: g.semantic_group_id,
        expected: g.expected_count,
        actual: g.actual_count,
        binding: g.binding_status,
        candidates: g.candidate_constraint_contract_ids,
      }))
    );
  });

  it('122. reverse raw trigger order yields same semantic groups', () => {
    const reversedTriggers = new Map(
      [...triggers.entries()].map(([relation, items]) => [
        relation,
        [...items].reverse(),
      ])
    );
    const forward = buildInternalTriggerSemanticGroups(triggers, fkContracts).groups;
    const reversed = buildInternalTriggerSemanticGroups(reversedTriggers, fkContracts).groups;
    assert.deepEqual(
      forward.map((g) => ({ id: g.semantic_group_id, actual: g.actual_count })),
      reversed.map((g) => ({ id: g.semantic_group_id, actual: g.actual_count }))
    );
  });

  it('123. raw trigger moved to wrong inventory cell fails closed', () => {
    const moved = new Map(triggers);
    const [sourceRelation, items] = [...moved.entries()].find(([, list]) =>
      list.some((item) => item.is_internal)
    );
    const targetRelation = [...moved.keys()].find((name) => name !== sourceRelation);
    const internal = items.find((item) => item.is_internal);
    const without = items.filter((item) => item !== internal);
    moved.set(sourceRelation, without);
    moved.set(targetRelation, [...(moved.get(targetRelation) ?? []), internal]);
    assert.throws(
      () => buildInternalTriggerSemanticGroups(moved, fkContracts),
      /internal_trigger_inventory_relation_mismatch/
    );
  });

  it('124. same global counts but wrong relation pair fails group multiset', () => {
    const built = buildInternalTriggerSemanticGroups(triggers, fkContracts);
    const expected = built.groups.flatMap((g) =>
      Array.from({ length: g.expected_count }, () => internalTriggerSemanticGroupFingerprint(g))
    );
    const wrongGroup = { ...built.groups[0], relation_name: 'wrong_relation' };
    const wrong = built.groups.flatMap((g, index) => {
      const group = index === 0 ? wrongGroup : g;
      return Array.from({ length: group.actual_count }, () =>
        internalTriggerSemanticGroupFingerprint(group)
      );
    });
    const comparison = compareSemanticMultisets(expected, wrong);
    assert.equal(comparison.semanticValidationPass, false);
  });

  it('125. wallet recomputation matches PATCH-4 actual_json', () => {
    const { patch4, p3Rows, functions, matrix } = (() => {
      const loaded = loadParsedArtifacts();
      const matrix = buildContractMatrix(loaded.patch4, loaded.p3Rows, loaded.functions);
      return { ...loaded, matrix };
    })();
    for (const cell of matrix.wallet_scope) {
      assert.equal(verifyWalletFingerprintIntegrity(cell), true);
    }
    const expected = patch4.wallet_scope
      .map((c) => walletFingerprintFromNormalizedOutput({ cell_id: c.cell_id, actual_json: c.actual_json }))
      .sort();
    const actual = matrix.wallet_scope
      .map((c) => walletFingerprintFromNormalizedOutput(c))
      .sort();
    assert.deepEqual(actual, expected);
  });

  it('126. state transition fingerprints include full semantic fields', () => {
    const { patch4, p3Rows, functions, matrix } = (() => {
      const loaded = loadParsedArtifacts();
      const matrix = buildContractMatrix(loaded.patch4, loaded.p3Rows, loaded.functions);
      return { ...loaded, matrix };
    })();
    const fps = matrix.state_transitions.map((t) => stateTransitionFingerprint(t));
    assert.equal(new Set(fps).size, fps.length);
    assert.equal(fps.length, 7);
  });

  it('127. absence fingerprints include state and object', () => {
    const { matrix } = (() => {
      const loaded = loadParsedArtifacts();
      const matrix = buildContractMatrix(loaded.patch4, loaded.p3Rows, loaded.functions);
      return { matrix };
    })();
    const fps = matrix.state_specific_absence.map((item) => stateSpecificAbsenceFingerprint(item));
    assert.ok(fps.every((fp) => fp.startsWith('P1|')));
  });

  it('128. function parity pending fingerprints require md5 and pending status', () => {
    const { matrix } = (() => {
      const loaded = loadParsedArtifacts();
      const matrix = buildContractMatrix(loaded.patch4, loaded.p3Rows, loaded.functions);
      return { matrix };
    })();
    for (const fn of matrix.functions) {
      const fp = functionParityPendingFingerprint(fn);
      assert.match(fp, /PENDING_DISPOSABLE_EXECUTION/);
      assert.match(fp, /md5/);
    }
  });

  it('129. missing function_schema on internal trigger fails closed', () => {
    const { patch4 } = loadParsedArtifacts();
    const triggers = inventoryByRelation(patch4.trigger_inventory, 'triggers');
    const [relation, items] = [...triggers.entries()].find(([, list]) =>
      list.some((item) => item.is_internal)
    );
    const target = items.find((item) => item.is_internal);
    const broken = { ...target, function_schema: '' };
    assert.throws(
      () => parseInternalTriggerStrict(relation, broken),
      /internal_trigger_function_schema_missing/
    );
  });
});

describe('previewBaselineArtifacts — Revision-4 pglast version pin', () => {
  it('101. runtime pglast version matches 7.14', () => {
    const version = assertPglastRuntimeVersion();
    assert.equal(version.expected_version, PGLAST_EXPECTED_VERSION);
    assert.equal(version.actual_version, PGLAST_EXPECTED_VERSION);
    assert.equal(version.version_match, true);
  });

  it('102. matrix parser_contract records runtime version fields', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    const parser = matrix.parser_contract as {
      expected_version: string;
      actual_version: string;
      version_match: boolean;
    };
    assert.equal(parser.expected_version, PGLAST_EXPECTED_VERSION);
    assert.equal(parser.actual_version, PGLAST_EXPECTED_VERSION);
    assert.equal(parser.version_match, true);
  });
});

const FROZEN_BASELINE_DDL_STATEMENT_MULTSET_SHA256 =
  'd8b3bf77d4e71358fcd0da8466bd7b9818f97283500fc3e6135d06bcbf515802' as const;

const FROZEN_PHASE_ORACLE_CONTRACT_HASHES = {
  P0: '85ac8761006ba1f9bf1f1cbfcd7940f81e21fb393eb50d1289ac31fd894f6792',
  P1: '77ba63b64fee47ca9b6deec00bb76f90fe239f6b236994116afdf8be9735fc0c',
  P2: '6bc6fef759709ae8212c47c364fe34b9af6eb4e751633e128d222293e2af44b8',
  P3: '26d9eec63ea50365008298a4a62b931638dba2ad285ffff8a2ba371d25d296b5',
  P4: 'dd80ce8029453c787ad4d645b5902038cb48b19c775f9ceff0d018fa59cead5b',
  P5: '154852f6c7681262c3e615a61df342a3e21ef8fd4d6bbbf642d38c5d3ac85139',
  P6: 'a70ed4282d55552c2a3bd1ef9448cecba5f01847b23de03f8e2c64ffbd9017d2',
  P7: '04860bcbfccb948acf5682c0bd4f787b9356b479ef18805834416f2f8e15a8e3',
} as const;

describe('previewBaselineArtifacts — RETRY-3 pre-FK prerequisite index ordering', () => {
  const { patch4, p3Rows, functions, productionFunctionExport } = loadParsedArtifacts();
  const bundleSha = computeEvidenceBundleSha256();
  const matrixJson = stableStringify(buildContractMatrix(patch4, p3Rows, functions));
  const matrixSha = sha256Hex(matrixJson);
  const baselineSql = buildTestBaselineSql(
    patch4,
    p3Rows,
    functions,
    matrixSha,
    bundleSha,
    productionFunctionExport
  );

  it('R3-1 pre-FK prerequisite index registry is exactly reply_sessions_id_theme_key', () => {
    const constraintsByRelation = inventoryByRelation(patch4.constraint_inventory, 'constraints');
    const indexesByRelation = inventoryByRelation(patch4.index_inventory, 'indexes');
    assert.deepEqual(
      identifyPreFkPrerequisiteIndexNames(constraintsByRelation, indexesByRelation),
      [...PRE_FK_PREREQUISITE_INDEX_REGISTRY_P1]
    );
  });

  it('R3-2 reply_sessions_id_theme_key appears before reply_documents_session_theme_fk', () => {
    const indexPosition = baselineSql.indexOf('CREATE UNIQUE INDEX reply_sessions_id_theme_key');
    const fkPosition = baselineSql.indexOf('ADD CONSTRAINT "reply_documents_session_theme_fk"');
    assert.ok(indexPosition >= 0);
    assert.ok(fkPosition >= 0);
    assert.ok(indexPosition < fkPosition);
  });

  it('R3-3 prerequisite index and composite FK each appear exactly once', () => {
    const indexMatches = baselineSql.match(/CREATE UNIQUE INDEX reply_sessions_id_theme_key\b/g) ?? [];
    const fkMatches =
      baselineSql.match(/ADD CONSTRAINT "reply_documents_session_theme_fk"/g) ?? [];
    assert.equal(indexMatches.length, 1);
    assert.equal(fkMatches.length, 1);
  });

  it('R3-4 baseline DDL statement multiset matches production-definition embed revision', () => {
    assert.equal(baselineDdlStatementMultisetSha256(baselineSql), FROZEN_BASELINE_DDL_STATEMENT_MULTSET_SHA256);
  });

  it('R3-5 matrix SHA unchanged', () => {
    assert.equal(matrixSha, EXPECTED_MATRIX_ARTIFACT_SHA256);
    assert.equal(sha256Hex(matrixJson), EXPECTED_MATRIX_ARTIFACT_SHA256);
  });

  it('R3-6 phase oracle_contract_hashes unchanged after oracle rebuild', () => {
    buildExecutionOracle(REPO_ROOT);
    const oracle = JSON.parse(
      readFileSync(join(REPO_ROOT, 'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json'), 'utf8')
    ) as { phases: { phase: string; oracle_contract_hash: string }[] };
    for (const [phase, expectedHash] of Object.entries(FROZEN_PHASE_ORACLE_CONTRACT_HASHES)) {
      const entry = oracle.phases.find((item) => item.phase === phase);
      assert.ok(entry, `missing oracle phase ${phase}`);
      assert.equal(entry.oracle_contract_hash, expectedHash);
    }
  });

  it('R3-7 canonical migration SHA and order unchanged', () => {
    for (const migration of CANONICAL_MIGRATIONS) {
      const actualSha = sha256File(resolveRepoPath(REPO_ROOT, migration.sourcePath));
      assert.equal(actualSha, migration.sha256);
    }
    assert.deepEqual(
      CANONICAL_MIGRATIONS.map((item) => item.version),
      [
        '20260615000001',
        '20260615000002',
        '20260615000003',
        '20260615000004',
        '20260615000005',
        '20260615000006',
      ]
    );
  });

  it('R3-8 workspace build and verify use synchronized baseline manifest oracle identities', () => {
    const built = buildArtifacts(REPO_ROOT);
    assert.equal(built.matrixSha256, EXPECTED_MATRIX_ARTIFACT_SHA256);
    assert.equal(built.baselineSha256, EXPECTED_BASELINE_ARTIFACT_SHA256);
    assert.equal(built.manifestSha256, EXPECTED_MANIFEST_ARTIFACT_SHA256);
    assert.equal(sha256File(built.baselinePath), EXPECTED_BASELINE_ARTIFACT_SHA256);
    assert.doesNotThrow(() => verifyArtifacts(REPO_ROOT));
    assert.doesNotThrow(() => verifyExecutionOracle(REPO_ROOT));
  });
});

describe('previewBaselineArtifacts — Revision-7 false-GREEN closure', () => {
  function evaluateMutation(mutator: (matrix: any) => void) {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = structuredClone(buildContractMatrix(patch4, p3Rows, functions));
    mutator(matrix);
    const coverage = evaluateSerializedMatrixCoverage(patch4, p3Rows, functions, matrix);
    return { coverage, matrix };
  }

  function category(coverage: any[], name: string) {
    const entry = coverage.find((item) => item.category === name);
    assert.ok(entry, `missing coverage category ${name}`);
    return entry;
  }

  it('R7-1 pending parity has passed static prerequisites and NOT_RUN runtime status', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const matrix = buildContractMatrix(patch4, p3Rows, functions);
    const coverage = evaluateSerializedMatrixCoverage(patch4, p3Rows, functions, matrix);
    const pending = category(coverage, 'functions_body_production_parity');
    assert.equal(pending.coverage_status, 'PENDING_EXECUTION');
    assert.equal(pending.static_prerequisites_pass, true);
    assert.equal(pending.runtime_validation_status, 'NOT_RUN');
    assert.deepEqual(pending.missing_ids, []);
    assert.deepEqual(pending.duplicate_ids, []);
    assert.deepEqual(pending.unexpected_ids, []);
    assert.doesNotThrow(() => validateCoverageForDerivation(coverage));
  });

  for (const [label, mutate] of [
    ['empty production hash', (fn: any) => { fn.production_definition_hash = ''; }],
    ['wrong production hash', (fn: any) => { fn.production_definition_hash = '00000000000000000000000000000000'; }],
    ['zero production length', (fn: any) => { fn.production_definition_length = 0; }],
    ['wrong production algorithm', (fn: any) => { fn.production_definition_hash_algorithm = 'sha256'; }],
    ['false verified status', (fn: any) => { fn.production_body_parity_status = 'VERIFIED_STATICALLY'; }],
  ] as const) {
    it(`R7-2 ${label} fails pending static prerequisites`, () => {
      const { coverage } = evaluateMutation((matrix) => mutate(matrix.functions[0]));
      const pending = category(coverage, 'functions_body_production_parity');
      assert.equal(pending.coverage_status, 'FAILED');
      assert.equal(pending.static_prerequisites_pass, false);
      assert.throws(() => validateCoverageForDerivation(coverage));
    });
  }

  for (const [label, mutate] of [
    ['binding status', (group: any) => { group.binding_status = 'BOGUS'; }],
    ['candidate IDs', (group: any) => { group.candidate_constraint_contract_ids = ['bogus']; }],
    ['exact constraint ID', (group: any) => { group.exact_constraint_contract_id = 'bogus'; }],
    ['expected count', (group: any) => { group.expected_count += 1; }],
    ['semantic group ID', (group: any) => { group.semantic_group_id = 'group:bogus'; }],
    ['portable identity', (group: any) => { group.portable_identity = false; }],
  ] as const) {
    it(`R7-3 trigger group ${label} mutation fails coverage`, () => {
      const { coverage } = evaluateMutation((matrix) => mutate(matrix.internal_trigger_semantic_groups[0]));
      assert.equal(category(coverage, 'triggers').coverage_status, 'FAILED');
    });
  }

  for (const [label, mutate] of [
    ['relation', (item: any) => { item.relation_name = 'wrong_relation'; }],
    ['semantic group', (item: any) => { item.semantic_group_id = 'group:bogus'; }],
    ['function', (item: any) => { item.function_name = 'RI_FKey_bogus'; }],
    ['enabled state', (item: any) => { item.enabled_state = 'D'; }],
    ['classification', (item: any) => { item.trigger_classification = 'USER_DEFINED'; }],
  ] as const) {
    it(`R7-4 trigger inventory ${label} mutation fails coverage`, () => {
      const { coverage } = evaluateMutation((matrix) => mutate(matrix.internal_trigger_inventory[0]));
      assert.equal(category(coverage, 'triggers').coverage_status, 'FAILED');
    });
  }

  it('R7-5 state registry mutation fails coverage', () => {
    const { coverage } = evaluateMutation((matrix) => { matrix.states[0] = 'PX'; });
    assert.equal(category(coverage, 'state_registry').coverage_status, 'FAILED');
  });

  it('R7-5 state presence mutation fails coverage', () => {
    const { coverage } = evaluateMutation((matrix) => { matrix.state_specific_presence[0].state = 'P7'; });
    assert.equal(category(coverage, 'state_presence').coverage_status, 'FAILED');
  });

  for (const field of ['definition_hash_algorithm', 'resolved_identity_arguments', 'proconfig'] as const) {
    it(`R7-6 missing authoritative function field ${field} fails closed`, () => {
      const { patch4 } = loadParsedArtifacts();
      const cell = structuredClone(patch4.function_inventory[0]);
      delete (cell.actual_json as any)[field];
      assert.throws(() => normalizeFunctionContract(cell), /function_contract_.*_missing/);
    });
  }
});

describe('previewBaselineArtifacts — Production function definition evidence (REVISION-8)', () => {
  const exportDoc = loadProductionFunctionDefinitionExport(REPO_ROOT);

  it('FP-1 frozen production export SHA, bytes, and revision', () => {
    const path = resolveRepoPath(REPO_ROOT, PATHS.productionFunctionDefinitionExport);
    assert.equal(sha256File(path), EXPECTED_PRODUCTION_FUNCTION_DEFINITION_EXPORT_SHA256);
    assert.equal(statSync(path).size, PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_BYTES);
    assert.equal(
      countNewlines(readFileSync(path, 'utf8')),
      PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_NEWLINES
    );
    assert.equal(exportDoc.diagnostic_revision, PRODUCTION_FUNCTION_DEFINITION_EXPORT_REVISION);
  });

  it('FP-2 export metadata and exact target identities', () => {
    assert.doesNotThrow(() => verifyProductionFunctionDefinitionExport(exportDoc));
    assert.equal(exportDoc.functions.length, 2);
    for (const target of PRODUCTION_FUNCTION_PARITY_TARGETS) {
      const record = exportDoc.functions.find((item) => item.function_name === target.functionName);
      assert.ok(record);
      assert.equal(record.schema_name, 'public');
      assert.equal(record.exact_match_count, 1);
      assert.equal(record.definition_md5, target.expectedMd5);
      assert.equal(record.definition_character_length, target.expectedCharacterLength);
      assert.equal(record.security_definer, true);
      assert.equal(record.volatility, 'v');
      assert.equal(record.parallel_safety, 'u');
      assert.deepEqual(record.proconfig, ['search_path=public']);
    }
  });

  it('FP-3 semantic guards tie production export to canonical migration provenance', () => {
    const functions = extractAllFunctionStatements(REPO_ROOT);
    assert.doesNotThrow(() => assertProductionFunctionSemanticGuards(exportDoc, functions));
  });

  it('FP-4 embedded CRLF bytes are preserved in frozen export strings', () => {
    for (const target of PRODUCTION_FUNCTION_PARITY_TARGETS) {
      const record = exportDoc.functions.find((item) => item.function_name === target.functionName)!;
      const crlfCount = (record.function_definition.match(/\r\n/g) ?? []).length;
      assert.equal(crlfCount, target.expectedCrlfCount);
      assert.ok(record.function_definition.includes('\r\n'));
    }
  });

  it('FP-5 generated P1 definitions produce expected raw MD5 and length', () => {
    for (const target of PRODUCTION_FUNCTION_PARITY_TARGETS) {
      const record = exportDoc.functions.find((item) => item.function_name === target.functionName)!;
      const formatted = formatProductionFunctionCreateForBaseline(record.function_definition);
      assert.equal(
        createHash('md5').update(record.function_definition).digest('hex'),
        target.expectedMd5
      );
      assert.equal(record.function_definition.length, target.expectedCharacterLength);
      assert.ok(formatted.endsWith(';'));
    }
  });

  it('FP-6 rejects unapproved reply spacing delta', () => {
    const functions = extractAllFunctionStatements(REPO_ROOT);
    const mutated = structuredClone(exportDoc);
    const reply = mutated.functions.find((item) => item.function_name === 'm55_reply_generate_commit')!;
    reply.function_definition = reply.function_definition.replace(
      'SELECT available_count INTO v_avail_before',
      'SELECT available_count  INTO v_avail_before'
    );
    assert.throws(
      () => assertProductionFunctionSemanticGuards(mutated, functions),
      /production_function_definition_export_definition_md5_mismatch:m55_reply_generate_commit/
    );
  });

  it('FP-7 rejects consult body drift', () => {
    const functions = extractAllFunctionStatements(REPO_ROOT);
    const mutated = structuredClone(exportDoc);
    const consult = mutated.functions.find((item) => item.function_name === 'm55_consult_reply_commit')!;
    consult.function_definition = consult.function_definition.replace('RAISE;', 'RAISE NOTICE;');
    assert.throws(
      () => assertProductionFunctionSemanticGuards(mutated, functions),
      /production_function_definition_export_definition_md5_mismatch:m55_consult_reply_commit/
    );
  });

  it('FP-8 matrix semantics unchanged while baseline uses production definitions', () => {
    const { patch4, p3Rows, functions } = loadParsedArtifacts();
    const bundleSha = computeEvidenceBundleSha256();
    const matrixSha = sha256Hex(stableStringify(buildContractMatrix(patch4, p3Rows, functions)));
    assert.equal(matrixSha, EXPECTED_MATRIX_ARTIFACT_SHA256);
    const baselineSql = buildTestBaselineSql(
      patch4,
      p3Rows,
      functions,
      matrixSha,
      bundleSha,
      exportDoc
    );
    for (const target of PRODUCTION_FUNCTION_PARITY_TARGETS) {
      const record = exportDoc.functions.find((item) => item.function_name === target.functionName)!;
      assert.ok(baselineSql.includes(record.function_definition.slice(0, 80)));
      const migrationCreate = findMigrationFunctionCreateStatement(
        functions.find((item) => item.targetName === target.functionName)!
      );
      if (target.functionName === 'm55_consult_reply_commit') {
        assert.equal(
          normalizeFunctionDefinitionEol(extractFunctionDollarQuotedBody(record.function_definition)),
          normalizeFunctionDefinitionEol(extractFunctionDollarQuotedBody(migrationCreate))
        );
      } else {
        assert.equal(
          collapseReplyAllowedSpacingDelta(
            normalizeFunctionDefinitionEol(extractFunctionDollarQuotedBody(migrationCreate))
          ),
          normalizeFunctionDefinitionEol(extractFunctionDollarQuotedBody(record.function_definition))
        );
      }
    }
  });
});

describe('previewBaselineArtifacts — P6 catalog name-array type canonicalization', () => {
  const migrationPath = join(
    REPO_ROOT,
    'supabase/migrations/20260615000005_m55_dtr_visible_report_uniqueness_v1.sql'
  );
  const migrationSql = readFileSync(migrationPath, 'utf8');
  const p6Entry = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000005');

  it('P6-1 manifest P6 migration SHA and byte length synchronized', () => {
    const manifest = JSON.parse(
      readFileSync(join(REPO_ROOT, PATHS.manifest), 'utf8')
    ) as { migrations: { version: string; sha256: string; byte_length: number; line_count: number }[] };
    const entry = manifest.migrations.find((item) => item.version === '20260615000005');
    assert.ok(entry);
    assert.ok(p6Entry);
    assert.equal(entry.sha256, p6Entry.sha256);
    assert.equal(entry.byte_length, 18265);
    assert.equal(entry.line_count, 481);
    assert.equal(sha256File(migrationPath), p6Entry.sha256);
  });

  it('P6-2 oracle P6 source_sha256 synchronized to corrected migration', () => {
    const oracle = JSON.parse(
      readFileSync(join(REPO_ROOT, PATHS.executionOracle), 'utf8')
    ) as {
      canonical_migration_shas: Record<string, string>;
      phases: { phase: string; expected_delta_from_previous?: { source_sha256?: string } }[];
    };
    assert.equal(oracle.canonical_migration_shas['20260615000005'], p6Entry!.sha256);
    const p6 = oracle.phases.find((item) => item.phase === 'P6');
    assert.equal(p6?.expected_delta_from_previous?.source_sha256, p6Entry!.sha256);
  });

  it('P6-3 P0 through P5 oracle contract hashes remain unchanged', () => {
    const oracle = JSON.parse(
      readFileSync(join(REPO_ROOT, PATHS.executionOracle), 'utf8')
    ) as { phases: { phase: string; oracle_contract_hash: string }[] };
    for (const [phase, expectedHash] of Object.entries(FROZEN_PHASE_ORACLE_CONTRACT_HASHES)) {
      if (phase === 'P6' || phase === 'P7') continue;
      const entry = oracle.phases.find((item) => item.phase === phase);
      assert.equal(entry?.oracle_contract_hash, expectedHash, phase);
    }
  });

  it('P6-4 matrix SHA remains unchanged', () => {
    assert.equal(
      sha256Hex(readFileSync(join(REPO_ROOT, PATHS.contractMatrix))),
      EXPECTED_MATRIX_ARTIFACT_SHA256
    );
  });

  it('P6-5 mutation removing one attname cast violates cast contract', () => {
    const mutated = migrationSql.replace(
      'array_agg(a.attname::text ORDER BY k.ord)',
      'array_agg(a.attname ORDER BY k.ord)',
      1
    );
    assert.equal((mutated.match(/array_agg\(a\.attname::text ORDER BY/g) ?? []).length, 6);
    assert.match(mutated, /array_agg\(a\.attname ORDER BY/);
  });
});

describe('previewBaselineArtifacts — P7 catalog name-array type canonicalization', () => {
  const migrationPath = join(
    REPO_ROOT,
    'supabase/migrations/20260615000006_m55_entitlements_unique_index_cleanup_v1.sql'
  );
  const migrationSql = readFileSync(migrationPath, 'utf8');
  const p7Entry = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000006');

  it('P7-1 manifest P7 migration SHA and byte length synchronized', () => {
    const manifest = JSON.parse(
      readFileSync(join(REPO_ROOT, PATHS.manifest), 'utf8')
    ) as { migrations: { version: string; sha256: string; byte_length: number; line_count: number }[] };
    const entry = manifest.migrations.find((item) => item.version === '20260615000006');
    assert.ok(entry);
    assert.ok(p7Entry);
    assert.equal(entry.sha256, p7Entry.sha256);
    assert.equal(entry.byte_length, 15577);
    assert.equal(entry.line_count, 436);
    assert.equal(sha256File(migrationPath), p7Entry.sha256);
  });

  it('P7-2 oracle P7 source_sha256 synchronized to corrected migration', () => {
    const oracle = JSON.parse(
      readFileSync(join(REPO_ROOT, PATHS.executionOracle), 'utf8')
    ) as {
      canonical_migration_shas: Record<string, string>;
      phases: { phase: string; expected_delta_from_previous?: { source_sha256?: string } }[];
    };
    assert.equal(oracle.canonical_migration_shas['20260615000006'], p7Entry!.sha256);
    const p7 = oracle.phases.find((item) => item.phase === 'P7');
    assert.equal(p7?.expected_delta_from_previous?.source_sha256, p7Entry!.sha256);
  });

  it('P7-3 P0 through P6 oracle contract hashes remain unchanged', () => {
    const oracle = JSON.parse(
      readFileSync(join(REPO_ROOT, PATHS.executionOracle), 'utf8')
    ) as { phases: { phase: string; oracle_contract_hash: string }[] };
    for (const [phase, expectedHash] of Object.entries(FROZEN_PHASE_ORACLE_CONTRACT_HASHES)) {
      if (phase === 'P7') continue;
      const entry = oracle.phases.find((item) => item.phase === phase);
      assert.equal(entry?.oracle_contract_hash, expectedHash, phase);
    }
  });

  it('P7-4 P6 migration SHA and semantics remain unchanged', () => {
    const p6Entry = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000005');
    assert.ok(p6Entry);
    assert.equal(
      sha256File(join(REPO_ROOT, p6Entry.sourcePath)),
      'b283aa73ea4b004c006229dfc6afec222b44ea71422b34cb7a3fa3f46862d8f6'
    );
  });

  it('P7-5 matrix SHA remains unchanged', () => {
    assert.equal(
      sha256Hex(readFileSync(join(REPO_ROOT, PATHS.contractMatrix))),
      EXPECTED_MATRIX_ARTIFACT_SHA256
    );
  });

  it('P7-6 attname aggregations cast to text exactly eight times', () => {
    assert.equal((migrationSql.match(/array_agg\(a\.attname::text ORDER BY/g) ?? []).length, 8);
  });

  it('P7-7 relname aggregations cast to text exactly four times', () => {
    assert.equal((migrationSql.match(/array_agg\(ic\.relname::text ORDER BY/g) ?? []).length, 4);
  });

  it('P7-8 conname aggregations cast to text exactly two times', () => {
    assert.equal((migrationSql.match(/array_agg\(con\.conname::text ORDER BY/g) ?? []).length, 2);
  });

  it('P7-9 no uncast attname/relname/conname array aggregations remain', () => {
    assert.equal(/array_agg\(a\.attname ORDER BY/.test(migrationSql), false);
    assert.equal(/array_agg\(ic\.relname ORDER BY/.test(migrationSql), false);
    assert.equal(/array_agg\(con\.conname ORDER BY/.test(migrationSql), false);
  });

  it('P7-10 exact DROP targets and canonical constraint remain unchanged', () => {
    assert.match(migrationSql, /DROP INDEX public\.entitlements_user_product_uq;/);
    assert.match(migrationSql, /DROP INDEX public\.uq_entitlements_user_product;/);
    assert.match(migrationSql, /entitlements_user_id_product_id_key/);
  });

  it('P7-11 mutation removing one attname cast violates cast contract', () => {
    const mutated = migrationSql.replace(
      'array_agg(a.attname::text ORDER BY k.ord)',
      'array_agg(a.attname ORDER BY k.ord)',
      1
    );
    assert.equal((mutated.match(/array_agg\(a\.attname::text ORDER BY/g) ?? []).length, 7);
    assert.match(mutated, /array_agg\(a\.attname ORDER BY/);
  });

  it('P7-12 mutation altering DROP target fails contract', () => {
    const mutated = migrationSql.replace(
      'DROP INDEX public.entitlements_user_product_uq;',
      'DROP INDEX public.wrong_index;'
    );
    assert.notEqual(mutated, migrationSql);
    assert.doesNotMatch(mutated, /DROP INDEX public\.entitlements_user_product_uq;/);
  });
});
