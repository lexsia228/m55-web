/**
 * Commercial quality control plane — unit and negative-fixture tests.
 *
 * Fixtures are evaluated by the production validators, so a fixture can only
 * pass when the real checker emits the declared failure code.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  APPROVAL_PACK_DIR,
  ALLOWED_APPROVAL_AUTHORITIES,
  GENERATOR_AUTHORITY,
  approvalPackBlockers,
  evaluatePromotion,
  generateApprovalPack,
} from './approvalPack';
import {
  STRESS_PROFILE_SPECS,
  resolveStressProfiles,
  stressProfileSpec,
} from './contentStateStress';
import {
  formatCaseFailure,
  governedWidths,
  orderWidthsForMode,
  planCases,
  runContinuousResponsive,
  summarizeRun,
  type CommercialQualityAdapter,
} from './continuousResponsiveEngine';
import {
  COMMERCIAL_QUALITY_NEGATIVE_FIXTURES,
  durablePromotionApprovalRecords,
  evaluateFixture,
  FIXTURE_DURABLE_APPROVAL_STORE,
  fixtureApprovalStoreOf,
  rect,
  validEntry,
  validManifest,
  validSurface,
} from './fixtures';
import {
  checkAccessibilityInvariants,
  checkLayoutInvariants,
  checkSemanticInvariants,
  summarizeGates,
} from './layoutInvariants';
import {
  manifestDigest,
  validateSurfaceManifest,
  validateSurfaceManifestEntry,
} from './surfaceManifest';
import {
  CANONICAL_BASELINE_STATES,
  COMMERCIAL_QUALITY_SCHEMA_VERSION,
  CONTENT_STRESS_PROFILES,
  type MeasuredSurface,
  type SurfaceManifestEntry,
} from './types';

const GREEN_GATES = { geometryGreen: true, semanticGreen: true, accessibilityGreen: true };

function green(surface: MeasuredSurface = validSurface(), entry = validEntry()) {
  return [
    ...checkLayoutInvariants(surface, entry),
    ...checkSemanticInvariants(surface, entry, 'short_text'),
    ...checkAccessibilityInvariants(surface, entry),
  ];
}

/* ── Schema and manifest ───────────────────────────────────────────── */

test('schema version 1 is the only supported version', () => {
  assert.equal(COMMERCIAL_QUALITY_SCHEMA_VERSION, 1);
  const failures = validateSurfaceManifest({
    ...validManifest(),
    schemaVersion: 2 as unknown as typeof COMMERCIAL_QUALITY_SCHEMA_VERSION,
  });
  assert.ok(failures.some((f) => f.code === 'MANIFEST_UNKNOWN_SCHEMA_VERSION'));
});

test('canonical baseline states are exactly none / candidate / human-approved', () => {
  assert.deepEqual([...CANONICAL_BASELINE_STATES], ['none', 'candidate', 'human-approved']);
});

test('a valid entry produces no manifest failures', () => {
  assert.deepEqual(validateSurfaceManifestEntry(validEntry()), []);
  assert.deepEqual(validateSurfaceManifest(validManifest()), []);
});

test('duplicate route/state identity is rejected', () => {
  const failures = validateSurfaceManifest(
    validManifest([validEntry(), validEntry({ surfaceId: 'fixture:surface.beta' })]),
  );
  assert.ok(failures.some((f) => f.code === 'MANIFEST_DUPLICATE_ROUTE_STATE_IDENTITY'));
});

test('missing setup identity is rejected', () => {
  const failures = validateSurfaceManifestEntry(validEntry({ setupId: '  ' }));
  assert.ok(failures.some((f) => f.code === 'MANIFEST_MISSING_SETUP'));
});

test('a declared critical CTA without CTA authority is rejected', () => {
  const failures = validateSurfaceManifestEntry(
    validEntry({
      criticalCta: {
        selector: '[data-q="cta"]',
        minTargetPx: 44,
        ctaAuthority: { kind: 'cta_state', key: '' },
      },
    }),
  );
  assert.ok(failures.some((f) => f.code === 'MANIFEST_MISSING_CTA_AUTHORITY'));
});

test('an inverted viewport range is rejected', () => {
  const failures = validateSurfaceManifestEntry(
    validEntry({
      viewport: {
        minWidth: 1440,
        maxWidth: 320,
        widthStep: 16,
        breakpointNeighborhoods: [],
        heightMatrix: [812],
      },
    }),
  );
  assert.ok(failures.some((f) => f.code === 'MANIFEST_INVALID_VIEWPORT_RANGE'));
});

test('an empty height matrix is rejected', () => {
  const failures = validateSurfaceManifestEntry(
    validEntry({
      viewport: {
        minWidth: 320,
        maxWidth: 1440,
        widthStep: 16,
        breakpointNeighborhoods: [],
        heightMatrix: [],
      },
    }),
  );
  assert.ok(failures.some((f) => f.code === 'MANIFEST_INVALID_VIEWPORT_RANGE'));
});

test('missing output behaviour is rejected', () => {
  const failures = validateSurfaceManifestEntry(
    validEntry({ outputBehaviour: { screen: false, print: false, pdf: false, sharedImage: false } }),
  );
  assert.ok(failures.some((f) => f.code === 'MANIFEST_MISSING_OUTPUT_BEHAVIOUR'));
});

test('a candidate baseline may not carry an approval record', () => {
  const failures = validateSurfaceManifestEntry(
    validEntry({
      canonicalBaseline: 'candidate',
      baselineApproval: {
        approvalAuthority: 'human:commercial-review',
        independentReviewRef: 'r',
        humanApprovalRef: 'h',
        approvedAt: '2026-07-30T00:00:00.000Z',
        sourceCommit: 'c',
        manifestDigest: 'd',
        candidateHashes: {},
      },
    }),
  );
  assert.ok(failures.some((f) => f.code === 'MANIFEST_CANDIDATE_MARKED_CANONICAL'));
});

test('human-approved baseline without an approval record is rejected', () => {
  const failures = validateSurfaceManifestEntry(
    validEntry({ canonicalBaseline: 'human-approved', baselineApproval: null }),
  );
  assert.ok(failures.some((f) => f.code === 'MANIFEST_APPROVED_BASELINE_WITHOUT_RECORD'));
});

test('missing source owner files is rejected', () => {
  const failures = validateSurfaceManifestEntry(validEntry({ sourceOwnerFiles: [] }));
  assert.ok(failures.some((f) => f.code === 'MANIFEST_MISSING_SOURCE_OWNER'));
});

test('manifest digest is stable under key order and changes with content', () => {
  const a = validManifest();
  const reordered = validManifest([{ ...validEntry() }]);
  assert.equal(manifestDigest(a), manifestDigest(reordered));
  assert.notEqual(manifestDigest(a), manifestDigest(validManifest([validEntry({ route: '/beta' })])));
});

/* ── Engine planning ───────────────────────────────────────────────── */

test('governed widths cover the stepped sweep plus breakpoint neighbours', () => {
  const widths = governedWidths(validEntry());
  assert.equal(widths[0], 320);
  assert.equal(widths.at(-1), 1440);
  for (const neighbour of [767, 768, 769]) assert.ok(widths.includes(neighbour));
  assert.ok(widths.includes(336));
});

test('resize-down mode descends and resize-up ascends', () => {
  const widths = governedWidths(validEntry());
  assert.ok(orderWidthsForMode(widths, 'resize_down')[0] > orderWidthsForMode(widths, 'resize_up')[0]);
});

test('planCases produces fresh-load, resize-down and resize-up modes', () => {
  const plans = planCases(validEntry(), { contentStressProfiles: ['short_text'] });
  for (const mode of ['fresh_load', 'resize_down', 'resize_up']) {
    assert.ok(plans.some((p) => p.mode === mode));
  }
});

test('deterministic sharding partitions the plan without loss', () => {
  const options = { contentStressProfiles: ['short_text'] } as const;
  const all = planCases(validEntry(), options);
  const shards = [0, 1, 2].map((shardIndex) =>
    planCases(validEntry(), { ...options, shardIndex, shardCount: 3 }),
  );
  assert.equal(
    shards.reduce((total, shard) => total + shard.length, 0),
    all.length,
  );
  assert.throws(() => planCases(validEntry(), { ...options, shardIndex: 3, shardCount: 3 }));
});

test('the engine returns one normalized result per planned case', async () => {
  const entry = validEntry({
    viewport: {
      minWidth: 320,
      maxWidth: 352,
      widthStep: 16,
      breakpointNeighborhoods: [],
      heightMatrix: [812],
    },
  });
  const adapter: CommercialQualityAdapter<{ calls: string[] }> = {
    projectId: 'fixture',
    sourceCommit: () => 'commit-a',
    applyStressProfile: async (ctx) => void ctx.calls.push('stress'),
    prepareCase: async (ctx) => void ctx.calls.push('prepare'),
    measure: async () => validSurface(),
    teardownCase: async (ctx) => void ctx.calls.push('teardown'),
  };
  const context = { calls: [] as string[] };
  const run = await runContinuousResponsive(entry, adapter, context, {
    contentStressProfiles: ['short_text'],
    profiles: ['default'],
  });
  assert.equal(run.results.length, run.plannedCaseCount);
  assert.ok(run.results.every((r) => r.sourceCommit === 'commit-a'));
  assert.ok(run.results.every((r) => r.setupId === entry.setupId));
  assert.ok(context.calls.includes('teardown'));
  const summary = summarizeRun(run.results);
  assert.equal(summary.failedCount, 0);
});

test('the engine reports failing cases with actionable diagnostics', async () => {
  const entry = validEntry({
    viewport: {
      minWidth: 320,
      maxWidth: 336,
      widthStep: 16,
      breakpointNeighborhoods: [],
      heightMatrix: [812],
    },
  });
  const adapter: CommercialQualityAdapter<null> = {
    projectId: 'fixture',
    sourceCommit: () => 'commit-a',
    applyStressProfile: async () => {},
    prepareCase: async () => {},
    measure: async () => validSurface({ documentScrollWidth: 500 }),
  };
  const run = await runContinuousResponsive(entry, adapter, null, {
    contentStressProfiles: ['short_text'],
    modes: ['fresh_load'],
    profiles: ['default'],
  });
  assert.ok(run.results.every((r) => !r.passed));
  const formatted = formatCaseFailure(run.results[0]);
  assert.match(formatted, /LAYOUT_HORIZONTAL_OVERFLOW/);
  assert.match(formatted, /documentScrollWidth/);
});

/* ── Invariants ────────────────────────────────────────────────────── */

test('a healthy surface produces no invariant failures', () => {
  assert.deepEqual(green(), []);
  assert.deepEqual(summarizeGates([]), GREEN_GATES);
});

test('an absent protected element is reported with its selector', () => {
  const failures = checkLayoutInvariants(
    validSurface({
      protectedNodes: [
        {
          ...validSurface().protectedNodes[0],
          found: false,
        },
        validSurface().protectedNodes[1],
      ],
    }),
    validEntry(),
  );
  const failure = failures.find((f) => f.code === 'LAYOUT_PROTECTED_ELEMENT_MISSING');
  assert.ok(failure);
  assert.equal(failure?.selector, '[data-q="headline"]');
});

test('an element outside the visual viewport is rejected', () => {
  const base = validSurface();
  const failures = checkLayoutInvariants(
    validSurface({
      protectedNodes: [
        { ...base.protectedNodes[0], rect: rect(80, 20, 520, 96) },
        base.protectedNodes[1],
      ],
    }),
    validEntry(),
  );
  assert.ok(failures.some((f) => f.code === 'LAYOUT_PROTECTED_ELEMENT_OUTSIDE_VIEWPORT'));
});

test('unauthorized external navigation is rejected', () => {
  const failures = checkLayoutInvariants(
    validSurface({ observedOrigin: 'https://example.test' }),
    validEntry(),
  );
  assert.ok(failures.some((f) => f.code === 'LAYOUT_UNAUTHORIZED_NAVIGATION'));
});

test('a dead page or context short-circuits with LAYOUT_PAGE_NOT_ALIVE', () => {
  const failures = checkLayoutInvariants(validSurface({ pageAlive: false }), validEntry());
  assert.deepEqual(
    failures.map((f) => f.code),
    ['LAYOUT_PAGE_NOT_ALIVE'],
  );
});

test('a following section that starts above content bottom is a collision', () => {
  const failures = checkLayoutInvariants(
    validSurface({
      boundaries: [
        { selector: '[data-q="next"]', position: 'following', found: true, rect: rect(100, 0, 390, 400) },
      ],
    }),
    validEntry(),
  );
  assert.ok(failures.some((f) => f.code === 'LAYOUT_SECTION_COLLISION'));
});

test('clipping diagnostics include the ancestor rectangle and computed overflow', () => {
  const fixture = COMMERCIAL_QUALITY_NEGATIVE_FIXTURES.find(
    (f) => f.id === 'clipped_protected_content',
  );
  assert.ok(fixture && fixture.kind === 'layout');
  const failures = checkLayoutInvariants(fixture.surface, fixture.entry);
  const clip = failures.find((f) => f.code === 'LAYOUT_ANCESTOR_CLIPPING');
  assert.ok(clip);
  assert.equal(clip?.diagnostics.clippingAncestor, '[data-q="poster"]');
  assert.equal(clip?.diagnostics.ancestorOverflow, 'hidden');
  assert.ok(clip?.diagnostics.ancestorRect);
  assert.ok(clip?.diagnostics.viewport);
});

test('rendered-line geometry is required for orphan-line detection', () => {
  const base = validSurface();
  // Same element text, but reconstructed into a punctuation-only rendered line.
  const oneLine = checkLayoutInvariants(
    validSurface({
      protectedNodes: [
        {
          ...base.protectedNodes[0],
          renderedLines: [{ text: 'あなたの傾向を短く整理します。', rect: rect(80, 20, 340, 48) }],
        },
        base.protectedNodes[1],
      ],
    }),
    validEntry(),
  );
  assert.equal(oneLine.filter((f) => f.code === 'LAYOUT_JAPANESE_ORPHAN_LINE').length, 0);

  const twoLines = checkLayoutInvariants(
    validSurface({
      protectedNodes: [
        {
          ...base.protectedNodes[0],
          renderedLines: [
            { text: 'あなたの傾向を短く整理します', rect: rect(80, 20, 340, 24) },
            { text: '。', rect: rect(104, 20, 340, 24) },
          ],
        },
        base.protectedNodes[1],
      ],
    }),
    validEntry(),
  );
  assert.equal(twoLines.filter((f) => f.code === 'LAYOUT_JAPANESE_ORPHAN_LINE').length, 1);
});

test('a fully visible CTA does not emit SEMANTIC_CTA_PARTIALLY_VISIBLE', () => {
  const viewportHeight = 812;
  const failures = checkSemanticInvariants(
    validSurface({
      viewport: { width: 390, height: viewportHeight },
      criticalCta: {
        ...validSurface().criticalCta!,
        rect: rect(200, 20, 320, 56),
      },
    }),
    validEntry(),
    'short_text',
  );
  assert.equal(
    failures.filter((f) => f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE').length,
    0,
  );
  assert.ok(validSurface().criticalCta!.rect.bottom < viewportHeight);
});

test('a CTA partially below the viewport is rejected', () => {
  const viewportHeight = 812;
  const ctaTop = 780;
  const ctaHeight = 56;
  assert.ok(ctaTop + ctaHeight > viewportHeight);
  const failures = checkSemanticInvariants(
    validSurface({
      viewport: { width: 390, height: viewportHeight },
      criticalCta: {
        ...validSurface().criticalCta!,
        rect: rect(ctaTop, 20, 320, ctaHeight),
      },
    }),
    validEntry(),
    'short_text',
  );
  assert.ok(failures.some((f) => f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE'));
});

test('a CTA fully below the viewport is rejected', () => {
  const viewportHeight = 812;
  const failures = checkSemanticInvariants(
    validSurface({
      viewport: { width: 390, height: viewportHeight },
      criticalCta: {
        ...validSurface().criticalCta!,
        rect: rect(900, 20, 320, 56),
      },
    }),
    validEntry(),
    'short_text',
  );
  assert.ok(failures.some((f) => f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE'));
});

test('an oversized container with CTA below the viewport is still rejected', () => {
  const viewportHeight = 812;
  const failures = checkSemanticInvariants(
    validSurface({
      viewport: { width: 390, height: viewportHeight },
      containerRect: rect(0, 0, 390, 2400),
      criticalCta: {
        ...validSurface().criticalCta!,
        rect: rect(1800, 20, 320, 56),
      },
    }),
    validEntry(),
    'short_text',
  );
  assert.ok(failures.some((f) => f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE'));
});

test('a blank governed surface is rejected', () => {
  const failures = checkSemanticInvariants(
    validSurface({ governedTextLength: 0, shellTextLength: 0 }),
    validEntry(),
    'short_text',
  );
  assert.ok(failures.some((f) => f.code === 'SEMANTIC_BLANK_SURFACE'));
});

test('unexpected large whitespace is rejected', () => {
  const failures = checkSemanticInvariants(
    validSurface({ largestVerticalGapPx: 900 }),
    validEntry(),
    'short_text',
  );
  assert.ok(failures.some((f) => f.code === 'SEMANTIC_UNEXPECTED_WHITESPACE'));
});

test('a loading indicator is accepted only under the loading stress profile', () => {
  const surface = validSurface({ loadingIndicatorPresent: true });
  assert.ok(
    checkSemanticInvariants(surface, validEntry(), 'short_text').some(
      (f) => f.code === 'SEMANTIC_LOADING_STATE_ACCEPTED',
    ),
  );
  assert.equal(
    checkSemanticInvariants(surface, validEntry(), 'loading').filter(
      (f) => f.code === 'SEMANTIC_LOADING_STATE_ACCEPTED',
    ).length,
    0,
  );
});

test('serious and critical axe violations fail; minor ones do not', () => {
  const serious = checkAccessibilityInvariants(
    validSurface({
      axeViolations: [
        {
          id: 'color-contrast',
          impact: 'serious',
          nodeCount: 2,
          targets: ['.footerCopy'],
          helpUrl: 'x',
        },
      ],
    }),
    validEntry(),
  );
  const failure = serious.find((f) => f.code === 'A11Y_SERIOUS_VIOLATION');
  assert.ok(failure);
  // Findings must be attributable to an owning selector, not just a rule id.
  assert.deepEqual(failure?.diagnostics.targets, ['.footerCopy']);
  assert.equal(failure?.diagnostics.axeRuleId, 'color-contrast');

  const minor = checkAccessibilityInvariants(
    validSurface({
      axeViolations: [{ id: 'region', impact: 'minor', nodeCount: 1, targets: ['main'], helpUrl: 'x' }],
    }),
    validEntry(),
  );
  assert.equal(minor.length, 0);
});

test('accessible name, focus visibility, landmark and target size are enforced', () => {
  const cta = validSurface().criticalCta!;
  const failures = checkAccessibilityInvariants(
    validSurface({
      criticalCta: { ...cta, accessibleName: '', focusVisible: false, rect: rect(200, 20, 20, 20) },
      landmarks: [],
    }),
    validEntry(),
  );
  const codes = failures.map((f) => f.code);
  assert.ok(codes.includes('A11Y_MISSING_ACCESSIBLE_NAME'));
  assert.ok(codes.includes('A11Y_FOCUS_NOT_VISIBLE'));
  assert.ok(codes.includes('A11Y_TARGET_SIZE'));
  assert.ok(codes.includes('A11Y_MISSING_LANDMARK'));
});

/* ── Content / state stress ────────────────────────────────────────── */

test('every declared content stress profile has a data-driven spec', () => {
  assert.equal(STRESS_PROFILE_SPECS.length, CONTENT_STRESS_PROFILES.length);
  for (const profile of CONTENT_STRESS_PROFILES) {
    assert.equal(stressProfileSpec(profile).profile, profile);
  }
  assert.ok(stressProfileSpec('loading').allowsLoadingIndicator);
  assert.ok(stressProfileSpec('empty').allowsEmptyContent);
  assert.ok(stressProfileSpec('authenticated').requiresAuthentication);
  assert.ok(stressProfileSpec('state_transition').requiresStateTransition);
});

test('resolved stress profiles merge declared profiles and registered variants', () => {
  const profiles = resolveStressProfiles(
    validEntry({ contentStressProfiles: ['short_text'], stateVariants: ['saved', 'short_text'] }),
  );
  assert.deepEqual([...profiles], ['short_text', 'saved']);
});

/* ── Adapter reconciliation ────────────────────────────────────────── */

test('probeAdapterNegative rejects unregistered route and state identities', async () => {
  const { probeAdapterNegative } = await import(
    '../m55/commercialUx/qualityControl/m55ManifestAdapter'
  );

  assert.ok(
    probeAdapterNegative('unregistered_route').some((f) => f.code === 'ADAPTER_UNREGISTERED_ROUTE'),
  );
  assert.ok(
    probeAdapterNegative('unregistered_state').some((f) => f.code === 'ADAPTER_UNREGISTERED_STATE'),
  );
  assert.ok(probeAdapterNegative('unknown_setup').some((f) => f.code.startsWith('SETUP_')));
  assert.ok(
    probeAdapterNegative('duplicate_ecp').some((f) => f.code === 'MANIFEST_DUPLICATE_SURFACE_ID'),
  );
});

/* ── Approval pack ─────────────────────────────────────────────────── */

test('the approval pack refuses to generate unless every gate is GREEN', () => {
  assert.deepEqual(approvalPackBlockers(GREEN_GATES, []), []);
  assert.equal(approvalPackBlockers({ ...GREEN_GATES, geometryGreen: false }, []).length, 1);
  assert.equal(approvalPackBlockers({ ...GREEN_GATES, semanticGreen: false }, []).length, 1);
  assert.equal(approvalPackBlockers({ ...GREEN_GATES, accessibilityGreen: false }, []).length, 1);
  assert.equal(
    approvalPackBlockers(GREEN_GATES, [
      { code: 'MANIFEST_MISSING_SETUP', message: 'x', diagnostics: {}, selector: null },
    ]).length,
    1,
  );
});

test('the generated pack is candidate-only, hashed and never self-approving', () => {
  const root = mkdtempSync(join(tmpdir(), 'm55-cq-'));
  try {
    const entry = validEntry();
    const pack = generateApprovalPack(root, {
      sourceCommit: 'commit-a',
      manifestDigest: 'digest-a',
      entries: [entry],
      results: [],
      gates: GREEN_GATES,
      changedSurfaces: [entry.surfaceId],
      captures: [{ relativePath: 'alpha-390.png', kind: 'png', data: new Uint8Array([1, 2, 3]) }],
      now: () => new Date('2026-07-30T00:00:00.000Z'),
    });
    assert.equal(pack.provenance.status, 'candidate');
    assert.equal(pack.provenance.humanApprovalRecorded, false);
    assert.equal(pack.provenance.generator, GENERATOR_AUTHORITY);
    assert.equal(pack.provenance.sourceCommit, 'commit-a');
    assert.equal(pack.provenance.manifestDigest, 'digest-a');
    assert.ok(pack.provenance.artifacts.every((a) => a.sha256.length === 64));
    assert.ok(pack.directory.endsWith(APPROVAL_PACK_DIR));
    const html = readFileSync(join(pack.directory, 'contact-sheet.html'), 'utf8');
    assert.match(html, /CANDIDATE/);
    assert.ok(!ALLOWED_APPROVAL_AUTHORITIES.includes(GENERATOR_AUTHORITY as never));

    // A second generation cleans the directory first.
    const second = generateApprovalPack(root, {
      sourceCommit: 'commit-a',
      manifestDigest: 'digest-a',
      entries: [entry],
      results: [],
      gates: GREEN_GATES,
      changedSurfaces: [],
      captures: [],
    });
    assert.equal(second.provenance.artifacts.filter((a) => a.kind === 'png').length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the approval pack throws when a gate is not GREEN', () => {
  const root = mkdtempSync(join(tmpdir(), 'm55-cq-'));
  try {
    assert.throws(() =>
      generateApprovalPack(root, {
        sourceCommit: 'commit-a',
        manifestDigest: 'digest-a',
        entries: [validEntry()],
        results: [],
        gates: { ...GREEN_GATES, geometryGreen: false },
        changedSurfaces: [],
        captures: [],
      }),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ── Baseline promotion state machine ──────────────────────────────── */

function promotion(overrides: Record<string, unknown> = {}) {
  const baseApproval = {
    approvalAuthority: 'durable:approval-record-store' as const,
    independentReviewRef: 'codex-1',
    humanApprovalRef: 'human-1',
    approvedAt: '2026-07-30T00:00:00.000Z',
    sourceCommit: 'commit-a',
    manifestDigest: 'digest-a',
    candidateHashes: { 'a.png': 'hash-a' },
  };
  return {
    surfaceId: 'fixture:surface.alpha',
    fromState: 'candidate' as const,
    toState: 'human-approved' as const,
    gates: GREEN_GATES,
    approval: baseApproval,
    currentSourceCommit: 'commit-a',
    currentManifestDigest: 'digest-a',
    currentCandidateHashes: { 'a.png': 'hash-a' },
    approvalStore: fixtureApprovalStoreOf(
      durablePromotionApprovalRecords({
        independentReviewRef: 'codex-1',
        humanApprovalRef: 'human-1',
        candidateHashes: { 'a.png': 'hash-a' },
      }),
    ),
    ...overrides,
  };
}

test('a complete promotion request is allowed only with resolvable durable records', () => {
  assert.equal(evaluatePromotion(promotion()).allowed, true);
  const { approvalStore: _store, ...withoutStore } = promotion();
  assert.equal(evaluatePromotion(withoutStore).allowed, false);
});

test('machine:self promotion is rejected with PROMOTION_SELF_APPROVAL', () => {
  const decision = evaluatePromotion(
    promotion({
      approval: {
        ...promotion().approval,
        approvalAuthority: GENERATOR_AUTHORITY,
        independentReviewRef: 'machine-self',
        humanApprovalRef: 'machine-self-approved',
      },
    }),
  );
  assert.equal(decision.allowed, false);
  assert.ok(decision.failures.some((f) => f.code === 'PROMOTION_SELF_APPROVAL'));
});

test('fabricated human:commercial-review authority is rejected', () => {
  const decision = evaluatePromotion(
    promotion({
      approval: {
        ...promotion().approval,
        approvalAuthority: 'human:commercial-review',
      },
    }),
  );
  assert.equal(decision.allowed, false);
  assert.ok(
    decision.failures.some((f) => f.code === 'PROMOTION_UNKNOWN_APPROVAL_AUTHORITY'),
  );
});

test('promotion requires geometry, semantic and accessibility GREEN', () => {
  for (const [key, code] of [
    ['geometryGreen', 'PROMOTION_GEOMETRY_NOT_GREEN'],
    ['semanticGreen', 'PROMOTION_SEMANTIC_NOT_GREEN'],
    ['accessibilityGreen', 'PROMOTION_ACCESSIBILITY_NOT_GREEN'],
  ] as const) {
    const decision = evaluatePromotion(
      promotion({ gates: { ...GREEN_GATES, [key]: false } }),
    );
    assert.equal(decision.allowed, false);
    assert.ok(decision.failures.some((f) => f.code === code));
  }
});

test('promotion requires an independent review and a distinct Human approval', () => {
  const noReview = evaluatePromotion(
    promotion({ approval: { ...promotion().approval, independentReviewRef: '' } }),
  );
  assert.ok(noReview.failures.some((f) => f.code === 'PROMOTION_MISSING_INDEPENDENT_REVIEW'));
  const sameRef = evaluatePromotion(
    promotion({
      approval: { ...promotion().approval, humanApprovalRef: 'codex-1', independentReviewRef: 'codex-1' },
    }),
  );
  assert.ok(sameRef.failures.some((f) => f.code === 'PROMOTION_MISSING_HUMAN_APPROVAL'));
});

test('promotion rejects an unknown approval authority and a missing record', () => {
  assert.ok(
    evaluatePromotion(
      promotion({ approval: { ...promotion().approval, approvalAuthority: 'ci:bot' } }),
    ).failures.some((f) => f.code === 'PROMOTION_UNKNOWN_APPROVAL_AUTHORITY'),
  );
  assert.ok(
    evaluatePromotion(promotion({ approval: null })).failures.some(
      (f) => f.code === 'PROMOTION_MISSING_HUMAN_APPROVAL',
    ),
  );
});

test('promotion with durable store resolves independent codex and human records', () => {
  const decision = evaluatePromotion(
    promotion({
      approvalStore: FIXTURE_DURABLE_APPROVAL_STORE,
      approval: {
        approvalAuthority: 'durable:approval-record-store',
        independentReviewRef: 'codex-review-1',
        humanApprovalRef: 'human-approval-1',
        approvedAt: '2026-07-30T00:00:00.000Z',
        sourceCommit: 'commit-a',
        manifestDigest: 'digest-a',
        candidateHashes: { 'home-390.png': 'hash-a' },
      },
      currentCandidateHashes: { 'home-390.png': 'hash-a' },
    }),
  );
  assert.equal(decision.allowed, true);
});

test('candidate-to-canonical direct assignment is rejected', () => {
  const decision = evaluatePromotion(promotion({ fromState: 'none' }));
  assert.equal(decision.allowed, false);
  assert.ok(decision.failures.some((f) => f.code === 'PROMOTION_DIRECT_CANDIDATE_ASSIGNMENT'));
});

test('promotion rejects a changed candidate artifact set', () => {
  const decision = evaluatePromotion(
    promotion({ currentCandidateHashes: { 'a.png': 'hash-a', 'b.png': 'hash-b' } }),
  );
  assert.ok(decision.failures.some((f) => f.code === 'PROMOTION_ALTERED_CANDIDATE_HASH'));
});

/* ── Negative fixtures ─────────────────────────────────────────────── */

const ORIGINAL_NEGATIVE_FIXTURE_IDS = [
  'duplicate_surface',
  'unregistered_route',
  'unregistered_runtime_state',
  'missing_protected_element',
  'clipped_protected_content',
  'horizontal_overflow',
  'fixed_element_obstruction',
  'undersized_cta',
  'route_drift',
  'state_drift',
  'shell_only_page',
  'loading_state_accepted',
  'japanese_punctuation_only_line',
  'neighbor_geometry_discontinuity',
  'automatic_canonical_promotion',
  'stale_source_commit',
  'stale_manifest_digest',
  'altered_candidate_hash',
] as const;

test('the negative fixture set covers all 18 original governed rejections', () => {
  const ids = COMMERCIAL_QUALITY_NEGATIVE_FIXTURES.map((f) => f.id);
  for (const id of ORIGINAL_NEGATIVE_FIXTURE_IDS) {
    assert.ok(ids.includes(id), `missing original negative fixture: ${id}`);
  }
  assert.ok(COMMERCIAL_QUALITY_NEGATIVE_FIXTURES.length >= ORIGINAL_NEGATIVE_FIXTURE_IDS.length);
  assert.equal(new Set(ids).size, ids.length);
});

for (const fixture of COMMERCIAL_QUALITY_NEGATIVE_FIXTURES) {
  test(`negative fixture ${fixture.id} is rejected with ${fixture.expectedCode}`, () => {
    const codes = evaluateFixture(fixture);
    assert.ok(
      codes.includes(fixture.expectedCode),
      `expected ${fixture.expectedCode}, received ${JSON.stringify(codes)}`,
    );
  });
}

test('the healthy baselines behind the fixtures are themselves GREEN', () => {
  assert.deepEqual(validateSurfaceManifest(validManifest()), []);
  assert.deepEqual(green(), []);
});

/* ── Ownership boundary ────────────────────────────────────────────── */

test('the engine declares no project-specific surface knowledge', () => {
  const entry: SurfaceManifestEntry = validEntry();
  // The engine derives everything from the manifest entry it is handed.
  assert.equal(planCases(entry, { contentStressProfiles: ['short_text'] })[0].route, entry.route);
  assert.equal(governedWidths(entry).length, new Set(governedWidths(entry)).size);
});
