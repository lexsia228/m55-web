/**
 * Deterministic rendered-copy to governed-inventory binding — repository-independent.
 *
 * Governed-copy PASS requires selector-owned observedElements with exact normalized text.
 * Aggregate observedTexts / page snippets are diagnostic-only and never grant PASS.
 */

import type { GovernedCopyEntry } from './japaneseComprehensionTypes';

export type GovernedCopyBindingSpec = {
  copyId: string;
  visibleText: string;
  copyRole: GovernedCopyEntry['copyRole'];
  selector?: string;
};

export type CtaBindingSpec = {
  ctaId: string;
  expectedLabel: string;
  selector?: string;
};

export type ObservedRenderedElement = {
  elementId: string;
  text: string;
};

export type RenderedCopyBindingInput = {
  surfaceId: string;
  runtimeStateId: string;
  observedElements?: readonly ObservedRenderedElement[];
  /** Diagnostic evidence only — never used to prove governed copy. */
  observedTexts?: readonly string[];
  /** Diagnostic evidence only when CTA selectors are supplied. */
  observedCtaLabels?: readonly string[];
  expectedCopy: readonly GovernedCopyBindingSpec[];
  expectedCtas: readonly CtaBindingSpec[];
  governedInventory?: readonly GovernedCopyEntry[];
};

export type RenderedCopyBindingResult = {
  surfaceId: string;
  runtimeStateId: string;
  expectedCopyIds: string[];
  observedCopyIds: string[];
  missingCopyIds: string[];
  mismatchedCopyIds: string[];
  pendingCopyIds: string[];
  unexpectedGovernedCandidates: string[];
  unexpectedCandidateStatus: 'COMPUTED' | 'NOT_EVALUATED';
  ctaBindings: Array<{
    ctaId: string;
    expectedLabel: string;
    observed: boolean;
    matchedLabel: string | null;
    superstringMatch: boolean;
    pending: boolean;
  }>;
  passed: boolean;
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, '').trim();
}

function collectNormalizedObservedElements(
  input: RenderedCopyBindingInput,
): { elementId: string; normalized: string; raw: string }[] {
  const elements: { elementId: string; normalized: string; raw: string }[] = [];
  for (const element of input.observedElements ?? []) {
    elements.push({
      elementId: element.elementId,
      normalized: normalizeText(element.text),
      raw: element.text,
    });
  }
  return elements;
}

function computeUnexpectedGovernedCandidates(
  input: RenderedCopyBindingInput,
  observedElements: readonly { normalized: string }[],
  expectedCopyIds: ReadonlySet<string>,
): { candidates: string[]; status: 'COMPUTED' | 'NOT_EVALUATED' } {
  if (!input.governedInventory) {
    return { candidates: [], status: 'NOT_EVALUATED' };
  }
  const candidates: string[] = [];
  for (const entry of input.governedInventory) {
    if (entry.surfaceId !== input.surfaceId || entry.runtimeStateId !== input.runtimeStateId) continue;
    if (expectedCopyIds.has(entry.copyId)) continue;
    const normalized = normalizeText(entry.visibleText);
    if (!normalized) continue;
    if (observedElements.some((element) => element.normalized === normalized)) {
      candidates.push(entry.copyId);
    }
  }
  return { candidates, status: 'COMPUTED' };
}

function bindCopySpec(
  spec: GovernedCopyBindingSpec,
  observedElements: readonly { elementId: string; normalized: string; raw: string }[],
): { status: 'observed' | 'missing' | 'mismatched' | 'pending' } {
  const expected = normalizeText(spec.visibleText);
  if (!expected) return { status: 'missing' };
  if (!spec.selector) return { status: 'pending' };

  const element = observedElements.find((entry) => entry.elementId === spec.selector);
  if (!element) return { status: 'missing' };
  if (element.normalized === expected) return { status: 'observed' };
  if (element.normalized.includes(expected)) return { status: 'mismatched' };
  return { status: 'mismatched' };
}

function bindCtaSpec(
  cta: CtaBindingSpec,
  observedElements: readonly { elementId: string; normalized: string; raw: string }[],
): { observed: boolean; matchedLabel: string | null; superstringMatch: boolean; pending: boolean } {
  const expected = normalizeText(cta.expectedLabel);
  if (!expected) {
    return { observed: false, matchedLabel: null, superstringMatch: false, pending: false };
  }
  if (!cta.selector) {
    return { observed: false, matchedLabel: null, superstringMatch: false, pending: true };
  }

  const element = observedElements.find((entry) => entry.elementId === cta.selector);
  if (!element) {
    return { observed: false, matchedLabel: null, superstringMatch: false, pending: false };
  }

  if (element.normalized === expected) {
    return { observed: true, matchedLabel: element.raw, superstringMatch: false, pending: false };
  }
  if (element.normalized.includes(expected) && element.normalized !== expected) {
    return { observed: false, matchedLabel: element.raw, superstringMatch: true, pending: false };
  }
  return { observed: false, matchedLabel: null, superstringMatch: false, pending: false };
}

export function bindRenderedCopyToGovernedInventory(
  input: RenderedCopyBindingInput,
): RenderedCopyBindingResult {
  const observedElements = collectNormalizedObservedElements(input);

  const observedCopyIds: string[] = [];
  const missingCopyIds: string[] = [];
  const mismatchedCopyIds: string[] = [];
  const pendingCopyIds: string[] = [];

  for (const spec of input.expectedCopy) {
    const result = bindCopySpec(spec, observedElements);
    switch (result.status) {
      case 'observed':
        observedCopyIds.push(spec.copyId);
        break;
      case 'missing':
        missingCopyIds.push(spec.copyId);
        break;
      case 'mismatched':
        mismatchedCopyIds.push(spec.copyId);
        break;
      case 'pending':
        pendingCopyIds.push(spec.copyId);
        break;
    }
  }

  const expectedSet = new Set(input.expectedCopy.map((c) => c.copyId));
  const { candidates: unexpectedGovernedCandidates, status: unexpectedCandidateStatus } =
    computeUnexpectedGovernedCandidates(input, observedElements, expectedSet);

  const ctaBindings = input.expectedCtas.map((cta) => {
    const bound = bindCtaSpec(cta, observedElements);
    return {
      ctaId: cta.ctaId,
      expectedLabel: cta.expectedLabel,
      observed: bound.observed,
      matchedLabel: bound.matchedLabel,
      superstringMatch: bound.superstringMatch,
      pending: bound.pending,
    };
  });

  const passed =
    missingCopyIds.length === 0 &&
    mismatchedCopyIds.length === 0 &&
    pendingCopyIds.length === 0 &&
    ctaBindings.every((cta) => cta.observed && !cta.pending);

  return {
    surfaceId: input.surfaceId,
    runtimeStateId: input.runtimeStateId,
    expectedCopyIds: input.expectedCopy.map((c) => c.copyId),
    observedCopyIds,
    missingCopyIds,
    mismatchedCopyIds,
    pendingCopyIds,
    unexpectedGovernedCandidates,
    unexpectedCandidateStatus,
    ctaBindings,
    passed,
  };
}
