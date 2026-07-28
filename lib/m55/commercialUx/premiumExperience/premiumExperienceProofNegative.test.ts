/**
 * Complete negative coverage for the Premium proof system.
 *
 * Every one of the 17 governed failure modes is exercised directly: the verifier,
 * the reachability checker, the evidence validator and the run-record validators
 * are each fed a deliberately broken input and must report a failure.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import {
  inspectPremiumOwnerFile,
  freeShareAccidentallyPremiumWrapped,
  hasPremiumSurfaceMount,
} from './premiumExperienceAstInspection.ts';
import { importsResolveTo } from './premiumExperienceModuleResolution.ts';
import {
  checkRouteReachability,
  PREMIUM_FIXTURE_ROUTE_REACHABILITY,
  type PremiumRouteReachabilityExpectation,
} from './premiumExperienceRouteReachability.ts';
import { validatePremiumEvidenceOnDisk } from './premiumExperienceEvidenceValidation.ts';
import {
  PREMIUM_EXPECTED_ORIGIN_PATTERN,
  validateCaptureEvents,
  validatePremiumRunRecord,
  validatePremiumRunRecordPair,
  type PremiumCaptureEvent,
  type PremiumRunRecord,
} from './premiumExperienceRunRecordValidation.ts';
import { PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST } from './premiumExperienceEvidenceManifest.ts';
import { PREMIUM_VISUAL_AUTHORITY_KEY } from './premiumVisualAuthority.ts';

const ROOT = join(import.meta.dirname, '../../../..');
const FIXTURES = 'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier';
const CANONICAL_DECISION_SURFACE = 'components/experience/PremiumDecisionSurface.tsx';

const SOURCE_DIGEST = 'a'.repeat(64);
const MANIFEST_DIGEST = 'b'.repeat(64);
const VALIDATION_OPTIONS = {
  expectedSourceSnapshotDigest: SOURCE_DIGEST,
  expectedManifestDigest: MANIFEST_DIGEST,
};

function captureEventFor(entry: (typeof PREMIUM_EXPERIENCE_PNG)[number]): PremiumCaptureEvent {
  return {
    captureId: entry.captureId,
    stateId: entry.stateId,
    viewport: entry.viewport,
    expectedRoute: entry.fixtureRoute,
    actualUrl: `http://127.0.0.1:3000${entry.fixtureRoute}`,
    actualOrigin: 'http://127.0.0.1:3000',
    ownerModule: entry.ownerFile,
    visibleContractDigest: entry.visibleContractDigest,
    fileName: entry.fileName,
    kind: 'png',
  };
}

const PREMIUM_EXPERIENCE_PNG = PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST;

function buildPassingCaptureEvents(): PremiumCaptureEvent[] {
  const pngEvents = PREMIUM_EXPERIENCE_PNG.map(captureEventFor);
  const pdfEvents: PremiumCaptureEvent[] = [
    ['answer-review', 'premium.lp.answer_review', '/dtr/lp', 'components/dtr/DtrPaidQuestionnaireLayer.tsx', 'pdf/answer-review.pdf'],
    ['plan-selection', 'premium.lp.plans', '/dtr/lp', 'components/dtr/DtrPaidPurchasePrep.tsx', 'pdf/plan-selection.pdf'],
    ['payment-prep', 'premium.lp.checkout', '/dtr/lp', 'components/dtr/DtrPaidPurchasePrep.tsx', 'pdf/payment-prep.pdf'],
    ['purchased-report-landing', 'purchased.report.body', '/dev/dtr-drawer-preview', 'components/dtr/DtrFullReader.tsx', 'pdf/purchased-report.pdf'],
    [
      'additional-reading-result',
      'purchased.consult.result',
      '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history',
      'components/dtr/ConsultReplyCard.tsx',
      'pdf/additional-reading-result.pdf',
    ],
  ].map(([captureId, stateId, route, owner, fileName]) => {
    const png = PREMIUM_EXPERIENCE_PNG.find((e) => e.captureId === captureId)!;
    return {
      captureId,
      stateId,
      viewport: null,
      expectedRoute: route,
      actualUrl: `http://127.0.0.1:3000${route}`,
      actualOrigin: 'http://127.0.0.1:3000',
      ownerModule: owner,
      visibleContractDigest: png.visibleContractDigest,
      fileName,
      kind: 'pdf' as const,
    };
  });
  return [...pngEvents, ...pdfEvents];
}

function buildPassingRecord(runId: string): PremiumRunRecord {
  const captureEvents = buildPassingCaptureEvents();
  return {
    suite: 'premium-experience-evidence',
    runId,
    sourceSnapshotDigest: SOURCE_DIGEST,
    evidenceManifestDigest: MANIFEST_DIGEST,
    evidenceIdentityDigest: 'c'.repeat(64),
    rawReporterDigest: 'd'.repeat(64),
    command: 'playwright test e2e/premium-experience-evidence.spec.ts --reporter=json',
    exitCode: 0,
    expectedOriginPattern: PREMIUM_EXPECTED_ORIGIN_PATTERN,
    actualOrigins: ['http://127.0.0.1:3000'],
    expectedTestCount: 19,
    passed: 19,
    failed: 0,
    skipped: 0,
    interrupted: 0,
    testTitles: Array.from({ length: 19 }, (_, i) => `chromium|premium evidence ${i + 1}`),
    pngCount: 42,
    pdfCount: 5,
    captureRecordCount: captureEvents.length,
    captureEvents,
    evidenceFailures: [],
    finalVerdict: 'PASS',
  };
}

function tempEvidenceRoot(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const evidence = join(dir, 'e2e/screenshots/premium-experience-ssot');
  mkdirSync(join(evidence, 'pdf'), { recursive: true });
  return { dir, evidence };
}

describe('premium proof — module resolution failure modes', () => {
  it('1. wrong-module same-name import is rejected', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/wrong-module-import.tsx`);
    assert.ok(inspection.premiumSurfaceMounts.length > 0, 'fixture should expose a JSX mount');
    assert.equal(inspection.premiumSurfaceMounts[0]?.boundToCanonicalModule, false);
    assert.equal(
      hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.share.card'),
      false,
    );
  });

  it('1b. wrong-module same-name import through a decoy barrel is rejected', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/decoy-barrel-import.tsx`);
    assert.equal(
      hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.share.card'),
      false,
    );
    assert.equal(
      importsResolveTo(
        ROOT,
        `${FIXTURES}/decoy-barrel-import.tsx`,
        'PremiumDecisionSurface',
        CANONICAL_DECISION_SURFACE,
      ),
      null,
    );
  });

  it('1c. canonical re-export chain through the real barrel resolves', () => {
    const binding = importsResolveTo(
      ROOT,
      `${FIXTURES}/canonical-barrel-import.tsx`,
      'PremiumDecisionSurface',
      CANONICAL_DECISION_SURFACE,
    );
    assert.ok(binding, 'barrel re-export must resolve to the canonical module');
    assert.ok(binding!.reExportChain.length > 0, 're-export chain must be recorded');
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/canonical-barrel-import.tsx`);
    assert.ok(hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.share.card'));
  });

  it('2. comment marker only does not count as a mount', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/comment-marker-only.tsx`);
    assert.equal(inspection.premiumSurfaceMounts.length, 0);
    assert.equal(inspection.importedSymbols.has('PremiumDecisionSurface'), false);
  });

  it('3. string literal marker only does not count as a mount', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/string-marker-only.tsx`);
    assert.equal(inspection.premiumSurfaceMounts.length, 0);
    assert.equal(inspection.dataPremiumStates.length, 0);
  });

  it('7. Free share wrapped as Premium is detected', () => {
    assert.equal(
      freeShareAccidentallyPremiumWrapped(ROOT, `${FIXTURES}/free-share-premium-wrapped.tsx`),
      true,
    );
    assert.equal(
      freeShareAccidentallyPremiumWrapped(ROOT, 'components/core/CoreFreeResultShareCTA.tsx'),
      false,
    );
  });
});

describe('premium proof — route-to-owner failure modes', () => {
  const base = PREMIUM_FIXTURE_ROUTE_REACHABILITY.find((e) => e.stateId === 'premium.share.card')!;

  it('4. registered state without a mount fails reachability', () => {
    const broken: PremiumRouteReachabilityExpectation = {
      ...base,
      selectionState: 'premium.lp.prerequisite',
    };
    const failures = checkRouteReachability(ROOT, broken);
    assert.ok(failures.some((f) => f.includes('not mounted')), failures.join('; '));
  });

  it('5. fixture route with no owner path fails reachability', () => {
    const broken: PremiumRouteReachabilityExpectation = { ...base, importChain: [] };
    const failures = checkRouteReachability(ROOT, broken);
    assert.ok(failures.some((f) => f.includes('declares no owner path')), failures.join('; '));
  });

  it('5b. dead owner import fails reachability', () => {
    const broken: PremiumRouteReachabilityExpectation = {
      ...base,
      importChain: [
        {
          fromModule: 'app/dev/premium-share-preview/page.tsx',
          importName: 'NonexistentOwner',
          toModule: 'components/core/CorePremiumResultShareCTA.tsx',
        },
      ],
    };
    const failures = checkRouteReachability(ROOT, broken);
    assert.ok(failures.some((f) => f.includes('must resolve to')), failures.join('; '));
  });

  it('6. route reaching the wrong state fails reachability', () => {
    const broken: PremiumRouteReachabilityExpectation = {
      ...base,
      stateId: 'premium.lp.checkout',
      selectionState: 'premium.lp.checkout',
    };
    const failures = checkRouteReachability(ROOT, broken);
    assert.ok(failures.some((f) => f.includes('not mounted')), failures.join('; '));
  });

  it('6b. missing route module fails reachability', () => {
    const broken: PremiumRouteReachabilityExpectation = {
      ...base,
      routeModule: 'app/dev/does-not-exist/page.tsx',
    };
    const failures = checkRouteReachability(ROOT, broken);
    assert.ok(failures.some((f) => f.includes('route module missing')), failures.join('; '));
  });

  it('every governed fixture state passes reachability on the real tree', () => {
    for (const entry of PREMIUM_FIXTURE_ROUTE_REACHABILITY) {
      const failures = checkRouteReachability(ROOT, entry);
      assert.deepEqual(failures, [], `${entry.stateId}: ${failures.join('; ')}`);
    }
  });
});

describe('premium proof — evidence file failure modes', () => {
  it('8. missing evidence file fails validation', () => {
    const { dir } = tempEvidenceRoot('m55-evidence-missing-');
    try {
      const result = validatePremiumEvidenceOnDisk(dir);
      assert.ok(result.failures.some((f) => f.startsWith('missing PNG')), result.failures.join('; '));
      assert.ok(result.failures.some((f) => f.startsWith('missing PDF')), result.failures.join('; '));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('9. unexpected extra evidence file fails validation', () => {
    const { dir, evidence } = tempEvidenceRoot('m55-evidence-extra-');
    try {
      const realDir = join(ROOT, 'e2e/screenshots/premium-experience-ssot');
      for (const entry of PREMIUM_EXPERIENCE_PNG) {
        copyFileSync(join(realDir, entry.fileName), join(evidence, entry.fileName));
      }
      copyFileSync(join(realDir, 'premium-bridge-390.png'), join(evidence, 'rogue-extra-390.png'));
      const result = validatePremiumEvidenceOnDisk(dir);
      assert.ok(
        result.failures.some((f) => f === 'unexpected PNG rogue-extra-390.png'),
        result.failures.join('; '),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('10. blank purchased-body evidence fails validation', () => {
    const { dir, evidence } = tempEvidenceRoot('m55-evidence-blank-');
    try {
      writeFileSync(join(evidence, 'purchased-report-body-390.png'), Buffer.alloc(100));
      const result = validatePremiumEvidenceOnDisk(dir);
      assert.ok(
        result.failures.some((f) => f.includes('purchased-report-body-390.png')),
        result.failures.join('; '),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('10b. undecodable PNG fails validation', () => {
    const { dir, evidence } = tempEvidenceRoot('m55-evidence-corrupt-');
    try {
      writeFileSync(join(evidence, 'premium-bridge-390.png'), Buffer.from('not a png at all'));
      const result = validatePremiumEvidenceOnDisk(dir);
      assert.ok(
        result.failures.some((f) => f.startsWith('undecodable PNG premium-bridge-390.png')),
        result.failures.join('; '),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('10c. loading-only PDF fails validation', () => {
    const { dir, evidence } = tempEvidenceRoot('m55-evidence-pdf-');
    try {
      const target = join(evidence, 'pdf/purchased-report.pdf');
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from('%PDF-1.4\n/Type /Page\n%%EOF\n'));
      const result = validatePremiumEvidenceOnDisk(dir);
      assert.ok(
        result.failures.some((f) => f.includes('pdf/purchased-report.pdf')),
        result.failures.join('; '),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('committed evidence passes per-file identity on the real tree', () => {
    const result = validatePremiumEvidenceOnDisk(ROOT);
    assert.deepEqual(result.failures, [], result.failures.join('; '));
    assert.equal(result.registeredStateCount, 12);
    assert.equal(result.visualCaptureCount, 14);
    assert.equal(result.pngCount, 42);
    assert.equal(result.pdfCount, 5);
    for (const identity of result.fileIdentities) {
      assert.equal(identity.decoded, true, `${identity.fileName} must decode`);
      assert.equal(identity.contentOk, true, `${identity.fileName} must have real content`);
    }
  });
});

describe('premium proof — execution record failure modes', () => {
  it('baseline synthetic record pair validates', () => {
    const failures = validatePremiumRunRecordPair(
      [buildPassingRecord('run-1'), buildPassingRecord('run-2')],
      VALIDATION_OPTIONS,
    );
    assert.deepEqual(failures, [], failures.join('; '));
  });

  it('11. skipped required E2E result fails validation', () => {
    const record = { ...buildPassingRecord('run-1'), skipped: 1, passed: 18 };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('skipped 1')), failures.join('; '));
    assert.ok(failures.some((f) => f.includes('passed 18')), failures.join('; '));
  });

  it('12. only one successful execution record fails validation', () => {
    const failures = validatePremiumRunRecordPair([buildPassingRecord('run-1')], VALIDATION_OPTIONS);
    assert.deepEqual(failures, ['expected exactly 2 successful execution records, received 1']);
  });

  it('13. stale sourceSnapshotDigest fails validation', () => {
    const record = { ...buildPassingRecord('run-1'), sourceSnapshotDigest: 'f'.repeat(64) };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('stale sourceSnapshotDigest')), failures.join('; '));
  });

  it('13b. records from different source trees fail as a pair', () => {
    const second = { ...buildPassingRecord('run-2'), sourceSnapshotDigest: 'e'.repeat(64) };
    const failures = validatePremiumRunRecordPair(
      [buildPassingRecord('run-1'), second],
      { ...VALIDATION_OPTIONS, expectedSourceSnapshotDigest: SOURCE_DIGEST },
    );
    assert.ok(
      failures.some((f) => f.includes('different source trees')),
      failures.join('; '),
    );
  });

  it('14. nonzero Playwright exit code fails validation', () => {
    const record = { ...buildPassingRecord('run-1'), exitCode: 1 };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('exit code 1')), failures.join('; '));
  });

  it('15. hard-coded or mismatched actual origin fails validation', () => {
    const hardCoded = { ...buildPassingRecord('run-1'), actualOrigins: ['localhost'] };
    const hardCodedFailures = validatePremiumRunRecord(hardCoded, VALIDATION_OPTIONS);
    assert.ok(
      hardCodedFailures.some((f) => f.includes('does not match expected pattern')),
      hardCodedFailures.join('; '),
    );

    const undeclared = { ...buildPassingRecord('run-1'), actualOrigins: ['http://localhost:4000'] };
    const undeclaredFailures = validatePremiumRunRecord(undeclared, VALIDATION_OPTIONS);
    assert.ok(
      undeclaredFailures.some((f) => f.includes('was not observed in any capture event')),
      undeclaredFailures.join('; '),
    );

    const remote = buildPassingRecord('run-1');
    remote.captureEvents = remote.captureEvents.map((e) => ({
      ...e,
      actualOrigin: 'https://m-55.jp',
    }));
    remote.actualOrigins = ['https://m-55.jp'];
    const remoteFailures = validatePremiumRunRecord(remote, VALIDATION_OPTIONS);
    assert.ok(remoteFailures.length > 0, 'a production origin must not satisfy the fixture contract');
  });

  it('16. capture mapped to the wrong state fails validation', () => {
    const record = buildPassingRecord('run-1');
    record.captureEvents = record.captureEvents.map((e) =>
      e.captureId === 'premium-share-card' ? { ...e, stateId: 'premium.lp.checkout' } : e,
    );
    const failures = validateCaptureEvents(record.captureEvents);
    assert.ok(
      failures.some((f) => f.includes('mapped to state premium.lp.checkout')),
      failures.join('; '),
    );
  });

  it('16b. undeclared captureId fails validation', () => {
    const record = buildPassingRecord('run-1');
    record.captureEvents = record.captureEvents.map((e) =>
      e.captureId === 'premium-bridge' ? { ...e, captureId: 'invented-capture' } : e,
    );
    const failures = validateCaptureEvents(record.captureEvents);
    assert.ok(
      failures.some((f) => f.includes('invented-capture has no capture case')),
      failures.join('; '),
    );
  });

  it('17. same-sized wrong-state evidence substitution fails as a pair', () => {
    const first = buildPassingRecord('run-1');
    const second = buildPassingRecord('run-2');
    // Counts, digests and byte sizes stay identical; only the semantic identity
    // of one capture is swapped to another state's owner and route.
    second.captureEvents = second.captureEvents.map((e) =>
      e.captureId === 'purchased-report-body'
        ? {
            ...e,
            captureId: 'saved-premium-reopen',
            stateId: 'purchased.saved_reopen',
            ownerModule: 'components/dtr/SavedSnapshotNotice.tsx',
            fileName: `saved-premium-reopen-${e.viewport}.png`,
          }
        : e,
    );
    const failures = validatePremiumRunRecordPair([first, second], VALIDATION_OPTIONS);
    assert.ok(
      failures.some((f) => f.includes('capture event identity sets differ')),
      failures.join('; '),
    );
  });

  it('17b. divergent semantic evidence identity fails as a pair', () => {
    const first = buildPassingRecord('run-1');
    const second = { ...buildPassingRecord('run-2'), evidenceIdentityDigest: '9'.repeat(64) };
    const failures = validatePremiumRunRecordPair([first, second], VALIDATION_OPTIONS);
    assert.ok(
      failures.some((f) => f.includes('semantic evidence identity differs')),
      failures.join('; '),
    );
  });

  it('handwritten record without real reporter digest fails validation', () => {
    const record = { ...buildPassingRecord('run-1'), rawReporterDigest: 'handwritten' };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('rawReporterDigest')), failures.join('; '));
  });

  it('missing capture records fail validation', () => {
    const record = buildPassingRecord('run-1');
    record.captureEvents = record.captureEvents.slice(0, 40);
    record.captureRecordCount = 40;
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('captureRecordCount 40')), failures.join('; '));
  });

  it('capture contract digests are bound to the typed authority', () => {
    const record = buildPassingRecord('run-1');
    for (const event of record.captureEvents) {
      assert.match(event.visibleContractDigest, /^[0-9a-f]{64}$/);
    }
    assert.equal(PREMIUM_VISUAL_AUTHORITY_KEY, 'premium.experience.home_editorial_sample_v1');
  });
});
