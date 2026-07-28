/**
 * Evidence validation — typed authority import, real per-file decode, no regex
 * parsing of the manifest.
 *
 * Every PNG is decoded (dimensions + luminance content) and every PDF is
 * inspected (page count + inflated content + text operators), so identical file
 * counts or byte sizes cannot substitute for the required capture.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import {
  PREMIUM_EXPERIENCE_EVIDENCE_DIR,
  PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST,
  PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST,
  PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT,
  PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT,
  PREMIUM_PRINT_MIN_BYTES,
  PREMIUM_PURCHASED_BODY_MIN_BYTES,
} from './premiumExperienceEvidenceManifest';
import {
  PREMIUM_EXPERIENCE_CAPTURE_CASES,
  PREMIUM_EXPERIENCE_REGISTERED_STATE_COUNT,
  PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
  PREMIUM_STATES_WITHOUT_CAPTURE,
  assertPremiumCaptureModelShape,
  captureCaseById,
} from './premiumExperienceCaptureModel';
import { PREMIUM_EXPERIENCE_STATE_REGISTRY } from './premiumExperienceStateRegistry';
import {
  pdfIsNotLoadingOnly,
  pngIsNonBlank,
  readPdfIdentity,
  readPngIdentity,
} from './premiumEvidenceFileIdentity';

export type EvidenceFileIdentityRecord = {
  fileName: string;
  captureId: string;
  stateId: string;
  viewport: string | null;
  expectedRoute: string;
  ownerModule: string;
  ownerSymbol: string;
  visibleContractDigest: string;
  sha256: string;
  byteLength: number;
  width: number | null;
  height: number | null;
  decoded: boolean;
  contentOk: boolean;
  /** PNG luminance spread / PDF text-operator count, for auditability. */
  contentMetric: number;
};

export type EvidenceValidationResult = {
  registeredStateCount: number;
  visualCaptureCount: number;
  pngCount: number;
  pdfCount: number;
  viewportCount: 3;
  captureIds: string[];
  fileIdentities: EvidenceFileIdentityRecord[];
  manifestDigest: string;
  evidenceIdentityDigest: string;
  purchasedBodyDigests: { fileName: string; sha256: string; byteLength: number }[];
  failures: string[];
};

function walkPngFiles(dirAbs: string, out: string[] = []): string[] {
  if (!existsSync(dirAbs)) return out;
  for (const name of readdirSync(dirAbs)) {
    const abs = join(dirAbs, name);
    if (statSync(abs).isDirectory()) {
      if (name === 'pdf') continue;
      walkPngFiles(abs, out);
    } else if (name.endsWith('.png')) {
      out.push(abs);
    }
  }
  return out;
}

export function computeManifestDigest(): string {
  const canonical = JSON.stringify({
    registeredStates: PREMIUM_EXPERIENCE_STATE_REGISTRY.map((s) => s.id),
    captures: PREMIUM_EXPERIENCE_CAPTURE_CASES,
    png: PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST,
    pdf: PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Semantic identity digest — captureId/stateId/route/owner/viewport/contract/
 * dimensions/content status per file, deliberately excluding the raster SHA so
 * two runs of the same source can be compared without requiring pixel equality.
 */
export function computeEvidenceIdentityDigest(records: EvidenceFileIdentityRecord[]): string {
  const canonical = records
    .slice()
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
    .map((r) =>
      JSON.stringify({
        fileName: r.fileName,
        captureId: r.captureId,
        stateId: r.stateId,
        viewport: r.viewport,
        expectedRoute: r.expectedRoute,
        ownerModule: r.ownerModule,
        ownerSymbol: r.ownerSymbol,
        visibleContractDigest: r.visibleContractDigest,
        width: r.width,
        height: r.height,
        decoded: r.decoded,
        contentOk: r.contentOk,
      }),
    )
    .join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

function validateStateCaptureReconciliation(failures: string[]) {
  try {
    assertPremiumCaptureModelShape();
  } catch (err) {
    failures.push(`capture model shape: ${(err as Error).message}`);
  }

  const registeredIds = new Set(PREMIUM_EXPERIENCE_STATE_REGISTRY.map((s) => s.id));
  if (registeredIds.size !== PREMIUM_EXPERIENCE_REGISTERED_STATE_COUNT) {
    failures.push(
      `registered state count ${registeredIds.size}, expected ${PREMIUM_EXPERIENCE_REGISTERED_STATE_COUNT}`,
    );
  }
  if (PREMIUM_EXPERIENCE_CAPTURE_CASES.length !== PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT) {
    failures.push(
      `capture count ${PREMIUM_EXPERIENCE_CAPTURE_CASES.length}, expected ${PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT}`,
    );
  }

  for (const capture of PREMIUM_EXPERIENCE_CAPTURE_CASES) {
    if (!registeredIds.has(capture.stateId)) {
      failures.push(`capture ${capture.captureId} maps to unregistered state ${capture.stateId}`);
    }
    if (registeredIds.has(capture.captureId)) {
      failures.push(`captureId ${capture.captureId} masquerades as a registry state`);
    }
  }

  const covered = new Set(PREMIUM_EXPERIENCE_CAPTURE_CASES.map((c) => c.stateId));
  for (const stateId of registeredIds) {
    const expectedUncovered = (PREMIUM_STATES_WITHOUT_CAPTURE as readonly string[]).includes(stateId);
    if (!covered.has(stateId) && !expectedUncovered) {
      failures.push(`registered state ${stateId} has no capture case and is not classified`);
    }
    if (covered.has(stateId) && expectedUncovered) {
      failures.push(`state ${stateId} is classified as capture-free but owns a capture case`);
    }
  }
}

export function validatePremiumEvidenceOnDisk(root: string): EvidenceValidationResult {
  const failures: string[] = [];
  const evidenceDir = join(root, PREMIUM_EXPERIENCE_EVIDENCE_DIR);
  const expectedPng = PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.map((e) => e.fileName);
  const expectedPdf = PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST.map((e) => e.fileName);
  const fileIdentities: EvidenceFileIdentityRecord[] = [];

  validateStateCaptureReconciliation(failures);

  if (PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT !== 42) {
    failures.push(`manifest png count ${PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT}, expected 42`);
  }
  if (PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT !== 5) {
    failures.push(`manifest pdf count ${PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT}, expected 5`);
  }

  for (const entry of PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST) {
    const abs = join(evidenceDir, entry.fileName);
    if (!existsSync(abs)) {
      failures.push(`missing PNG ${entry.fileName}`);
      continue;
    }
    const identity = readPngIdentity(abs);
    if (!identity.decoded) {
      failures.push(`undecodable PNG ${entry.fileName}: ${identity.reason}`);
      fileIdentities.push({
        fileName: entry.fileName,
        captureId: entry.captureId,
        stateId: entry.stateId,
        viewport: entry.viewport,
        expectedRoute: entry.fixtureRoute,
        ownerModule: entry.ownerFile,
        ownerSymbol: entry.ownerSymbol,
        visibleContractDigest: entry.visibleContractDigest,
        sha256: identity.sha256,
        byteLength: identity.byteLength,
        width: null,
        height: null,
        decoded: false,
        contentOk: false,
        contentMetric: 0,
      });
      continue;
    }

    const nonBlank = pngIsNonBlank(identity);
    if (identity.byteLength === 0) failures.push(`zero-byte PNG ${entry.fileName}`);
    if (identity.width < entry.minWidth) {
      failures.push(`PNG ${entry.fileName} width ${identity.width} < ${entry.minWidth}`);
    }
    if (identity.height < entry.minHeight) {
      failures.push(`PNG ${entry.fileName} height ${identity.height} < ${entry.minHeight}`);
    }
    if (!nonBlank) {
      failures.push(
        `blank PNG ${entry.fileName} (buckets=${identity.distinctLuminanceBuckets}, stdDev=${identity.luminanceStdDev})`,
      );
    }
    if (
      entry.captureId === 'purchased-report-body' &&
      identity.byteLength < PREMIUM_PURCHASED_BODY_MIN_BYTES
    ) {
      failures.push(`blank purchased-body PNG ${entry.fileName} (${identity.byteLength}b)`);
    }

    fileIdentities.push({
      fileName: entry.fileName,
      captureId: entry.captureId,
      stateId: entry.stateId,
      viewport: entry.viewport,
      expectedRoute: entry.fixtureRoute,
      ownerModule: entry.ownerFile,
      ownerSymbol: entry.ownerSymbol,
      visibleContractDigest: entry.visibleContractDigest,
      sha256: identity.sha256,
      byteLength: identity.byteLength,
      width: identity.width,
      height: identity.height,
      decoded: true,
      contentOk: nonBlank,
      contentMetric: identity.luminanceStdDev,
    });
  }

  for (const entry of PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST) {
    const abs = join(evidenceDir, entry.fileName);
    if (!existsSync(abs)) {
      failures.push(`missing PDF ${entry.fileName}`);
      continue;
    }
    const identity = readPdfIdentity(abs);
    if (!identity.decoded) {
      failures.push(`undecodable PDF ${entry.fileName}: ${identity.reason}`);
      continue;
    }
    const notLoadingOnly = pdfIsNotLoadingOnly(identity);
    if (identity.byteLength < PREMIUM_PRINT_MIN_BYTES) {
      failures.push(`loading-only PDF ${entry.fileName} (${identity.byteLength}b)`);
    }
    if (!notLoadingOnly) {
      failures.push(
        `loading-only PDF ${entry.fileName} (pages=${identity.pageCount}, content=${identity.inflatedContentBytes}b, text=${identity.textShowingOperators})`,
      );
    }
    if (!identity.hasFontResource) {
      failures.push(`PDF ${entry.fileName} has no font resource`);
    }

    fileIdentities.push({
      fileName: entry.fileName,
      captureId: entry.captureId,
      stateId: entry.stateId,
      viewport: null,
      expectedRoute: entry.fixtureRoute,
      ownerModule: entry.ownerFile,
      ownerSymbol: entry.ownerSymbol,
      visibleContractDigest: entry.visibleContractDigest,
      sha256: identity.sha256,
      byteLength: identity.byteLength,
      width: null,
      height: null,
      decoded: true,
      contentOk: notLoadingOnly,
      contentMetric: identity.textShowingOperators,
    });
  }

  const onDiskPngRel = walkPngFiles(evidenceDir).map((abs) =>
    abs.replace(join(root, PREMIUM_EXPERIENCE_EVIDENCE_DIR) + sep, '').split(sep).join('/'),
  );
  const onDiskPdfRel = existsSync(join(evidenceDir, 'pdf'))
    ? readdirSync(join(evidenceDir, 'pdf'))
        .filter((f) => f.endsWith('.pdf'))
        .map((f) => `pdf/${f}`)
    : [];

  if (onDiskPngRel.length !== 42) failures.push(`on-disk PNG count ${onDiskPngRel.length}, expected 42`);
  if (onDiskPdfRel.length !== 5) failures.push(`on-disk PDF count ${onDiskPdfRel.length}, expected 5`);

  for (const file of onDiskPngRel) {
    if (!expectedPng.includes(file)) failures.push(`unexpected PNG ${file}`);
  }
  for (const file of onDiskPdfRel) {
    if (!expectedPdf.includes(file)) failures.push(`unexpected PDF ${file}`);
  }

  const manifestCaptureIds = new Set(PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.map((e) => e.captureId));
  for (const capture of PREMIUM_EXPERIENCE_CAPTURE_CASES) {
    if (!manifestCaptureIds.has(capture.captureId)) {
      failures.push(`manifest missing capture ${capture.captureId}`);
    }
  }
  for (const captureId of manifestCaptureIds) {
    if (!captureCaseById(captureId)) failures.push(`manifest capture ${captureId} has no capture case`);
  }

  const purchasedBodyDigests = fileIdentities
    .filter((d) => d.captureId === 'purchased-report-body')
    .map((d) => ({ fileName: d.fileName, sha256: d.sha256, byteLength: d.byteLength }));

  return {
    registeredStateCount: PREMIUM_EXPERIENCE_STATE_REGISTRY.length,
    visualCaptureCount: PREMIUM_EXPERIENCE_CAPTURE_CASES.length,
    pngCount: onDiskPngRel.length,
    pdfCount: onDiskPdfRel.length,
    viewportCount: 3,
    captureIds: PREMIUM_EXPERIENCE_CAPTURE_CASES.map((c) => c.captureId),
    fileIdentities,
    manifestDigest: computeManifestDigest(),
    evidenceIdentityDigest: computeEvidenceIdentityDigest(fileIdentities),
    purchasedBodyDigests,
    failures,
  };
}
