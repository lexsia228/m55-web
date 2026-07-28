/**
 * Source-bound proof identity.
 *
 * Execution records are bound to a digest of the exact proof-relevant tracked
 * source set rather than to a Git HEAD, so a record produced before a later edit
 * to the spec, runner, authority or owner files can be detected as stale even
 * when HEAD is unchanged.
 *
 * Generated evidence (PNG/PDF), the run records themselves and temporary
 * reporter output are deliberately excluded.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Proof-relevant tracked sources, grouped by the role each plays in the proof. */
export const PREMIUM_PROOF_SOURCE_FILES = [
  // Premium E2E specification
  'e2e/premium-experience-evidence.spec.ts',
  'playwright.config.ts',
  // Runner + reporter parser
  'scripts/run-premium-experience-evidence.mjs',
  'scripts/verify-m55-premium-experience.mjs',
  'scripts/verify-m55-premium-proof-records.mjs',
  // Evidence authority
  'lib/m55/commercialUx/premiumExperience/premiumExperienceCaptureModel.ts',
  'lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceManifest.ts',
  // Evidence validator + per-file identity
  'lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceValidation.ts',
  'lib/m55/commercialUx/premiumExperience/premiumEvidenceFileIdentity.ts',
  // Module resolution + AST inspection
  'lib/m55/commercialUx/premiumExperience/premiumExperienceModuleResolution.ts',
  'lib/m55/commercialUx/premiumExperience/premiumExperienceAstInspection.ts',
  // Route reachability
  'lib/m55/commercialUx/premiumExperience/premiumExperienceRouteReachability.ts',
  // Mount / state contracts
  'lib/m55/commercialUx/premiumExperience/premiumExperienceMountContract.ts',
  'lib/m55/commercialUx/premiumExperience/premiumExperienceStateRegistry.ts',
  'lib/m55/commercialUx/premiumExperience/premiumVisualAuthority.ts',
  // Verifier + run-record validation
  'lib/m55/commercialUx/premiumExperience/premiumExperienceVerifier.ts',
  'lib/m55/commercialUx/premiumExperience/premiumExperienceRunRecordValidation.ts',
  // Dependency lock
  'package-lock.json',
  // Shared owner files whose markup the capture contracts depend on
  'components/core/CoreFreeToPaidConversionBridge.tsx',
  'components/core/CorePremiumResultShareCTA.tsx',
  'components/core/CoreShareResultBody.tsx',
  'components/core/useCoreShareActions.ts',
  'components/dtr/DtrPaidQuestionnaireLayer.tsx',
  'components/dtr/DtrPaidPurchasePrep.tsx',
  'components/dtr/DtrFullReader.tsx',
  'components/dtr/ConsultRoom.tsx',
  'components/dtr/ConsultReplyCard.tsx',
  'components/dtr/SavedSnapshotNotice.tsx',
  'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
  'components/experience/PremiumExperienceSurface.tsx',
  'components/experience/PremiumDecisionSurface.tsx',
  'app/dtr/lp/page.tsx',
  'app/dev/dtr-drawer-preview/page.tsx',
  'app/dev/premium-share-preview/page.tsx',
] as const;

export type SourceSnapshot = {
  digest: string;
  fileCount: number;
  missing: string[];
};

export function computePremiumProofSourceSnapshot(root: string): SourceSnapshot {
  const missing: string[] = [];
  const lines: string[] = [];

  for (const rel of [...PREMIUM_PROOF_SOURCE_FILES].sort()) {
    const abs = join(root, rel);
    if (!existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    // Normalize line endings so the digest is stable across checkout settings.
    const normalized = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
    const fileDigest = createHash('sha256').update(normalized).digest('hex');
    lines.push(`${rel}:${fileDigest}`);
  }

  return {
    digest: createHash('sha256').update(lines.join('\n')).digest('hex'),
    fileCount: lines.length,
    missing,
  };
}
