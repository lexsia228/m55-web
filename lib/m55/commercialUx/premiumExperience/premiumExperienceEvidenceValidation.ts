/**
 * Evidence manifest validation — typed authority import, no regex parsing.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import {
  PREMIUM_EXPERIENCE_EVIDENCE_DIR,
  PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST,
  PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST,
  PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT,
  PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT,
  PREMIUM_PURCHASED_BODY_MIN_BYTES,
} from './premiumExperienceEvidenceManifest';

export type EvidenceFileDigest = {
  fileName: string;
  sha256: string;
  byteLength: number;
};

export type EvidenceValidationResult = {
  pngCount: number;
  pdfCount: number;
  visualStateCount: number;
  viewportCount: 3;
  fileDigests: EvidenceFileDigest[];
  manifestDigest: string;
  purchasedBodyDigests: EvidenceFileDigest[];
  failures: string[];
};

const REQUIRED_VISUAL_STATE_IDS = [
  'premium.core.bridge',
  'premium.lp.questions',
  'premium.lp.answer_review',
  'premium.lp.answer_edit',
  'premium.lp.plans',
  'premium.lp.checkout',
  'purchased.report.landing',
  'purchased.report.body',
  'purchased.consult.input',
  'purchased.consult.result',
  'purchased.saved_reopen',
  'premium.share.card',
] as const;

function sha256File(absPath: string): EvidenceFileDigest {
  const buf = readFileSync(absPath);
  return {
    fileName: absPath.split(sep).pop() ?? absPath,
    sha256: createHash('sha256').update(buf).digest('hex'),
    byteLength: buf.byteLength,
  };
}

function walkPngFiles(dirAbs: string, out: string[] = []): string[] {
  if (!existsSync(dirAbs)) return out;
  for (const name of readdirSync(dirAbs)) {
    const abs = join(dirAbs, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
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
    png: PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST,
    pdf: PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function validatePremiumEvidenceOnDisk(root: string): EvidenceValidationResult {
  const failures: string[] = [];
  const evidenceDir = join(root, PREMIUM_EXPERIENCE_EVIDENCE_DIR);
  const expectedPng = PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.map((e) => e.fileName);
  const expectedPdf = PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST.map((e) => e.fileName);
  const fileDigests: EvidenceFileDigest[] = [];

  if (PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT !== 42) {
    failures.push(`manifest png count ${PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT}, expected 42`);
  }
  if (PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT !== 5) {
    failures.push(`manifest pdf count ${PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT}, expected 5`);
  }

  const manifestStates = new Set<string>();
  for (const entry of PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST) {
    manifestStates.add(entry.stateId);
    const abs = join(evidenceDir, entry.fileName);
    if (!existsSync(abs)) {
      failures.push(`missing PNG ${entry.fileName}`);
      continue;
    }
    const digest = sha256File(abs);
    digest.fileName = entry.fileName;
    fileDigests.push(digest);
    if (digest.byteLength === 0) failures.push(`zero-byte PNG ${entry.fileName}`);
    if (entry.fileName.startsWith('purchased-report-body-') && digest.byteLength < PREMIUM_PURCHASED_BODY_MIN_BYTES) {
      failures.push(`blank purchased-body PNG ${entry.fileName} (${digest.byteLength}b)`);
    }
  }

  for (const entry of PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST) {
    const abs = join(evidenceDir, entry.fileName);
    if (!existsSync(abs)) {
      failures.push(`missing PDF ${entry.fileName}`);
      continue;
    }
    const digest = sha256File(abs);
    digest.fileName = entry.fileName;
    fileDigests.push(digest);
    if (digest.byteLength < 3000) failures.push(`loading-only PDF ${entry.fileName} (${digest.byteLength}b)`);
    if (entry.fileName === 'pdf/purchased-report.pdf' && digest.byteLength < 5000) {
      failures.push(`purchased-report PDF too small (${digest.byteLength}b)`);
    }
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

  for (const stateId of REQUIRED_VISUAL_STATE_IDS) {
    if (!manifestStates.has(stateId)) failures.push(`manifest missing visual state ${stateId}`);
  }

  const purchasedBodyDigests = fileDigests.filter((d) => d.fileName.startsWith('purchased-report-body-'));

  return {
    pngCount: onDiskPngRel.length,
    pdfCount: onDiskPdfRel.length,
    visualStateCount: REQUIRED_VISUAL_STATE_IDS.length,
    viewportCount: 3,
    fileDigests,
    manifestDigest: computeManifestDigest(),
    purchasedBodyDigests,
    failures,
  };
}
