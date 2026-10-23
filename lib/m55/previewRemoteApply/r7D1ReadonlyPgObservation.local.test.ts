import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  buildUnitTestAlignedExactCatalogQueryResults,
  deriveExactCatalogObservationQueryPlanDigestSha256,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
  registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector,
} from './r7D1ExactCatalogContract.ts';
import { R7_PREVIEW_TARGET_PROJECT_REF, R7_PR249_FROZEN_REPO_ROOT } from './r7D1D5OfflinePlan.ts';
import {
  evaluateR7D1ReadonlyPgObservationRuntimeAuthorization,
  isR7D1ReadonlyPgObservationIoPermitted,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1,
} from './r7D1ReadonlyPgObservationRuntimeAuthorization.ts';
import {
  finalizeR7D1ReadonlyPgObservationFromTrustedCollected,
  parseR7D1ReadonlyPgObservationWireV1,
} from './r7D1ReadonlyPgObservationOrchestration.ts';
import { buildTrustedCollectedCatalogObservationFromQueryResults } from './r7D1TrustedCatalogVerifier.ts';
import type { R7D1TrustedCollectedCatalogObservation } from './r7D1TrustedCatalogVerifier.ts';
import { bindR7D1ReadonlyPgVerifiedSessionProvenanceForTestsOnly } from './r7D1ReadonlyPgSessionProvenance.ts';

const ORIGINAL_CHANNEL = process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];

afterEach(() => {
  if (ORIGINAL_CHANNEL === undefined) {
    delete process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];
  } else {
    process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV] = ORIGINAL_CHANNEL;
  }
});

describe('r7D1 readonly PG observation runtime authorization', () => {
  it('fails closed without operator channel env', () => {
    delete process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];
    assert.equal(isR7D1ReadonlyPgObservationIoPermitted(), false);
    const denied = evaluateR7D1ReadonlyPgObservationRuntimeAuthorization();
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.holdReasonCode, 'HOLD_READONLY_PG_OBSERVATION_NOT_AUTHORIZED');
    }
  });

  it('permits IO only when channel v1 is set and mutation gate remains closed', () => {
    process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV] = R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1;
    assert.equal(evaluateR7D1ReadonlyPgObservationRuntimeAuthorization().ok, true);
    assert.equal(isR7D1ReadonlyPgObservationIoPermitted(), true);
  });
});

describe('r7D1 readonly_pg_verified session provenance (no global flag flip)', () => {
  it('still rejects forged readonly_pg_verified without session binding', () => {
    assert.equal(R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION, false);
    const forged = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
      { forged: true },
      deriveExactCatalogObservationQueryPlanDigestSha256(),
      'readonly_pg_verified',
    );
    assert.equal(forged, null);
  });

  it('allows readonly_pg_verified registration when session provenance is bound', () => {
    const session = { sessionId: 'test-readonly-pg' };
    const digest = deriveExactCatalogObservationQueryPlanDigestSha256();
    const bound = bindR7D1ReadonlyPgVerifiedSessionProvenanceForTestsOnly(session, {
      previewProjectRef: R7_PREVIEW_TARGET_PROJECT_REF,
      queryPlanDigestSha256: digest,
      physicalBackendLocatorSha256: 'a'.repeat(64),
    });
    assert.equal(bound, true);
    const trusted = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
      session,
      digest,
      'readonly_pg_verified',
    );
    assert.notEqual(trusted, null);
    assert.equal(trusted?.observationProvenanceTier, 'readonly_pg_verified');
  });
});

function buildTrustedPreObservationFromMockRows(
  results: ReturnType<typeof buildUnitTestAlignedExactCatalogQueryResults>,
): R7D1TrustedCollectedCatalogObservation {
  const session = { testSession: 'pre-readonly-finalize' };
  const digest = deriveExactCatalogObservationQueryPlanDigestSha256();
  const ctx = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
    session,
    digest,
    'local_code_only_mock',
  );
  assert.notEqual(ctx, null);
  const built = buildTrustedCollectedCatalogObservationFromQueryResults(R7_PR249_FROZEN_REPO_ROOT, results, {
    trustedQueryExecutionContext: ctx!,
    phase: 'PRE_READONLY',
  });
  assert.equal(built.ok, true);
  if (!built.ok) {
    throw new Error('expected trusted observation build');
  }
  return built.trusted;
}

describe('r7D1 readonly PG observation PRE finalize (negative)', () => {
  it('holds when producer-bound evidence is missing from trusted collected', () => {
    const orphan = {
      provenance: 'D1_READONLY_QUERY_COLLECTOR_INTERNAL_V1',
      observationProvenanceTier: 'readonly_pg_verified',
      observationDigestSha256: 'a'.repeat(64),
      nameObservation: Object.freeze({
        anchorTableCount: 0,
        tablesPresent: [],
        functionsPresent: [],
        triggersPresent: [],
        explicitIndexesPresent: [],
        rlsEnabledTablesPresent: [],
      }),
      supabaseMigrationVersion: null,
      categoryOutcomes: Object.freeze({}),
    } as R7D1TrustedCollectedCatalogObservation;
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, orphan);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_OBSERVATION_HOLD');
    if (result.mode === 'R7_D1_READONLY_PG_OBSERVATION_HOLD') {
      assert.equal(result.holdReasonCode, 'HOLD_PRODUCER_BOUND_EVIDENCE_MISSING');
    }
  });

  it('holds on PRE migration history mismatch', () => {
    const rows = buildUnitTestAlignedExactCatalogQueryResults(R7_PR249_FROZEN_REPO_ROOT, 'PRE_READONLY');
    const bad = { ...rows, MIGRATION_HISTORY_ROW: [{ version: '19990101000000' }] };
    const trusted = buildTrustedPreObservationFromMockRows(bad);
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, trusted);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_OBSERVATION_HOLD');
    if (result.mode === 'R7_D1_READONLY_PG_OBSERVATION_HOLD') {
      assert.equal(result.holdReasonCode, 'HOLD_PRE_READONLY_CATALOG_EVALUATION_FAILED');
    }
  });

  it('holds when compliance objects exist before D1 (PRE_STATE_ABSENCE)', () => {
    const rows = buildUnitTestAlignedExactCatalogQueryResults(R7_PR249_FROZEN_REPO_ROOT, 'PRE_READONLY');
    const bad = { ...rows, TABLES: [{ name: 'm55_r5_compliance_anchor_v1' }] };
    const trusted = buildTrustedPreObservationFromMockRows(bad);
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, trusted);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_OBSERVATION_HOLD');
    if (result.mode === 'R7_D1_READONLY_PG_OBSERVATION_HOLD') {
      assert.equal(result.holdReasonCode, 'HOLD_PRE_READONLY_CATALOG_EVALUATION_FAILED');
    }
  });

  it('succeeds only when mandatory PRE categories pass and category digest differs from evidence digest', () => {
    const trusted = buildTrustedPreObservationFromMockRows(
      buildUnitTestAlignedExactCatalogQueryResults(R7_PR249_FROZEN_REPO_ROOT, 'PRE_READONLY'),
    );
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, trusted);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_CATALOG_OBSERVATION');
    if (result.mode === 'R7_D1_READONLY_PG_CATALOG_OBSERVATION') {
      assert.notEqual(result.categoryOutcomesDigestSha256, result.evidenceDigestSha256);
      assert.equal(result.observedMigrationVersions.length, 16);
    }
  });
});

describe('r7D1 readonly PG observation wire', () => {
  it('rejects wire missing tlsCaPem', () => {
    const parsed = parseR7D1ReadonlyPgObservationWireV1({
      wireVersion: 'R7_D1_READONLY_PG_OBSERVATION_WIRE_v1',
      host: 'x',
      port: 5432,
      database: 'postgres',
      user: 'u',
      password: 'p',
      sslmode: 'require',
      tlsTrustProfile: 't',
      tlsServerName: 's',
    });
    assert.equal(parsed.ok, false);
  });
});
