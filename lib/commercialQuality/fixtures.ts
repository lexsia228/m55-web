/**
 * Reusable negative fixtures.
 *
 * Each fixture is a real manifest / measured-surface / promotion structure that
 * the production validators evaluate. Nothing here passes by matching a string
 * marker: a fixture is accepted only when the real checker emits the declared
 * failure code.
 *
 * Adapter negatives are evaluated via `probeAdapterNegative` from the M55
 * manifest adapter (dynamic require — engine must not statically import M55).
 */
import { createRequire } from 'node:module';

import { evaluatePromotion, GENERATOR_AUTHORITY, type PromotionRequest } from './approvalPack';
import type { ApprovalRecordStore, ResolvedApprovalRecord } from './approvalRecords';
import {
  checkAccessibilityInvariants,
  checkLayoutInvariants,
  checkSemanticInvariants,
  type NeighborContext,
} from './layoutInvariants';
import { validateSurfaceManifest } from './surfaceManifest';
import {
  COMMERCIAL_QUALITY_SCHEMA_VERSION,
  type CommercialQualityFailureCode,
  type ContentStressProfile,
  type MeasuredNode,
  type MeasuredRect,
  type MeasuredSurface,
  type SurfaceManifest,
  type SurfaceManifestEntry,
} from './types';

export function rect(
  top: number,
  left: number,
  width: number,
  height: number,
): MeasuredRect {
  return { top, left, width, height, right: left + width, bottom: top + height };
}

export function validEntry(
  overrides: Partial<SurfaceManifestEntry> = {},
): SurfaceManifestEntry {
  return {
    schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION,
    surfaceId: 'fixture:surface.alpha',
    runtimeStateId: 'alpha.default',
    route: '/alpha',
    routeIsPattern: false,
    setupId: 'fixture.setup.alpha',
    requiresAuthentication: false,
    preconditions: [],
    authorityReferences: [{ kind: 'route_registry', key: 'fixture.alpha' }],
    viewport: {
      minWidth: 320,
      maxWidth: 1440,
      widthStep: 16,
      breakpointNeighborhoods: [767, 768, 769],
      heightMatrix: [812],
    },
    protectedElements: [
      { selector: '[data-q="headline"]', role: 'heading', requireText: true },
      { selector: '[data-q="support"]', role: 'supporting', requireText: true },
    ],
    criticalCta: {
      selector: '[data-q="cta"]',
      minTargetPx: 44,
      ctaAuthority: { kind: 'cta_state', key: 'fixture.cta.primary' },
    },
    fixedElements: ['[data-q="header"]'],
    sectionBoundaries: [{ selector: '[data-q="next"]', position: 'following' }],
    stateVariants: ['unauthenticated'],
    contentStressProfiles: ['short_text', 'long_japanese_text'],
    executionProfiles: ['default'],
    outputBehaviour: { screen: true, print: false, pdf: false, sharedImage: false },
    canonicalBaseline: 'none',
    baselineApproval: null,
    sourceOwnerFiles: ['fixtures/alpha.tsx'],
    ...overrides,
  };
}

export function validManifest(
  entries: readonly SurfaceManifestEntry[] = [validEntry()],
): SurfaceManifest {
  return { schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION, projectId: 'fixture', entries };
}

function node(
  selector: string,
  role: MeasuredNode['role'],
  nodeRect: MeasuredRect,
  overrides: Partial<MeasuredNode> = {},
): MeasuredNode {
  return {
    selector,
    role,
    found: true,
    visible: true,
    opacity: 1,
    textLength: 24,
    rect: nodeRect,
    clippingAncestor: null,
    renderedLines: [{ text: 'あなたの傾向を短く整理します', rect: nodeRect }],
    accessibleName: role === 'cta' ? '無料で読み解く' : null,
    focusVisible: role === 'cta' ? true : null,
    ...overrides,
  };
}

export function validSurface(overrides: Partial<MeasuredSurface> = {}): MeasuredSurface {
  const container = rect(0, 0, 390, 700);
  return {
    surfaceId: 'fixture:surface.alpha',
    runtimeStateId: 'alpha.default',
    observedRoute: '/alpha',
    observedOrigin: 'http://127.0.0.1:3000',
    expectedOrigin: 'http://127.0.0.1:3000',
    pageAlive: true,
    viewport: { width: 390, height: 812 },
    innerWidth: 390,
    documentScrollWidth: 390,
    protectedNodes: [
      node('[data-q="headline"]', 'heading', rect(80, 20, 340, 96)),
      node('[data-q="support"]', 'supporting', rect(300, 20, 340, 48)),
    ],
    criticalCta: node('[data-q="cta"]', 'cta', rect(200, 20, 320, 56)),
    fixedNodes: [
      {
        selector: '[data-q="header"]',
        position: 'fixed',
        zIndex: '10',
        visible: true,
        rect: rect(0, 0, 390, 48),
      },
    ],
    boundaries: [
      { selector: '[data-q="next"]', position: 'following', found: true, rect: rect(700, 0, 390, 400) },
    ],
    containerRect: container,
    governedTextLength: 180,
    shellTextLength: 40,
    loadingIndicatorPresent: false,
    largestVerticalGapPx: 120,
    axeViolations: [],
    landmarks: ['main'],
    ...overrides,
  };
}

/* ── Fixture model ─────────────────────────────────────────────────── */

export type ManifestFixture = {
  id: string;
  kind: 'manifest';
  expectedCode: CommercialQualityFailureCode;
  manifest: SurfaceManifest;
};

export type SurfaceFixture = {
  id: string;
  kind: 'layout' | 'semantic' | 'accessibility';
  expectedCode: CommercialQualityFailureCode;
  entry: SurfaceManifestEntry;
  surface: MeasuredSurface;
  contentStressProfile: ContentStressProfile;
  neighbor?: NeighborContext;
};

export type PromotionFixture = {
  id: string;
  kind: 'promotion';
  expectedCode: CommercialQualityFailureCode;
  request: PromotionRequest;
  /** Injected store so stale-commit/digest/hash negatives fail for the right reason. */
  approvalStore?: ApprovalRecordStore;
};

/** Adapter negatives map to `probeAdapterNegative` kinds in the M55 adapter. */
export type AdapterFixture = {
  id: string;
  kind: 'adapter';
  expectedCode: CommercialQualityFailureCode;
};

const ADAPTER_PROBE_KIND_BY_FIXTURE_ID = {
  unregistered_route: 'unregistered_route',
  unregistered_runtime_state: 'unregistered_state',
  unknown_setup: 'unknown_setup',
  duplicate_ecp: 'duplicate_ecp',
} as const;

type AdapterProbeKind = (typeof ADAPTER_PROBE_KIND_BY_FIXTURE_ID)[keyof typeof ADAPTER_PROBE_KIND_BY_FIXTURE_ID];

const require = createRequire(import.meta.url);

function probeAdapterNegativeForFixture(
  fixtureId: string,
): readonly CommercialQualityFailureCode[] {
  const kind = ADAPTER_PROBE_KIND_BY_FIXTURE_ID[
    fixtureId as keyof typeof ADAPTER_PROBE_KIND_BY_FIXTURE_ID
  ] as AdapterProbeKind | undefined;
  if (!kind) {
    throw new Error(`adapter fixture ${fixtureId} has no probeAdapterNegative mapping`);
  }
  const { probeAdapterNegative } = require('../m55/commercialUx/qualityControl/m55ManifestAdapter') as {
    probeAdapterNegative: (probeKind: AdapterProbeKind) => readonly { code: CommercialQualityFailureCode }[];
  };
  return probeAdapterNegative(kind).map((failure) => failure.code);
}

export function durablePromotionApprovalRecords(
  overrides: Partial<{
    sourceCommit: string;
    manifestDigest: string;
    candidateHashes: Readonly<Record<string, string>>;
    independentReviewRef: string;
    humanApprovalRef: string;
  }> = {},
): readonly ResolvedApprovalRecord[] {
  const sourceCommit = overrides.sourceCommit ?? 'commit-a';
  const manifestDigestValue = overrides.manifestDigest ?? 'digest-a';
  const candidateHashes = overrides.candidateHashes ?? { 'home-390.png': 'hash-a' };
  const independentReviewRef = overrides.independentReviewRef ?? 'codex-review-1';
  const humanApprovalRef = overrides.humanApprovalRef ?? 'human-approval-1';
  return [
    {
      approvalId: independentReviewRef,
      authorityType: 'independent_codex_review',
      sourceCommit,
      manifestDigest: manifestDigestValue,
      candidateHashes,
      decision: 'approve',
      recordedAt: '2026-07-30T00:00:00.000Z',
      recordProvenance: 'fixtures/codex-review.json',
    },
    {
      approvalId: humanApprovalRef,
      authorityType: 'human_commercial_approval',
      sourceCommit,
      manifestDigest: manifestDigestValue,
      candidateHashes,
      decision: 'approve',
      recordedAt: '2026-07-30T00:00:00.000Z',
      recordProvenance: 'fixtures/human-approval.json',
    },
  ];
}

function inMemoryApprovalStore(records: readonly ResolvedApprovalRecord[]): ApprovalRecordStore {
  const map = new Map(records.map((record) => [record.approvalId, record]));
  return {
    resolve: (approvalId) => map.get(approvalId) ?? null,
  };
}

/** Test helper mirroring approvalRecordStoreOf without importing approvalRecords. */
export function fixtureApprovalStoreOf(
  records: readonly ResolvedApprovalRecord[],
): ApprovalRecordStore {
  return inMemoryApprovalStore(records);
}

export const FIXTURE_DURABLE_APPROVAL_STORE = inMemoryApprovalStore(
  durablePromotionApprovalRecords(),
);

export type CommercialQualityFixture =
  | ManifestFixture
  | SurfaceFixture
  | PromotionFixture
  | AdapterFixture;

const GREEN_GATES = { geometryGreen: true, semanticGreen: true, accessibilityGreen: true };

function promotionRequest(overrides: Partial<PromotionRequest> = {}): PromotionRequest {
  return {
    surfaceId: 'fixture:surface.alpha',
    fromState: 'candidate',
    toState: 'human-approved',
    gates: GREEN_GATES,
    approval: {
      approvalAuthority: 'durable:approval-record-store',
      independentReviewRef: 'codex-review-1',
      humanApprovalRef: 'human-approval-1',
      approvedAt: '2026-07-30T00:00:00.000Z',
      sourceCommit: 'commit-a',
      manifestDigest: 'digest-a',
      candidateHashes: { 'home-390.png': 'hash-a' },
    },
    currentSourceCommit: 'commit-a',
    currentManifestDigest: 'digest-a',
    currentCandidateHashes: { 'home-390.png': 'hash-a' },
    ...overrides,
  };
}

/** The 18 governed negative fixtures. */
export const COMMERCIAL_QUALITY_NEGATIVE_FIXTURES: readonly CommercialQualityFixture[] = [
  {
    id: 'duplicate_surface',
    kind: 'manifest',
    expectedCode: 'MANIFEST_DUPLICATE_SURFACE_ID',
    manifest: validManifest([
      validEntry(),
      validEntry({ runtimeStateId: 'alpha.second', route: '/alpha-second' }),
    ]),
  },
  {
    id: 'unregistered_route',
    kind: 'adapter',
    expectedCode: 'ADAPTER_UNREGISTERED_ROUTE',
  },
  {
    id: 'unregistered_runtime_state',
    kind: 'adapter',
    expectedCode: 'ADAPTER_UNREGISTERED_STATE',
  },
  {
    id: 'unknown_setup',
    kind: 'adapter',
    expectedCode: 'SETUP_MISSING_FOR_SURFACE',
  },
  {
    id: 'duplicate_ecp',
    kind: 'adapter',
    expectedCode: 'MANIFEST_DUPLICATE_SURFACE_ID',
  },
  {
    id: 'missing_protected_element',
    kind: 'manifest',
    expectedCode: 'MANIFEST_MISSING_PROTECTED_ELEMENTS',
    manifest: validManifest([validEntry({ protectedElements: [] })]),
  },
  {
    id: 'clipped_protected_content',
    kind: 'layout',
    expectedCode: 'LAYOUT_ANCESTOR_CLIPPING',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({
      criticalCta: node('[data-q="cta"]', 'cta', rect(660, 20, 320, 56), {
        clippingAncestor: {
          selector: '[data-q="poster"]',
          rect: rect(0, 0, 390, 700),
          computed: {
            overflow: 'hidden',
            overflowX: 'hidden',
            overflowY: 'hidden',
            height: '700px',
            minHeight: '700px',
            maxHeight: 'none',
            position: 'relative',
            zIndex: 'auto',
            transform: 'none',
            display: 'block',
            alignItems: 'normal',
            justifyContent: 'normal',
            flex: '0 1 auto',
            gridTemplateRows: 'none',
            inset: 'auto',
            width: '390px',
          },
        },
      }),
    }),
  },
  {
    id: 'horizontal_overflow',
    kind: 'layout',
    expectedCode: 'LAYOUT_HORIZONTAL_OVERFLOW',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({ documentScrollWidth: 430 }),
  },
  {
    id: 'fixed_element_obstruction',
    kind: 'layout',
    expectedCode: 'LAYOUT_FIXED_INTERSECTION',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({
      fixedNodes: [
        {
          selector: '[data-q="header"]',
          position: 'fixed',
          zIndex: '10',
          visible: true,
          rect: rect(180, 0, 390, 120),
        },
      ],
    }),
  },
  {
    id: 'undersized_cta',
    kind: 'layout',
    expectedCode: 'LAYOUT_CTA_TARGET_SIZE',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({
      criticalCta: node('[data-q="cta"]', 'cta', rect(200, 20, 320, 30)),
    }),
  },
  {
    id: 'route_drift',
    kind: 'layout',
    expectedCode: 'LAYOUT_ROUTE_DRIFT',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({ observedRoute: '/sign-in' }),
  },
  {
    id: 'state_drift',
    kind: 'layout',
    expectedCode: 'LAYOUT_STATE_DRIFT',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({ runtimeStateId: 'alpha.other' }),
  },
  {
    id: 'shell_only_page',
    kind: 'semantic',
    expectedCode: 'SEMANTIC_SHELL_ONLY_PAGE',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({ governedTextLength: 0, shellTextLength: 64 }),
  },
  {
    id: 'loading_state_accepted',
    kind: 'semantic',
    expectedCode: 'SEMANTIC_LOADING_STATE_ACCEPTED',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface({ loadingIndicatorPresent: true }),
  },
  {
    id: 'japanese_punctuation_only_line',
    kind: 'layout',
    expectedCode: 'LAYOUT_JAPANESE_ORPHAN_LINE',
    entry: validEntry(),
    contentStressProfile: 'punctuation_heavy_japanese',
    surface: validSurface({
      protectedNodes: [
        node('[data-q="headline"]', 'heading', rect(80, 20, 340, 96), {
          renderedLines: [
            { text: 'あなたの傾向を', rect: rect(80, 20, 340, 48) },
            { text: '。', rect: rect(128, 20, 340, 48) },
          ],
        }),
        node('[data-q="support"]', 'supporting', rect(300, 20, 340, 48)),
      ],
    }),
  },
  {
    id: 'neighbor_geometry_discontinuity',
    kind: 'layout',
    expectedCode: 'LAYOUT_NEIGHBOR_GEOMETRY_DISCONTINUITY',
    entry: validEntry(),
    contentStressProfile: 'short_text',
    surface: validSurface(),
    neighbor: {
      previousContentBottom: 20,
      previousWidth: 374,
      previousPassed: true,
      nextWidth: 406,
    },
  },
  {
    id: 'automatic_canonical_promotion',
    kind: 'promotion',
    expectedCode: 'PROMOTION_SELF_APPROVAL',
    request: promotionRequest({
      approval: {
        approvalAuthority: GENERATOR_AUTHORITY,
        independentReviewRef: 'machine-self',
        humanApprovalRef: 'machine-self-approved',
        approvedAt: '2026-07-30T00:00:00.000Z',
        sourceCommit: 'commit-a',
        manifestDigest: 'digest-a',
        candidateHashes: { 'home-390.png': 'hash-a' },
      },
    }),
  },
  {
    id: 'stale_source_commit',
    kind: 'promotion',
    expectedCode: 'PROMOTION_STALE_SOURCE_COMMIT',
    request: promotionRequest({ currentSourceCommit: 'commit-b' }),
    approvalStore: FIXTURE_DURABLE_APPROVAL_STORE,
  },
  {
    id: 'stale_manifest_digest',
    kind: 'promotion',
    expectedCode: 'PROMOTION_STALE_MANIFEST_DIGEST',
    request: promotionRequest({ currentManifestDigest: 'digest-b' }),
    approvalStore: FIXTURE_DURABLE_APPROVAL_STORE,
  },
  {
    id: 'altered_candidate_hash',
    kind: 'promotion',
    expectedCode: 'PROMOTION_ALTERED_CANDIDATE_HASH',
    request: promotionRequest({ currentCandidateHashes: { 'home-390.png': 'hash-b' } }),
    approvalStore: FIXTURE_DURABLE_APPROVAL_STORE,
  },
];

/** Run a fixture through the real validators and return emitted codes. */
export function evaluateFixture(
  fixture: CommercialQualityFixture,
): readonly CommercialQualityFailureCode[] {
  if (fixture.kind === 'manifest') {
    return validateSurfaceManifest(fixture.manifest).map((f) => f.code);
  }
  if (fixture.kind === 'promotion') {
    return evaluatePromotion({
      ...fixture.request,
      approvalStore: fixture.approvalStore ?? fixture.request.approvalStore,
    }).failures.map((f) => f.code);
  }
  if (fixture.kind === 'adapter') {
    return probeAdapterNegativeForFixture(fixture.id);
  }
  const neighbor: NeighborContext =
    fixture.neighbor ?? {
      previousContentBottom: null,
      previousWidth: null,
      previousPassed: null,
      nextWidth: null,
    };
  return [
    ...checkLayoutInvariants(fixture.surface, fixture.entry, neighbor),
    ...checkSemanticInvariants(
      fixture.surface,
      fixture.entry,
      fixture.contentStressProfile,
      neighbor,
    ),
    ...checkAccessibilityInvariants(fixture.surface, fixture.entry),
  ].map((f) => f.code);
}
