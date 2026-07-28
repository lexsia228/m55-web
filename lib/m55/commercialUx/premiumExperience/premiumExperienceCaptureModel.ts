/**
 * Premium Experience capture model — the single typed authority that separates
 * REGISTERED STATES (12) from VISUAL CAPTURE CASES (14).
 *
 * A captureId is an evidence identity, never a registry state. Three question
 * captures (q1/q5/q6) map to one state, and two purchased-report captures
 * (landing/body) map to one state. `premium.lp.prerequisite` is a registered
 * state that carries no capture case in this matrix.
 */
import { createHash } from 'node:crypto';
import { PREMIUM_VISUAL_AUTHORITY_KEY } from './premiumVisualAuthority';

export const PREMIUM_EXPERIENCE_REGISTERED_STATE_COUNT = 12 as const;
export const PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT = 14 as const;
export const PREMIUM_EXPERIENCE_VIEWPORTS = ['390', '768', '1280'] as const;

export type PremiumEvidenceViewport = (typeof PREMIUM_EXPERIENCE_VIEWPORTS)[number];

export type PremiumCaptureVisibleContract = {
  /** Locator that must be visible before the capture is taken. */
  locator: string;
  /** Representative visible text that must be present. */
  requiredTexts: readonly string[];
  /** Loading / auth / error text that must be absent. */
  forbiddenTexts: readonly string[];
  /** Locators that must resolve to zero nodes (loading / auth overlays). */
  forbiddenLocators: readonly string[];
};

export type PremiumCaptureCase = {
  captureId: string;
  /** Must be a registered Premium state id. */
  stateId: string;
  expectedRoute: string;
  ownerModule: string;
  ownerSymbol: string;
  visualAuthority: typeof PREMIUM_VISUAL_AUTHORITY_KEY;
  visibleContract: PremiumCaptureVisibleContract;
  captureScope: 'full_page' | 'element';
  /** Lower bound for decoded PNG dimensions (fullPage height varies by content). */
  minWidth: number;
  minHeight: number;
  printRequired: boolean;
  printFileName?: string;
};

const LOADING_TEXT = '読み込み中…';
const AUTH_OVERLAY_LOCATORS = ['[data-clerk-modal]', '.cl-modalBackdrop'] as const;

function contract(
  locator: string,
  requiredTexts: readonly string[],
  extraForbiddenLocators: readonly string[] = [],
): PremiumCaptureVisibleContract {
  return {
    locator,
    requiredTexts,
    forbiddenTexts: [LOADING_TEXT],
    forbiddenLocators: [...AUTH_OVERLAY_LOCATORS, ...extraForbiddenLocators],
  };
}

const PREMIUM_TIER_LOCATOR = '[data-m55-experience-tier="PREMIUM"]';
const DECISION_SHEET_LOCATOR = '[data-m55-premium-decision-sheet="true"]';

export const PREMIUM_EXPERIENCE_CAPTURE_CASES: readonly PremiumCaptureCase[] = [
  {
    captureId: 'premium-bridge',
    stateId: 'premium.core.bridge',
    expectedRoute: '/core',
    ownerModule: 'components/core/CoreFreeToPaidConversionBridge.tsx',
    ownerSymbol: 'CoreFreeToPaidConversionBridge',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract(PREMIUM_TIER_LOCATOR, []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
  {
    captureId: 'premium-q1',
    stateId: 'premium.lp.questions',
    expectedRoute: '/dtr/lp',
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract(DECISION_SHEET_LOCATOR, []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
  {
    captureId: 'premium-q5',
    stateId: 'premium.lp.questions',
    expectedRoute: '/dtr/lp',
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract(DECISION_SHEET_LOCATOR, []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
  {
    captureId: 'premium-q6',
    stateId: 'premium.lp.questions',
    expectedRoute: '/dtr/lp',
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract(DECISION_SHEET_LOCATOR, []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
  {
    captureId: 'answer-review',
    stateId: 'premium.lp.answer_review',
    expectedRoute: '/dtr/lp',
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('[data-m55-paid-phase="complete"]', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: true,
    printFileName: 'pdf/answer-review.pdf',
  },
  {
    captureId: 'answer-edit',
    stateId: 'premium.lp.answer_edit',
    expectedRoute: '/dtr/lp',
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('[data-m55-paid-answer-edit="true"]', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
  {
    captureId: 'plan-selection',
    stateId: 'premium.lp.plans',
    expectedRoute: '/dtr/lp',
    ownerModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
    ownerSymbol: 'DtrPaidPurchasePrep',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('[data-testid="m55-dtr-plan-selection"]', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: true,
    printFileName: 'pdf/plan-selection.pdf',
  },
  {
    captureId: 'payment-prep',
    stateId: 'premium.lp.checkout',
    expectedRoute: '/dtr/lp',
    ownerModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
    ownerSymbol: 'DtrPaidPurchasePrep',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('[data-m55-paid-phase="checkout"]', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: true,
    printFileName: 'pdf/payment-prep.pdf',
  },
  {
    captureId: 'purchased-report-landing',
    stateId: 'purchased.report.body',
    expectedRoute: '/dev/dtr-drawer-preview',
    ownerModule: 'components/dtr/DtrFullReader.tsx',
    ownerSymbol: 'DtrFullReader',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('[data-m55-dev-preview="dtr-drawer"]', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: true,
    printFileName: 'pdf/purchased-report.pdf',
  },
  {
    captureId: 'purchased-report-body',
    stateId: 'purchased.report.body',
    expectedRoute: '/dev/dtr-drawer-preview',
    ownerModule: 'components/dtr/DtrFullReader.tsx',
    ownerSymbol: 'DtrFullReader',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract(
      '[data-testid="m55-purchased-report-body"]',
      ['の自分の形'],
      ['[data-m55-premium-decision-field="true"]'],
    ),
    captureScope: 'element',
    minWidth: 200,
    minHeight: 200,
    printRequired: false,
  },
  {
    captureId: 'additional-reading-input',
    stateId: 'purchased.consult.input',
    expectedRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=available',
    ownerModule: 'components/dtr/ConsultRoom.tsx',
    ownerSymbol: 'ConsultRoom',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('#consult-step-1', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
  {
    captureId: 'additional-reading-result',
    stateId: 'purchased.consult.result',
    expectedRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history',
    ownerModule: 'components/dtr/ConsultReplyCard.tsx',
    ownerSymbol: 'ConsultReplyCard',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('#drawer-hub-body-consult', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: true,
    printFileName: 'pdf/additional-reading-result.pdf',
  },
  {
    captureId: 'saved-premium-reopen',
    stateId: 'purchased.saved_reopen',
    expectedRoute: '/dev/dtr-drawer-preview',
    ownerModule: 'components/dtr/SavedSnapshotNotice.tsx',
    ownerSymbol: 'SavedSnapshotNotice',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('[data-testid="m55-saved-snapshot-notice"]', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
  {
    captureId: 'premium-share-card',
    stateId: 'premium.share.card',
    expectedRoute: '/dev/premium-share-preview',
    ownerModule: 'components/core/CorePremiumResultShareCTA.tsx',
    ownerSymbol: 'CorePremiumResultShareCTA',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    visibleContract: contract('[data-testid="m55-premium-result-share"]', []),
    captureScope: 'full_page',
    minWidth: 380,
    minHeight: 400,
    printRequired: false,
  },
] as const;

/** States that own at least one capture case. */
export const PREMIUM_CAPTURE_COVERED_STATE_IDS = Array.from(
  new Set(PREMIUM_EXPERIENCE_CAPTURE_CASES.map((c) => c.stateId)),
);

/** Registered state deliberately excluded from the visual capture matrix. */
export const PREMIUM_STATES_WITHOUT_CAPTURE = ['premium.lp.prerequisite'] as const;

export function captureCaseById(captureId: string): PremiumCaptureCase | undefined {
  return PREMIUM_EXPERIENCE_CAPTURE_CASES.find((c) => c.captureId === captureId);
}

export function captureContractDigest(capture: PremiumCaptureCase): string {
  const canonical = JSON.stringify({
    captureId: capture.captureId,
    stateId: capture.stateId,
    expectedRoute: capture.expectedRoute,
    ownerModule: capture.ownerModule,
    ownerSymbol: capture.ownerSymbol,
    visualAuthority: capture.visualAuthority,
    visibleContract: capture.visibleContract,
    captureScope: capture.captureScope,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function pngFileNameFor(captureId: string, viewport: PremiumEvidenceViewport): string {
  return `${captureId}-${viewport}.png`;
}

export function assertPremiumCaptureModelShape(): void {
  const ids = new Set<string>();
  for (const capture of PREMIUM_EXPERIENCE_CAPTURE_CASES) {
    if (ids.has(capture.captureId)) {
      throw new Error(`duplicate captureId ${capture.captureId}`);
    }
    ids.add(capture.captureId);
    if (capture.printRequired && !capture.printFileName) {
      throw new Error(`${capture.captureId} printRequired without printFileName`);
    }
  }
  if (PREMIUM_EXPERIENCE_CAPTURE_CASES.length !== PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT) {
    throw new Error(
      `capture count ${PREMIUM_EXPERIENCE_CAPTURE_CASES.length}, expected ${PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT}`,
    );
  }
}
