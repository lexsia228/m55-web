/**
 * Intentionally broken measurement fixtures.
 *
 * Each fixture starts from a healthy snapshot and injects exactly one of the
 * defect classes the commercial review found, so the gate is proven to reject
 * that class rather than merely to pass today's pages. Fixtures run through
 * `checkMeasuredPage`, the same judgement real pages use.
 */
import type {
  MeasuredElement,
  MeasuredOverlay,
  MeasuredPage,
  MeasuredRect,
  QualityFailure,
} from './commercialVisualQualityChecks';
import type { CommercialVisualCase, ProtectedRole } from './commercialVisualQualityContract';

function rect(left: number, top: number, width: number, height: number): MeasuredRect {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function element(
  selector: string,
  role: ProtectedRole,
  box: MeasuredRect,
  overrides: Partial<MeasuredElement> = {},
): MeasuredElement {
  return {
    selector,
    role,
    present: true,
    rect: box,
    scrollWidth: Math.round(box.width),
    scrollHeight: Math.round(box.height),
    clientWidth: Math.round(box.width),
    clientHeight: Math.round(box.height),
    clippedByAncestor: null,
    foreground: [26, 26, 26],
    background: [255, 255, 255],
    fontSizePx: 16,
    fontWeight: 400,
    hasVisibleFocusIndicator: role === 'cta' ? true : null,
    stageWidth: role === 'desktop_content' ? box.width + 40 : null,
    ...overrides,
  };
}

const HEALTHY_MOBILE_WIDTH = 390;
const HEALTHY_MOBILE_HEIGHT = 844;

/** A page with no defects. Every fixture below is this snapshot plus one defect. */
export function healthyMobilePage(): MeasuredPage {
  return {
    caseId: 'fixture',
    route: '/fixture',
    scrollState: 'top',
    viewportWidth: HEALTHY_MOBILE_WIDTH,
    viewportHeight: HEALTHY_MOBILE_HEIGHT,
    documentScrollWidth: HEALTHY_MOBILE_WIDTH,
    documentClientWidth: HEALTHY_MOBILE_WIDTH,
    scrollContainers: [
      {
        label: 'html',
        overflowX: 'visible',
        scrollWidth: HEALTHY_MOBILE_WIDTH,
        clientWidth: HEALTHY_MOBILE_WIDTH,
        isPageLevel: true,
      },
    ],
    overflowingElements: [],
    elements: [
      element('[data-fixture="heading"]', 'heading', rect(16, 80, 358, 96)),
      element('[data-fixture="copy"]', 'copy', rect(16, 200, 358, 120)),
      element('[data-fixture="cta"]', 'cta', rect(16, 360, 200, 48)),
    ],
    overlays: [],
    coVisibleGroups: [],
  };
}

/** A desktop page with no defects, used by the desktop adaptation fixture. */
export function healthyDesktopPage(): MeasuredPage {
  return {
    ...healthyMobilePage(),
    viewportWidth: 1280,
    viewportHeight: 900,
    documentScrollWidth: 1280,
    documentClientWidth: 1280,
    scrollContainers: [
      { label: 'html', overflowX: 'visible', scrollWidth: 1280, clientWidth: 1280, isPageLevel: true },
    ],
    elements: [
      element('[data-fixture="heading"]', 'heading', rect(320, 80, 640, 72)),
      element('[data-fixture="column"]', 'desktop_content', rect(320, 180, 640, 600), {
        stageWidth: 1260,
      }),
    ],
  };
}

export type BrokenFixture = {
  id: string;
  /** The reviewed defect this fixture reproduces. */
  defect: string;
  expectedRule: QualityFailure['rule'];
  page: MeasuredPage;
};

/** The governed case fixtures are judged against: all targets required, nothing exempt. */
export function fixtureCase(page: MeasuredPage): CommercialVisualCase {
  return {
    caseId: 'fixture',
    route: '/fixture',
    setup: 'none',
    readySelector: '[data-fixture="heading"]',
    findingIds: [],
    protectedTargets: page.elements.map((e) => ({
      selector: e.selector,
      role: e.role,
      findingIds: [],
    })),
    overlaySelectors: page.overlays.map((o) => o.selector),
    mobileCoVisibleGroups: page.coVisibleGroups.map((g) => ({
      groupId: g.groupId,
      selectors: [...g.selectors],
      findingIds: [],
    })),
  };
}

function withElement(
  page: MeasuredPage,
  selector: string,
  patch: Partial<MeasuredElement>,
): MeasuredPage {
  return {
    ...page,
    elements: page.elements.map((e) => (e.selector === selector ? { ...e, ...patch } : e)),
  };
}

function bottomOverlay(overrides: Partial<MeasuredOverlay> = {}): MeasuredOverlay {
  return {
    selector: '[data-fixture="floating-cta"]',
    present: true,
    visible: true,
    position: 'fixed',
    rect: rect(16, 350, 358, 64),
    anchoredToBottom: true,
    safeAreaCompensated: true,
    ...overrides,
  };
}

export function brokenFixtures(): readonly BrokenFixture[] {
  const overflowingHeading = (() => {
    const base = healthyMobilePage();
    const box = rect(16, 80, 420, 96);
    return {
      ...withElement(base, '[data-fixture="heading"]', { rect: box, scrollWidth: 420, clientWidth: 420 }),
      documentScrollWidth: 436,
      overflowingElements: [
        { description: 'h1[data-fixture="heading"]', left: box.left, right: box.right },
      ],
    } satisfies MeasuredPage;
  })();

  const bottomClipped = withElement(healthyMobilePage(), '[data-fixture="copy"]', {
    scrollHeight: 240,
    clientHeight: 120,
  });

  const fixedCtaCoveringText = (() => {
    const base = healthyMobilePage();
    return { ...base, overlays: [bottomOverlay()] } satisfies MeasuredPage;
  })();

  const lowContrastPremiumText = withElement(healthyMobilePage(), '[data-fixture="copy"]', {
    foreground: [150, 150, 150],
    background: [255, 255, 255],
  });

  const narrowDesktopContent = (() => {
    const base = healthyDesktopPage();
    return withElement(base, '[data-fixture="column"]', {
      rect: rect(500, 180, 280, 600),
      scrollWidth: 280,
      clientWidth: 280,
      stageWidth: 300,
    });
  })();

  const planComparisonPushedBelowFold = (() => {
    const base = healthyMobilePage();
    const light = element('[data-fixture="plan-light"]', 'copy', rect(16, 200, 358, 900));
    const full = element('[data-fixture="plan-full"]', 'copy', rect(16, 1140, 358, 300));
    return {
      ...base,
      elements: [...base.elements, light, full],
      coVisibleGroups: [
        {
          groupId: 'plan-comparison',
          selectors: [light.selector, full.selector],
          rects: [light.rect, full.rect],
        },
      ],
    } satisfies MeasuredPage;
  })();

  return [
    {
      id: 'right_edge_heading_overflow',
      defect: 'mobile hero headline runs past the right edge',
      expectedRule: 'horizontal_overflow',
      page: overflowingHeading,
    },
    {
      id: 'bottom_clipped_content',
      defect: 'supporting copy is cut off at the bottom of its container',
      expectedRule: 'clipped_text',
      page: bottomClipped,
    },
    {
      id: 'fixed_cta_covers_text',
      defect: 'fixed CTA sits on top of an action the reader has not scrolled past',
      expectedRule: 'overlay_covers_protected',
      page: fixedCtaCoveringText,
    },
    {
      id: 'low_contrast_premium_text',
      defect: 'Premium bridge text falls below the contrast floor',
      expectedRule: 'contrast_below_minimum',
      page: lowContrastPremiumText,
    },
    {
      id: 'narrow_desktop_content',
      defect: 'desktop shows a mobile-width card centred in empty space',
      expectedRule: 'desktop_content_too_narrow',
      page: narrowDesktopContent,
    },
    {
      id: 'plan_comparison_below_oversized_card',
      defect: 'the second plan is pushed below the fold by an oversized first card',
      expectedRule: 'mobile_group_not_co_visible',
      page: planComparisonPushedBelowFold,
    },
  ];
}
