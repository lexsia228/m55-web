/**
 * Deterministic route → owner reachability contract for fixture-required Premium states.
 *
 * Reachability is proven by resolving the module graph (route module → fixture
 * client → owner module) plus an AST state-selection proof in the owner. The
 * successful E2E capture event for the same state completes the proof.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PREMIUM_VISUAL_AUTHORITY_KEY } from './premiumVisualAuthority';
import {
  PREMIUM_EXPERIENCE_CAPTURE_CASES,
  type PremiumCaptureCase,
} from './premiumExperienceCaptureModel';
import { importsResolveTo } from './premiumExperienceModuleResolution';
import {
  hasPremiumSurfaceMount,
  inspectPremiumOwnerFile,
  jsxPassesPropToComponent,
} from './premiumExperienceAstInspection';

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

/** Where a fixture prop is injected, keyed by the prop name in the contract. */
const FIXTURE_PROP_INJECTORS: Record<string, { module: string; tag: string; tagModule: string }> = {
  devPreviewFixtureReady: {
    module: 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx',
    tag: 'DtrFullReader',
    tagModule: 'components/dtr/DtrFullReader.tsx',
  },
};

export function captureCasesForState(stateId: string): PremiumCaptureCase[] {
  return PREMIUM_EXPERIENCE_CAPTURE_CASES.filter((c) => c.stateId === stateId);
}

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

/**
 * Pure reachability check for one contract entry. Injectable so negative
 * fixtures can exercise dead imports, missing route modules and wrong-state
 * contracts directly.
 */
export function checkRouteReachability(
  root: string,
  entry: PremiumRouteReachabilityExpectation,
): string[] {
  const failures: string[] = [];

  if (!existsSync(join(root, entry.routeModule))) {
    failures.push(`${entry.stateId}: route module missing ${entry.routeModule}`);
    return failures;
  }

  if (entry.importChain.length === 0) {
    failures.push(`${entry.stateId}: fixture route ${entry.expectedRoute} declares no owner path`);
    return failures;
  }
  if (entry.importChain[0].fromModule !== entry.routeModule) {
    failures.push(
      `${entry.stateId}: import chain does not start at route module ${entry.routeModule}`,
    );
  }
  const lastLink = entry.importChain[entry.importChain.length - 1];
  if (lastLink.toModule !== entry.ownerModule) {
    failures.push(
      `${entry.stateId}: import chain ends at ${lastLink.toModule}, expected owner ${entry.ownerModule}`,
    );
  }

  for (const link of entry.importChain) {
    if (!existsSync(join(root, link.fromModule))) {
      failures.push(`${entry.stateId}: chain module missing ${link.fromModule}`);
      continue;
    }
    if (!importsResolveTo(root, link.fromModule, link.importName, link.toModule)) {
      failures.push(
        `${entry.stateId}: ${link.fromModule} → ${link.importName} must resolve to ${link.toModule}`,
      );
    }
  }
  if (failures.length > 0) return failures;

  const inspection = inspectPremiumOwnerFile(root, entry.ownerModule);
  if (entry.selectionState?.startsWith('premium.')) {
    const mounted =
      hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', entry.selectionState) ||
      hasPremiumSurfaceMount(inspection, 'PremiumExperienceSurface', entry.selectionState);
    if (!mounted) {
      failures.push(`${entry.stateId}: state ${entry.selectionState} not mounted in ${entry.ownerModule}`);
    }
  } else if (entry.selectionState) {
    if (!inspection.dataPremiumStates.some((s) => s.value === entry.selectionState)) {
      failures.push(`${entry.stateId}: data state ${entry.selectionState} missing in ${entry.ownerModule}`);
    }
  }

  if (entry.selectionProp) {
    const injector = FIXTURE_PROP_INJECTORS[entry.selectionProp];
    if (!injector) {
      failures.push(`${entry.stateId}: no declared injector for selection prop ${entry.selectionProp}`);
    } else if (
      !jsxPassesPropToComponent(root, injector.module, injector.tag, entry.selectionProp, injector.tagModule)
    ) {
      failures.push(
        `${entry.stateId}: ${injector.module} does not pass ${entry.selectionProp} to ${injector.tag}`,
      );
    }
  }

  if (captureCasesForState(entry.stateId).length === 0) {
    failures.push(`${entry.stateId}: fixture-required state has no evidence manifest capture case`);
  }

  return failures;
}
