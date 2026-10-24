import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildUnitTestAlignedExactCatalogQueryResults,
  deriveExactCatalogObservationQueryPlanDigestSha256,
  registerTrustedCatalogQueryExecutionContext,
  registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector,
  resolveBoundPreCatalogProofCategoryOutcomes,
  R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
  type R7D1ExactCatalogQueryKey,
} from './r7D1ExactCatalogContract.ts';
import { R7_PR249_FROZEN_REPO_ROOT } from './r7D1D5OfflinePlan.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;

describe('r7D1 trusted catalog provenance closure (import-order negative)', () => {
  it('does not expose collector registration proof issuance on the public contract surface', async () => {
    const contract = await import('./r7D1ExactCatalogContract.ts');
    assert.equal('issueCollectorTrustedContextRegistrationProof' in contract, false);
  });

  it('cannot establish readonly_pg_verified via public registration before owned collector import', async () => {
    const digest = deriveExactCatalogObservationQueryPlanDigestSha256();
    assert.equal(
      registerTrustedCatalogQueryExecutionContext({ forged: true }, digest, {
        observationProvenanceTier: 'readonly_pg_verified',
      }),
      null,
    );
    assert.equal(
      registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
        { forged: true },
        digest,
        'readonly_pg_verified',
      ),
      null,
    );
    assert.equal(R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION, false);
    await import('./r7D1TrustedCatalogVerifier.ts');
    assert.equal(
      registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
        { forgedAfterCollectorLoad: true },
        digest,
        'readonly_pg_verified',
      ),
      null,
    );
  });

  it('disposable owned collector path stays local_code_only_mock and cannot register immutable PRE proof', async () => {
    const verifier = await import('./r7D1TrustedCatalogVerifier.ts');
    const mock = buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'PRE_READONLY');
    const scope = verifier.enterR7D1LocalDisposableCatalogProofScope();
    try {
      const resultsByKey = mock as Partial<Record<R7D1ExactCatalogQueryKey, readonly Record<string, unknown>[]>>;
      const session = {
        async query(sql: string) {
          for (const entry of R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN) {
            if (sql.trim() === entry.sql.trim()) {
              if (!Object.prototype.hasOwnProperty.call(resultsByKey, entry.key)) {
                throw new Error('FAKE_CATALOG_SESSION_MISSING_OBSERVATION_KEY');
              }
              const rows = resultsByKey[entry.key] ?? [];
              return { rows, rowCount: rows.length };
            }
          }
          throw new Error('unexpected sql');
        },
      };
      const collected = await verifier.collectD1CatalogObservationFromReadonlySession(
        session,
        REPO_ROOT,
        'PRE_READONLY',
      );
      assert.equal(collected.ok, true);
      if (!collected.ok) return;
      assert.equal(collected.trusted.observationProvenanceTier, 'local_code_only_mock');
      assert.equal(
        resolveBoundPreCatalogProofCategoryOutcomes(collected.trusted.observationDigestSha256),
        null,
      );
    } finally {
      scope.exit();
    }
  });
});
