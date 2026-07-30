/**
 * Shared layout, semantic and accessibility invariants.
 *
 * Every check is pure: it consumes a measured surface (JSON) plus the manifest
 * entry, so the same rules that reject the negative fixtures also guard real
 * surfaces. No project authority and no DOM access here.
 */
import type {
  ContentStressProfile,
  GateSummary,
  InvariantFailure,
  MeasuredNode,
  MeasuredRect,
  MeasuredSurface,
  SurfaceManifestEntry,
} from './types';

/** Sub-pixel tolerance for geometry comparisons. */
export const GEOMETRY_TOLERANCE_PX = 1.5;
/** Neighbour width delta beyond which layout is treated as discontinuous. */
export const NEIGHBOR_DISCONTINUITY_PX = 220;
/** Unexplained vertical gap treated as a layout defect. */
export const MAX_GOVERNED_VERTICAL_GAP_PX = 480;
/** Below this, a governed surface is shell-only rather than content. */
export const MIN_GOVERNED_TEXT_LENGTH = 24;

const PUNCTUATION_ONLY =
  /^[\s\u3000。、．，・…‥！？!?：:；;「」『』（）()【】［］[\]〜～―ー\-—–]+$/u;

function fail(
  code: InvariantFailure['code'],
  message: string,
  diagnostics: Record<string, unknown>,
  selector: string | null = null,
): InvariantFailure {
  return { code, message, diagnostics, selector };
}

function ancestorDiagnostics(node: MeasuredNode): Record<string, unknown> {
  if (!node.clippingAncestor) return {};
  return {
    clippingAncestor: node.clippingAncestor.selector,
    ancestorRect: node.clippingAncestor.rect,
    ancestorOverflow: node.clippingAncestor.computed.overflow,
    ancestorOverflowY: node.clippingAncestor.computed.overflowY,
    ancestorHeight: node.clippingAncestor.computed.height,
    ancestorMinHeight: node.clippingAncestor.computed.minHeight,
    ancestorMaxHeight: node.clippingAncestor.computed.maxHeight,
    ancestorPosition: node.clippingAncestor.computed.position,
    ancestorZIndex: node.clippingAncestor.computed.zIndex,
  };
}

function baseDiagnostics(
  surface: MeasuredSurface,
  node: MeasuredNode | null,
): Record<string, unknown> {
  return {
    surfaceId: surface.surfaceId,
    runtimeStateId: surface.runtimeStateId,
    route: surface.observedRoute,
    viewport: surface.viewport,
    ...(node ? { elementRect: node.rect, ...ancestorDiagnostics(node) } : {}),
  };
}

function intersects(a: MeasuredRect, b: MeasuredRect): boolean {
  return (
    a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2
  );
}

export type NeighborContext = {
  /** Content bottom measured at the previous governed width, when available. */
  previousContentBottom: number | null;
  previousWidth: number | null;
  previousPassed: boolean | null;
  nextWidth: number | null;
};

export const EMPTY_NEIGHBOR_CONTEXT: NeighborContext = {
  previousContentBottom: null,
  previousWidth: null,
  previousPassed: null,
  nextWidth: null,
};

function contentBottom(surface: MeasuredSurface): number {
  const rects = [
    ...surface.protectedNodes.filter((n) => n.found).map((n) => n.rect.bottom),
    ...(surface.criticalCta?.found ? [surface.criticalCta.rect.bottom] : []),
  ];
  return rects.length ? Math.max(...rects) : 0;
}

/** Geometry invariants. Authoritative before any pixel comparison. */
export function checkLayoutInvariants(
  surface: MeasuredSurface,
  entry: SurfaceManifestEntry,
  neighbor: NeighborContext = EMPTY_NEIGHBOR_CONTEXT,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];

  if (!surface.pageAlive) {
    failures.push(
      fail('LAYOUT_PAGE_NOT_ALIVE', 'page or context is not alive', baseDiagnostics(surface, null)),
    );
    return failures;
  }

  if (surface.observedOrigin !== surface.expectedOrigin) {
    failures.push(
      fail('LAYOUT_UNAUTHORIZED_NAVIGATION', 'surface navigated to an unauthorized origin', {
        ...baseDiagnostics(surface, null),
        observedOrigin: surface.observedOrigin,
        expectedOrigin: surface.expectedOrigin,
      }),
    );
  }

  if (!entry.routeIsPattern && surface.observedRoute !== entry.route) {
    failures.push(
      fail('LAYOUT_ROUTE_DRIFT', 'observed route differs from the registered route', {
        ...baseDiagnostics(surface, null),
        expectedRoute: entry.route,
      }),
    );
  }
  if (surface.runtimeStateId !== entry.runtimeStateId) {
    failures.push(
      fail('LAYOUT_STATE_DRIFT', 'observed runtime state differs from the registered state', {
        ...baseDiagnostics(surface, null),
        expectedRuntimeStateId: entry.runtimeStateId,
      }),
    );
  }

  if (surface.documentScrollWidth > surface.innerWidth + 1) {
    failures.push(
      fail('LAYOUT_HORIZONTAL_OVERFLOW', 'document scrolls horizontally', {
        ...baseDiagnostics(surface, null),
        documentScrollWidth: surface.documentScrollWidth,
        innerWidth: surface.innerWidth,
      }),
    );
  }

  const allNodes: MeasuredNode[] = [
    ...surface.protectedNodes,
    ...(surface.criticalCta ? [surface.criticalCta] : []),
  ];

  for (const node of allNodes) {
    if (!node.found) {
      failures.push(
        fail(
          'LAYOUT_PROTECTED_ELEMENT_MISSING',
          `protected element not found: ${node.selector}`,
          baseDiagnostics(surface, null),
          node.selector,
        ),
      );
      continue;
    }
    if (!node.visible || node.opacity <= 0.01) {
      failures.push(
        fail(
          'LAYOUT_PROTECTED_ELEMENT_HIDDEN',
          `protected element is not visible: ${node.selector}`,
          { ...baseDiagnostics(surface, node), opacity: node.opacity },
          node.selector,
        ),
      );
    }
    const declared = entry.protectedElements.find((p) => p.selector === node.selector);
    if ((declared?.requireText ?? node.role !== 'media') && node.textLength === 0) {
      failures.push(
        fail(
          'LAYOUT_PROTECTED_ELEMENT_EMPTY',
          `protected element has no rendered text: ${node.selector}`,
          baseDiagnostics(surface, node),
          node.selector,
        ),
      );
    }

    const outside =
      node.rect.left < -GEOMETRY_TOLERANCE_PX ||
      node.rect.right > surface.innerWidth + GEOMETRY_TOLERANCE_PX;
    if (outside) {
      failures.push(
        fail(
          'LAYOUT_PROTECTED_ELEMENT_OUTSIDE_VIEWPORT',
          `protected element extends beyond the visual viewport: ${node.selector}`,
          { ...baseDiagnostics(surface, node), innerWidth: surface.innerWidth },
          node.selector,
        ),
      );
    }

    if (node.clippingAncestor) {
      failures.push(
        fail(
          'LAYOUT_ANCESTOR_CLIPPING',
          `protected element is clipped by ${node.clippingAncestor.selector}`,
          baseDiagnostics(surface, node),
          node.selector,
        ),
      );
    }

    for (const line of node.renderedLines) {
      if (line.text.trim().length > 0 && PUNCTUATION_ONLY.test(line.text.trim())) {
        failures.push(
          fail(
            'LAYOUT_JAPANESE_ORPHAN_LINE',
            `rendered line contains only Japanese punctuation: "${line.text.trim()}"`,
            { ...baseDiagnostics(surface, node), lineRect: line.rect },
            node.selector,
          ),
        );
      }
    }
  }

  const cta = surface.criticalCta;
  if (entry.criticalCta && cta?.found) {
    const min = entry.criticalCta.minTargetPx;
    if (cta.rect.height < min - GEOMETRY_TOLERANCE_PX) {
      failures.push(
        fail(
          'LAYOUT_CTA_TARGET_SIZE',
          `critical CTA height ${cta.rect.height} < ${min}`,
          { ...baseDiagnostics(surface, cta), minTargetPx: min },
          cta.selector,
        ),
      );
    }
  }

  const bottom = contentBottom(surface);
  if (surface.containerRect && bottom > surface.containerRect.bottom + GEOMETRY_TOLERANCE_PX) {
    failures.push(
      fail('LAYOUT_SECTION_COLLISION', 'governed content overflows its container', {
        ...baseDiagnostics(surface, null),
        contentBottom: bottom,
        containerRect: surface.containerRect,
      }),
    );
  }
  for (const boundary of surface.boundaries) {
    if (!boundary.found) continue;
    if (boundary.position === 'following' && boundary.rect.top < bottom - GEOMETRY_TOLERANCE_PX) {
      failures.push(
        fail(
          'LAYOUT_SECTION_COLLISION',
          `following section starts above governed content bottom`,
          { ...baseDiagnostics(surface, null), contentBottom: bottom, boundaryRect: boundary.rect },
          boundary.selector,
        ),
      );
    }
    if (boundary.position === 'preceding') {
      const top = Math.min(
        ...surface.protectedNodes.filter((n) => n.found).map((n) => n.rect.top),
        Number.POSITIVE_INFINITY,
      );
      if (Number.isFinite(top) && boundary.rect.bottom > top + GEOMETRY_TOLERANCE_PX) {
        failures.push(
          fail(
            'LAYOUT_SECTION_COLLISION',
            'preceding section ends below governed content top',
            { ...baseDiagnostics(surface, null), contentTop: top, boundaryRect: boundary.rect },
            boundary.selector,
          ),
        );
      }
    }
  }

  for (const overlay of surface.fixedNodes) {
    if (!overlay.visible) continue;
    if (overlay.position !== 'fixed' && overlay.position !== 'sticky') continue;
    for (const node of allNodes) {
      if (!node.found) continue;
      if (intersects(node.rect, overlay.rect)) {
        failures.push(
          fail(
            'LAYOUT_FIXED_INTERSECTION',
            `fixed/sticky ${overlay.selector} intersects ${node.selector}`,
            { ...baseDiagnostics(surface, node), overlayRect: overlay.rect },
            node.selector,
          ),
        );
      }
    }
  }

  if (
    neighbor.previousContentBottom !== null &&
    Math.abs(bottom - neighbor.previousContentBottom) > NEIGHBOR_DISCONTINUITY_PX
  ) {
    failures.push(
      fail('LAYOUT_NEIGHBOR_GEOMETRY_DISCONTINUITY', 'abrupt geometry change vs neighbour width', {
        ...baseDiagnostics(surface, null),
        contentBottom: bottom,
        previousContentBottom: neighbor.previousContentBottom,
        previousWidth: neighbor.previousWidth,
        previousPassed: neighbor.previousPassed,
        nextWidth: neighbor.nextWidth,
      }),
    );
  }

  return failures;
}

/** Machine semantic review. Runs after geometry. */
export function checkSemanticInvariants(
  surface: MeasuredSurface,
  entry: SurfaceManifestEntry,
  contentStressProfile: ContentStressProfile,
  neighbor: NeighborContext = EMPTY_NEIGHBOR_CONTEXT,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const diag = baseDiagnostics(surface, null);

  const cta = surface.criticalCta;
  if (entry.criticalCta && cta?.found) {
    // Visual viewport bottom is viewport.height — never inflate with innerWidth.
    const viewportBottom = surface.viewport.height;
    const outsideViewport =
      cta.rect.top < -GEOMETRY_TOLERANCE_PX ||
      cta.rect.bottom > viewportBottom + GEOMETRY_TOLERANCE_PX;
    const clippedByContainer =
      surface.containerRect !== null &&
      cta.rect.bottom > surface.containerRect.bottom + GEOMETRY_TOLERANCE_PX;
    if (outsideViewport || clippedByContainer) {
      failures.push(
        fail(
          'SEMANTIC_CTA_PARTIALLY_VISIBLE',
          'critical CTA is only partially visible within the visual viewport',
          {
            ...diag,
            ctaRect: cta.rect,
            viewportBottom,
            containerRect: surface.containerRect,
            outsideViewport,
            clippedByContainer,
          },
          cta.selector,
        ),
      );
    }
  }

  const supporting = surface.protectedNodes.filter(
    (n) => n.role === 'supporting' || n.role === 'copy',
  );
  if (supporting.length > 0 && supporting.every((n) => !n.found || n.textLength === 0)) {
    failures.push(
      fail('SEMANTIC_MISSING_SUPPORTING_CONTENT', 'no supporting content rendered', diag),
    );
  }

  if (surface.governedTextLength === 0 && surface.shellTextLength > 0) {
    failures.push(fail('SEMANTIC_SHELL_ONLY_PAGE', 'only shell chrome rendered', diag));
  }
  if (surface.governedTextLength + surface.shellTextLength === 0) {
    failures.push(fail('SEMANTIC_BLANK_SURFACE', 'governed surface rendered blank', diag));
  } else if (
    surface.governedTextLength > 0 &&
    surface.governedTextLength < MIN_GOVERNED_TEXT_LENGTH &&
    contentStressProfile !== 'empty'
  ) {
    failures.push(
      fail('SEMANTIC_SHELL_ONLY_PAGE', 'governed content below minimum content length', {
        ...diag,
        governedTextLength: surface.governedTextLength,
        minimum: MIN_GOVERNED_TEXT_LENGTH,
      }),
    );
  }

  for (const overlay of surface.fixedNodes) {
    if (!overlay.visible) continue;
    const obstructedCta =
      cta?.found === true && intersects(cta.rect, overlay.rect) ? cta.selector : null;
    if (obstructedCta) {
      failures.push(
        fail(
          'SEMANTIC_FIXED_CONTROL_OBSTRUCTION',
          `fixed control ${overlay.selector} obstructs the critical CTA`,
          { ...diag, overlayRect: overlay.rect, ctaRect: cta?.rect },
          obstructedCta,
        ),
      );
    }
  }

  if (
    (!entry.routeIsPattern && surface.observedRoute !== entry.route) ||
    surface.runtimeStateId !== entry.runtimeStateId
  ) {
    failures.push(
      fail('SEMANTIC_WRONG_ROUTE_STATE', 'surface is not on the expected route/state', {
        ...diag,
        expectedRoute: entry.route,
        expectedRuntimeStateId: entry.runtimeStateId,
      }),
    );
  }

  if (surface.largestVerticalGapPx > MAX_GOVERNED_VERTICAL_GAP_PX) {
    failures.push(
      fail('SEMANTIC_UNEXPECTED_WHITESPACE', 'unexplained large vertical gap in governed content', {
        ...diag,
        largestVerticalGapPx: surface.largestVerticalGapPx,
        maximum: MAX_GOVERNED_VERTICAL_GAP_PX,
      }),
    );
  }

  if (surface.loadingIndicatorPresent && contentStressProfile !== 'loading') {
    failures.push(
      fail('SEMANTIC_LOADING_STATE_ACCEPTED', 'loading placeholder accepted as a settled state', {
        ...diag,
        contentStressProfile,
      }),
    );
  }

  const bottom = contentBottom(surface);
  if (
    neighbor.previousContentBottom !== null &&
    Math.abs(bottom - neighbor.previousContentBottom) > NEIGHBOR_DISCONTINUITY_PX
  ) {
    failures.push(
      fail('SEMANTIC_NEIGHBOR_DISCONTINUITY', 'abrupt layout discontinuity between widths', {
        ...diag,
        contentBottom: bottom,
        previousContentBottom: neighbor.previousContentBottom,
        previousWidth: neighbor.previousWidth,
      }),
    );
  }

  return failures;
}

export const REQUIRED_LANDMARKS = ['main'] as const;

export function checkAccessibilityInvariants(
  surface: MeasuredSurface,
  entry: SurfaceManifestEntry,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const diag = baseDiagnostics(surface, null);

  for (const violation of surface.axeViolations) {
    if (violation.impact === 'serious' || violation.impact === 'critical') {
      failures.push(
        fail('A11Y_SERIOUS_VIOLATION', `axe ${violation.impact} violation: ${violation.id}`, {
          ...diag,
          axeRuleId: violation.id,
          nodeCount: violation.nodeCount,
          targets: violation.targets,
          helpUrl: violation.helpUrl,
        }),
      );
    }
  }

  const cta = surface.criticalCta;
  if (entry.criticalCta && cta?.found) {
    if (!cta.accessibleName || cta.accessibleName.trim().length === 0) {
      failures.push(
        fail(
          'A11Y_MISSING_ACCESSIBLE_NAME',
          'critical CTA has no accessible name',
          diag,
          cta.selector,
        ),
      );
    }
    if (cta.focusVisible === false) {
      failures.push(
        fail('A11Y_FOCUS_NOT_VISIBLE', 'critical CTA focus is not visible', diag, cta.selector),
      );
    }
    const min = entry.criticalCta.minTargetPx;
    if (
      cta.rect.height < min - GEOMETRY_TOLERANCE_PX ||
      cta.rect.width < min - GEOMETRY_TOLERANCE_PX
    ) {
      failures.push(
        fail(
          'A11Y_TARGET_SIZE',
          `critical CTA target smaller than ${min}px`,
          { ...diag, ctaRect: cta.rect },
          cta.selector,
        ),
      );
    }
  }

  for (const landmark of REQUIRED_LANDMARKS) {
    if (!surface.landmarks.includes(landmark)) {
      failures.push(fail('A11Y_MISSING_LANDMARK', `required landmark missing: ${landmark}`, diag));
    }
  }

  return failures;
}

export function summarizeGates(failures: readonly InvariantFailure[]): GateSummary {
  return {
    geometryGreen: !failures.some((f) => f.code.startsWith('LAYOUT_')),
    semanticGreen: !failures.some((f) => f.code.startsWith('SEMANTIC_')),
    accessibilityGreen: !failures.some((f) => f.code.startsWith('A11Y_')),
  };
}

export function measuredContentBottom(surface: MeasuredSurface): number {
  return contentBottom(surface);
}
