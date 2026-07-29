/**
 * Pure commercial responsive quality checker.
 *
 * The browser only measures; every judgement lives here as a total function over
 * a plain `MeasuredPage` snapshot. Real pages and intentionally broken fixtures
 * therefore run through the identical rules, so the gate cannot pass a defect
 * class in CI that a synthetic fixture proves it rejects.
 */
import {
  CONTRAST_MIN_LARGE_TEXT,
  CONTRAST_MIN_NORMAL_TEXT,
  COMMERCIAL_DESKTOP_MIN_WIDTH,
  COMMERCIAL_MOBILE_MAX_WIDTH,
  DESKTOP_MIN_CONTENT_WIDTH_PX,
  DESKTOP_MIN_STAGE_WIDTH_RATIO,
  LARGE_TEXT_BOLD_MIN_PX,
  LARGE_TEXT_BOLD_MIN_WEIGHT,
  LARGE_TEXT_MIN_PX,
  MIN_INTERACTIVE_TARGET_PX,
  type CommercialVisualCase,
  type ProtectedRole,
} from './commercialVisualQualityContract';

/** Sub-pixel tolerance: browsers report fractional layout widths. */
export const GEOMETRY_TOLERANCE_PX = 1 as const;

export type MeasuredRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type MeasuredElement = {
  selector: string;
  role: ProtectedRole;
  present: boolean;
  rect: MeasuredRect | null;
  /** Layout box vs content box, used to detect clipped text. */
  scrollWidth: number | null;
  scrollHeight: number | null;
  clientWidth: number | null;
  clientHeight: number | null;
  /** Description of the ancestor clipping this element, or null when unclipped. */
  clippedByAncestor: string | null;
  /** Foreground / effective background colour as sRGB 0-255 triplets. */
  foreground: [number, number, number] | null;
  background: [number, number, number] | null;
  fontSizePx: number | null;
  fontWeight: number | null;
  /**
   * Focus ring measured after programmatic focus, for interactive roles. `null`
   * when the control cannot take focus at all (a disabled loading placeholder).
   */
  hasVisibleFocusIndicator: boolean | null;
  /**
   * Width of the nearest full-bleed stage around a `desktop_content` target, used
   * to distinguish a deliberate reading column from a card floating in emptiness.
   */
  stageWidth: number | null;
};

export type MeasuredOverlay = {
  selector: string;
  present: boolean;
  /** A control that is faded out or hidden from assistive tech covers nothing. */
  visible: boolean;
  position: 'fixed' | 'sticky' | 'static' | 'absolute' | 'relative' | null;
  rect: MeasuredRect | null;
  /** True when the overlay is pinned to the bottom band of the viewport. */
  anchoredToBottom: boolean;
  /**
   * True when a CSS rule matching this element declares bottom-edge spacing that
   * references `env(safe-area-inset-bottom)`. Computed styles resolve `env()` to
   * pixels, so the declaration text is the only honest evidence.
   */
  safeAreaCompensated: boolean;
};

export type MeasuredCoVisibleGroup = {
  groupId: string;
  selectors: readonly string[];
  rects: readonly (MeasuredRect | null)[];
};

/**
 * A container that scrolls or clips horizontally. Shells that move scrolling out
 * of `document` into an inner element are measured here too, so overflow cannot
 * hide inside a nested scrollport.
 */
export type MeasuredScrollContainer = {
  label: string;
  overflowX: string;
  scrollWidth: number;
  clientWidth: number;
  /** True for `html` and `body`, whose clipping applies to the whole page. */
  isPageLevel: boolean;
};

/** An element whose box extends past the viewport's horizontal edges. */
export type MeasuredOverflowingElement = {
  description: string;
  left: number;
  right: number;
};

/**
 * `top` is the state the reader lands in, where nothing may cover a headline or
 * an action. `engaged` is mid-scroll, where a floating control legitimately
 * passes over running content but still must not collide with the other
 * controls sharing the floating rail.
 */
export type MeasuredScrollState = 'top' | 'engaged';

export type MeasuredPage = {
  caseId: string;
  route: string;
  scrollState: MeasuredScrollState;
  viewportWidth: number;
  viewportHeight: number;
  documentScrollWidth: number;
  documentClientWidth: number;
  scrollContainers: readonly MeasuredScrollContainer[];
  /**
   * Elements proven to sit outside the viewport. This is the evidence that
   * page-level clipping is concealing a real defect rather than implementing an
   * intentional scroll architecture.
   */
  overflowingElements: readonly MeasuredOverflowingElement[];
  elements: readonly MeasuredElement[];
  overlays: readonly MeasuredOverlay[];
  coVisibleGroups: readonly MeasuredCoVisibleGroup[];
};

export type QualityFailure = {
  caseId: string;
  viewportWidth: number;
  scrollState: MeasuredScrollState;
  rule:
    | 'horizontal_overflow'
    | 'overflow_x_concealment'
    | 'missing_protected_target'
    | 'outside_viewport'
    | 'clipped_text'
    | 'overlay_covers_protected'
    | 'overlay_covers_overlay'
    | 'safe_area_missing'
    | 'contrast_below_minimum'
    | 'focus_indicator_missing'
    | 'interactive_target_too_small'
    | 'desktop_content_too_narrow'
    | 'mobile_group_not_co_visible';
  selector: string;
  detail: string;
};

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(
  foreground: [number, number, number],
  background: [number, number, number],
): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function requiredContrastFor(fontSizePx: number | null, fontWeight: number | null): number {
  if (fontSizePx === null) return CONTRAST_MIN_NORMAL_TEXT;
  if (fontSizePx >= LARGE_TEXT_MIN_PX) return CONTRAST_MIN_LARGE_TEXT;
  if (
    fontSizePx >= LARGE_TEXT_BOLD_MIN_PX &&
    (fontWeight ?? 400) >= LARGE_TEXT_BOLD_MIN_WEIGHT
  ) {
    return CONTRAST_MIN_LARGE_TEXT;
  }
  return CONTRAST_MIN_NORMAL_TEXT;
}

function rectsOverlap(a: MeasuredRect, b: MeasuredRect): boolean {
  return (
    a.left < b.right - GEOMETRY_TOLERANCE_PX &&
    a.right > b.left + GEOMETRY_TOLERANCE_PX &&
    a.top < b.bottom - GEOMETRY_TOLERANCE_PX &&
    a.bottom > b.top + GEOMETRY_TOLERANCE_PX
  );
}

/**
 * Judge one measured page. Returns every violated rule so a review sees the
 * complete defect set rather than only the first failure.
 */
export function checkMeasuredPage(
  page: MeasuredPage,
  governedCase: CommercialVisualCase,
): QualityFailure[] {
  const failures: QualityFailure[] = [];
  const vw = page.viewportWidth;
  const push = (rule: QualityFailure['rule'], selector: string, detail: string) =>
    failures.push({
      caseId: page.caseId,
      viewportWidth: vw,
      scrollState: page.scrollState,
      rule,
      selector,
      detail,
    });

  if (page.documentScrollWidth > vw + GEOMETRY_TOLERANCE_PX) {
    push(
      'horizontal_overflow',
      ':root',
      `document scrollWidth ${page.documentScrollWidth} exceeds viewport ${vw}`,
    );
  }

  // Overflow must not survive inside a nested scrollport either.
  for (const container of page.scrollContainers) {
    if (container.scrollWidth > container.clientWidth + GEOMETRY_TOLERANCE_PX) {
      push(
        'horizontal_overflow',
        container.label,
        `scrollWidth ${container.scrollWidth} exceeds clientWidth ${container.clientWidth}`,
      );
    }
  }

  for (const element of page.overflowingElements) {
    push(
      'horizontal_overflow',
      element.description,
      `box [${element.left.toFixed(1)}, ${element.right.toFixed(1)}] extends past viewport ${vw}`,
    );
  }

  /*
   * Page-level clipping is only a defect when it is actually hiding content.
   * A shell that intentionally moves scrolling into an inner container clips at
   * the page level by design, so clipping alone is not evidence of concealment.
   */
  if (page.overflowingElements.length > 0) {
    for (const container of page.scrollContainers) {
      if (!container.isPageLevel) continue;
      if (container.overflowX === 'hidden' || container.overflowX === 'clip') {
        push(
          'overflow_x_concealment',
          container.label,
          `overflow-x "${container.overflowX}" conceals ${page.overflowingElements.length} element(s) outside the viewport`,
        );
      }
    }
  }

  const presentProtected: MeasuredElement[] = [];

  for (const element of page.elements) {
    const target = governedCase.protectedTargets.find((t) => t.selector === element.selector);
    const expectedAbsent = target?.absentOn?.includes(vw as never) ?? false;

    if (!element.present) {
      if (!expectedAbsent) {
        push('missing_protected_target', element.selector, 'protected target is not rendered');
      }
      continue;
    }
    if (!element.rect) {
      push('missing_protected_target', element.selector, 'protected target has no layout box');
      continue;
    }
    presentProtected.push(element);
    const rect = element.rect;

    if (element.role !== 'desktop_content') {
      if (rect.left < -GEOMETRY_TOLERANCE_PX || rect.right > vw + GEOMETRY_TOLERANCE_PX) {
        push(
          'outside_viewport',
          element.selector,
          `horizontal box [${rect.left.toFixed(1)}, ${rect.right.toFixed(1)}] is outside viewport width ${vw}`,
        );
      }
      if (rect.width <= 0 || rect.height <= 0) {
        push('outside_viewport', element.selector, 'protected target has a collapsed box');
      }
    }

    if (
      element.scrollWidth !== null &&
      element.clientWidth !== null &&
      element.scrollWidth > element.clientWidth + GEOMETRY_TOLERANCE_PX
    ) {
      push(
        'clipped_text',
        element.selector,
        `content width ${element.scrollWidth} exceeds visible width ${element.clientWidth}`,
      );
    }
    if (
      element.scrollHeight !== null &&
      element.clientHeight !== null &&
      element.scrollHeight > element.clientHeight + GEOMETRY_TOLERANCE_PX
    ) {
      push(
        'clipped_text',
        element.selector,
        `content height ${element.scrollHeight} exceeds visible height ${element.clientHeight}`,
      );
    }
    if (element.clippedByAncestor) {
      push('clipped_text', element.selector, element.clippedByAncestor);
    }

    if (!target?.contrastExempt && element.foreground && element.background) {
      const ratio = contrastRatio(element.foreground, element.background);
      const required = requiredContrastFor(element.fontSizePx, element.fontWeight);
      if (ratio + 0.05 < required) {
        push(
          'contrast_below_minimum',
          element.selector,
          `contrast ${ratio.toFixed(2)} is below the required ${required} for ${element.fontSizePx ?? '?'}px`,
        );
      }
    }

    if (element.role === 'cta') {
      if (element.hasVisibleFocusIndicator === false) {
        push('focus_indicator_missing', element.selector, 'keyboard focus produces no visible indicator');
      }
      if (
        rect.height < MIN_INTERACTIVE_TARGET_PX - GEOMETRY_TOLERANCE_PX ||
        rect.width < MIN_INTERACTIVE_TARGET_PX - GEOMETRY_TOLERANCE_PX
      ) {
        push(
          'interactive_target_too_small',
          element.selector,
          `target ${rect.width.toFixed(1)}×${rect.height.toFixed(1)} is below ${MIN_INTERACTIVE_TARGET_PX}px`,
        );
      }
    }

    if (element.role === 'desktop_content' && vw >= COMMERCIAL_DESKTOP_MIN_WIDTH) {
      if (rect.width + GEOMETRY_TOLERANCE_PX < DESKTOP_MIN_CONTENT_WIDTH_PX) {
        push(
          'desktop_content_too_narrow',
          element.selector,
          `desktop reading column is ${rect.width.toFixed(0)}px, below the ${DESKTOP_MIN_CONTENT_WIDTH_PX}px adaptation floor at viewport ${vw}`,
        );
      }
      if (element.stageWidth !== null) {
        const stageRatio = element.stageWidth / vw;
        if (stageRatio < DESKTOP_MIN_STAGE_WIDTH_RATIO) {
          push(
            'desktop_content_too_narrow',
            element.selector,
            `surrounding stage covers ${(stageRatio * 100).toFixed(1)}% of ${vw}px, so the column reads as a card in empty space`,
          );
        }
      }
    }
  }

  const liveOverlays = page.overlays.filter(
    (o) => o.present && o.visible && o.rect && (o.position === 'fixed' || o.position === 'sticky'),
  );

  for (const overlay of liveOverlays) {
    /*
     * At rest, no floating control may cover a headline or an action. Running
     * body copy is excluded because a floating control is meant to sit above it.
     */
    if (page.scrollState === 'top') {
      for (const element of presentProtected) {
        if (!element.rect) continue;
        if (element.role !== 'heading' && element.role !== 'cta') continue;
        if (rectsOverlap(overlay.rect!, element.rect)) {
          push(
            'overlay_covers_protected',
            overlay.selector,
            `${overlay.position} overlay intersects protected ${element.role} ${element.selector}`,
          );
        }
      }
    }

    if (overlay.anchoredToBottom && !overlay.safeAreaCompensated) {
      push(
        'safe_area_missing',
        overlay.selector,
        'bottom-anchored overlay does not compensate env(safe-area-inset-bottom)',
      );
    }
  }

  // Floating controls must share the bottom rail without stacking on each other.
  for (let i = 0; i < liveOverlays.length; i += 1) {
    for (let j = i + 1; j < liveOverlays.length; j += 1) {
      const a = liveOverlays[i];
      const b = liveOverlays[j];
      if (rectsOverlap(a.rect!, b.rect!)) {
        push('overlay_covers_overlay', a.selector, `overlaps ${b.selector} in the floating rail`);
      }
    }
  }

  if (vw <= COMMERCIAL_MOBILE_MAX_WIDTH) {
    for (const group of page.coVisibleGroups) {
      const rects = group.rects.filter((r): r is MeasuredRect => r !== null);
      if (rects.length !== group.selectors.length) {
        push(
          'mobile_group_not_co_visible',
          group.groupId,
          `group has ${rects.length} of ${group.selectors.length} members rendered`,
        );
        continue;
      }
      const span = Math.max(...rects.map((r) => r.bottom)) - Math.min(...rects.map((r) => r.top));
      if (span > page.viewportHeight) {
        push(
          'mobile_group_not_co_visible',
          group.groupId,
          `group spans ${span.toFixed(0)}px, exceeding the ${page.viewportHeight}px viewport so members cannot be compared together`,
        );
      }
    }
  }

  return failures;
}

export function summarizeFailures(failures: readonly QualityFailure[]) {
  const byRule: Record<string, number> = {};
  for (const failure of failures) {
    byRule[failure.rule] = (byRule[failure.rule] ?? 0) + 1;
  }
  return {
    total: failures.length,
    byRule,
    horizontalOverflow: failures.filter(
      (f) => f.rule === 'horizontal_overflow' || f.rule === 'overflow_x_concealment',
    ).length,
    clipped: failures.filter((f) => f.rule === 'clipped_text' || f.rule === 'outside_viewport').length,
    overlayOverlap: failures.filter((f) => f.rule === 'overlay_covers_protected').length,
    contrast: failures.filter((f) => f.rule === 'contrast_below_minimum').length,
  };
}
