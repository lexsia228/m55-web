/**
 * M55 registrations for the repository-independent commercial quality control
 * plane (schema v1).
 *
 * This module *imports* existing governed identities and never restates their
 * authority: ECP route registry, Premium state registry, Premium capture model,
 * commercial visual quality contract, Method authority, Asset Ledger and the
 * machine Product Truth contract remain the sources of truth.
 *
 * Commit A registers imported identities and adapter contracts only. HOME
 * continuous execution is not migrated into the shared runner here.
 */
import {
  COMMERCIAL_QUALITY_SCHEMA_VERSION,
  type AuthorityReference,
  type ContentStressProfile,
  type ProtectedElement,
  type SurfaceManifest,
  type SurfaceManifestEntry,
} from '../../../commercialQuality/types';
import { M55_ASSET_LEDGER, assetKeysForRoute } from '../assetLedger';
import { M55_EXPERIENCE_ARCHETYPES } from '../experience/experienceArchetypes';
import { M55_CTA_STATES } from '../experience/experienceCtaState';
import {
  M55_EXPERIENCE_ROUTE_REGISTRY,
  type ExperienceRouteEntry,
} from '../experience/experienceRouteRegistry';
import {
  PREMIUM_EXPERIENCE_CAPTURE_CASES,
  type PremiumCaptureCase,
} from '../premiumExperience/premiumExperienceCaptureModel';
import {
  PREMIUM_EXPERIENCE_STATE_REGISTRY,
  type PremiumExperienceStateDeclaration,
} from '../premiumExperience/premiumExperienceStateRegistry';
import { PREMIUM_VISUAL_AUTHORITY_KEY } from '../premiumExperience/premiumVisualAuthority';
import {
  COMMERCIAL_VIEWPORTS,
  COMMERCIAL_VIEWPORT_HEIGHTS,
  COMMERCIAL_VISUAL_CASES,
  HOME_HERO_CTA_MIN_HEIGHT_PX,
  MIN_INTERACTIVE_TARGET_PX,
  PUBLIC_FIXED_HEADER_SELECTOR,
  type CommercialVisualCase,
} from '../visualQuality/commercialVisualQualityContract';
import { M55_METHOD_CANONICAL_ROUTE, M55_METHOD_PLACEMENTS } from '../../method/m55MethodAuthority';
import { M55_METHOD_ROUTE_CONSUMPTION } from '../../method/m55MethodRouteConsumption';
import { M55_COMMERCIAL_PRODUCTS } from '../../contracts/m55CommercialFunnelContract';

export const M55_QUALITY_PROJECT_ID = 'm55' as const;

/** Governed width continuum shared by every M55 surface. */
export const M55_WIDTH_MIN = 320;
export const M55_WIDTH_MAX = 1440;
export const M55_WIDTH_STEP = 16;
export const M55_BREAKPOINT_NEIGHBORHOODS = [
  767, 768, 769, 895, 896, 897, 1023, 1024, 1025, 1279, 1280, 1281,
] as const;

/** Height matrix derived from the existing commercial viewport contract. */
export const M55_HEIGHT_MATRIX: readonly number[] = [
  ...new Set(COMMERCIAL_VIEWPORTS.map((width) => COMMERCIAL_VIEWPORT_HEIGHTS[width])),
].sort((a, b) => a - b);

const VIEWPORT_RANGE = {
  minWidth: M55_WIDTH_MIN,
  maxWidth: M55_WIDTH_MAX,
  widthStep: M55_WIDTH_STEP,
  breakpointNeighborhoods: M55_BREAKPOINT_NEIGHBORHOODS,
  heightMatrix: M55_HEIGHT_MATRIX,
} as const;

/** Governed content root rendered by every M55 shell. */
export const M55_GOVERNED_ROOT_SELECTOR = 'main';
const PREMIUM_TIER_SELECTOR = '[data-m55-experience-tier="PREMIUM"]';

/* ── Known authority keys (for unknown-reference rejection) ────────── */

export const M55_KNOWN_AUTHORITY_KEYS: Readonly<Record<string, readonly string[]>> = {
  route_registry: M55_EXPERIENCE_ROUTE_REGISTRY.map((entry) => entry.id),
  archetype: [...M55_EXPERIENCE_ARCHETYPES],
  cta_state: [...M55_CTA_STATES, 'CONTEXTUAL', 'NONE'],
  asset_ledger: M55_ASSET_LEDGER.map((entry) => entry.assetKey),
  product_truth: Object.values(M55_COMMERCIAL_PRODUCTS).map((product) => product.productKey),
  premium_state: PREMIUM_EXPERIENCE_STATE_REGISTRY.map((state) => state.id),
  premium_capture: PREMIUM_EXPERIENCE_CAPTURE_CASES.map((capture) => capture.captureId),
  visual_authority: [PREMIUM_VISUAL_AUTHORITY_KEY],
  commercial_visual_case: COMMERCIAL_VISUAL_CASES.map((visualCase) => visualCase.caseId),
  method_placement: [
    ...M55_METHOD_PLACEMENTS.map((placement) => placement.id),
    ...M55_METHOD_ROUTE_CONSUMPTION.map((placement) => placement.id),
  ],
  method_route: [M55_METHOD_CANONICAL_ROUTE],
};

export function isKnownAuthorityReference(reference: AuthorityReference): boolean {
  const known = M55_KNOWN_AUTHORITY_KEYS[reference.kind];
  return Array.isArray(known) && known.includes(reference.key);
}

/**
 * ECP `productTruth` is a route-level dependency enum, not a product key. Map it
 * onto machine Product Truth product keys so the reference stays verifiable.
 */
const PRODUCT_TRUTH_DEP_TO_PRODUCT_KEYS: Readonly<Record<string, readonly string[]>> = {
  none: [],
  self_premium_prices: [
    M55_COMMERCIAL_PRODUCTS.selfPremiumLight.productKey,
    M55_COMMERCIAL_PRODUCTS.selfPremiumFull.productKey,
  ],
  plan_comparison: [
    M55_COMMERCIAL_PRODUCTS.selfPremiumLight.productKey,
    M55_COMMERCIAL_PRODUCTS.selfPremiumFull.productKey,
  ],
  trait_identity: [M55_COMMERCIAL_PRODUCTS.selfFree.productKey],
  legal_copy: [],
};

function productTruthReferences(dep: string): readonly AuthorityReference[] {
  return (PRODUCT_TRUTH_DEP_TO_PRODUCT_KEYS[dep] ?? []).map((key) => ({
    kind: 'product_truth',
    key,
  }));
}

function assetReferences(routeId: string): readonly AuthorityReference[] {
  return assetKeysForRoute(routeId).map((key) => ({ kind: 'asset_ledger', key }));
}

/** Routes whose ECP migration class allows real browser execution. */
export function isBrowserExecutableEcpEntry(entry: ExperienceRouteEntry): boolean {
  return (
    entry.migration === 'ecp_v2_active' &&
    !entry.pattern.includes(':') &&
    !entry.pattern.includes('*') &&
    entry.privacy !== 'authenticated' &&
    entry.privacy !== 'purchased_private'
  );
}

const DEFAULT_STRESS: readonly ContentStressProfile[] = ['short_text'];

/** Rich governed-content stress — only surfaces with real protected copy mutation. */
const RICH_CONTENT_STRESS: readonly ContentStressProfile[] = [
  'short_text',
  'long_japanese_text',
  'punctuation_heavy_japanese',
  'manual_line_breaks',
  'max_dynamic_text',
  'empty',
  'loading',
  'error',
  // Auth/saved/plan/state_transition profiles are unsupported without a real
  // governed state adapter (SETUP_STRESS_UNSUPPORTED) — do not list them here.
];

/* ── Recorded accessibility deferrals ──────────────────────────────── */

/**
 * Exact accessibility deferrals. Each is bound to a stable decision-record ID,
 * exact route, exact selector, owner file, axe rule, typed measured ratio, and
 * CLOSE_IN_COMMIT_B classification. Substring / wildcard suppression is
 * prohibited — unmatched contrast violations still fail.
 */
export type AccessibilityDeferral = {
  decisionRecordId: string;
  route: string;
  /** Exact CSS selector that must match the failing node target string. */
  selector: string;
  ownerFile: string;
  axeRuleId: string;
  /** Measured contrast ratio at deferral time. */
  measuredRatio: number;
  classification: 'CLOSE_IN_COMMIT_B';
  reason: string;
};

/**
 * Temporary accessibility deferrals.
 * Commit B closed both prior CLOSE_IN_COMMIT_B contrast deferrals — keep empty.
 */
export const M55_ACCESSIBILITY_DEFERRALS: readonly AccessibilityDeferral[] = [];

/** Closed Commit B contrast deferral IDs (historical; must not remain active). */
export const M55_CLOSED_COMMIT_B_DEFERRAL_RECORD_IDS = [
  'CQ-A11Y-DEFER-METHOD-SECTION-ORDER-2026-07-30',
  'CQ-A11Y-DEFER-PUBLIC-FOOTER-COPY-2026-07-30',
] as const;

/**
 * A finding is deferred only when the axe rule, the exact route (when known),
 * and every failing target equal a deferred selector. Partial / substring
 * matches and route-null wildcards are rejected.
 */
export function isDeferredAccessibilityFinding(
  axeRuleId: unknown,
  targets: unknown,
  route?: string | null,
): boolean {
  if (typeof axeRuleId !== 'string' || !Array.isArray(targets) || targets.length === 0) {
    return false;
  }
  if (route == null || route === '') {
    return false;
  }
  return targets.every((target) => {
    if (typeof target !== 'string') return false;
    return M55_ACCESSIBILITY_DEFERRALS.some((deferral) => {
      if (deferral.axeRuleId !== axeRuleId) return false;
      if (route !== deferral.route) return false;
      // Exact selector match only — no substring / wildcard suppression.
      return target === deferral.selector;
    });
  });
}

/* ── ECP page surfaces (51) ────────────────────────────────────────── */

function ecpEntryToSurface(entry: ExperienceRouteEntry): SurfaceManifestEntry {
  const references: AuthorityReference[] = [
    { kind: 'route_registry', key: entry.id },
    { kind: 'archetype', key: entry.archetype },
    { kind: 'cta_state', key: entry.primaryCtaState },
    ...productTruthReferences(entry.productTruth),
    ...assetReferences(entry.id),
  ];
  const stress: ContentStressProfile[] =
    entry.id === 'public.how_m55_works' ? [...RICH_CONTENT_STRESS] : [...DEFAULT_STRESS];
  const variants: ContentStressProfile[] = [
    entry.privacy === 'authenticated' || entry.privacy === 'purchased_private'
      ? 'authenticated'
      : 'unauthenticated',
  ];

  return {
    schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION,
    surfaceId: `${M55_QUALITY_PROJECT_ID}:ecp.${entry.id}`,
    runtimeStateId: `ecp:${entry.id}:${entry.state ?? 'default'}`,
    route: entry.pattern,
    routeIsPattern: /[:*]/.test(entry.pattern),
    setupId: `m55.setup.ecp.${entry.id}`,
    requiresAuthentication:
      entry.privacy === 'authenticated' || entry.privacy === 'purchased_private',
    preconditions: [
      `migration:${entry.migration}`,
      `shell:${entry.shell}`,
      `privacy:${entry.privacy}`,
      `print_mode:${entry.printMode}`,
    ],
    authorityReferences: references,
    viewport: VIEWPORT_RANGE,
    protectedElements:
      entry.id === 'shared.og'
        ? [{ selector: 'img', role: 'media', requireText: false }]
        : [{ selector: M55_GOVERNED_ROOT_SELECTOR, role: 'container', requireText: true }],
    criticalCta: null,
    fixedElements:
      entry.id === 'shared.og'
        ? []
        : entry.shell === 'public'
          ? [PUBLIC_FIXED_HEADER_SELECTOR]
          : [],
    sectionBoundaries: [],
    stateVariants: variants,
    contentStressProfiles: stress,
    executionProfiles:
      entry.id === 'public.how_m55_works'
        ? ['default', 'text_zoom', 'font_load_transition', 'reduced_motion', 'safe_area']
        : ['default', 'reduced_motion'],
    // Every ECP archetype declares a paged print mode, so screen + paged output
    // are both governed; a privacy-safe route additionally emits a shared image.
    outputBehaviour: {
      screen: true,
      print: true,
      pdf: true,
      sharedImage: entry.privacy === 'privacy_safe_share',
    },
    canonicalBaseline: 'none',
    baselineApproval: null,
    sourceOwnerFiles: entry.ownerFiles,
  };
}

/* ── Premium runtime state surfaces (12) ───────────────────────────── */

function premiumStateToSurface(state: PremiumExperienceStateDeclaration): SurfaceManifestEntry {
  return {
    schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION,
    surfaceId: `${M55_QUALITY_PROJECT_ID}:premium.${state.id}`,
    runtimeStateId: `premium:${state.id}`,
    route: state.routePattern,
    routeIsPattern: /[:*]/.test(state.routePattern),
    setupId: `m55.setup.premium.${state.id}`,
    requiresAuthentication: state.shareAuthority === 'purchased_private',
    preconditions: [
      `ecp_route:${state.ecpRouteId}`,
      `premium_state:${state.state}`,
      `print_mode:${state.printAuthority}`,
    ],
    authorityReferences: [
      { kind: 'premium_state', key: state.id },
      { kind: 'route_registry', key: state.ecpRouteId },
      { kind: 'visual_authority', key: state.visualAuthorityKey },
      { kind: 'cta_state', key: state.primaryCtaState },
      ...productTruthReferences(state.productTruth),
    ],
    viewport: VIEWPORT_RANGE,
    protectedElements: [{ selector: PREMIUM_TIER_SELECTOR, role: 'container', requireText: true }],
    criticalCta: null,
    fixedElements: [],
    sectionBoundaries: [],
    stateVariants: [state.shareAuthority === 'purchased_private' ? 'saved' : 'unsaved'],
    contentStressProfiles: [...DEFAULT_STRESS],
    executionProfiles: ['default'],
    outputBehaviour: {
      screen: true,
      print: true,
      pdf: true,
      sharedImage: state.shareAuthority === 'privacy_safe_share',
    },
    canonicalBaseline: 'none',
    baselineApproval: null,
    sourceOwnerFiles: state.ownerFiles,
  };
}

/* ── Premium capture surfaces (14) ─────────────────────────────────── */

function premiumCaptureToSurface(capture: PremiumCaptureCase): SurfaceManifestEntry {
  const protectedElements: ProtectedElement[] = [
    { selector: capture.visibleContract.locator, role: 'container', requireText: true },
  ];
  return {
    schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION,
    surfaceId: `${M55_QUALITY_PROJECT_ID}:capture.${capture.captureId}`,
    runtimeStateId: `capture:${capture.captureId}`,
    route: capture.expectedRoute,
    routeIsPattern: /[:*]/.test(capture.expectedRoute),
    setupId: `m55.setup.capture.${capture.captureId}`,
    requiresAuthentication: false,
    preconditions: [`premium_state:${capture.stateId}`, `capture_scope:${capture.captureScope}`],
    authorityReferences: [
      { kind: 'premium_capture', key: capture.captureId },
      { kind: 'premium_state', key: capture.stateId },
      { kind: 'visual_authority', key: capture.visualAuthority },
    ],
    viewport: VIEWPORT_RANGE,
    protectedElements,
    criticalCta: null,
    fixedElements: [],
    sectionBoundaries: [],
    stateVariants: [],
    contentStressProfiles: ['short_text'],
    executionProfiles: ['default'],
    outputBehaviour: {
      screen: true,
      print: capture.printRequired,
      pdf: capture.printRequired,
      sharedImage: capture.captureId === 'premium-share-card',
    },
    canonicalBaseline: 'none',
    baselineApproval: null,
    sourceOwnerFiles: [capture.ownerModule],
  };
}

/* ── Commercial visual quality surfaces (6) ────────────────────────── */

/** Existing visual case routes mapped onto their ECP route identity. */
export const VISUAL_CASE_TO_ECP_ROUTE: Readonly<Record<string, string>> = {
  home: 'public.home',
  'core-prerequisite': 'free.core.empty',
  'core-free-result': 'free.core.result',
  'premium-questionnaire': 'premium.lp.questions',
  'premium-plans': 'premium.lp.plans',
  pricing: 'public.pricing',
};

function visualCaseToSurface(visualCase: CommercialVisualCase): SurfaceManifestEntry {
  const ecpRouteId = VISUAL_CASE_TO_ECP_ROUTE[visualCase.caseId];
  const ecpEntry = M55_EXPERIENCE_ROUTE_REGISTRY.find((entry) => entry.id === ecpRouteId);
  const ctaTarget = visualCase.protectedTargets.find((target) => target.role === 'cta');
  const minTargetPx =
    visualCase.caseId === 'home' ? HOME_HERO_CTA_MIN_HEIGHT_PX : MIN_INTERACTIVE_TARGET_PX;

  const protectedElements: ProtectedElement[] = visualCase.protectedTargets
    .filter((target) => target.role !== 'cta')
    .map((target) => ({
      selector: target.selector,
      role: target.role === 'desktop_content' ? 'container' : 'copy',
      requireText: true,
    }));
  if (protectedElements.length === 0) {
    protectedElements.push({
      selector: visualCase.readySelector,
      role: 'container',
      requireText: true,
    });
  }

  return {
    schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION,
    surfaceId: `${M55_QUALITY_PROJECT_ID}:visual.${visualCase.caseId}`,
    runtimeStateId: `visual:${visualCase.caseId}`,
    route: visualCase.route,
    routeIsPattern: /[:*]/.test(visualCase.route),
    // One executable setup per visual case — shared setup names (e.g. "none")
    // must not collapse distinct route/state identities.
    setupId: `m55.setup.visual.${visualCase.caseId}`,
    requiresAuthentication: false,
    preconditions: [`ready_selector:${visualCase.readySelector}`, `setup:${visualCase.setup}`],
    authorityReferences: [
      { kind: 'commercial_visual_case', key: visualCase.caseId },
      ...(ecpRouteId ? [{ kind: 'route_registry', key: ecpRouteId } as AuthorityReference] : []),
      ...(ecpEntry ? productTruthReferences(ecpEntry.productTruth) : []),
      ...(ecpRouteId ? assetReferences(ecpRouteId) : []),
    ],
    viewport: VIEWPORT_RANGE,
    protectedElements,
    criticalCta: ctaTarget
      ? {
          selector: ctaTarget.selector,
          minTargetPx,
          ctaAuthority: {
            kind: 'cta_state',
            key: ecpEntry ? ecpEntry.primaryCtaState : 'CONTEXTUAL',
          },
        }
      : null,
    fixedElements: visualCase.overlaySelectors,
    sectionBoundaries: [],
    stateVariants: ['unauthenticated'],
    contentStressProfiles:
      visualCase.caseId === 'home'
        ? [...RICH_CONTENT_STRESS]
        : [...DEFAULT_STRESS],
    executionProfiles:
      visualCase.caseId === 'home'
        ? ['default', 'text_zoom', 'font_load_transition', 'reduced_motion', 'safe_area']
        : ['default', 'reduced_motion'],
    outputBehaviour: { screen: true, print: false, pdf: false, sharedImage: false },
    canonicalBaseline: 'none',
    baselineApproval: null,
    sourceOwnerFiles: ecpEntry ? ecpEntry.ownerFiles : [visualCase.route],
  };
}

/* ── Manifest ──────────────────────────────────────────────────────── */

export const M55_ECP_SURFACES: readonly SurfaceManifestEntry[] =
  M55_EXPERIENCE_ROUTE_REGISTRY.map(ecpEntryToSurface);

export const M55_PREMIUM_STATE_SURFACES: readonly SurfaceManifestEntry[] =
  PREMIUM_EXPERIENCE_STATE_REGISTRY.map(premiumStateToSurface);

export const M55_PREMIUM_CAPTURE_SURFACES: readonly SurfaceManifestEntry[] =
  PREMIUM_EXPERIENCE_CAPTURE_CASES.map(premiumCaptureToSurface);

export const M55_COMMERCIAL_VISUAL_SURFACES: readonly SurfaceManifestEntry[] =
  COMMERCIAL_VISUAL_CASES.map(visualCaseToSurface);

export const M55_COMMERCIAL_QUALITY_MANIFEST: SurfaceManifest = {
  schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION,
  projectId: M55_QUALITY_PROJECT_ID,
  entries: [
    ...M55_ECP_SURFACES,
    ...M55_PREMIUM_STATE_SURFACES,
    ...M55_PREMIUM_CAPTURE_SURFACES,
    ...M55_COMMERCIAL_VISUAL_SURFACES,
  ],
};

export const M55_REGISTRATION_COUNTS = {
  ecpEntries: M55_ECP_SURFACES.length,
  premiumStates: M55_PREMIUM_STATE_SURFACES.length,
  premiumCaptures: M55_PREMIUM_CAPTURE_SURFACES.length,
  commercialVisualCases: M55_COMMERCIAL_VISUAL_SURFACES.length,
  total: M55_COMMERCIAL_QUALITY_MANIFEST.entries.length,
} as const;

/**
 * Deterministic browser-gate subset: public, unauthenticated, concrete ECP
 * routes plus registered commercial visual cases that need no seeded funnel
 * state. HOME continuous responsive execution uses the shared runner via
 * e2e/home-continuous-responsive.spec.ts (planCases + measureCommercialSurface).
 */
export const M55_BROWSER_SMOKE_SURFACE_IDS: readonly string[] = [
  ...M55_EXPERIENCE_ROUTE_REGISTRY.filter(
    (entry) => isBrowserExecutableEcpEntry(entry) && entry.shell === 'public',
  ).map((entry) => `${M55_QUALITY_PROJECT_ID}:ecp.${entry.id}`),
  ...COMMERCIAL_VISUAL_CASES.filter((visualCase) => visualCase.setup === 'none').map(
    (visualCase) => `${M55_QUALITY_PROJECT_ID}:visual.${visualCase.caseId}`,
  ),
];
