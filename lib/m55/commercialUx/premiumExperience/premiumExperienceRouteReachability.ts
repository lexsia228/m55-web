/**
 * Deterministic route → owner reachability contract for fixture-required Premium states.
 */
import { PREMIUM_VISUAL_AUTHORITY_KEY } from './premiumVisualAuthority';

export type RouteReachabilityLink = {
  fromModule: string;
  importName: string;
  toModule: string;
};

export type PremiumRouteReachabilityExpectation = {
  stateId: string;
  routeModule: string;
  expectedRoute: string;
  importChain: readonly RouteReachabilityLink[];
  ownerModule: string;
  ownerSymbol: string;
  selectionState?: string;
  selectionProp?: string;
  visualAuthority: typeof PREMIUM_VISUAL_AUTHORITY_KEY;
  fixtureRequired: true;
};

export const PREMIUM_NON_FIXTURE_STATE_IDS = [
  'premium.core.bridge',
  'premium.lp.prerequisite',
] as const;

export const PREMIUM_FIXTURE_ROUTE_REACHABILITY: readonly PremiumRouteReachabilityExpectation[] = [
  {
    stateId: 'premium.lp.questions',
    routeModule: 'app/dtr/lp/page.tsx',
    expectedRoute: '/dtr/lp',
    importChain: [
      {
        fromModule: 'app/dtr/lp/page.tsx',
        importName: 'DtrPaidPurchasePrep',
        toModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
      },
      {
        fromModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
        importName: 'DtrPaidQuestionnaireLayer',
        toModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
      },
    ],
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    selectionState: 'premium.lp.questions',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'premium.lp.answer_edit',
    routeModule: 'app/dtr/lp/page.tsx',
    expectedRoute: '/dtr/lp',
    importChain: [
      {
        fromModule: 'app/dtr/lp/page.tsx',
        importName: 'DtrPaidPurchasePrep',
        toModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
      },
      {
        fromModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
        importName: 'DtrPaidQuestionnaireLayer',
        toModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
      },
    ],
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    selectionState: 'premium.lp.answer_edit',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'premium.lp.answer_review',
    routeModule: 'app/dtr/lp/page.tsx',
    expectedRoute: '/dtr/lp',
    importChain: [
      {
        fromModule: 'app/dtr/lp/page.tsx',
        importName: 'DtrPaidPurchasePrep',
        toModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
      },
      {
        fromModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
        importName: 'DtrPaidQuestionnaireLayer',
        toModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
      },
    ],
    ownerModule: 'components/dtr/DtrPaidQuestionnaireLayer.tsx',
    ownerSymbol: 'DtrPaidQuestionnaireLayer',
    selectionState: 'premium.lp.answer_review',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'premium.lp.plans',
    routeModule: 'app/dtr/lp/page.tsx',
    expectedRoute: '/dtr/lp',
    importChain: [
      {
        fromModule: 'app/dtr/lp/page.tsx',
        importName: 'DtrPaidPurchasePrep',
        toModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
      },
    ],
    ownerModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
    ownerSymbol: 'DtrPaidPurchasePrep',
    selectionState: 'premium.lp.plans',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'premium.lp.checkout',
    routeModule: 'app/dtr/lp/page.tsx',
    expectedRoute: '/dtr/lp',
    importChain: [
      {
        fromModule: 'app/dtr/lp/page.tsx',
        importName: 'DtrPaidPurchasePrep',
        toModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
      },
    ],
    ownerModule: 'components/dtr/DtrPaidPurchasePrep.tsx',
    ownerSymbol: 'DtrPaidPurchasePrep',
    selectionState: 'premium.lp.checkout',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'purchased.report.body',
    routeModule: 'app/dev/dtr-drawer-preview/page.tsx',
    expectedRoute: '/dev/dtr-drawer-preview',
    importChain: [
      {
        fromModule: 'app/dev/dtr-drawer-preview/page.tsx',
        importName: 'DtrDrawerPreviewClient',
        toModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
      },
      {
        fromModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
        importName: 'DtrFullReader',
        toModule: 'components/dtr/DtrFullReader.tsx',
      },
    ],
    ownerModule: 'components/dtr/DtrFullReader.tsx',
    ownerSymbol: 'DtrFullReader',
    selectionState: 'purchased.report.body',
    selectionProp: 'devPreviewFixtureReady',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'purchased.saved_reopen',
    routeModule: 'app/dev/dtr-drawer-preview/page.tsx',
    expectedRoute: '/dev/dtr-drawer-preview',
    importChain: [
      {
        fromModule: 'app/dev/dtr-drawer-preview/page.tsx',
        importName: 'DtrDrawerPreviewClient',
        toModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
      },
      {
        fromModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
        importName: 'DtrFullReader',
        toModule: 'components/dtr/DtrFullReader.tsx',
      },
      {
        fromModule: 'components/dtr/DtrFullReader.tsx',
        importName: 'SavedSnapshotNotice',
        toModule: 'components/dtr/SavedSnapshotNotice.tsx',
      },
    ],
    ownerModule: 'components/dtr/SavedSnapshotNotice.tsx',
    ownerSymbol: 'SavedSnapshotNotice',
    selectionState: 'purchased.saved_reopen',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'purchased.consult.input',
    routeModule: 'app/dev/dtr-drawer-preview/page.tsx',
    expectedRoute: '/dev/dtr-drawer-preview',
    importChain: [
      {
        fromModule: 'app/dev/dtr-drawer-preview/page.tsx',
        importName: 'DtrDrawerPreviewClient',
        toModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
      },
      {
        fromModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
        importName: 'DtrFullReader',
        toModule: 'components/dtr/DtrFullReader.tsx',
      },
      {
        fromModule: 'components/dtr/DtrFullReader.tsx',
        importName: 'ConsultRoom',
        toModule: 'components/dtr/ConsultRoom.tsx',
      },
    ],
    ownerModule: 'components/dtr/ConsultRoom.tsx',
    ownerSymbol: 'ConsultRoom',
    selectionState: 'purchased.consult.input',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'purchased.consult.result',
    routeModule: 'app/dev/dtr-drawer-preview/page.tsx',
    expectedRoute: '/dev/dtr-drawer-preview',
    importChain: [
      {
        fromModule: 'app/dev/dtr-drawer-preview/page.tsx',
        importName: 'DtrDrawerPreviewClient',
        toModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
      },
      {
        fromModule: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
        importName: 'DtrFullReader',
        toModule: 'components/dtr/DtrFullReader.tsx',
      },
      {
        fromModule: 'components/dtr/DtrFullReader.tsx',
        importName: 'ConsultRoom',
        toModule: 'components/dtr/ConsultRoom.tsx',
      },
      {
        fromModule: 'components/dtr/ConsultRoom.tsx',
        importName: 'ConsultReplyCard',
        toModule: 'components/dtr/ConsultReplyCard.tsx',
      },
    ],
    ownerModule: 'components/dtr/ConsultReplyCard.tsx',
    ownerSymbol: 'ConsultReplyCard',
    selectionState: 'purchased.consult.result',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
  {
    stateId: 'premium.share.card',
    routeModule: 'app/dev/premium-share-preview/page.tsx',
    expectedRoute: '/dev/premium-share-preview',
    importChain: [
      {
        fromModule: 'app/dev/premium-share-preview/page.tsx',
        importName: 'CorePremiumResultShareCTA',
        toModule: 'components/core/CorePremiumResultShareCTA.tsx',
      },
    ],
    ownerModule: 'components/core/CorePremiumResultShareCTA.tsx',
    ownerSymbol: 'CorePremiumResultShareCTA',
    selectionState: 'premium.share.card',
    visualAuthority: PREMIUM_VISUAL_AUTHORITY_KEY,
    fixtureRequired: true,
  },
] as const;
