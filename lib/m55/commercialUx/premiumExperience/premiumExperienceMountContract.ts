/**
 * Premium Experience mount contract — REGISTERED states must be MOUNTED in owner files.
 * Verifier resolves mounts via TypeScript AST (not string markers).
 */

export type PremiumSurfaceMount = {
  kind: 'premium_surface';
  component: 'PremiumExperienceSurface' | 'PremiumDecisionSurface';
  stateId: string;
  conditionallySelected?: boolean;
};

export type PremiumDataStateMount = {
  kind: 'data_premium_state';
  value: string;
};

export type PremiumExperienceMountSpec = PremiumSurfaceMount | PremiumDataStateMount;

export type PremiumExperienceMountExpectation = {
  id: string;
  ownerFile: string;
  mount: PremiumExperienceMountSpec;
  fixtureRoute?: string;
  fixtureModule?: string;
};

export const PREMIUM_EXPERIENCE_MOUNT_CONTRACT: readonly PremiumExperienceMountExpectation[] = [
  {
    id: 'premium.core.bridge',
    ownerFile: 'components/core/CoreFreeToPaidConversionBridge.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumExperienceSurface',
      stateId: 'premium.core.bridge',
    },
  },
  {
    id: 'premium.lp.prerequisite',
    ownerFile: 'components/dtr/DtrLpPremiumContinuityIntro.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumExperienceSurface',
      stateId: 'premium.lp.prerequisite',
    },
  },
  {
    id: 'premium.lp.questions',
    ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumDecisionSurface',
      stateId: 'premium.lp.questions',
    },
    fixtureRoute: '/dtr/lp',
    fixtureModule: 'app/dtr/lp/page.tsx',
  },
  {
    id: 'premium.lp.answer_edit',
    ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumDecisionSurface',
      stateId: 'premium.lp.answer_edit',
      conditionallySelected: true,
    },
    fixtureRoute: '/dtr/lp',
    fixtureModule: 'app/dtr/lp/page.tsx',
  },
  {
    id: 'premium.lp.answer_review',
    ownerFile: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumDecisionSurface',
      stateId: 'premium.lp.answer_review',
    },
    fixtureRoute: '/dtr/lp',
    fixtureModule: 'app/dtr/lp/page.tsx',
  },
  {
    id: 'premium.lp.plans',
    ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumDecisionSurface',
      stateId: 'premium.lp.plans',
    },
    fixtureRoute: '/dtr/lp',
    fixtureModule: 'app/dtr/lp/page.tsx',
  },
  {
    id: 'premium.lp.checkout',
    ownerFile: 'components/dtr/DtrPaidPurchasePrep.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumDecisionSurface',
      stateId: 'premium.lp.checkout',
    },
    fixtureRoute: '/dtr/lp',
    fixtureModule: 'app/dtr/lp/page.tsx',
  },
  {
    id: 'purchased.report.body',
    ownerFile: 'components/dtr/DtrFullReader.tsx',
    mount: { kind: 'data_premium_state', value: 'purchased.report.body' },
    fixtureRoute: '/dev/dtr-drawer-preview',
    fixtureModule: 'app/dev/dtr-drawer-preview/page.tsx',
  },
  {
    id: 'purchased.consult.input',
    ownerFile: 'components/dtr/ConsultRoom.tsx',
    mount: { kind: 'data_premium_state', value: 'purchased.consult.input' },
    fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=available',
    fixtureModule: 'app/dev/dtr-drawer-preview/page.tsx',
  },
  {
    id: 'purchased.consult.result',
    ownerFile: 'components/dtr/ConsultReplyCard.tsx',
    mount: { kind: 'data_premium_state', value: 'purchased.consult.result' },
    fixtureRoute: '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history',
    fixtureModule: 'app/dev/dtr-drawer-preview/page.tsx',
  },
  {
    id: 'purchased.saved_reopen',
    ownerFile: 'components/dtr/SavedSnapshotNotice.tsx',
    mount: { kind: 'data_premium_state', value: 'purchased.saved_reopen' },
    fixtureRoute: '/dev/dtr-drawer-preview',
    fixtureModule: 'app/dev/dtr-drawer-preview/page.tsx',
  },
  {
    id: 'premium.share.card',
    ownerFile: 'components/core/CorePremiumResultShareCTA.tsx',
    mount: {
      kind: 'premium_surface',
      component: 'PremiumDecisionSurface',
      stateId: 'premium.share.card',
    },
    fixtureRoute: '/dev/premium-share-preview',
    fixtureModule: 'app/dev/premium-share-preview/page.tsx',
  },
] as const;

/** Dev-only fixture gate — must never appear on Production reader route. */
export const PREMIUM_DEV_FIXTURE_READY_PROP = 'devPreviewFixtureReady' as const;

export const PREMIUM_DEV_FIXTURE_OWNER_FILES = [
  'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
  'app/dev/dtr-drawer-preview/page.tsx',
  'app/dev/premium-share-preview/page.tsx',
] as const;

export const PREMIUM_DEV_FIXTURE_FORBIDDEN_OWNER_FILES = ['app/dtr/core/page.tsx'] as const;

export const PREMIUM_SHARE_FREE_OWNER_FILE = 'components/core/CoreFreeResultShareCTA.tsx' as const;

export const PREMIUM_SHARE_PREMIUM_OWNER_FILE = 'components/core/CorePremiumResultShareCTA.tsx' as const;
