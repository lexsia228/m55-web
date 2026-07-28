/**
 * Verifier-level negative fixtures — the production verifier must pass on the
 * real tree and the module-resolution primitives must reject decoys.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { join } from 'node:path';
import {
  inspectPremiumOwnerFile,
  freeShareAccidentallyPremiumWrapped,
} from './premiumExperienceAstInspection.ts';
import { importsResolveTo } from './premiumExperienceModuleResolution.ts';
import { runPremiumExperienceVerifier } from './premiumExperienceVerifier.ts';
import { computePremiumProofSourceSnapshot } from './premiumExperienceProofSourceSnapshot.ts';

const ROOT = join(import.meta.dirname, '../../../..');
const FIXTURES = 'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier';

describe('premium experience verifier negative fixtures', () => {
  it('fails when PremiumDecisionSurface resolves to the wrong module', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/wrong-module-import.tsx`);
    assert.ok(inspection.premiumSurfaceMounts.length > 0);
    assert.equal(inspection.premiumSurfaceMounts[0]?.boundToCanonicalModule, false);
  });

  it('comment marker fixture does not count as mount', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/comment-marker-only.tsx`);
    assert.equal(inspection.premiumSurfaceMounts.length, 0);
    assert.equal(inspection.importedSymbols.has('PremiumDecisionSurface'), false);
  });

  it('string literal marker fixture does not count as mount', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/string-marker-only.tsx`);
    assert.equal(inspection.premiumSurfaceMounts.length, 0);
    assert.equal(inspection.dataPremiumStates.length, 0);
  });

  it('free share premium wrapped fixture is detected', () => {
    assert.equal(
      freeShareAccidentallyPremiumWrapped(ROOT, `${FIXTURES}/free-share-premium-wrapped.tsx`),
      true,
    );
  });

  it('fails when an import chain does not resolve', () => {
    assert.equal(
      importsResolveTo(ROOT, 'app/dtr/lp/page.tsx', 'NonexistentOwner', 'components/dtr/DtrFullReader.tsx'),
      null,
    );
  });

  it('proof source snapshot covers every declared file', () => {
    const snapshot = computePremiumProofSourceSnapshot(ROOT);
    assert.deepEqual(snapshot.missing, []);
    assert.ok(snapshot.fileCount >= 30, `expected a broad proof source set, got ${snapshot.fileCount}`);
    assert.match(snapshot.digest, /^[0-9a-f]{64}$/);
  });

  it('production verifier passes on repository root', () => {
    const report = runPremiumExperienceVerifier(ROOT);
    assert.equal(report.failures.length, 0, report.failures.map((f) => `[${f.rule}] ${f.message}`).join('\n'));
    assert.equal(report.registered, 12);
    assert.equal(report.visualCaptureCount, 14);
    assert.equal(report.fixtureRequiredStateCount, 10);
    assert.equal(report.fixtureReachableStateCount, 10);
    assert.equal(report.nonFixtureStateCount, 2);
    assert.equal(report.moduleResolutionResult, 'PASS');
    assert.equal(report.routeToOwnerReachability, 'PASS');
    assert.equal(report.perFileEvidenceIdentity, 'PASS');
  });
});
