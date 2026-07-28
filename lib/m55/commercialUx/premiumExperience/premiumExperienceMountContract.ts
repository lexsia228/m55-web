/**
 * Premium Experience mount contract — REGISTERED states must be MOUNTED in owner files.
 */

export type PremiumExperienceMountExpectation = {
  id: string;
  ownerFile: string;
  requiredMarkers: readonly string[];
  fixtureRoute?: string;
};

export const PREMIUM_EXPERIENCE_MOUNT_CONTRACT: readonly PremiumExperienceMountExpectation[] = [
  {
    id: 'premium.core.bridge',
    ownerFile: 'components/core/CoreFreeToPaidConversionBridge.tsx',
    requiredMarkers: ['PremiumExperienceSurface', 'premium.core.bridge'],
  },
  {
    id: 'premium.lp.prerequisite',
    ownerFile: 'components/dtr/DtrLpPremiumContinuityIntro.tsx',
    requiredMarkers: ['PremiumExperienceSurface', 'premium.lp.prerequisite'],
  },
  {
    id: 'premium.lp.questions',
    ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    requiredMarkers: ['PremiumDecisionSurface', 'premium.lp.questions'],
    fixtureRoute: '/dtr/lp',
  },
  {
    id: 'premium.lp.answer_edit',
    ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    requiredMarkers: ['PremiumDecisionSurface', 'premium.lp.answer_edit'],
    fixtureRoute: '/dtr/lp',
  },
  {
    id: 'premium.lp.answer_review',
    ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    requiredMarkers: ['PremiumDecisionSurface', 'premium.lp.answer_review'],
    fixtureRoute: '/dtr/lp',
  },
  {
    id: 'premium.lp.plans',
    ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx',
    requiredMarkers: ['PremiumDecisionSurface', 'premium.lp.plans'],
    fixtureRoute: '/dtr/lp',
  },
  {
    id: 'premium.lp.checkout',
    ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx',
    requiredMarkers: ['PremiumDecisionSurface', 'premium.lp.checkout'],
    fixtureRoute: '/dtr/lp',
  },
  {
    id: 'purchased.report.body',
    ownerFile: 'components/dtr/DtrFullReader.tsx',
    requiredMarkers: ['PremiumHero', 'data-m55-dtr-scroll-root'],
    fixtureRoute: '/dev/dtr-drawer-preview',
  },
  {
    id: 'purchased.consult.input',
    ownerFile: 'components/dtr/ConsultRoom.tsx',
    requiredMarkers: ['consult-step-1', 'CONSULT_COMPOSE_PANEL_ID'],
    fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=available',
  },
  {
    id: 'purchased.consult.result',
    ownerFile: 'components/dtr/ConsultReplyCard.tsx',
    requiredMarkers: ['ConsultReplyCard', 'replyCard'],
    fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history',
  },
  {
    id: 'purchased.saved_reopen',
    ownerFile: 'components/dtr/SavedSnapshotNotice.tsx',
    requiredMarkers: ['purchased.saved_reopen', 'm55-saved-snapshot-notice'],
    fixtureRoute: '/dev/dtr-drawer-preview',
  },
  {
    id: 'premium.share.card',
    ownerFile: 'components/core/CoreFreeResultShareCTA.tsx',
    requiredMarkers: ['PremiumDecisionSurface', 'premium.share.card'],
    fixtureRoute: '/core',
  },
] as const;

/** Dev-only fixture gate — must never appear on Production reader route. */
export const PREMIUM_DEV_FIXTURE_READY_PROP = 'devPreviewFixtureReady' as const;

export const PREMIUM_DEV_FIXTURE_OWNER_FILES = [
  'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
  'app/dev/dtr-drawer-preview/page.tsx',
] as const;

export const PREMIUM_DEV_FIXTURE_FORBIDDEN_OWNER_FILES = ['app/dtr/core/page.tsx'] as const;
