import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { validatePremiumEvidenceOnDisk } from './premiumExperienceEvidenceValidation.js';
import {
  importsResolveTo,
  jsxUsesResolvedSymbol,
  proveOwnerModuleResolution,
} from './premiumExperienceModuleResolution.js';
import { inspectPremiumOwnerFile, freeShareAccidentallyPremiumWrapped } from './premiumExperienceAstInspection.js';
import { runPremiumExperienceVerifier } from './premiumExperienceVerifier.js';

const ROOT = join(import.meta.dirname, '../../../..');

describe('premium experience verifier negative fixtures', () => {
  it('fails when PremiumDecisionSurface resolves to wrong module', () => {
    const rel = 'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier/wrong-module-import.tsx';
    const inspection = inspectPremiumOwnerFile(ROOT, rel);
    assert.ok(inspection.premiumSurfaceMounts.length > 0);
    assert.equal(inspection.premiumSurfaceMounts[0]?.boundToCanonicalModule, false);
  });

  it('comment marker fixture does not count as mount', () => {
    const rel = 'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier/comment-marker-only.tsx';
    const inspection = inspectPremiumOwnerFile(ROOT, rel);
    assert.equal(inspection.premiumSurfaceMounts.length, 0);
    assert.equal(inspection.importedSymbols.has('PremiumDecisionSurface'), false);
  });

  it('string literal marker fixture does not count as mount', () => {
    const rel = 'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier/string-marker-only.tsx';
    const inspection = inspectPremiumOwnerFile(ROOT, rel);
    assert.equal(inspection.premiumSurfaceMounts.length, 0);
    assert.equal(inspection.dataPremiumStates.length, 0);
  });

  it('free share premium wrapped fixture is detected', () => {
    const rel = 'lib/m55/commercialUx/premiumExperience/__fixtures__/verifier/free-share-premium-wrapped.tsx';
    assert.equal(freeShareAccidentallyPremiumWrapped(ROOT, rel), true);
  });

  it('fails for missing evidence file in temp dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm55-evidence-'));
    try {
      const result = validatePremiumEvidenceOnDisk(dir);
      assert.ok(result.failures.length > 0);
      assert.ok(result.failures.some((f) => f.includes('missing PNG')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails for blank purchased-body evidence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm55-evidence-blank-'));
    const evidenceDir = join(dir, 'e2e/screenshots/premium-experience-ssot');
    mkdirSync(join(evidenceDir, 'pdf'), { recursive: true });
    try {
      writeFileSync(join(evidenceDir, 'purchased-report-body-390.png'), Buffer.alloc(100));
      const result = validatePremiumEvidenceOnDisk(dir);
      assert.ok(result.failures.some((f) => f.includes('purchased-report-body-390.png')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when import chain does not resolve', () => {
    const hit = importsResolveTo(ROOT, 'app/dtr/lp/page.tsx', 'NonexistentOwner', 'components/dtr/DtrFullReader.tsx');
    assert.equal(hit, null);
  });

  it('production verifier passes on repository root', () => {
    const report = runPremiumExperienceVerifier(ROOT);
    assert.equal(report.failures.length, 0, report.failures.map((f) => f.message).join('\n'));
  });
});
