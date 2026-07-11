import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FREE_BLOCK_ROLE_ORDER_V1,
  STRAIN_SELECTOR_CATALOG_V1,
} from './individualizationSelectorCatalogV1';
import {
  resolveIndividualizationSelectorsV1,
  type ResolveIndividualizationSelectorsInputV1,
} from './resolveIndividualizationSelectorsV1';
import type {
  AlignDivergeItem,
  ExpressionAxes,
  FreeExpression,
} from './types';
import type { FreeBlockSelectorIdV1 } from './individualizationSelectorTypesV1';
import { INDIVIDUALIZATION_SELECTOR_VERSION_V1 } from './versions';

const BASE_AXES: ExpressionAxes = {
  start: 'map',
  decision: 'sort',
  recovery: 'pause',
  distance: 'close',
  change: 'observe',
};

function alignItem(
  axisId: AlignDivergeItem['axisId'],
  relation: AlignDivergeItem['relation'],
): AlignDivergeItem {
  return {
    axisId,
    dobTendency: BASE_AXES[axisId],
    freeTendency: relation === 'align' ? BASE_AXES[axisId] : 'try',
    relation,
    evidenceAnswerIds: [`free.${axisId}_style.sample`],
    uiSlot: 'freeOne',
  };
}

function divergeItem(axisId: AlignDivergeItem['axisId']): AlignDivergeItem {
  const alt: Record<ExpressionAxes[keyof ExpressionAxes], string> = {
    map: 'try',
    try: 'map',
    ask: 'map',
    sort: 'deadline',
    deadline: 'sort',
    wait: 'sort',
    pause: 'shrink',
    shrink: 'pause',
    scene: 'pause',
    close: 'solo',
    middle: 'close',
    solo: 'close',
    observe: 'adjust',
    adjust: 'observe',
    rebuild: 'observe',
  };
  const dob = BASE_AXES[axisId];
  const free = (alt[dob] ?? dob) as AlignDivergeItem['dobTendency'];
  return {
    axisId,
    dobTendency: dob,
    freeTendency: free,
    relation: 'diverge',
    evidenceAnswerIds: [`free.${axisId}_style.alt`],
    uiSlot: 'freeOne',
  };
}

function baseFreeExpression(
  overrides: Partial<FreeExpression> = {},
): FreeExpression {
  return {
    axes: { ...BASE_AXES },
    primaryThemeAnswerId: 'free.primary_theme.work',
    primaryReplyTheme: 'work',
    secondaryReplyTheme: 'tendency',
    freeExpressionHash: 'test-hash-not-used',
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<ResolveIndividualizationSelectorsInputV1> = {},
): ResolveIndividualizationSelectorsInputV1 {
  return {
    selectorVersion: INDIVIDUALIZATION_SELECTOR_VERSION_V1,
    catalogVersion: INDIVIDUALIZATION_SELECTOR_VERSION_V1,
    fingerprintSpecVersion: 'fp-v1',
    dobBase: {
      dobFp: 'dob-fp-test',
      axes: { ...BASE_AXES },
    },
    freeExpression: baseFreeExpression(),
    alignItems: [
      alignItem('start', 'align'),
      alignItem('recovery', 'align'),
      alignItem('distance', 'align'),
      alignItem('change', 'align'),
    ],
    divergeItems: [divergeItem('decision')],
    intensity: { level: 'low', drivers: [] },
    hesitation: {
      present: true,
      drivers: ['paid.decision_friction.too_many'],
      chapterHint: 'II',
    },
    reactiveContext: { scenes: [], drivers: [] },
    replyAffinity: {
      ranked: [
        {
          replyThemeId: 'work',
          reasonCodes: ['primary_theme'],
          evidenceAnswerIds: ['free.primary_theme.work'],
        },
      ],
    },
    paidDepth: {
      chapterBias: { I: 0, II: 2, III: 0, IV: 0 },
      readingStyle: 'paid.reading_style.headline',
      reportUsage: 'paid.report_usage.reread_scene',
      paidDepthHash: 'paid-hash-test',
    },
    freePick: divergeItem('decision'),
    ...overrides,
  };
}

function expectOk(input: ResolveIndividualizationSelectorsInputV1) {
  const result = resolveIndividualizationSelectorsV1(input);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return null;
  return result.value;
}

function expectError(
  input: ResolveIndividualizationSelectorsInputV1,
  code: string,
) {
  const result = resolveIndividualizationSelectorsV1(input);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, code);
  return result.error;
}

describe('A. version and validation', () => {
  it('selectors-v1 accepted', () => {
    const bundle = expectOk(baseInput());
    assert.ok(bundle);
    assert.equal(bundle.version, 'selectors-v1');
  });

  it('unknown selector version rejected', () => {
    expectError(baseInput({ selectorVersion: 'selectors-v9' }), 'unknown_selector_version');
  });

  it('selector/catalog version mismatch rejected', () => {
    expectError(
      baseInput({ catalogVersion: 'catalog-v9' }),
      'selector_version_mismatch',
    );
  });

  it('required derived input missing rejected', () => {
    expectError(
      baseInput({ freeExpression: baseFreeExpression({ primaryReplyTheme: null }) }),
      'selector_resolution_failed',
    );
  });

  it('unknown axis rejected', () => {
    expectError(
      baseInput({
        divergeItems: [
          {
            ...divergeItem('decision'),
            axisId: 'unknown' as AlignDivergeItem['axisId'],
          },
        ],
      }),
      'selector_resolution_failed',
    );
  });

  it('PII-safe error payload', () => {
    const err = expectError(baseInput({ selectorVersion: 'bad' }), 'unknown_selector_version');
    assert.ok(err);
    const serialized = JSON.stringify(err);
    assert.equal(serialized.includes('dob-fp-test'), false);
    assert.equal(serialized.includes('test-hash-not-used'), false);
    assert.equal(serialized.includes('email'), false);
    assert.equal(serialized.includes('userId'), false);
  });
});

describe('B. determinism and purity', () => {
  it('same input repeated returns deep-equal bundle', () => {
    const input = baseInput();
    const a = resolveIndividualizationSelectorsV1(input);
    const b = resolveIndividualizationSelectorsV1(input);
    assert.deepEqual(a, b);
  });

  it('same invalid input repeated returns same error', () => {
    const input = baseInput({ selectorVersion: 'bad' });
    const a = resolveIndividualizationSelectorsV1(input);
    const b = resolveIndividualizationSelectorsV1(input);
    assert.deepEqual(a, b);
  });

  it('input object not mutated', () => {
    const input = baseInput();
    const snap = JSON.stringify(input);
    resolveIndividualizationSelectorsV1(input);
    assert.equal(JSON.stringify(input), snap);
  });

  it('frozen input accepted', () => {
    const input = Object.freeze(baseInput());
    const result = resolveIndividualizationSelectorsV1(input);
    assert.equal(result.ok, true);
  });

  it('catalog not mutated', () => {
    const before = JSON.stringify(STRAIN_SELECTOR_CATALOG_V1);
    resolveIndividualizationSelectorsV1(baseInput());
    const after = JSON.stringify(STRAIN_SELECTOR_CATALOG_V1);
    assert.equal(before, after);
  });

  it('stable order independent of candidate insertion order', () => {
    const inputA = baseInput({
      divergeItems: [divergeItem('distance'), divergeItem('decision')],
      freeExpression: baseFreeExpression({ primaryReplyTheme: 'relation' }),
      hesitation: {
        present: true,
        drivers: ['paid.decision_friction.unclear_end'],
        chapterHint: 'III',
      },
    });
    const inputB = baseInput({
      divergeItems: [divergeItem('decision'), divergeItem('distance')],
      freeExpression: baseFreeExpression({ primaryReplyTheme: 'relation' }),
      hesitation: {
        present: true,
        drivers: ['paid.decision_friction.unclear_end'],
        chapterHint: 'III',
      },
    });
    const a = expectOk(inputA);
    const b = expectOk(inputB);
    assert.deepEqual(a?.strainSelectorIds, b?.strainSelectorIds);
  });
});

describe('C. strain', () => {
  it('zero candidate returns []', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [],
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });

  it('one eligible candidate suppresses strain bundle when chapter IV strain emphasis wins', () => {
    const bundle = expectOk(baseInput());
    assert.deepEqual(bundle?.strainSelectorIds, []);
    assert.ok(
      bundle?.paidChapterEmphasisIds.chapter4.includes('paid_ch4__strain_life_context'),
    );
    assert.ok(
      bundle?.freeBlockSelectorIds.includes('free__strain__decision_overload'),
    );
  });

  it('multiple candidates resolve one by priority before chapter IV suppression', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('distance'), divergeItem('decision')],
        freeExpression: baseFreeExpression({ primaryReplyTheme: 'relation' }),
        hesitation: {
          present: true,
          drivers: ['paid.decision_friction.too_many'],
          chapterHint: 'II',
        },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
    assert.ok(
      bundle?.freeBlockSelectorIds.includes('free__strain__distance_tension'),
    );
  });

  it('minimum two independent roots required', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('start')],
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });

  it('non-target root requirement', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('recovery')],
        hesitation: {
          present: true,
          drivers: ['free.recovery_style.pause_short'],
          chapterHint: 'II',
        },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });

  it('freePick does not add independent strain evidence', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('distance')],
        freePick: divergeItem('distance'),
        freeExpression: baseFreeExpression({ primaryReplyTheme: 'work' }),
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });

  it('diverge alone insufficient', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('change')],
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });

  it('distance tension protection blocks Q4 reactiveContext only', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('distance')],
        freeExpression: baseFreeExpression({ primaryReplyTheme: 'work' }),
        hesitation: { present: false, drivers: [], chapterHint: null },
        reactiveContext: {
          scenes: ['close_careful'],
          drivers: ['free.distance_style.close_careful'],
        },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });

  it('recovery delay protection blocks Q3 reactiveContext only', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('recovery')],
        hesitation: { present: false, drivers: [], chapterHint: null },
        reactiveContext: {
          scenes: ['short_pause'],
          drivers: ['free.recovery_style.pause_short'],
        },
      }),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });
});

describe('D. recovery', () => {
  it('zero candidate returns []', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: {
            ...BASE_AXES,
            recovery: 'scene',
            distance: 'solo',
            decision: 'deadline',
            change: 'rebuild',
          },
        }),
        divergeItems: [],
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    assert.deepEqual(bundle?.recoverySelectorIds, []);
  });

  it('one eligible candidate', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, distance: 'close', recovery: 'pause' },
          primaryReplyTheme: 'relation',
        }),
        divergeItems: [divergeItem('decision')],
      }),
    );
    assert.ok(bundle?.recoverySelectorIds.length === 1);
  });

  it('small_start is not unconditional fallback', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, recovery: 'scene', distance: 'solo' },
        }),
        divergeItems: [],
        alignItems: [alignItem('start', 'align')],
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    assert.deepEqual(bundle?.recoverySelectorIds, []);
  });

  it('pause-first contradiction suppresses pause_first for recovery scene', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, recovery: 'scene' },
        }),
        divergeItems: [divergeItem('decision'), divergeItem('change')],
      }),
    );
    assert.equal(bundle?.recoverySelectorIds.includes('recovery__pause_first'), false);
  });

  it('trusted-person contradiction suppresses for solo distance', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, distance: 'solo' },
          primaryReplyTheme: 'relation',
        }),
      }),
    );
    assert.equal(
      bundle?.recoverySelectorIds.includes('recovery__speak_to_trusted_person'),
      false,
    );
  });

  it('fatigue/small-start contradiction prefers pause_first when both eligible', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, recovery: 'pause' },
        }),
        alignItems: [alignItem('start', 'align'), alignItem('recovery', 'align')],
        divergeItems: [divergeItem('decision'), divergeItem('change')],
        reactiveContext: {
          scenes: ['before_start'],
          drivers: ['paid.fatigue_signal.before_start'],
        },
      }),
    );
    assert.deepEqual(bundle?.recoverySelectorIds, ['recovery__pause_first']);
  });

  it('stable priority and ID tie-break favors pause_first over speak_to_trusted', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, distance: 'close', recovery: 'pause' },
          primaryReplyTheme: 'relation',
        }),
        divergeItems: [divergeItem('decision')],
      }),
    );
    assert.deepEqual(bundle?.recoverySelectorIds, ['recovery__pause_first']);
  });
});

describe('E. free roles', () => {
  it('recovery absent yields exact 7 selectors', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, recovery: 'scene', distance: 'solo' },
        }),
        divergeItems: [],
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    assert.equal(bundle?.freeBlockSelectorIds.length, 7);
    assert.equal(
      bundle?.freeBlockSelectorIds.includes('free__recovery__pause_first'),
      false,
    );
  });

  it('recovery present yields exact 8 selectors', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          axes: { ...BASE_AXES, recovery: 'pause' },
        }),
        divergeItems: [divergeItem('decision')],
      }),
    );
    assert.equal(bundle?.freeBlockSelectorIds.length, 8);
    assert.ok(
      bundle?.freeBlockSelectorIds.some((id) => id.startsWith('free__recovery__')),
    );
  });

  it('FREE_BLOCK_ROLE_ORDER_V1 preserved', () => {
    const bundle = expectOk(baseInput());
    assert.ok(bundle);
    const roles = FREE_BLOCK_ROLE_ORDER_V1.filter(
      (role) => role !== 'recovery' || bundle.recoverySelectorIds.length > 0,
    );
    const ids: readonly FreeBlockSelectorIdV1[] = bundle.freeBlockSelectorIds;
    for (let i = 0; i < roles.length; i += 1) {
      const role = roles[i]!;
      const id = ids[i]!;
      if (role === 'intro') assert.equal(id, 'free__intro__welcome');
      if (role === 'primary_theme') assert.equal(id, 'free__primary_theme__work');
    }
  });

  it('strain none fallback used only in free strain role', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [],
        hesitation: { present: false, drivers: [], chapterHint: null },
      }),
    );
    const strainIdx = bundle!.freeBlockSelectorIds.findIndex((id) =>
      id.startsWith('free__strain__'),
    );
    assert.ok(strainIdx >= 0);
    assert.equal(bundle?.freeBlockSelectorIds[strainIdx], 'free__strain__none');
  });

  it('primary theme mapping uses neutral report_scene', () => {
    const bundle = expectOk(
      baseInput({
        freeExpression: baseFreeExpression({
          primaryReplyTheme: 'report',
          primaryThemeAnswerId: 'free.primary_theme.report_preview',
        }),
      }),
    );
    assert.ok(bundle?.freeBlockSelectorIds.includes('free__primary_theme__report_scene'));
  });

  it('align/diverge mapping from freePick', () => {
    const bundle = expectOk(
      baseInput({
        freePick: divergeItem('distance'),
      }),
    );
    assert.ok(
      bundle?.freeBlockSelectorIds.includes('free__align_diverge__distance_diverge'),
    );
  });

  it('paid-depth chapter hint mapping', () => {
    const bundle = expectOk(
      baseInput({
        hesitation: {
          present: true,
          drivers: ['paid.decision_friction.unclear_end'],
          chapterHint: 'III',
        },
      }),
    );
    assert.ok(
      bundle?.freeBlockSelectorIds.includes('free__paid_depth_point__chapter_III'),
    );
  });

  it('paid-depth chapterBias fallback', () => {
    const bundle = expectOk(
      baseInput({
        hesitation: { present: false, drivers: [], chapterHint: null },
        paidDepth: {
          chapterBias: { I: 0, II: 0, III: 0, IV: 3 },
          readingStyle: null,
          reportUsage: null,
          paidDepthHash: 'paid',
        },
      }),
    );
    assert.ok(
      bundle?.freeBlockSelectorIds.includes('free__paid_depth_point__chapter_IV'),
    );
  });

  it('final chapter-I fallback when no hint or bias', () => {
    const bundle = expectOk(
      baseInput({
        hesitation: { present: false, drivers: [], chapterHint: null },
        paidDepth: null,
      }),
    );
    assert.ok(
      bundle?.freeBlockSelectorIds.includes('free__paid_depth_point__chapter_I'),
    );
  });

  it('no duplicate free IDs', () => {
    const bundle = expectOk(baseInput());
    const ids = bundle?.freeBlockSelectorIds ?? [];
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('F. paid emphasis', () => {
  it('all four chapters present with 1-3 each', () => {
    const bundle = expectOk(baseInput());
    assert.ok(bundle);
    for (const chapter of ['chapter1', 'chapter2', 'chapter3', 'chapter4'] as const) {
      const ids = bundle.paidChapterEmphasisIds[chapter];
      assert.ok(ids.length >= 1 && ids.length <= 3);
    }
  });

  it('cross-chapter exact duplicate suppressed', () => {
    const bundle = expectOk(baseInput());
    const all = [
      ...bundle!.paidChapterEmphasisIds.chapter1,
      ...bundle!.paidChapterEmphasisIds.chapter2,
      ...bundle!.paidChapterEmphasisIds.chapter3,
      ...bundle!.paidChapterEmphasisIds.chapter4,
    ];
    assert.equal(new Set(all).size, all.length);
  });

  it('chapter IV strain context suppresses strain bundle when emphasis selected', () => {
    const bundle = expectOk(
      baseInput({
        divergeItems: [divergeItem('distance'), divergeItem('decision')],
        freeExpression: baseFreeExpression({ primaryReplyTheme: 'relation' }),
        hesitation: {
          present: true,
          drivers: ['paid.decision_friction.too_many'],
          chapterHint: 'II',
        },
      }),
    );
    assert.ok(
      bundle?.paidChapterEmphasisIds.chapter4.includes('paid_ch4__strain_life_context'),
    );
    assert.deepEqual(bundle?.strainSelectorIds, []);
  });
});

describe('G. error model', () => {
  it('covers unknown_selector_version', () => {
    expectError(baseInput({ selectorVersion: 'x' }), 'unknown_selector_version');
  });

  it('covers selector_version_mismatch', () => {
    expectError(baseInput({ catalogVersion: 'x' }), 'selector_version_mismatch');
  });

  it('covers selector_resolution_failed', () => {
    expectError(
      baseInput({ fingerprintSpecVersion: 'fp-v9' }),
      'selector_resolution_failed',
    );
  });
});
