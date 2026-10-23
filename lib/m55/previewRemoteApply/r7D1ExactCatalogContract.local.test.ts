import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildUnitTestAlignedExactCatalogQueryResults,
  canonicalizePgInformationSchemaType,
  deriveD1ExpectedPostMigrationVersionList,
  deriveD1ExactPostCatalogContract,
  deriveD1ExactPreCatalogContract,
  evaluateProducerBoundD1CatalogEvidence,
  isProducerBoundCatalogEvidence,
  produceProducerBoundD1CatalogEvidenceFromQueryResults,
  registerTrustedCatalogQueryExecutionContext,
  registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
  resolveBoundPreCatalogProofCategoryOutcomes,
  rejectForgeableExactCatalogEvidenceInput,
  R7_D1_EXACT_MANDATORY_CATEGORIES,
  R7_D1_EXACT_STATIC_POST_READONLY_CATEGORIES,
  deriveExactCatalogObservationQueryPlanDigestSha256,
} from './r7D1ExactCatalogContract.ts';
import { R7_PR249_FROZEN_REPO_ROOT } from './r7D1D5OfflinePlan.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;
const UNIT_TEST = { unitTestFixtureRows: true as const };

describe('r7D1ExactCatalogContract', () => {
  it('derives PRE absence contract without DB observation', () => {
    const pre = deriveD1ExactPreCatalogContract();
    assert.equal(pre.complianceTablesAbsent, true);
    assert.equal(pre.complianceFunctionsAbsent, true);
    assert.equal(pre.complianceTriggersAbsent, true);
  });

  it('PRE_READONLY reaches evaluated pass when compliance inventory absent and frozen history matches', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'PRE_READONLY');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(
      REPO_ROOT,
      mock,
      'PRE_READONLY',
      UNIT_TEST,
    );
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.PRE_STATE_ABSENCE, 'pass');
    assert.equal(produced.evidence.categoryOutcomes.MIGRATION_HISTORY_ROW, 'pass');
    const evaluated = evaluateProducerBoundD1CatalogEvidence(REPO_ROOT, produced.evidence);
    assert.equal(evaluated.ok, true);
  });

  it('parses reject_mutation without search_path and without security definer leakage', () => {
    const post = deriveD1ExactPostCatalogContract(REPO_ROOT);
    const rejectMutation = post.functions.find((f) => f.functionName === 'm55_r5_compliance_reject_mutation_v1');
    assert.ok(rejectMutation);
    assert.equal(rejectMutation.canonicalSearchPathConfig, '');
    assert.equal(rejectMutation.securityDefiner, false);
  });

  it('parses decision_machine_evidence search_path=public without security definer', () => {
    const post = deriveD1ExactPostCatalogContract(REPO_ROOT);
    const decisionEvidence = post.functions.find(
      (f) => f.functionName === 'm55_r5_compliance_decision_machine_evidence_v1',
    );
    assert.ok(decisionEvidence);
    assert.equal(decisionEvidence.canonicalSearchPathConfig, 'search_path=public');
    assert.equal(decisionEvidence.securityDefiner, false);
  });

  it('does not propagate security definer from a prior function into a later header-only function', () => {
    const post = deriveD1ExactPostCatalogContract(REPO_ROOT);
    const openMachine = post.functions.find((f) => f.functionName === 'm55_r5_compliance_open_machine_exception_v1');
    assert.ok(openMachine);
    assert.equal(openMachine.securityDefiner, true);
    assert.equal(openMachine.canonicalSearchPathConfig, 'search_path=public, extensions');
    const rejectMutation = post.functions.find((f) => f.functionName === 'm55_r5_compliance_reject_mutation_v1');
    assert.ok(rejectMutation);
    assert.equal(rejectMutation.securityDefiner, false);
  });

  it('derives POST contract from pinned migration only', () => {
    const post = deriveD1ExactPostCatalogContract(REPO_ROOT);
    assert.equal(post.migrationDerivedFunctionExpectationsVerifiable, true);
    assert.equal(post.tables.length, 7);
    assert.equal(post.functions.length, 14);
    assert.equal(post.triggers.length, 6);
    assert.equal(post.explicitIndexes.length, 4);
    assert.equal(post.rlsEnabledTables.length, 7);
    assert.ok(post.expectedConstraints.length > 0);
    assert.ok(post.expectedFinalFunctionGrants.length > 0);
    assert.ok(post.expectedTablePrivilegeAbsences.length > 0);
  });

  it('canonicalizes timestamptz alias strictly', () => {
    assert.equal(canonicalizePgInformationSchemaType('timestamp with time zone'), 'timestamptz');
    assert.equal(canonicalizePgInformationSchemaType('not a type!'), null);
  });

  it('rejects forged public evidence objects', () => {
    assert.equal(rejectForgeableExactCatalogEvidenceInput({ categoryStatus: { TABLES: 'pass' } }).ok, false);
    assert.equal(isProducerBoundCatalogEvidence({ categoryStatus: { TABLES: 'pass' } }), false);
  });

  it('rejects caller-provided rows without trusted query execution context', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    assert.equal(produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock).ok, false);
  });

  it('rejects caller-forged trusted context registration without collector registration proof', () => {
    const forged = registerTrustedCatalogQueryExecutionContext(
      { forged: true },
      deriveExactCatalogObservationQueryPlanDigestSha256(),
    );
    assert.equal(forged, null);
  });

  it('rejects forged trusted context registration with arbitrary registration proof symbol', () => {
    const forged = registerTrustedCatalogQueryExecutionContext(
      { forged: true },
      deriveExactCatalogObservationQueryPlanDigestSha256(),
      {
        collectorRegistrationProof: Symbol('forged_registration_proof'),
        observationProvenanceTier: 'readonly_pg_verified',
      },
    );
    assert.equal(forged, null);
  });

  it('owned readonly collector registration rejects readonly_pg_verified until real PG provenance is established', () => {
    assert.equal(R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION, false);
    const forged = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
      { forged: true },
      deriveExactCatalogObservationQueryPlanDigestSha256(),
      'readonly_pg_verified',
    );
    assert.equal(forged, null);
  });

  it('unit-test PRE produce does not register immutable pre proof digest', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'PRE_READONLY');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(
      REPO_ROOT,
      mock,
      'PRE_READONLY',
      UNIT_TEST,
    );
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(
      resolveBoundPreCatalogProofCategoryOutcomes(produced.evidence.evidenceDigestSha256),
      null,
    );
  });

  it('FUNCTION_IDENTITY_ARGS_SECURITY_OWNER remains unobserved without frozen owner authority', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.FUNCTION_IDENTITY_ARGS_SECURITY_OWNER, 'unobserved');
  });

  it('POST positive fixture passes every static POST category', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    for (const category of R7_D1_EXACT_STATIC_POST_READONLY_CATEGORIES) {
      assert.equal(
        produced.evidence.categoryOutcomes[category],
        'pass',
        `expected static POST category ${category} to pass`,
      );
    }
  });

  it('producer-bound evidence cannot reach VERIFIED while mandatory runtime categories remain unobserved', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(isProducerBoundCatalogEvidence(produced.evidence), true);
    const evaluated = evaluateProducerBoundD1CatalogEvidence(REPO_ROOT, produced.evidence);
    assert.equal(evaluated.ok, false);
    if (!evaluated.ok) {
      assert.ok(evaluated.pendingCategories.length > 0);
      assert.ok(evaluated.pendingCategories.length < R7_D1_EXACT_MANDATORY_CATEGORIES.length);
    }
  });

  it('rejects duplicate catalog name rows', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    mock.TABLES = [{ name: 'm55_r5_compliance_contents' }, { name: 'm55_r5_compliance_contents' }];
    assert.equal(produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST).ok, false);
  });

  it('fails constraint category on wrong FK fingerprint', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const row = mock.TABLE_CONSTRAINTS?.[0];
    assert.ok(row);
    row!.constraint_def = 'foreign key (x) references wrong_table(wrong_col)';
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.TABLE_PRIMARY_FOREIGN_UNIQUE_CHECK, 'fail');
  });

  it('fails constraint category on extra observed constraint', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    mock.TABLE_CONSTRAINTS = [
      ...(mock.TABLE_CONSTRAINTS ?? []),
      {
        table_name: 'm55_r5_compliance_contents',
        constraint_name: 'extra_chk',
        constraint_type: 'c',
        constraint_def: 'check (false)',
      },
    ];
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.TABLE_PRIMARY_FOREIGN_UNIQUE_CHECK, 'fail');
  });

  it('fails trigger binding on wrong target function', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const row = mock.TRIGGER_BINDING_ROWS?.[0];
    assert.ok(row);
    row!.function_name = 'm55_r5_compliance_wrong_stub';
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.TRIGGER_TIMING_EVENTS_BINDING, 'fail');
  });

  it('fails trigger binding on schema-qualified def mismatch (wrong event)', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const row = mock.TRIGGER_BINDING_ROWS?.[0];
    assert.ok(row);
    row!.trigger_def = String(row!.trigger_def).replace(/before\s+update/i, 'after update');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.TRIGGER_TIMING_EVENTS_BINDING, 'fail');
  });

  it('accepts schema-qualified trigger def when timing/table/function match', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const row = mock.TRIGGER_BINDING_ROWS?.[0];
    assert.ok(row);
    row!.trigger_def = String(row!.trigger_def)
      .replace(/\sON\s+(\w+)/i, ' ON public.$1')
      .replace(/EXECUTE FUNCTION\s+(\w+)/i, 'EXECUTE FUNCTION public.$1');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.TRIGGER_TIMING_EVENTS_BINDING, 'pass');
  });

  it('fails function search_path drift', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const row = mock.FUNCTION_IDENTITY_ROWS?.find((r) => String(r.function_config).includes('extensions'));
    assert.ok(row);
    row!.function_config = 'search_path=public';
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.FUNCTION_DEFINITION_SEARCH_PATH, 'fail');
  });

  it('fails function identity on security definer drift', () => {
    const contract = deriveD1ExactPostCatalogContract(REPO_ROOT);
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const row = mock.FUNCTION_IDENTITY_ROWS?.find((candidate) => {
      const expected = contract.functions.find((f) => f.functionName === candidate.function_name);
      return expected?.securityDefiner === true;
    });
    assert.ok(row);
    row!.security_definer = false;
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.FUNCTION_IDENTITY_ARGS_SECURITY_OWNER, 'fail');
  });

  it('fails index category on wrong predicate (no name-only fallback)', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const row = mock.STANDALONE_INDEX_DEFINITIONS?.find((r) => String(r.index_def).includes('WHERE'));
    assert.ok(row);
    row!.index_def = String(row!.index_def).replace(/WHERE\s+.+/i, 'WHERE false');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.INDEX_DEFINITIONS_PREDICATES, 'fail');
  });

  it('fails grants when revoked role still has table privilege', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    mock.TABLE_PRIVILEGES = [
      { table_name: contractFirstTable(mock), grantee: 'public', privilege_type: 'SELECT' },
    ];
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.GRANTS_REVOKES, 'fail');
  });

  it('passes grants when service_role has execute after revoke-all then grant (ordered final state)', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.GRANTS_REVOKES, 'pass');
  });

  it('fails grants on extra function execute privilege', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    mock.FUNCTION_PRIVILEGES = [
      ...(mock.FUNCTION_PRIVILEGES ?? []),
      {
        function_name: 'm55_r5_compliance_derive_objective_reason_v1',
        identity_arguments: 'uuid, uuid',
        grantee: 'service_role',
        privilege_type: 'EXECUTE',
      },
    ];
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.GRANTS_REVOKES, 'fail');
  });

  it('rejects forged producer evidence objects and post-mutation category tampering', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    const forged = {
      ...produced.evidence,
      categoryOutcomes: Object.fromEntries(
        R7_D1_EXACT_MANDATORY_CATEGORIES.map((c) => [c, 'pass']),
      ),
    };
    assert.equal(isProducerBoundCatalogEvidence(forged), false);
    assert.equal(evaluateProducerBoundD1CatalogEvidence(REPO_ROOT, forged as typeof produced.evidence).ok, false);
  });

  it('fails migration history when tail-only tuple is supplied', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const contract = deriveD1ExactPostCatalogContract(REPO_ROOT);
    mock.MIGRATION_HISTORY_ROW = [{ version: contract.migrationVersion }];
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.MIGRATION_HISTORY_ROW, 'fail');
  });

  it('fails default expression drift even when default presence matches', () => {
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const target = mock.TABLE_COLUMNS_TYPES_NULLABILITY?.find((r) => r.column_default !== null);
    assert.ok(target);
    target!.column_default = 'wrong_default_expression()';
    const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mock, 'POST_READONLY', UNIT_TEST);
    assert.equal(produced.ok, true);
    if (!produced.ok) return;
    assert.equal(produced.evidence.categoryOutcomes.TABLE_DEFAULTS, 'fail');
  });

  it('changes evidence digest when one observation row mutates', () => {
    const mockA = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const mockB = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'POST_READONLY');
    const producedA = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mockA, 'POST_READONLY', UNIT_TEST);
    mockB.MIGRATION_HISTORY_ROW = deriveD1ExpectedPostMigrationVersionList().map((version, index, all) =>
      index === all.length - 1 ? { version: `${version}x` } : { version },
    );
    const producedB = produceProducerBoundD1CatalogEvidenceFromQueryResults(REPO_ROOT, mockB, 'POST_READONLY', UNIT_TEST);
    assert.equal(producedA.ok, true);
    assert.equal(producedB.ok, true);
    if (!producedA.ok || !producedB.ok) return;
    assert.notEqual(producedA.evidence.evidenceDigestSha256, producedB.evidence.evidenceDigestSha256);
  });
});

function contractFirstTable(
  mock: Partial<Record<string, readonly Record<string, unknown>[]>>,
): string {
  const row = mock.TABLES?.[0];
  assert.ok(row);
  return String(row.name);
}
