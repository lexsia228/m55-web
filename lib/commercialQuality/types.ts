/**
 * Repository-independent commercial quality control plane — schema v1 types.
 *
 * Ownership boundary: this directory must never import project authorities
 * (Product Truth, copy modules, route registries, selectors, Premium
 * authorities). Every project fact enters through a typed adapter.
 */

export const COMMERCIAL_QUALITY_SCHEMA_VERSION = 1 as const;

export type CommercialQualitySchemaVersion = typeof COMMERCIAL_QUALITY_SCHEMA_VERSION;

/** Canonical-baseline status. Exactly three values are legal. */
export const CANONICAL_BASELINE_STATES = ['none', 'candidate', 'human-approved'] as const;
export type CanonicalBaselineState = (typeof CANONICAL_BASELINE_STATES)[number];

/** Execution mode of a single governed case. */
export const EXECUTION_MODES = ['fresh_load', 'resize_down', 'resize_up'] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

/** Rendering/environment stress profile applied to a case. */
export const EXECUTION_PROFILES = [
  'default',
  'text_zoom',
  'font_load_transition',
  'reduced_motion',
  'safe_area',
] as const;
export type ExecutionProfile = (typeof EXECUTION_PROFILES)[number];

/** Data-driven content / runtime-state stress profiles. */
export const CONTENT_STRESS_PROFILES = [
  'short_text',
  'long_japanese_text',
  'punctuation_heavy_japanese',
  'manual_line_breaks',
  'max_dynamic_text',
  'empty',
  'loading',
  'error',
  'authenticated',
  'unauthenticated',
  'saved',
  'unsaved',
  'plan_variant',
  'state_transition',
] as const;
export type ContentStressProfile = (typeof CONTENT_STRESS_PROFILES)[number];

/** Role of a protected element. Drives which invariants apply. */
export const PROTECTED_ROLES = [
  'heading',
  'copy',
  'cta',
  'supporting',
  'media',
  'container',
] as const;
export type ProtectedRole = (typeof PROTECTED_ROLES)[number];

/** Required machine-checkable output behaviour of a surface. */
export type OutputBehaviour = {
  screen: boolean;
  print: boolean;
  pdf: boolean;
  sharedImage: boolean;
};

export type AuthorityReference = {
  /** Authority family, e.g. 'route_registry', 'product_truth', 'asset_ledger'. */
  kind: string;
  /** Stable identifier inside that authority. Never a copy string. */
  key: string;
};

export type ProtectedElement = {
  selector: string;
  role: ProtectedRole;
  /** Non-empty rendered text is required when true. */
  requireText: boolean;
  /** Minimum interactive target size in CSS px, when applicable. */
  minTargetPx?: number;
};

export type CriticalCta = {
  selector: string;
  minTargetPx: number;
  /** Authority that owns the CTA state/label. Mandatory for a critical CTA. */
  ctaAuthority: AuthorityReference;
};

export type SectionBoundary = {
  selector: string;
  /** 'preceding' must end above content; 'following' must start below it. */
  position: 'preceding' | 'following';
};

export type ViewportRange = {
  minWidth: number;
  maxWidth: number;
  widthStep: number;
  /** Explicit widths around breakpoints, tested in addition to the sweep. */
  breakpointNeighborhoods: readonly number[];
  heightMatrix: readonly number[];
};

export type BaselineApprovalRecord = {
  /** Authority that issued the approval. Machine self-approval is illegal. */
  approvalAuthority: string;
  /** Independent (non-implementer) review record identifier. */
  independentReviewRef: string;
  /** Human commercial approval record identifier. */
  humanApprovalRef: string;
  approvedAt: string;
  sourceCommit: string;
  manifestDigest: string;
  candidateHashes: Readonly<Record<string, string>>;
};

export type SurfaceManifestEntry = {
  schemaVersion: CommercialQualitySchemaVersion;
  /** Project-qualified stable surface ID, e.g. 'm55:public.home'. */
  surfaceId: string;
  /** Stable runtime-state ID within the surface. */
  runtimeStateId: string;
  /** Concrete route or governed route pattern. */
  route: string;
  /** True when `route` is a pattern (contains ':' or '*'). */
  routeIsPattern: boolean;
  /** Deterministic fixture/setup identity resolved by the project adapter. */
  setupId: string;
  requiresAuthentication: boolean;
  preconditions: readonly string[];
  authorityReferences: readonly AuthorityReference[];
  viewport: ViewportRange;
  protectedElements: readonly ProtectedElement[];
  criticalCta: CriticalCta | null;
  fixedElements: readonly string[];
  sectionBoundaries: readonly SectionBoundary[];
  /** Registered variants reachable from this surface/state. */
  stateVariants: readonly ContentStressProfile[];
  contentStressProfiles: readonly ContentStressProfile[];
  executionProfiles: readonly ExecutionProfile[];
  outputBehaviour: OutputBehaviour;
  canonicalBaseline: CanonicalBaselineState;
  baselineApproval: BaselineApprovalRecord | null;
  sourceOwnerFiles: readonly string[];
};

export type SurfaceManifest = {
  schemaVersion: CommercialQualitySchemaVersion;
  projectId: string;
  entries: readonly SurfaceManifestEntry[];
};

/* ── Failure codes ─────────────────────────────────────────────────── */

export const MANIFEST_FAILURE_CODES = [
  'MANIFEST_UNKNOWN_SCHEMA_VERSION',
  'MANIFEST_DUPLICATE_SURFACE_ID',
  'MANIFEST_DUPLICATE_ROUTE_STATE_IDENTITY',
  'MANIFEST_MISSING_SETUP',
  'MANIFEST_MISSING_PROTECTED_ELEMENTS',
  'MANIFEST_MISSING_CTA_AUTHORITY',
  'MANIFEST_INVALID_VIEWPORT_RANGE',
  'MANIFEST_MISSING_OUTPUT_BEHAVIOUR',
  'MANIFEST_CANDIDATE_MARKED_CANONICAL',
  'MANIFEST_APPROVED_BASELINE_WITHOUT_RECORD',
  'MANIFEST_MISSING_SOURCE_OWNER',
  'MANIFEST_MISSING_AUTHORITY_REFERENCE',
] as const;
export type ManifestFailureCode = (typeof MANIFEST_FAILURE_CODES)[number];

export const LAYOUT_FAILURE_CODES = [
  'LAYOUT_PROTECTED_ELEMENT_MISSING',
  'LAYOUT_PROTECTED_ELEMENT_HIDDEN',
  'LAYOUT_PROTECTED_ELEMENT_EMPTY',
  'LAYOUT_PROTECTED_ELEMENT_OUTSIDE_VIEWPORT',
  'LAYOUT_ANCESTOR_CLIPPING',
  'LAYOUT_HORIZONTAL_OVERFLOW',
  'LAYOUT_SECTION_COLLISION',
  'LAYOUT_FIXED_INTERSECTION',
  'LAYOUT_CTA_TARGET_SIZE',
  'LAYOUT_ROUTE_DRIFT',
  'LAYOUT_STATE_DRIFT',
  'LAYOUT_PAGE_NOT_ALIVE',
  'LAYOUT_UNAUTHORIZED_NAVIGATION',
  'LAYOUT_NEIGHBOR_GEOMETRY_DISCONTINUITY',
  'LAYOUT_JAPANESE_ORPHAN_LINE',
] as const;
export type LayoutFailureCode = (typeof LAYOUT_FAILURE_CODES)[number];

export const SEMANTIC_FAILURE_CODES = [
  'SEMANTIC_CTA_PARTIALLY_VISIBLE',
  'SEMANTIC_MISSING_SUPPORTING_CONTENT',
  'SEMANTIC_SHELL_ONLY_PAGE',
  'SEMANTIC_BLANK_SURFACE',
  'SEMANTIC_FIXED_CONTROL_OBSTRUCTION',
  'SEMANTIC_WRONG_ROUTE_STATE',
  'SEMANTIC_UNEXPECTED_WHITESPACE',
  'SEMANTIC_NEIGHBOR_DISCONTINUITY',
  'SEMANTIC_LOADING_STATE_ACCEPTED',
] as const;
export type SemanticFailureCode = (typeof SEMANTIC_FAILURE_CODES)[number];

export const ACCESSIBILITY_FAILURE_CODES = [
  'A11Y_SERIOUS_VIOLATION',
  'A11Y_MISSING_ACCESSIBLE_NAME',
  'A11Y_FOCUS_NOT_VISIBLE',
  'A11Y_MISSING_LANDMARK',
  'A11Y_TARGET_SIZE',
] as const;
export type AccessibilityFailureCode = (typeof ACCESSIBILITY_FAILURE_CODES)[number];

export const PROMOTION_FAILURE_CODES = [
  'PROMOTION_GEOMETRY_NOT_GREEN',
  'PROMOTION_SEMANTIC_NOT_GREEN',
  'PROMOTION_ACCESSIBILITY_NOT_GREEN',
  'PROMOTION_MISSING_INDEPENDENT_REVIEW',
  'PROMOTION_MISSING_HUMAN_APPROVAL',
  'PROMOTION_STALE_SOURCE_COMMIT',
  'PROMOTION_STALE_MANIFEST_DIGEST',
  'PROMOTION_ALTERED_CANDIDATE_HASH',
  'PROMOTION_SELF_APPROVAL',
  'PROMOTION_DIRECT_CANDIDATE_ASSIGNMENT',
  'PROMOTION_UNKNOWN_APPROVAL_AUTHORITY',
] as const;
export type PromotionFailureCode = (typeof PROMOTION_FAILURE_CODES)[number];

export const ADAPTER_FAILURE_CODES = [
  'ADAPTER_UNREGISTERED_ROUTE',
  'ADAPTER_UNREGISTERED_STATE',
  'ADAPTER_DUPLICATE_IMPORTED_AUTHORITY',
  'ADAPTER_UNKNOWN_AUTHORITY_REFERENCE',
  'ADAPTER_MISSING_RUNTIME_STATE_CONTRACT',
] as const;
export type AdapterFailureCode = (typeof ADAPTER_FAILURE_CODES)[number];

export const SETUP_FAILURE_CODES = [
  'SETUP_UNKNOWN_ID',
  'SETUP_NO_EXECUTABLE_FUNCTION',
  'SETUP_ROUTE_MISMATCH',
  'SETUP_STATE_MISMATCH',
  'SETUP_STRESS_UNSUPPORTED',
  'SETUP_AUTH_WITHOUT_FIXTURE',
  'SETUP_MISSING_FOR_SURFACE',
] as const;
export type SetupFailureCode = (typeof SETUP_FAILURE_CODES)[number];

export type CommercialQualityFailureCode =
  | ManifestFailureCode
  | LayoutFailureCode
  | SemanticFailureCode
  | AccessibilityFailureCode
  | PromotionFailureCode
  | AdapterFailureCode
  | SetupFailureCode;

/* ── Measurement input (produced by a browser helper) ──────────────── */

export type MeasuredRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type MeasuredComputed = {
  overflow: string;
  overflowX: string;
  overflowY: string;
  height: string;
  minHeight: string;
  maxHeight: string;
  position: string;
  zIndex: string;
  transform: string;
  display: string;
  alignItems: string;
  justifyContent: string;
  flex: string;
  gridTemplateRows: string;
  inset: string;
  width: string;
};

export type MeasuredAncestor = {
  selector: string;
  rect: MeasuredRect;
  computed: MeasuredComputed;
};

/** One rendered line reconstructed from Range.getClientRects(). */
export type MeasuredRenderedLine = {
  text: string;
  rect: MeasuredRect;
};

export type MeasuredNode = {
  selector: string;
  role: ProtectedRole;
  found: boolean;
  visible: boolean;
  opacity: number;
  textLength: number;
  rect: MeasuredRect;
  /** Nearest ancestor that clips this node, when one exists. */
  clippingAncestor: MeasuredAncestor | null;
  renderedLines: readonly MeasuredRenderedLine[];
  accessibleName: string | null;
  focusVisible: boolean | null;
};

export type MeasuredOverlayNode = {
  selector: string;
  position: string;
  zIndex: string;
  visible: boolean;
  rect: MeasuredRect;
};

export type MeasuredBoundary = {
  selector: string;
  position: 'preceding' | 'following';
  found: boolean;
  rect: MeasuredRect;
};

export type MeasuredAxeViolation = {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  nodeCount: number;
  /** Failing node selectors, so a finding can be attributed to an owner. */
  targets: readonly string[];
  helpUrl: string;
};

export type MeasuredSurface = {
  surfaceId: string;
  runtimeStateId: string;
  /** Route actually observed in the browser. */
  observedRoute: string;
  observedOrigin: string;
  expectedOrigin: string;
  pageAlive: boolean;
  viewport: { width: number; height: number };
  innerWidth: number;
  documentScrollWidth: number;
  protectedNodes: readonly MeasuredNode[];
  criticalCta: MeasuredNode | null;
  fixedNodes: readonly MeasuredOverlayNode[];
  boundaries: readonly MeasuredBoundary[];
  /** Governed content container, used for content-bottom comparisons. */
  containerRect: MeasuredRect | null;
  governedTextLength: number;
  shellTextLength: number;
  loadingIndicatorPresent: boolean;
  /** Largest vertical gap between adjacent governed blocks. */
  largestVerticalGapPx: number;
  axeViolations: readonly MeasuredAxeViolation[];
  landmarks: readonly string[];
};

/* ── Normalized result ─────────────────────────────────────────────── */

export type InvariantFailure = {
  code: CommercialQualityFailureCode;
  selector: string | null;
  message: string;
  diagnostics: Readonly<Record<string, unknown>>;
};

export type CasePlan = {
  surfaceId: string;
  runtimeStateId: string;
  route: string;
  setupId: string;
  viewport: { width: number; height: number };
  mode: ExecutionMode;
  profile: ExecutionProfile;
  contentStressProfile: ContentStressProfile;
};

export type NormalizedCaseResult = {
  surfaceId: string;
  runtimeStateId: string;
  route: string;
  viewport: { width: number; height: number };
  mode: ExecutionMode;
  profile: ExecutionProfile;
  contentStressProfile: ContentStressProfile;
  passed: boolean;
  failures: readonly InvariantFailure[];
  durationMs: number;
  setupId: string;
  sourceCommit: string;
};

export type GateSummary = {
  geometryGreen: boolean;
  semanticGreen: boolean;
  accessibilityGreen: boolean;
};
