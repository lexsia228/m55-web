/**
 * Complete negative coverage for the Premium proof system.
 *
 * Every governed failure mode is exercised against the real committed artifacts
 * rather than against synthetic stand-ins: the committed execution records, the
 * committed normalized reporters and the committed evidence files are loaded, a
 * single property is deliberately broken on a copy, and the validator must
 * report it. Committed evidence is never mutated — substitution tests operate on
 * an isolated temporary evidence tree.
 */
import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import {
  inspectPremiumOwnerFile,
  freeShareAccidentallyPremiumWrapped,
  hasPremiumSurfaceMount,
  unresolvedStateIdMounts,
} from './premiumExperienceAstInspection.ts';
import { importsResolveTo } from './premiumExperienceModuleResolution.ts';
import {
  checkRouteReachability,
  PREMIUM_FIXTURE_ROUTE_REACHABILITY,
  type PremiumRouteReachabilityExpectation,
} from './premiumExperienceRouteReachability.ts';
import {
  computeManifestDigest,
  validatePremiumEvidenceOnDisk,
  type EvidenceFileIdentityRecord,
} from './premiumExperienceEvidenceValidation.ts';
import {
  computePremiumProofSourceSnapshot,
  listPremiumProofSourceFiles,
} from './premiumExperienceProofSourceSnapshot.ts';
import {
  validateCaptureEvents,
  validatePremiumRunRecord,
  validatePremiumRunRecordPair,
  type RecordValidationOptions,
  type PremiumRunRecord,
} from './premiumExperienceRunRecordValidation.ts';
import { PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST, PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST } from './premiumExperienceEvidenceManifest.ts';
import { PREMIUM_VISUAL_AUTHORITY_KEY } from './premiumVisualAuthority.ts';

const ROOT = join(import.meta.dirname, '../../../..');
const FIXTURES = 'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier';
const RECORDS_DIR_REL = 'lib/m55/commercialUx/premiumExperience/evidence-execution-records';
const EVIDENCE_DIR_REL = 'e2e/screenshots/premium-experience-ssot';
const CANONICAL_DECISION_SURFACE = 'components/experience/PremiumDecisionSurface.tsx';

const PREMIUM_EXPERIENCE_PNG = PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST;

const DISK_EVIDENCE = validatePremiumEvidenceOnDisk(ROOT);
const SOURCE_SNAPSHOT = computePremiumProofSourceSnapshot(ROOT);

const VALIDATION_OPTIONS: RecordValidationOptions = {
  root: ROOT,
  expectedSourceSnapshotDigest: SOURCE_SNAPSHOT.digest,
  expectedSourceSnapshotFileCount: SOURCE_SNAPSHOT.fileCount,
  expectedManifestDigest: computeManifestDigest(),
  diskFileIdentities: DISK_EVIDENCE.fileIdentities,
  expectedEvidenceIdentityDigest: DISK_EVIDENCE.evidenceIdentityDigest,
};

/** Deep clone of a committed record, so mutations never touch the original. */
function loadRecord(runId: 'run-1' | 'run-2'): PremiumRunRecord {
  const abs = join(ROOT, RECORDS_DIR_REL, `${runId}.json`);
  return JSON.parse(readFileSync(abs, 'utf8')) as PremiumRunRecord;
}

const COMMITTED_RECORD = loadRecord('run-2');

/** Copy the complete committed evidence set into an isolated temporary tree. */
function copyCommittedEvidence(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const evidence = join(dir, EVIDENCE_DIR_REL);
  mkdirSync(join(evidence, 'pdf'), { recursive: true });
  const source = join(ROOT, EVIDENCE_DIR_REL);
  for (const entry of PREMIUM_EXPERIENCE_PNG) {
    copyFileSync(join(source, entry.fileName), join(evidence, entry.fileName));
  }
  for (const entry of PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST) {
    copyFileSync(join(source, entry.fileName), join(evidence, entry.fileName));
  }
  return { dir, evidence };
}

function tempEvidenceRoot(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const evidence = join(dir, EVIDENCE_DIR_REL);
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

describe('premium proof — JSX stateId expression binding', () => {
  it('18. an unrelated variable holding the required state does not satisfy a mount', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/wrong-state-expression.tsx`);
    // The unrelated variable contains premium.share.card / premium.lp.answer_edit.
    assert.equal(
      hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.share.card'),
      false,
      'a variable that is never passed as stateId must not prove a mount',
    );
    assert.equal(
      hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.lp.answer_edit'),
      false,
    );
    // Only the states reachable from the actual attribute expression count.
    assert.ok(hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.lp.checkout'));
    assert.ok(hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.lp.plans'));
    for (const mount of inspection.premiumSurfaceMounts) {
      assert.equal(mount.stateIdExpression, 'mountedStateId');
    }
  });

  it('19. an open-ended stateId expression is unresolved and proves nothing', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, `${FIXTURES}/open-ended-state-expression.tsx`);
    assert.equal(
      hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', 'premium.share.card'),
      false,
    );
    const unresolved = unresolvedStateIdMounts(inspection);
    assert.equal(unresolved.length, 1);
    assert.equal(unresolved[0]?.stateIdExpression, 'stateId');
  });

  it('governed owners resolve every mounted stateId expression', () => {
    for (const entry of PREMIUM_FIXTURE_ROUTE_REACHABILITY) {
      const inspection = inspectPremiumOwnerFile(ROOT, entry.ownerModule);
      assert.deepEqual(
        unresolvedStateIdMounts(inspection).map((m) => `${entry.ownerModule}:${m.stateIdExpression}`),
        [],
      );
    }
  });

  it('the conditional questionnaire expression resolves to both branches only', () => {
    const inspection = inspectPremiumOwnerFile(ROOT, 'components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const conditional = inspection.premiumSurfaceMounts.filter(
      (m) => m.stateIdExpression === 'questionStateId',
    );
    assert.deepEqual(
      conditional.map((m) => m.stateId).sort(),
      ['premium.lp.answer_edit', 'premium.lp.questions'],
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
    const { dir, evidence } = copyCommittedEvidence('m55-evidence-extra-');
    try {
      copyFileSync(
        join(ROOT, EVIDENCE_DIR_REL, 'premium-bridge-390.png'),
        join(evidence, 'rogue-extra-390.png'),
      );
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
    assert.deepEqual(DISK_EVIDENCE.failures, [], DISK_EVIDENCE.failures.join('; '));
    assert.equal(DISK_EVIDENCE.registeredStateCount, 12);
    assert.equal(DISK_EVIDENCE.visualCaptureCount, 14);
    assert.equal(DISK_EVIDENCE.pngCount, 42);
    assert.equal(DISK_EVIDENCE.pdfCount, 5);
    for (const identity of DISK_EVIDENCE.fileIdentities) {
      assert.equal(identity.decoded, true, `${identity.fileName} must decode`);
      assert.equal(identity.contentOk, true, `${identity.fileName} must have real content`);
    }
  });
});

describe('premium proof — real same-dimension file substitution', () => {
  const VICTIM = 'premium-bridge-390.png';
  const DONOR = 'premium-share-card-390.png';

  function recordedIdentity(fileName: string): EvidenceFileIdentityRecord {
    const identity = COMMITTED_RECORD.evidenceFileIdentities.find((i) => i.fileName === fileName);
    assert.ok(identity, `${fileName} must have a committed identity`);
    return identity!;
  }

  it('the donor and victim captures really do share dimensions', () => {
    const victim = recordedIdentity(VICTIM);
    const donor = recordedIdentity(DONOR);
    assert.equal(victim.width, donor.width);
    assert.equal(victim.height, donor.height);
    assert.notEqual(victim.captureId, donor.captureId);
    assert.notEqual(victim.stateId, donor.stateId);
  });

  it('20. replacing a required PNG with a same-dimension PNG from another capture fails', () => {
    const { dir, evidence } = copyCommittedEvidence('m55-evidence-swap-');
    try {
      copyFileSync(join(evidence, DONOR), join(evidence, VICTIM));
      const result = validatePremiumEvidenceOnDisk(dir, {
        expectedFileIdentities: COMMITTED_RECORD.evidenceFileIdentities,
      });
      assert.ok(
        result.failures.some(
          (f) => f.startsWith(`evidence identity mismatch for ${VICTIM}`) && f.includes('sha256'),
        ),
        `substituted file must be named: ${result.failures.join('; ')}`,
      );
      assert.ok(
        result.failures.some((f) => f.includes('evidence substitution') && f.includes(VICTIM)),
        result.failures.join('; '),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('21. updating the recorded SHA to match the wrong file still fails', () => {
    const { dir, evidence } = copyCommittedEvidence('m55-evidence-swap-sha-');
    try {
      copyFileSync(join(evidence, DONOR), join(evidence, VICTIM));
      const donor = recordedIdentity(DONOR);
      // Forge the record so every raster-derived field matches the wrong file.
      const forged = COMMITTED_RECORD.evidenceFileIdentities.map((identity) =>
        identity.fileName === VICTIM
          ? {
              ...identity,
              sha256: donor.sha256,
              byteLength: donor.byteLength,
              width: donor.width,
              height: donor.height,
              contentMetric: donor.contentMetric,
              meanLuminance: donor.meanLuminance,
              distinctLuminanceBuckets: donor.distinctLuminanceBuckets,
            }
          : identity,
      );
      const result = validatePremiumEvidenceOnDisk(dir, { expectedFileIdentities: forged });
      assert.ok(
        result.failures.some(
          (f) =>
            f.includes('evidence substitution') && f.includes(VICTIM) && f.includes(DONOR),
        ),
        `capture identity must still reject the substitution: ${result.failures.join('; ')}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('22. an unmodified copy of the committed evidence binds cleanly', () => {
    const { dir } = copyCommittedEvidence('m55-evidence-clean-');
    try {
      const result = validatePremiumEvidenceOnDisk(dir, {
        expectedFileIdentities: COMMITTED_RECORD.evidenceFileIdentities,
      });
      assert.deepEqual(result.failures, [], result.failures.join('; '));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('premium proof — complete source snapshot', () => {
  const PREVIOUSLY_OMITTED = [
    'package.json',
    'package-lock.json',
    '.github/workflows/audit.yml',
    'scripts/premium-proof-toolchain.mjs',
    'scripts/verify-m55-premium-proof-records.mjs',
    'playwright.config.ts',
    'lib/m55/commercialUx/premiumExperience/premiumProofRecordsCli.ts',
    'lib/m55/commercialUx/premiumExperience/premiumExperienceProofNegative.test.ts',
    'lib/m55/commercialUx/premiumExperience/premiumExperienceReporterAuthority.ts',
    'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier/wrong-state-expression.tsx',
    'components/experience/PremiumDecisionSurface.tsx',
  ];

  it('23. every proof-relevant authority is inside the snapshot', () => {
    const files = listPremiumProofSourceFiles(ROOT);
    for (const rel of PREVIOUSLY_OMITTED) {
      assert.ok(files.includes(rel), `${rel} must be bound into the proof snapshot`);
    }
    assert.deepEqual(SOURCE_SNAPSHOT.missing, [], SOURCE_SNAPSHOT.missing.join('; '));
    assert.equal(SOURCE_SNAPSHOT.fileCount, files.length);
  });

  it('24. changing a previously omitted proof file makes both records stale', () => {
    for (const rel of PREVIOUSLY_OMITTED) {
      const original = readFileSync(join(ROOT, rel), 'utf8');
      const perturbed = computePremiumProofSourceSnapshot(
        ROOT,
        new Map([[rel, `${original}\n/* proof snapshot perturbation */\n`]]),
      );
      assert.notEqual(perturbed.digest, SOURCE_SNAPSHOT.digest, `${rel} must affect the digest`);

      const failures = validatePremiumRunRecordPair([loadRecord('run-1'), loadRecord('run-2')], {
        ...VALIDATION_OPTIONS,
        expectedSourceSnapshotDigest: perturbed.digest,
      });
      assert.ok(
        failures.filter((f) => f.includes('stale sourceSnapshotDigest')).length === 2,
        `${rel}: both records must be reported stale — ${failures.join('; ')}`,
      );
    }
  });
});

describe('premium proof — execution record failure modes', () => {
  it('committed record pair validates against the real artifacts', () => {
    const failures = validatePremiumRunRecordPair(
      [loadRecord('run-1'), loadRecord('run-2')],
      VALIDATION_OPTIONS,
    );
    assert.deepEqual(failures, [], failures.join('; '));
  });

  it('11. skipped required E2E result fails validation', () => {
    const record = { ...loadRecord('run-2'), skipped: 1, passed: 18 };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('skipped 1')), failures.join('; '));
    assert.ok(failures.some((f) => f.includes('passed 18')), failures.join('; '));
    assert.ok(
      failures.some((f) => f.includes('reporter derives skipped 0')),
      'the reporter artifact must contradict the record',
    );
  });

  it('12. only one successful execution record fails validation', () => {
    const failures = validatePremiumRunRecordPair([loadRecord('run-1')], VALIDATION_OPTIONS);
    assert.deepEqual(failures, ['expected exactly 2 successful execution records, received 1']);
  });

  it('13. stale sourceSnapshotDigest fails validation', () => {
    const record = { ...loadRecord('run-2'), sourceSnapshotDigest: 'f'.repeat(64) };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('stale sourceSnapshotDigest')), failures.join('; '));
  });

  it('13b. records from different source trees fail as a pair', () => {
    const second = { ...loadRecord('run-2'), sourceSnapshotDigest: 'e'.repeat(64) };
    const failures = validatePremiumRunRecordPair([loadRecord('run-1'), second], VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('different source trees')), failures.join('; '));
  });

  it('14. nonzero Playwright exit code fails validation', () => {
    const record = { ...loadRecord('run-2'), exitCode: 1 };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('exit code 1')), failures.join('; '));
    assert.ok(
      failures.some((f) => f.includes('reporter exit code 0 does not match record 1')),
      failures.join('; '),
    );
  });

  it('15. hard-coded or mismatched actual origin fails validation', () => {
    const hardCoded = { ...loadRecord('run-2'), actualOrigins: ['localhost'] };
    assert.ok(
      validatePremiumRunRecord(hardCoded, VALIDATION_OPTIONS).some((f) =>
        f.includes('does not match expected pattern'),
      ),
    );

    const undeclared = { ...loadRecord('run-2'), actualOrigins: ['http://localhost:4000'] };
    assert.ok(
      validatePremiumRunRecord(undeclared, VALIDATION_OPTIONS).some((f) =>
        f.includes('was not observed in any capture event'),
      ),
    );

    const remote = loadRecord('run-2');
    remote.captureEvents = remote.captureEvents.map((e) => ({ ...e, actualOrigin: 'https://m-55.jp' }));
    remote.actualOrigins = ['https://m-55.jp'];
    const remoteFailures = validatePremiumRunRecord(remote, VALIDATION_OPTIONS);
    assert.ok(
      remoteFailures.some((f) => f.includes('is not a local fixture origin')),
      remoteFailures.join('; '),
    );
  });

  it('16. capture mapped to the wrong state fails validation', () => {
    const record = loadRecord('run-2');
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
    const record = loadRecord('run-2');
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
    const first = loadRecord('run-1');
    const second = loadRecord('run-2');
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

  it('17b. a modified per-file SHA in the committed record fails validation', () => {
    const record = loadRecord('run-2');
    record.evidenceFileIdentities = record.evidenceFileIdentities.map((identity) =>
      identity.fileName === 'premium-bridge-390.png'
        ? { ...identity, sha256: '0'.repeat(64) }
        : identity,
    );
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(
      failures.some(
        (f) => f.includes('premium-bridge-390.png') && f.includes('sha256'),
      ),
      failures.join('; '),
    );
  });

  it('25. a forged 64-hex reporter digest fails validation', () => {
    const record = { ...loadRecord('run-2'), normalizedReporterSha256: 'a'.repeat(64) };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(
      failures.some((f) => f.includes('does not match recorded')),
      failures.join('; '),
    );
  });

  it('26. a handwritten command string fails validation', () => {
    const record = { ...loadRecord('run-2'), command: 'npx playwright test --grep premium' };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(
      failures.some((f) => f.includes('does not match contract')),
      failures.join('; '),
    );
  });

  it('26b. an unknown command contract key fails validation', () => {
    const record = { ...loadRecord('run-2'), commandContractKey: 'invented.key' };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(
      failures.some((f) => f.includes('not in the frozen command contract')),
      failures.join('; '),
    );
  });

  it('27. a missing normalized reporter artifact fails validation', () => {
    const record = {
      ...loadRecord('run-2'),
      normalizedReporterFile: `${RECORDS_DIR_REL}/reporter-run-2.json`.replace(
        'evidence-execution-records',
        'evidence-execution-records-absent',
      ),
    };
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.length > 0, 'a missing reporter artifact must fail');
  });

  it('28. record capture events that were not emitted by the tests fail validation', () => {
    const record = loadRecord('run-2');
    record.captureEvents = record.captureEvents.map((e) =>
      e.fileName === 'premium-bridge-390.png'
        ? { ...e, actualUrl: `${e.actualUrl}#fabricated` }
        : e,
    );
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(
      failures.some((f) => f.includes('are not the capture events emitted by the tests')),
      failures.join('; '),
    );
  });

  it('missing capture records fail validation', () => {
    const record = loadRecord('run-2');
    record.captureEvents = record.captureEvents.slice(0, 40);
    record.captureRecordCount = 40;
    const failures = validatePremiumRunRecord(record, VALIDATION_OPTIONS);
    assert.ok(failures.some((f) => f.includes('captureRecordCount 40')), failures.join('; '));
  });

  it('capture contract digests are bound to the typed authority', () => {
    const record = loadRecord('run-2');
    for (const event of record.captureEvents) {
      assert.match(event.visibleContractDigest, /^[0-9a-f]{64}$/);
    }
    assert.equal(PREMIUM_VISUAL_AUTHORITY_KEY, 'premium.experience.home_editorial_sample_v1');
  });
});
