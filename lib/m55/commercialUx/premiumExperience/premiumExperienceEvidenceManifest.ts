/**
 * Premium Experience visual evidence manifest — derived from the typed capture
 * model: 14 capture cases × 3 viewports = 42 PNGs, plus 5 print captures.
 *
 * Entries carry captureId and stateId separately so a capture identity can never
 * masquerade as a registry state.
 */

import {
  PREMIUM_EXPERIENCE_CAPTURE_CASES,
  PREMIUM_EXPERIENCE_VIEWPORTS,
  captureContractDigest,
  pngFileNameFor,
  type PremiumCaptureCase,
  type PremiumEvidenceViewport,
} from './premiumExperienceCaptureModel';

export type { PremiumEvidenceViewport };

export type PremiumEvidencePngEntry = {
  captureId: string;
  stateId: string;
  viewport: PremiumEvidenceViewport;
  fileName: string;
  fixtureRoute: string;
  ownerFile: string;
  ownerSymbol: string;
  visibleContractDigest: string;
  captureScope: 'full_page' | 'element';
  minWidth: number;
  minHeight: number;
  visualRequirement: 'VISUAL_EVIDENCE_REQUIRED';
};

export type PremiumEvidencePdfEntry = {
  captureId: string;
  stateId: string;
  fileName: string;
  fixtureRoute: string;
  ownerFile: string;
  ownerSymbol: string;
  visibleContractDigest: string;
  visualRequirement: 'PRINT_EVIDENCE_REQUIRED';
};

export const PREMIUM_EXPERIENCE_EVIDENCE_DIR = 'e2e/screenshots/premium-experience-ssot' as const;

function pngEntriesFor(capture: PremiumCaptureCase): PremiumEvidencePngEntry[] {
  const digest = captureContractDigest(capture);
  return PREMIUM_EXPERIENCE_VIEWPORTS.map((viewport) => ({
    captureId: capture.captureId,
    stateId: capture.stateId,
    viewport,
    fileName: pngFileNameFor(capture.captureId, viewport),
    fixtureRoute: capture.expectedRoute,
    ownerFile: capture.ownerModule,
    ownerSymbol: capture.ownerSymbol,
    visibleContractDigest: digest,
    captureScope: capture.captureScope,
    minWidth: capture.minWidth,
    minHeight: capture.minHeight,
    visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' as const,
  }));
}

export const PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST: readonly PremiumEvidencePngEntry[] =
  PREMIUM_EXPERIENCE_CAPTURE_CASES.flatMap(pngEntriesFor);

export const PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST: readonly PremiumEvidencePdfEntry[] =
  PREMIUM_EXPERIENCE_CAPTURE_CASES.filter((c) => c.printRequired).map((capture) => ({
    captureId: capture.captureId,
    stateId: capture.stateId,
    fileName: capture.printFileName!,
    fixtureRoute: capture.expectedRoute,
    ownerFile: capture.ownerModule,
    ownerSymbol: capture.ownerSymbol,
    visibleContractDigest: captureContractDigest(capture),
    visualRequirement: 'PRINT_EVIDENCE_REQUIRED' as const,
  }));

export const PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT = PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.length;
export const PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT = PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST.length;

/** Minimum byte size for non-blank purchased-body evidence. */
export const PREMIUM_PURCHASED_BODY_MIN_BYTES = 8_000;

/** Minimum byte size for any print capture that is not loading-only. */
export const PREMIUM_PRINT_MIN_BYTES = 3_000;

export function listExpectedPremiumEvidencePngFileNames(): string[] {
  return PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.map((e) => e.fileName);
}

export function listExpectedPremiumEvidencePdfFileNames(): string[] {
  return PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST.map((e) => e.fileName);
}

export function pngEntryByFileName(fileName: string): PremiumEvidencePngEntry | undefined {
  return PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.find((e) => e.fileName === fileName);
}
