import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FREE_BLOCK_ROLE_ORDER_V1,
  FREE_BLOCK_SELECTOR_CATALOG_V1,
  FREE_BLOCK_SELECTOR_IDS_V1,
  INDIVIDUALIZATION_SELECTOR_CATALOG_VERSION_V1,
  PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1,
  PAID_CHAPTER_EMPHASIS_CATALOG_V1,
  PAID_CHAPTER_EMPHASIS_IDS_V1,
  RECOVERY_SELECTOR_CATALOG_V1,
  RECOVERY_SELECTOR_IDS_V1,
  SELECTOR_AXIS_PRIORITY_V1,
  STRAIN_SELECTOR_CATALOG_V1,
  STRAIN_SELECTOR_IDS_V1,
} from './individualizationSelectorCatalogV1';
import type { FreeBlockRoleV1 } from './individualizationSelectorTypesV1';
import { INDIVIDUALIZATION_SELECTOR_VERSION_V1 } from './versions';

const EXPECTED_STRAIN_IDS = [
  'strain__pace_mismatch',
  'strain__decision_overload',
  'strain__distance_tension',
  'strain__recovery_delay',
  'strain__change_uncertainty',
] as const;

const EXPECTED_RECOVERY_IDS = [
  'recovery__small_start',
  'recovery__sort_materials',
  'recovery__pause_first',
  'recovery__speak_to_trusted_person',
  'recovery__reduce_change_scope',
] as const;

const EXPECTED_FREE_BLOCK_IDS = [
  'free__intro__welcome',
  'free__dob_baseline__five_axes',
  'free__current_expression__projection',
  'free__primary_theme__work',
  'free__primary_theme__relation',
  'free__primary_theme__fatigue',
  'free__primary_theme__tendency',
  'free__primary_theme__report_scene',
  'free__align_diverge__distance_diverge',
  'free__align_diverge__distance_align',
  'free__align_diverge__recovery_diverge',
  'free__align_diverge__recovery_align',
  'free__align_diverge__decision_diverge',
  'free__align_diverge__decision_align',
  'free__align_diverge__start_diverge',
  'free__align_diverge__start_align',
  'free__align_diverge__change_diverge',
  'free__align_diverge__change_align',
  'free__strain__pace_mismatch',
  'free__strain__decision_overload',
  'free__strain__distance_tension',
  'free__strain__recovery_delay',
  'free__strain__change_uncertainty',
  'free__strain__none',
  'free__recovery__small_start',
  'free__recovery__sort_materials',
  'free__recovery__pause_first',
  'free__recovery__speak_to_trusted_person',
  'free__recovery__reduce_change_scope',
  'free__paid_depth_point__chapter_I',
  'free__paid_depth_point__chapter_II',
  'free__paid_depth_point__chapter_III',
  'free__paid_depth_point__chapter_IV',
] as const;

const EXPECTED_PAID_EMPHASIS_IDS = [
  'paid_ch1__baseline_landscape',
  'paid_ch1__expression_mirror',
  'paid_ch1__align_diverge_bridge',
  'paid_ch2__start_rhythm',
  'paid_ch2__decision_flow',
  'paid_ch2__change_adaptation',
  'paid_ch3__distance_posture',
  'paid_ch3__decision_in_relation',
  'paid_ch3__recovery_connection',
  'paid_ch4__recovery_pace',
  'paid_ch4__change_life_load',
  'paid_ch4__distance_boundary',
  'paid_ch4__strain_life_context',
] as const;

const FORBIDDEN_FIELD_NAMES = [
  'birthDate',
  'birthTime',
  'birthPlace',
  'nickname',
  'email',
  'userId',
  'clerkId',
  'stripeId',
  'freeExpressionHash',
  'rawAnswer',
  'purchaseIntent',
  'conversionScore',
  'confidence',
  'percentage',
  'displayText',
  'body',
  'prompt',
  'unconditionalFallback',
  'defaultFallback',
  'isDefault',
  'isFallback',
] as const;

function collectIds(): string[] {
  return [
    ...STRAIN_SELECTOR_IDS_V1,
    ...RECOVERY_SELECTOR_IDS_V1,
    ...FREE_BLOCK_SELECTOR_IDS_V1,
    ...PAID_CHAPTER_EMPHASIS_IDS_V1,
  ];
}

function hasForbiddenField(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const hits: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    if ((FORBIDDEN_FIELD_NAMES as readonly string[]).includes(key)) {
      hits.push(path ? `${path}.${key}` : key);
    }
    hits.push(...hasForbiddenField(nested, path ? `${path}.${key}` : key));
  }
  return hits;
}

describe('selectors-v1 catalog', () => {
  it('selector version literal is selectors-v1', () => {
    assert.equal(INDIVIDUALIZATION_SELECTOR_VERSION_V1, 'selectors-v1');
    assert.equal(INDIVIDUALIZATION_SELECTOR_CATALOG_VERSION_V1, 'selectors-v1');
  });

  it('category counts are exact', () => {
    assert.equal(STRAIN_SELECTOR_CATALOG_V1.length, 5);
    assert.equal(RECOVERY_SELECTOR_CATALOG_V1.length, 5);
    assert.equal(FREE_BLOCK_SELECTOR_CATALOG_V1.length, 33);
    assert.equal(PAID_CHAPTER_EMPHASIS_CATALOG_V1.length, 13);
    assert.equal(collectIds().length, 56);
  });

  it('all catalog IDs are unique with zero cross-category collisions', () => {
    const ids = collectIds();
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length);
    assert.equal(unique.size, 56);
  });

  it('canonical ordering matches plan-fixed ID order', () => {
    assert.deepEqual([...STRAIN_SELECTOR_IDS_V1], [...EXPECTED_STRAIN_IDS]);
    assert.deepEqual([...RECOVERY_SELECTOR_IDS_V1], [...EXPECTED_RECOVERY_IDS]);
    assert.deepEqual([...FREE_BLOCK_SELECTOR_IDS_V1], [...EXPECTED_FREE_BLOCK_IDS]);
    assert.deepEqual(
      [...PAID_CHAPTER_EMPHASIS_IDS_V1],
      [...EXPECTED_PAID_EMPHASIS_IDS],
    );
  });

  it('catalog order indices are stable and sequential', () => {
    for (const catalog of [
      STRAIN_SELECTOR_CATALOG_V1,
      RECOVERY_SELECTOR_CATALOG_V1,
      FREE_BLOCK_SELECTOR_CATALOG_V1,
      PAID_CHAPTER_EMPHASIS_CATALOG_V1,
    ]) {
      catalog.forEach((entry, index) => {
        assert.equal(entry.catalogOrder, index + 1);
      });
    }
  });

  it('strain contracts enforce 0-1 max and minimum root evidence count 2', () => {
    for (const entry of STRAIN_SELECTOR_CATALOG_V1) {
      assert.equal(entry.maxSelectedCount, 1);
      assert.equal(entry.minimumRootEvidenceCount, 2);
      assert.equal(entry.minimumNonTargetQuestionLineage, true);
      assert.equal(entry.allowsDerivedDoubleCount, false);
    }
  });

  it('recovery contracts enforce 0-1 max without fallback metadata', () => {
    for (const entry of RECOVERY_SELECTOR_CATALOG_V1) {
      assert.equal(entry.maxSelectedCount, 1);
      const serialized = JSON.stringify(entry);
      assert.equal(serialized.includes('unconditionalFallback'), false);
      assert.equal(serialized.includes('defaultFallback'), false);
      assert.equal(serialized.includes('isDefault'), false);
      assert.equal(serialized.includes('isFallback'), false);
    }
    const smallStart = RECOVERY_SELECTOR_CATALOG_V1.find(
      (entry) => entry.id === 'recovery__small_start',
    );
    assert.ok(smallStart);
    assert.equal(smallStart.priority, 10);
  });

  it('free roles are complete with optional recovery suppressible role', () => {
    const roles = new Set(
      FREE_BLOCK_SELECTOR_CATALOG_V1.map((entry) => entry.role),
    );
    for (const role of FREE_BLOCK_ROLE_ORDER_V1) {
      assert.ok(roles.has(role));
    }
    assert.equal(FREE_BLOCK_ROLE_ORDER_V1.length, 8);
    const recoveryRoleEntries = FREE_BLOCK_SELECTOR_CATALOG_V1.filter(
      (entry) => entry.role === 'recovery',
    );
    assert.equal(recoveryRoleEntries.length, 5);
    assert.ok(
      recoveryRoleEntries.every((entry) => entry.optionalSuppressible === true),
    );
    assert.ok(
      FREE_BLOCK_SELECTOR_CATALOG_V1.some(
        (entry) => entry.id === 'free__strain__none',
      ),
    );
    assert.ok(
      FREE_BLOCK_SELECTOR_CATALOG_V1.some(
        (entry) => entry.id === 'free__primary_theme__report_scene',
      ),
    );
  });

  it('paid chapter ownership is 3/3/3/4 with zero cross-chapter exact ID duplicates', () => {
    assert.equal(PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.I.length, 3);
    assert.equal(PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.II.length, 3);
    assert.equal(PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.III.length, 3);
    assert.equal(PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.IV.length, 4);
    const paidIds = PAID_CHAPTER_EMPHASIS_CATALOG_V1.map((entry) => entry.id);
    assert.equal(new Set(paidIds).size, paidIds.length);
  });

  it('axis priority metadata matches repo-fixed order without runtime import', () => {
    assert.deepEqual(SELECTOR_AXIS_PRIORITY_V1, [
      'distance',
      'recovery',
      'decision',
      'start',
      'change',
    ]);
  });

  it('catalog metadata excludes display copy, PII-shaped, score, and commerce intent fields', () => {
    const catalogs = [
      ...STRAIN_SELECTOR_CATALOG_V1,
      ...RECOVERY_SELECTOR_CATALOG_V1,
      ...FREE_BLOCK_SELECTOR_CATALOG_V1,
      ...PAID_CHAPTER_EMPHASIS_CATALOG_V1,
    ];
    for (const entry of catalogs) {
      assert.equal(entry.category.length > 0, true);
      const forbidden = hasForbiddenField(entry);
      assert.deepEqual(forbidden, []);
    }
  });

  it('catalog exports are static arrays without resolver functions', () => {
    assert.equal(Array.isArray(STRAIN_SELECTOR_CATALOG_V1), true);
    assert.equal(Array.isArray(RECOVERY_SELECTOR_CATALOG_V1), true);
    assert.equal(Array.isArray(FREE_BLOCK_SELECTOR_CATALOG_V1), true);
    assert.equal(Array.isArray(PAID_CHAPTER_EMPHASIS_CATALOG_V1), true);
    for (const value of Object.values({
      STRAIN_SELECTOR_CATALOG_V1,
      RECOVERY_SELECTOR_CATALOG_V1,
      FREE_BLOCK_SELECTOR_CATALOG_V1,
      PAID_CHAPTER_EMPHASIS_CATALOG_V1,
    })) {
      assert.equal(typeof value, 'object');
    }
  });

  it('free role coverage includes all eight roles exactly once in role order authority', () => {
    const roleCounts = FREE_BLOCK_ROLE_ORDER_V1.reduce(
      (counts, role) => {
        counts[role] = FREE_BLOCK_SELECTOR_CATALOG_V1.filter(
          (entry) => entry.role === role,
        ).length;
        return counts;
      },
      {} as Record<FreeBlockRoleV1, number>,
    );
    assert.equal(roleCounts.intro, 1);
    assert.equal(roleCounts.dob_baseline, 1);
    assert.equal(roleCounts.current_expression, 1);
    assert.equal(roleCounts.primary_theme, 5);
    assert.equal(roleCounts.align_diverge, 10);
    assert.equal(roleCounts.strain, 6);
    assert.equal(roleCounts.recovery, 5);
    assert.equal(roleCounts.paid_depth_point, 4);
  });
});
