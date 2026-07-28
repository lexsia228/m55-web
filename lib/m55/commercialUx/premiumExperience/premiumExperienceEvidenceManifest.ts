/**
 * Premium Experience visual evidence manifest — 14 states × 3 viewports + 5 PDFs.
 */

export type PremiumEvidenceViewport = '390' | '768' | '1280';

export type PremiumEvidencePngEntry = {
  stateId: string;
  viewport: PremiumEvidenceViewport;
  fileName: string;
  fixtureRoute: string;
  ownerFile: string;
  visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' | 'PRINT_EVIDENCE_REQUIRED';
};

export type PremiumEvidencePdfEntry = {
  stateId: string;
  fileName: string;
  fixtureRoute: string;
  ownerFile: string;
  visualRequirement: 'PRINT_EVIDENCE_REQUIRED';
};

export const PREMIUM_EXPERIENCE_EVIDENCE_DIR = 'e2e/screenshots/premium-experience-ssot' as const;

export const PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST: readonly PremiumEvidencePngEntry[] = [
  { stateId: 'premium.core.bridge', viewport: '390', fileName: 'premium-bridge-390.png', fixtureRoute: '/core', ownerFile: 'components/core/CoreFreeToPaidConversionBridge.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.core.bridge', viewport: '768', fileName: 'premium-bridge-768.png', fixtureRoute: '/core', ownerFile: 'components/core/CoreFreeToPaidConversionBridge.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.core.bridge', viewport: '1280', fileName: 'premium-bridge-1280.png', fixtureRoute: '/core', ownerFile: 'components/core/CoreFreeToPaidConversionBridge.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '390', fileName: 'premium-q1-390.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '768', fileName: 'premium-q1-768.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '1280', fileName: 'premium-q1-1280.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '390', fileName: 'premium-q5-390.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '768', fileName: 'premium-q5-768.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '1280', fileName: 'premium-q5-1280.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '390', fileName: 'premium-q6-390.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '768', fileName: 'premium-q6-768.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.questions', viewport: '1280', fileName: 'premium-q6-1280.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.answer_review', viewport: '390', fileName: 'answer-review-390.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.answer_review', viewport: '768', fileName: 'answer-review-768.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.answer_review', viewport: '1280', fileName: 'answer-review-1280.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.answer_edit', viewport: '390', fileName: 'answer-edit-390.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.answer_edit', viewport: '768', fileName: 'answer-edit-768.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.answer_edit', viewport: '1280', fileName: 'answer-edit-1280.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.plans', viewport: '390', fileName: 'plan-selection-390.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.plans', viewport: '768', fileName: 'plan-selection-768.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.plans', viewport: '1280', fileName: 'plan-selection-1280.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.checkout', viewport: '390', fileName: 'payment-prep-390.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.checkout', viewport: '768', fileName: 'payment-prep-768.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.checkout', viewport: '1280', fileName: 'payment-prep-1280.png', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.report.landing', viewport: '390', fileName: 'purchased-report-landing-390.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/DtrFullReader.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.report.landing', viewport: '768', fileName: 'purchased-report-landing-768.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/DtrFullReader.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.report.landing', viewport: '1280', fileName: 'purchased-report-landing-1280.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/DtrFullReader.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.report.body', viewport: '390', fileName: 'purchased-report-body-390.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/DtrFullReader.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.report.body', viewport: '768', fileName: 'purchased-report-body-768.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/DtrFullReader.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.report.body', viewport: '1280', fileName: 'purchased-report-body-1280.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/DtrFullReader.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.consult.input', viewport: '390', fileName: 'additional-reading-input-390.png', fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=available', ownerFile: 'components/dtr/ConsultRoom.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.consult.input', viewport: '768', fileName: 'additional-reading-input-768.png', fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=available', ownerFile: 'components/dtr/ConsultRoom.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.consult.input', viewport: '1280', fileName: 'additional-reading-input-1280.png', fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=available', ownerFile: 'components/dtr/ConsultRoom.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.consult.result', viewport: '390', fileName: 'additional-reading-result-390.png', fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history', ownerFile: 'components/dtr/ConsultReplyCard.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.consult.result', viewport: '768', fileName: 'additional-reading-result-768.png', fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history', ownerFile: 'components/dtr/ConsultReplyCard.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.consult.result', viewport: '1280', fileName: 'additional-reading-result-1280.png', fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history', ownerFile: 'components/dtr/ConsultReplyCard.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.saved_reopen', viewport: '390', fileName: 'saved-premium-reopen-390.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/SavedSnapshotNotice.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.saved_reopen', viewport: '768', fileName: 'saved-premium-reopen-768.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/SavedSnapshotNotice.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.saved_reopen', viewport: '1280', fileName: 'saved-premium-reopen-1280.png', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/SavedSnapshotNotice.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.share.card', viewport: '390', fileName: 'premium-share-card-390.png', fixtureRoute: '/dev/premium-share-preview', ownerFile: 'components/core/CorePremiumResultShareCTA.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.share.card', viewport: '768', fileName: 'premium-share-card-768.png', fixtureRoute: '/dev/premium-share-preview', ownerFile: 'components/core/CorePremiumResultShareCTA.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
  { stateId: 'premium.share.card', viewport: '1280', fileName: 'premium-share-card-1280.png', fixtureRoute: '/dev/premium-share-preview', ownerFile: 'components/core/CorePremiumResultShareCTA.tsx', visualRequirement: 'VISUAL_EVIDENCE_REQUIRED' },
] as const;

export const PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST: readonly PremiumEvidencePdfEntry[] = [
  { stateId: 'premium.lp.answer_review', fileName: 'pdf/answer-review.pdf', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx', visualRequirement: 'PRINT_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.plans', fileName: 'pdf/plan-selection.pdf', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'PRINT_EVIDENCE_REQUIRED' },
  { stateId: 'premium.lp.checkout', fileName: 'pdf/payment-prep.pdf', fixtureRoute: '/dtr/lp', ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx', visualRequirement: 'PRINT_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.report.body', fileName: 'pdf/purchased-report.pdf', fixtureRoute: '/dev/dtr-drawer-preview', ownerFile: 'components/dtr/DtrFullReader.tsx', visualRequirement: 'PRINT_EVIDENCE_REQUIRED' },
  { stateId: 'purchased.consult.result', fileName: 'pdf/additional-reading-result.pdf', fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history', ownerFile: 'components/dtr/ConsultReplyCard.tsx', visualRequirement: 'PRINT_EVIDENCE_REQUIRED' },
] as const;

export const PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT = PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.length;
export const PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT = PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST.length;

/** Minimum byte size for non-blank purchased-body evidence. */
export const PREMIUM_PURCHASED_BODY_MIN_BYTES = 8_000;

export function listExpectedPremiumEvidencePngFileNames(): string[] {
  return PREMIUM_EXPERIENCE_EVIDENCE_PNG_MANIFEST.map((e) => e.fileName);
}

export function listExpectedPremiumEvidencePdfFileNames(): string[] {
  return PREMIUM_EXPERIENCE_EVIDENCE_PDF_MANIFEST.map((e) => e.fileName);
}
