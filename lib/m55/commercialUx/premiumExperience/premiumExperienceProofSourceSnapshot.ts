/**
 * Source-bound proof identity.
 *
 * Execution records are bound to a digest of the complete proof-relevant source
 * set rather than to a Git HEAD, so a record produced before a later edit to any
 * part of the proof system is detected as stale even when HEAD is unchanged.
 *
 * The premiumExperience proof directory is expanded deterministically rather
 * than enumerated by hand, so a newly added validator, authority, fixture or
 * negative test is covered automatically. Generated evidence, run records and
 * normalized reporter artifacts are excluded — they are the output being proven.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/** Directories expanded recursively; every matching file joins the snapshot. */
export const PREMIUM_PROOF_SOURCE_DIRECTORIES = [
  {
    dir: 'lib/m55/commercialUx/premiumExperience',
    extensions: ['.ts', '.tsx'],
    excludeDirs: ['evidence-execution-records'],
  },
  {
    dir: 'components/experience',
    extensions: ['.ts', '.tsx', '.css'],
    excludeDirs: [],
  },
] as const;

/** Individually declared proof-relevant files outside the expanded directories. */
export const PREMIUM_PROOF_SOURCE_FILES = [
  // Dependency + workflow authority
  'package.json',
  'package-lock.json',
  '.github/workflows/audit.yml',
  // Proof toolchain, runner and launchers
  'scripts/premium-proof-toolchain.mjs',
  'scripts/run-premium-experience-evidence.mjs',
  'scripts/verify-m55-premium-experience.mjs',
  'scripts/verify-m55-premium-proof-records.mjs',
  // Premium E2E specification and Playwright configuration
  'e2e/premium-experience-evidence.spec.ts',
  'playwright.config.ts',
  // Shared owner files whose markup the capture contracts depend on
  'components/core/CoreFreeToPaidConversionBridge.tsx',
  'components/core/CoreFreeResultShareCTA.tsx',
  'components/core/CorePremiumResultShareCTA.tsx',
  'components/core/CoreShareResultBody.tsx',
  'components/core/useCoreShareActions.ts',
  'components/dtr/DtrPaidQuestionnaireLayer.tsx',
  'components/dtr/DtrPaidPurchasePrep.tsx',
  'components/dtr/DtrLpPremiumContinuityIntro.tsx',
  'components/dtr/DtrNeedFreeResultGate.tsx',
  'components/dtr/DtrFullReader.tsx',
  'components/dtr/ConsultRoom.tsx',
  'components/dtr/ConsultReplyCard.tsx',
  'components/dtr/SavedSnapshotNotice.tsx',
  'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
  'app/dtr/lp/page.tsx',
  'app/dtr/core/page.tsx',
  'app/dev/dtr-drawer-preview/page.tsx',
  'app/dev/premium-share-preview/page.tsx',
  'lib/m55/freeResult/privacySafeShareCardV1.ts',
] as const;

export type SourceSnapshot = {
  digest: string;
  fileCount: number;
  files: string[];
  missing: string[];
};

function walk(root: string, dirRel: string, extensions: readonly string[], excludeDirs: readonly string[], out: string[]) {
  const abs = join(root, dirRel);
  if (!existsSync(abs)) return;
  for (const name of readdirSync(abs).sort()) {
    if (name === 'node_modules' || name === '.git') continue;
    const rel = join(dirRel, name).split(sep).join('/');
    const st = statSync(join(root, rel));
    if (st.isDirectory()) {
      if (excludeDirs.includes(name)) continue;
      walk(root, rel, extensions, excludeDirs, out);
    } else if (extensions.some((ext) => name.endsWith(ext))) {
      out.push(rel);
    }
  }
}

/** Deterministic, sorted list of every file bound into the proof snapshot. */
export function listPremiumProofSourceFiles(root: string): string[] {
  const files: string[] = [...PREMIUM_PROOF_SOURCE_FILES];
  for (const spec of PREMIUM_PROOF_SOURCE_DIRECTORIES) {
    walk(root, spec.dir, spec.extensions, spec.excludeDirs, files);
  }
  return Array.from(new Set(files)).sort();
}

/**
 * `contentOverrides` exists so negative tests can prove that changing any single
 * covered proof file invalidates the committed records, without mutating the
 * repository.
 */
export function computePremiumProofSourceSnapshot(
  root: string,
  contentOverrides?: ReadonlyMap<string, string>,
): SourceSnapshot {
  const missing: string[] = [];
  const files: string[] = [];
  const lines: string[] = [];

  for (const rel of listPremiumProofSourceFiles(root)) {
    const override = contentOverrides?.get(rel);
    let content: string;
    if (override !== undefined) {
      content = override;
    } else {
      const abs = join(root, rel);
      if (!existsSync(abs)) {
        missing.push(rel);
        continue;
      }
      content = readFileSync(abs, 'utf8');
    }
    // Normalize line endings so the digest is stable across checkout settings.
    const normalized = content.replace(/\r\n/g, '\n');
    files.push(rel);
    lines.push(`${rel}:${createHash('sha256').update(normalized).digest('hex')}`);
  }

  return {
    digest: createHash('sha256').update(lines.join('\n')).digest('hex'),
    fileCount: files.length,
    files,
    missing,
  };
}
