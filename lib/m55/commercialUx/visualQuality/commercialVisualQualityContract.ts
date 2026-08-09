/**
 * Commercial responsive quality contract.
 *
 * Single typed authority for the governed route/state × viewport matrix and the
 * protected content that must never be clipped, overflowed, covered or rendered
 * below the minimum contrast. The E2E collector, the pure checker and the
 * verifier all read this file, so a defect class cannot be silently dropped from
 * one of them.
 *
 * Human-observed P0/P1 findings are recorded as `findingIds` so each governed
 * case states which reviewed defect it keeps closed.
 */

/** Viewport widths required by the commercial review. */
export const COMMERCIAL_VIEWPORTS = [320, 360, 390, 430, 768, 1024, 1280, 1440] as const;
export type CommercialViewport = (typeof COMMERCIAL_VIEWPORTS)[number];

/** Viewport heights paired with each width, chosen to expose vertical clipping. */
export const COMMERCIAL_VIEWPORT_HEIGHTS: Record<CommercialViewport, number> = {
  320: 568,
  360: 640,
  390: 844,
  430: 932,
  768: 1024,
  1024: 768,
  1280: 900,
  1440: 900,
};

export const COMMERCIAL_MOBILE_MAX_WIDTH = 430 as const;
export const COMMERCIAL_DESKTOP_MIN_WIDTH = 1024 as const;

/** Reviewed commercial visual findings this gate keeps closed. */
export const COMMERCIAL_VISUAL_FINDINGS = {
  'P0-1': '/home mobile hero headline horizontal clipping',
  'P0-2': '/home mobile hero supporting copy and CTA-area vertical clipping',
  'P0-3': '/home Premium headline horizontal overflow',
  'P0-4': 'fixed/sticky Premium CTA, accessibility control and back-to-top overlap',
  'P0-5': 'dark Premium bridge text and control contrast',
  'P1-3': '/dtr/lp payment-prep checkout text contrast',
  'P1-6': 'desktop questionnaire excessively narrow mobile-column presentation',
  'P1-7': 'Light and Full comparison not visible together on mobile',
  'P1-8': 'Premium CTA hierarchy emphasizes answering work instead of outcome',
  'P1-9': '/core prerequisite surface loses Home/M55 visual continuity',
  'P1-10': 'canonical Free entry CTA wording is inconsistent',
} as const;

export type CommercialVisualFindingId = keyof typeof COMMERCIAL_VISUAL_FINDINGS;

/** Minimum WCAG-style contrast ratios applied to governed text. */
export const CONTRAST_MIN_NORMAL_TEXT = 4.5 as const;
export const CONTRAST_MIN_LARGE_TEXT = 3 as const;
/** Large text threshold in CSS px (>=24px, or >=18.66px when bold). */
export const LARGE_TEXT_MIN_PX = 24 as const;
export const LARGE_TEXT_BOLD_MIN_PX = 18.66 as const;
export const LARGE_TEXT_BOLD_MIN_WEIGHT = 700 as const;

/**
 * Desktop content must be an intentional adaptation, not a mobile column centred
 * in empty space. The reviewed defect was a reading column that stayed the same
 * ~420px at 1024, 1280 and 1440, so the contract is expressed as an absolute
 * column floor plus a requirement that the surrounding stage fills the width.
 */
export const DESKTOP_MIN_CONTENT_WIDTH_PX = 560 as const;
export const DESKTOP_MIN_STAGE_WIDTH_RATIO = 0.96 as const;

/** Interactive targets must stay reachable with one thumb on small phones. */
export const MIN_INTERACTIVE_TARGET_PX = 40 as const;
/** HOME hero CTA floor (commercial visual closure — thumb target). */
export const HOME_HERO_CTA_MIN_HEIGHT_PX = 44 as const;

/** Fixed public navigation — checked for protected-target intersection. */
export const PUBLIC_FIXED_HEADER_SELECTOR =
  '[data-m55-public-shell] > header, [data-m55-public-shell] header' as const;

export type ProtectedRole =
  /** Headline that must be fully visible and unclipped. */
  | 'heading'
  /** Primary action that must be fully visible, unclipped and uncovered. */
  | 'cta'
  /** Body copy that must be fully visible and unclipped. */
  | 'copy'
  /** Container whose desktop width must be an intentional adaptation. */
  | 'desktop_content';

export type ProtectedTarget = {
  /** Stable selector, preferably a data-testid attribute selector. */
  selector: string;
  role: ProtectedRole;
  findingIds: readonly CommercialVisualFindingId[];
  /** Viewports where the target is expected to be absent (optional surfaces). */
  absentOn?: readonly CommercialViewport[];
  /** Skip the contrast rule when the target has no own text node. */
  contrastExempt?: boolean;
};

export type CommercialVisualCase = {
  caseId: string;
  route: string;
  /** Named setup executed by the collector before measuring. */
  setup: 'none' | 'core_free_result' | 'premium_questionnaire' | 'premium_plans' | 'premium_checkout';
  /** Element that must exist before the page counts as ready. */
  readySelector: string;
  protectedTargets: readonly ProtectedTarget[];
  /**
   * Selectors expected to be fixed or sticky. Each is checked for overlap with
   * every protected target and for bottom safe-area compensation.
   */
  overlaySelectors: readonly string[];
  /**
   * Groups whose members must all be inside the viewport together on mobile,
   * so a comparison cannot be pushed below an oversized first card.
   */
  mobileCoVisibleGroups: readonly { groupId: string; selectors: readonly string[]; findingIds: readonly CommercialVisualFindingId[] }[];
  findingIds: readonly CommercialVisualFindingId[];
};

const HOME_TARGETS: readonly ProtectedTarget[] = [
  { selector: '[data-testid="m55-home-hero-title"]', role: 'heading', findingIds: ['P0-1'] },
  { selector: '[data-testid="m55-home-hero-support"]', role: 'copy', findingIds: ['P0-2'] },
  // Attribute selector so either the intake or the /core variant satisfies it.
  { selector: '[data-m55-hero-cta="true"]', role: 'cta', findingIds: ['P0-2', 'P1-10'] },
  { selector: '[data-testid="m55-home-premium-headline"]', role: 'heading', findingIds: ['P0-3'] },
];

export const COMMERCIAL_VISUAL_CASES: readonly CommercialVisualCase[] = [
  {
    caseId: 'home',
    route: '/home',
    setup: 'none',
    readySelector: '[data-testid="m55-home-hero"]',
    protectedTargets: HOME_TARGETS,
    overlaySelectors: [PUBLIC_FIXED_HEADER_SELECTOR, '[data-testid="m55-scroll-to-top"]'],
    mobileCoVisibleGroups: [],
    findingIds: ['P0-1', 'P0-2', 'P0-3', 'P0-4', 'P1-10'],
  },
  {
    caseId: 'core-prerequisite',
    route: '/core',
    setup: 'none',
    readySelector: '[data-testid="m55-core-locked"]',
    protectedTargets: [
      { selector: '[data-testid="m55-core-prerequisite-headline"]', role: 'heading', findingIds: ['P1-9'] },
      { selector: '[data-testid="m55-core-start-intake"]', role: 'cta', findingIds: ['P1-9', 'P1-10'] },
    ],
    overlaySelectors: [PUBLIC_FIXED_HEADER_SELECTOR, '[data-testid="m55-scroll-to-top"]'],
    mobileCoVisibleGroups: [],
    findingIds: ['P1-9', 'P1-10'],
  },
  {
    caseId: 'core-free-result',
    route: '/core',
    setup: 'core_free_result',
    readySelector: '[data-testid="m55-core-essence"]',
    protectedTargets: [
      { selector: '[data-testid="m55-premium-bridge-headline"]', role: 'heading', findingIds: ['P0-3', 'P0-5'] },
      { selector: '[data-testid="m55-premium-bridge-copy"]', role: 'copy', findingIds: ['P0-5'] },
      { selector: '[data-testid="m55-paid-bridge-primary"]', role: 'cta', findingIds: ['P0-4', 'P0-5', 'P1-8'] },
      {
        selector: '[data-testid="m55-free-to-paid-bridge"] h3',
        role: 'heading',
        findingIds: ['P0-5'],
      },
      {
        selector: '[data-testid="m55-premium-bridge-price"] + p',
        role: 'copy',
        findingIds: ['P0-5'],
      },
      {
        selector: '[data-testid="m55-paid-bridge-secondary"]',
        role: 'cta',
        findingIds: ['P0-5'],
      },
      {
        selector: '[data-testid="m55-paid-bridge-primary"] + p',
        role: 'copy',
        findingIds: ['P0-5'],
      },
      {
        selector: '[data-testid="m55-free-to-paid-bridge"] > p:last-child',
        role: 'copy',
        findingIds: ['P0-5'],
      },
    ],
    overlaySelectors: [
      PUBLIC_FIXED_HEADER_SELECTOR,
      '[data-testid="m55-scroll-to-top"]',
      '[data-testid="m55-premium-sticky-cta"]',
    ],
    mobileCoVisibleGroups: [],
    findingIds: ['P0-3', 'P0-4', 'P0-5', 'P1-8'],
  },
  {
    caseId: 'premium-questionnaire',
    route: '/dtr/lp',
    setup: 'premium_questionnaire',
    readySelector: '[data-testid="m55-paid-questionnaire-active"]',
    protectedTargets: [
      { selector: '[data-testid="m55-premium-question-headline"]', role: 'heading', findingIds: ['P1-6'] },
      {
        selector: '[data-m55-questionnaire-column="true"]',
        role: 'desktop_content',
        findingIds: ['P1-6'],
        contrastExempt: true,
      },
    ],
    overlaySelectors: [
      PUBLIC_FIXED_HEADER_SELECTOR,
      '[data-testid="m55-scroll-to-top"]',
      '[data-testid="m55-premium-sticky-cta"]',
    ],
    mobileCoVisibleGroups: [],
    findingIds: ['P1-6', 'P0-4'],
  },
  {
    caseId: 'premium-plans',
    route: '/dtr/lp',
    setup: 'premium_plans',
    readySelector: '[data-testid="m55-dtr-plan-selection"]',
    protectedTargets: [
      { selector: '[data-testid="m55-premium-plans-headline"]', role: 'heading', findingIds: ['P0-3'] },
      { selector: '[data-testid="m55-plan-compare-light"]', role: 'copy', findingIds: ['P1-7'], contrastExempt: true },
      { selector: '[data-testid="m55-plan-compare-full"]', role: 'copy', findingIds: ['P1-7'], contrastExempt: true },
    ],
    overlaySelectors: [
      PUBLIC_FIXED_HEADER_SELECTOR,
      '[data-testid="m55-scroll-to-top"]',
      '[data-testid="m55-premium-sticky-cta"]',
    ],
    mobileCoVisibleGroups: [
      {
        groupId: 'plan-comparison',
        selectors: ['[data-testid="m55-plan-compare-light"]', '[data-testid="m55-plan-compare-full"]'],
        findingIds: ['P1-7'],
      },
    ],
    findingIds: ['P0-3', 'P0-4', 'P1-7'],
  },
  {
    caseId: 'premium-checkout',
    route: '/dtr/lp',
    setup: 'premium_checkout',
    readySelector: '[data-m55-paid-phase="checkout"]',
    protectedTargets: [
      {
        selector: '[data-m55-paid-phase="checkout"] > p:first-of-type',
        role: 'copy',
        findingIds: ['P1-3'],
      },
      {
        selector: '[data-m55-paid-phase="checkout"] > h3',
        role: 'heading',
        findingIds: ['P1-3'],
      },
      {
        selector: '[data-m55-paid-phase="checkout"] .m55-lp-cta-btn',
        role: 'cta',
        findingIds: ['P1-3'],
      },
    ],
    overlaySelectors: [
      PUBLIC_FIXED_HEADER_SELECTOR,
      '[data-testid="m55-scroll-to-top"]',
      '[data-testid="m55-premium-sticky-cta"]',
    ],
    mobileCoVisibleGroups: [],
    findingIds: ['P1-3'],
  },
  {
    caseId: 'pricing',
    route: '/pricing',
    setup: 'none',
    readySelector: '[data-testid="m55-pricing-plan-light"]',
    protectedTargets: [
      { selector: '[data-testid="m55-pricing-headline"]', role: 'heading', findingIds: ['P0-3'] },
      { selector: '[data-testid="m55-pricing-plan-light"]', role: 'copy', findingIds: ['P1-7'], contrastExempt: true },
      { selector: '[data-testid="m55-pricing-plan-full"]', role: 'copy', findingIds: ['P1-7'], contrastExempt: true },
    ],
    overlaySelectors: [PUBLIC_FIXED_HEADER_SELECTOR, '[data-testid="m55-scroll-to-top"]'],
    mobileCoVisibleGroups: [],
    findingIds: ['P0-3'],
  },
];

export function commercialVisualCaseById(caseId: string): CommercialVisualCase | undefined {
  return COMMERCIAL_VISUAL_CASES.find((c) => c.caseId === caseId);
}

/** Every reviewed finding must be owned by at least one governed case. */
export function findingCoverageGaps(): CommercialVisualFindingId[] {
  const covered = new Set<string>();
  for (const c of COMMERCIAL_VISUAL_CASES) {
    for (const id of c.findingIds) covered.add(id);
    for (const t of c.protectedTargets) for (const id of t.findingIds) covered.add(id);
    for (const g of c.mobileCoVisibleGroups) for (const id of g.findingIds) covered.add(id);
  }
  return (Object.keys(COMMERCIAL_VISUAL_FINDINGS) as CommercialVisualFindingId[]).filter(
    (id) => !covered.has(id),
  );
}
