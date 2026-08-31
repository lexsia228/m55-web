/**
 * Typed route-consumption authority for M55 method placements.
 *
 * Each placement is a single registry entry with a route/state, owner, copy key,
 * required DOM order, link target and runtime evidence requirement. Checkout
 * preparation remains a distinct /dtr/lp entry. The retired /pricing public
 * surface is not a method placement.
 *
 * Negative fixtures below prove the verifier rejects the ten review-blocker
 * defect classes directly.
 */
import {
  M55_METHOD_CANONICAL_COPY,
  M55_METHOD_CANONICAL_ROUTE,
  M55_METHOD_PUBLIC_NAME,
  M55_METHOD_ROUTE_LINK_LABEL_JA,
  type MethodPlacementId as LegacyPlacementId,
} from './m55MethodAuthority';

export type MethodCopyKey = keyof typeof M55_METHOD_CANONICAL_COPY | 'publicName' | 'routeLinkLabel';

export type MethodRouteConsumptionId =
  | 'home'
  | 'core_free_result'
  | 'dtr_lp'
  | 'purchased_report'
  | 'checkout_prep'
  | 'footer_nav';

export type MethodRelativeOrder = {
  /** Placement must appear after this test id (document order / scroll Y). */
  afterTestId?: string;
  /** Placement must appear before this test id. */
  beforeTestId?: string;
};

export type MethodRouteConsumptionPlacement = {
  id: MethodRouteConsumptionId;
  route: string;
  /** Runtime UX phase / paid phase, or null when the route itself is enough. */
  runtimeState: string | null;
  ownerFile: string;
  ownerComponent: string;
  canonicalCopyKeys: readonly MethodCopyKey[];
  testId: string;
  relativeOrder: MethodRelativeOrder;
  linkTarget: typeof M55_METHOD_CANONICAL_ROUTE;
  linkTestId: string | null;
  runtimeEvidenceRequired: boolean;
};

export const M55_METHOD_ROUTE_CONSUMPTION: readonly MethodRouteConsumptionPlacement[] = [
  {
    id: 'home',
    route: '/home',
    runtimeState: null,
    ownerFile: 'components/home/HomeMethodModel.tsx',
    ownerComponent: 'HomeMethodModel',
    canonicalCopyKeys: ['publicName', 'explanationJa', 'boundaryJa'],
    testId: 'm55-method-home',
    relativeOrder: {
      afterTestId: 'm55-home-mechanism',
      beforeTestId: 'm55-home-premium-preview',
    },
    linkTarget: M55_METHOD_CANONICAL_ROUTE,
    linkTestId: null,
    runtimeEvidenceRequired: true,
  },
  {
    id: 'core_free_result',
    route: '/core',
    runtimeState: 'RESULT',
    ownerFile: 'components/core/CoreMethodCompact.tsx',
    ownerComponent: 'CoreMethodCompact',
    canonicalCopyKeys: ['publicName', 'explanationJa', 'boundaryJa'],
    testId: 'm55-method-core-free-result',
    relativeOrder: {
      beforeTestId: 'core-paid',
    },
    linkTarget: M55_METHOD_CANONICAL_ROUTE,
    linkTestId: null,
    runtimeEvidenceRequired: true,
  },
  {
    id: 'dtr_lp',
    route: '/dtr/lp',
    runtimeState: 'plans',
    ownerFile: 'components/dtr/DtrMethodDifference.tsx',
    ownerComponent: 'DtrMethodDifference',
    canonicalCopyKeys: [
      'publicName',
      'premiumDifferenceFreeJa',
      'premiumDifferencePremiumJa',
      'boundaryJa',
    ],
    testId: 'm55-method-dtr-difference',
    relativeOrder: {
      afterTestId: 'm55-dtr-plan-light',
    },
    linkTarget: M55_METHOD_CANONICAL_ROUTE,
    linkTestId: null,
    runtimeEvidenceRequired: true,
  },
  {
    id: 'purchased_report',
    route: '/dtr/core',
    runtimeState: 'purchased_report_body',
    ownerFile: 'components/dtr/DtrMethodReportNote.tsx',
    ownerComponent: 'DtrMethodReportNote',
    canonicalCopyKeys: ['publicName', 'explanationJa', 'reproducibilityJa', 'boundaryJa'],
    testId: 'm55-method-purchased-report',
    relativeOrder: {
      beforeTestId: 'm55-report-chapter-heading',
    },
    linkTarget: M55_METHOD_CANONICAL_ROUTE,
    linkTestId: null,
    runtimeEvidenceRequired: true,
  },
  {
    id: 'checkout_prep',
    route: '/dtr/lp',
    runtimeState: 'checkout',
    ownerFile: 'components/pages/M55MethodTrustLink.tsx',
    ownerComponent: 'M55MethodTrustLink',
    canonicalCopyKeys: ['publicName', 'boundaryJa', 'routeLinkLabel'],
    testId: 'm55-method-checkout-trust-link',
    relativeOrder: {},
    linkTarget: M55_METHOD_CANONICAL_ROUTE,
    linkTestId: 'm55-method-checkout-link',
    runtimeEvidenceRequired: true,
  },
  {
    id: 'footer_nav',
    route: '*',
    runtimeState: null,
    ownerFile: 'app/_components/PublicFooter.tsx',
    ownerComponent: 'PublicFooter',
    canonicalCopyKeys: ['routeLinkLabel'],
    testId: 'm55-method-footer-link',
    relativeOrder: {},
    linkTarget: M55_METHOD_CANONICAL_ROUTE,
    linkTestId: 'm55-method-footer-link',
    runtimeEvidenceRequired: true,
  },
] as const;

export function methodRouteConsumptionById(
  id: MethodRouteConsumptionId,
): MethodRouteConsumptionPlacement | undefined {
  return M55_METHOD_ROUTE_CONSUMPTION.find((p) => p.id === id);
}

export function resolveCanonicalCopy(key: MethodCopyKey): string {
  if (key === 'publicName') return M55_METHOD_PUBLIC_NAME;
  if (key === 'routeLinkLabel') return M55_METHOD_ROUTE_LINK_LABEL_JA;
  return M55_METHOD_CANONICAL_COPY[key];
}

/** Competing public methodology names that must not appear on the canonical route. */
export const COMPETING_PUBLIC_METHOD_NAMES = [
  'M55複合暦解析',
  'M55 複合暦解析',
  '複合暦解析',
] as const;

export type RouteConsumptionDefectId =
  | 'duplicate_placement'
  | 'unregistered_placement'
  | 'wrong_route'
  | 'wrong_runtime_state'
  | 'wrong_dom_order'
  | 'noncanonical_copy_owner'
  | 'missing_checkout_placement'
  | 'missing_purchased_report_placement'
  | 'wrong_link_target'
  | 'competing_canonical_method_name';

export type RouteConsumptionFixture = {
  id: RouteConsumptionDefectId;
  /** Candidate registry under review (may be broken). */
  placements: readonly MethodRouteConsumptionPlacement[];
  /** Optional runtime observation used by order / name checks. */
  observation?: {
    route?: string;
    runtimeState?: string | null;
    testIdsInDocumentOrder?: readonly string[];
    linkTargetsByTestId?: Readonly<Record<string, string>>;
    renderedPublicNames?: readonly string[];
    ownerFilesByTestId?: Readonly<Record<string, string>>;
  };
};

function ids(placements: readonly MethodRouteConsumptionPlacement[]): MethodRouteConsumptionId[] {
  return placements.map((p) => p.id);
}

/**
 * Reject a broken route-consumption registry / observation.
 * Returns one human-readable reason per defect; empty means the fixture is healthy.
 */
export function rejectRouteConsumptionFixture(fixture: RouteConsumptionFixture): string[] {
  const reasons: string[] = [];
  const { placements, observation } = fixture;
  const byId = new Map(placements.map((p) => [p.id, p]));

  switch (fixture.id) {
    case 'duplicate_placement': {
      const seen = new Set<string>();
      for (const p of placements) {
        if (seen.has(p.id)) reasons.push(`duplicate placement id: ${p.id}`);
        seen.add(p.id);
      }
      break;
    }
    case 'unregistered_placement': {
      for (const p of placements) {
        if (!M55_METHOD_ROUTE_CONSUMPTION.some((c) => c.id === p.id)) {
          reasons.push(`unregistered placement id: ${p.id}`);
        }
      }
      break;
    }
    case 'wrong_route': {
      for (const canonical of M55_METHOD_ROUTE_CONSUMPTION) {
        const live = byId.get(canonical.id);
        if (live && live.route !== canonical.route) {
          reasons.push(
            `${canonical.id} route ${live.route} does not match authority ${canonical.route}`,
          );
        }
      }
      break;
    }
    case 'wrong_runtime_state': {
      for (const canonical of M55_METHOD_ROUTE_CONSUMPTION) {
        const live = byId.get(canonical.id);
        if (live && live.runtimeState !== canonical.runtimeState) {
          reasons.push(
            `${canonical.id} runtimeState ${String(live.runtimeState)} does not match authority ${String(canonical.runtimeState)}`,
          );
        }
      }
      break;
    }
    case 'wrong_dom_order': {
      const order = observation?.testIdsInDocumentOrder ?? [];
      for (const p of M55_METHOD_ROUTE_CONSUMPTION) {
        const idx = order.indexOf(p.testId);
        if (idx < 0) continue;
        if (p.relativeOrder.afterTestId) {
          const afterIdx = order.indexOf(p.relativeOrder.afterTestId);
          if (afterIdx < 0 || idx <= afterIdx) {
            reasons.push(
              `${p.id} must appear after ${p.relativeOrder.afterTestId}`,
            );
          }
        }
        if (p.relativeOrder.beforeTestId) {
          const beforeIdx = order.indexOf(p.relativeOrder.beforeTestId);
          if (beforeIdx < 0 || idx >= beforeIdx) {
            reasons.push(
              `${p.id} must appear before ${p.relativeOrder.beforeTestId}`,
            );
          }
        }
      }
      break;
    }
    case 'noncanonical_copy_owner': {
      const owners = observation?.ownerFilesByTestId ?? {};
      for (const p of M55_METHOD_ROUTE_CONSUMPTION) {
        const owner = owners[p.testId];
        if (owner && owner !== p.ownerFile) {
          reasons.push(
            `${p.id} owner ${owner} is not the canonical owner ${p.ownerFile}`,
          );
        }
      }
      break;
    }
    case 'missing_checkout_placement': {
      if (!byId.has('checkout_prep')) {
        reasons.push('checkout_prep placement is missing from the registry');
      }
      break;
    }
    case 'missing_purchased_report_placement': {
      if (!byId.has('purchased_report')) {
        reasons.push('purchased_report placement is missing from the registry');
      }
      break;
    }
    case 'wrong_link_target': {
      const links = observation?.linkTargetsByTestId ?? {};
      for (const p of M55_METHOD_ROUTE_CONSUMPTION) {
        const linkId = p.linkTestId ?? p.testId;
        const href = links[linkId];
        if (href && href !== p.linkTarget) {
          reasons.push(`${p.id} link target ${href} is not ${p.linkTarget}`);
        }
      }
      break;
    }
    case 'competing_canonical_method_name': {
      const names = observation?.renderedPublicNames ?? [];
      for (const name of names) {
        if (COMPETING_PUBLIC_METHOD_NAMES.some((c) => name.includes(c))) {
          reasons.push(`competing public method name rendered: ${name}`);
        }
        if (name !== M55_METHOD_PUBLIC_NAME && name.includes('複合') && name.includes('M55')) {
          reasons.push(`non-canonical M55 method name rendered: ${name}`);
        }
      }
      break;
    }
    default: {
      const _exhaustive: never = fixture.id;
      reasons.push(`unknown defect id: ${String(_exhaustive)}`);
    }
  }

  // Shared structural guards used by several fixtures.
  if (fixture.id === 'missing_checkout_placement' || fixture.id === 'missing_purchased_report_placement') {
    // already handled
  } else if (ids(placements).length === 0) {
    reasons.push('placement registry is empty');
  }

  return reasons;
}

/** Ten intentionally broken fixtures — each must be rejected. */
export function routeConsumptionNegativeFixtures(): readonly RouteConsumptionFixture[] {
  const healthy = M55_METHOD_ROUTE_CONSUMPTION;
  const withoutCheckout = healthy.filter((p) => p.id !== 'checkout_prep');
  const withoutPurchased = healthy.filter((p) => p.id !== 'purchased_report');
  const duplicateHome: MethodRouteConsumptionPlacement[] = [
    ...healthy,
    { ...healthy[0]!, id: 'home' },
  ];
  // Build a truly unregistered id outside the canonical set.
  const rogue = {
    ...healthy[0]!,
    id: 'rogue_unregistered' as MethodRouteConsumptionId,
    testId: 'm55-method-rogue',
  };

  return [
    {
      id: 'duplicate_placement',
      placements: duplicateHome,
    },
    {
      id: 'unregistered_placement',
      placements: [...healthy, rogue],
    },
    {
      id: 'wrong_route',
      placements: healthy.map((p) =>
        p.id === 'home' ? { ...p, route: '/wrong-home' } : p,
      ),
    },
    {
      id: 'wrong_runtime_state',
      placements: healthy.map((p) =>
        p.id === 'checkout_prep' ? { ...p, runtimeState: 'plans' } : p,
      ),
    },
    {
      id: 'wrong_dom_order',
      placements: healthy,
      observation: {
        testIdsInDocumentOrder: [
          'm55-home-premium-preview',
          'm55-method-home',
          'm55-home-mechanism',
        ],
      },
    },
    {
      id: 'noncanonical_copy_owner',
      placements: healthy,
      observation: {
        ownerFilesByTestId: {
          'm55-method-home': 'components/legacy/OldMethod.tsx',
        },
      },
    },
    {
      id: 'missing_checkout_placement',
      placements: withoutCheckout,
    },
    {
      id: 'missing_purchased_report_placement',
      placements: withoutPurchased,
    },
    {
      id: 'wrong_link_target',
      placements: healthy,
      observation: {
        linkTargetsByTestId: {
          'm55-method-footer-link': '/legacy-method',
        },
      },
    },
    {
      id: 'competing_canonical_method_name',
      placements: healthy,
      observation: {
        renderedPublicNames: ['M55複合暦解析', M55_METHOD_PUBLIC_NAME],
      },
    },
  ];
}

/** Bridge for callers that still reference the legacy six-placement ids. */
export type { LegacyPlacementId };
