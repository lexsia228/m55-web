/**
 * fp-v1 individualization variance QA (synthetic DOB × free-v1 × paid-v1).
 * Pure-function data diffs only — no UI / DB / Stripe / real user data.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDobAxisLookupV1,
  dayBandFromDay,
  dayBandIndex,
} from './dobAxisLookupV1';
import {
  buildIndividualizationDraftSnapshotV1,
  buildIndividualizationFingerprintV1,
} from './buildIndividualizationV1';
import { pickFreeAlignDivergeItemV1 } from './alignDivergeV1';
import type { ChangeTendency, DistanceTendency } from './types';

const ENGINE = 'variance-qa-engine';
const CATALOG = 'variance-qa-catalog';
const REPORT = 'variance-qa-report';
const GENERATED_AT = '2026-07-09T00:00:00.000Z';

/** Decade + boundary + leap synthetic DOBs (QA plan §3). */
const DECADE_DOBS = [
  '1955-06-15',
  '1963-03-10',
  '1968-11-21',
  '1972-01-01',
  '1977-08-20',
  '1983-04-11',
  '1989-12-31',
  '1992-07-15',
  '1998-02-28',
  '2001-05-10',
  '2005-09-21',
  '2012-10-01',
  '2000-02-29',
] as const;

/** dayBand boundary synthetic DOBs (QA plan §3.2). */
const DAYBAND_BOUNDARY_DOBS = [
  '1990-01-01',
  '1990-01-10',
  '1990-01-11',
  '1990-01-20',
  '1990-01-21',
  '1990-01-28',
  '1990-01-29',
  '1990-01-31',
] as const;

const EXPECTED_DAYBAND: Record<(typeof DAYBAND_BOUNDARY_DOBS)[number], 'early' | 'mid' | 'late'> = {
  '1990-01-01': 'early',
  '1990-01-10': 'early',
  '1990-01-11': 'mid',
  '1990-01-20': 'mid',
  '1990-01-21': 'late',
  '1990-01-28': 'late',
  '1990-01-29': 'late',
  '1990-01-31': 'late',
};

/** One DOB per calendar month (season3 coverage). */
const MONTH_DOBS = [
  '1990-01-15',
  '1990-02-15',
  '1990-03-15',
  '1990-04-15',
  '1990-05-15',
  '1990-06-15',
  '1990-07-15',
  '1990-08-15',
  '1990-09-15',
  '1990-10-15',
  '1990-11-15',
  '1990-12-15',
] as const;

function freeSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.map_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.observe_first',
    'free.primary_theme': 'free.primary_theme.work',
    ...overrides,
  };
}

function paidSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'paid.work_focus': 'paid.work_focus.priority',
    'paid.decision_friction': 'paid.decision_friction.too_many',
    'paid.relation_focus': 'paid.relation_focus.words',
    'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
    'paid.report_usage': 'paid.report_usage.reread_scene',
    'paid.reading_style': 'paid.reading_style.headline',
    ...overrides,
  };
}

function draftOf(input: {
  birthDate: string;
  stemLaneIndex: number;
  freeAnswerSet: Record<string, string>;
  paidAnswerSet?: Record<string, string> | null;
}) {
  const paidAnswerSet =
    input.paidAnswerSet === undefined ? paidSet() : input.paidAnswerSet;
  return buildIndividualizationDraftSnapshotV1({
    birthDate: input.birthDate,
    stemLaneIndex: input.stemLaneIndex,
    freeAnswerSet: input.freeAnswerSet,
    paidAnswerSet,
    engineVersion: ENGINE,
    catalogVersion: CATALOG,
    reportLogicVersion: REPORT,
    generatedAt: GENERATED_AT,
    templateBlockIds: ['variance-block'],
    includeInternalSelectors: true,
  });
}

function assertNoLeakage(raw: string, label: string) {
  for (const bad of [
    'diagnosis',
    'consultation',
    'advice',
    'fortune',
    'horoscope',
    'rawPrompt',
    'rawResponse',
    'systemPrompt',
    'stripeSecret',
    'clerkSecret',
    'serviceRole',
    'userId',
    'email',
    '"birthDate"',
    '"score"',
    '相談返書',
    '相談サービス',
  ]) {
    assert.equal(raw.includes(bad), false, `${label}: leaked ${bad}`);
  }
}

function assertEvidenceNonEmpty(
  alignItems: { evidenceAnswerIds: string[] }[],
  divergeItems: { evidenceAnswerIds: string[] }[],
  ranked: { evidenceAnswerIds: string[] }[],
) {
  for (const it of [...alignItems, ...divergeItems]) {
    assert.ok(it.evidenceAnswerIds.length >= 1);
  }
  for (const row of ranked) {
    assert.ok(row.evidenceAnswerIds.length >= 1);
  }
}

describe('fp-v1 variance QA — DOB coverage', () => {
  it('decade + boundary + leap DOBs build successfully', () => {
    for (const birthDate of DECADE_DOBS) {
      const r = buildDobAxisLookupV1({ birthDate, stemLaneIndex: 0 });
      assert.equal(r.ok, true, birthDate);
    }
  });

  it('dayBand boundary DOBs map to expected bands', () => {
    for (const birthDate of DAYBAND_BOUNDARY_DOBS) {
      const day = Number(birthDate.slice(-2));
      assert.equal(dayBandFromDay(day), EXPECTED_DAYBAND[birthDate], birthDate);
      const r = buildDobAxisLookupV1({ birthDate, stemLaneIndex: 0 });
      assert.equal(r.ok, true, birthDate);
      if (!r.ok) continue;
      assert.equal(r.value.internalSelectors.dayBand, EXPECTED_DAYBAND[birthDate], birthDate);
    }
  });

  it('months 1–12 and season3 0/1/2 all appear; leap 2/29 is late', () => {
    const seasons = new Set<number>();
    const months = new Set<number>();
    for (const birthDate of MONTH_DOBS) {
      const r = buildDobAxisLookupV1({ birthDate, stemLaneIndex: 0 });
      assert.equal(r.ok, true, birthDate);
      if (!r.ok) continue;
      const month = r.value.internalSelectors.monthBand + 1;
      months.add(month);
      seasons.add(r.value.internalSelectors.monthBand % 3);
    }
    assert.equal(months.size, 12);
    assert.deepEqual([...seasons].sort(), [0, 1, 2]);

    const leap = buildDobAxisLookupV1({ birthDate: '2000-02-29', stemLaneIndex: 0 });
    assert.equal(leap.ok, true);
    if (!leap.ok) return;
    assert.equal(leap.value.internalSelectors.dayBand, 'late');
  });
});

describe('fp-v1 variance QA — stemLaneIndex coverage', () => {
  it('stem 0–9 produce all distance and change patterns', () => {
    const distances = new Set<DistanceTendency>();
    const changes = new Set<ChangeTendency>();
    const stemsSeen = new Set<number>();

    // early / mid / late fixed days × stems 0–9
    const dayBandDobs = ['1990-01-05', '1990-01-15', '1990-01-25'] as const;
    for (const birthDate of dayBandDobs) {
      for (let stem = 0; stem <= 9; stem += 1) {
        const r = buildDobAxisLookupV1({ birthDate, stemLaneIndex: stem });
        assert.equal(r.ok, true, `${birthDate} stem=${stem}`);
        if (!r.ok) continue;
        stemsSeen.add(stem);
        distances.add(r.value.dobBase.axes.distance);
        changes.add(r.value.dobBase.axes.change);

        const expectedDistance = (['close', 'middle', 'solo'] as const)[stem % 3]!;
        const dbi = dayBandIndex(r.value.internalSelectors.dayBand);
        const expectedChange = (['observe', 'adjust', 'rebuild'] as const)[
          (stem + dbi) % 3
        ]!;
        assert.equal(r.value.dobBase.axes.distance, expectedDistance);
        assert.equal(r.value.dobBase.axes.change, expectedChange);
      }
    }

    assert.equal(stemsSeen.size, 10);
    assert.deepEqual([...distances].sort(), ['close', 'middle', 'solo'].sort());
    assert.deepEqual([...changes].sort(), ['adjust', 'observe', 'rebuild'].sort());
  });
});

describe('fp-v1 variance QA — free-v1 answer variance', () => {
  const DOB = '1992-07-15';
  const STEM = 3;

  const FREE_VARIANTS: Array<{ id: string; free: Record<string, string> }> = [
    { id: 'F0', free: freeSet() },
    {
      id: 'F1',
      free: freeSet({ 'free.start_style': 'free.start_style.try_first' }),
    },
    {
      id: 'F2',
      free: freeSet({ 'free.distance_style': 'free.distance_style.solo_reset' }),
    },
    {
      id: 'F3',
      free: freeSet({ 'free.recovery_style': 'free.recovery_style.shrink_task' }),
    },
    {
      id: 'F4',
      free: freeSet({ 'free.decision_style': 'free.decision_style.wait_first' }),
    },
    {
      id: 'F5',
      free: freeSet({ 'free.change_style': 'free.change_style.rebuild_slow' }),
    },
    {
      id: 'F6',
      free: freeSet({ 'free.primary_theme': 'free.primary_theme.relation' }),
    },
    {
      id: 'F7',
      free: freeSet({ 'free.primary_theme': 'free.primary_theme.report_preview' }),
    },
    {
      id: 'F8',
      free: freeSet({
        'free.start_style': 'free.start_style.ask_first',
        'free.decision_style': 'free.decision_style.wait_first',
        'free.recovery_style': 'free.recovery_style.change_scene',
        'free.distance_style': 'free.distance_style.solo_reset',
        'free.change_style': 'free.change_style.rebuild_slow',
        'free.primary_theme': 'free.primary_theme.fatigue',
      }),
    },
  ];

  it('same DOB different free changes axes / align-diverge / pick / hashes', () => {
    const base = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: FREE_VARIANTS[0]!.free,
      paidAnswerSet: paidSet(),
    });
    assert.equal(base.ok, true);
    if (!base.ok) return;

    for (const variant of FREE_VARIANTS.slice(1)) {
      const d = draftOf({
        birthDate: DOB,
        stemLaneIndex: STEM,
        freeAnswerSet: variant.free,
        paidAnswerSet: paidSet(),
      });
      assert.equal(d.ok, true, variant.id);
      if (!d.ok) continue;

      const freeExprChanged: boolean =
        JSON.stringify(base.value.fingerprint.freeExpression) !==
        JSON.stringify(d.value.fingerprint.freeExpression);
      const axesChanged: boolean =
        JSON.stringify(base.value.fingerprint.freeExpression.axes) !==
        JSON.stringify(d.value.fingerprint.freeExpression.axes);
      const alignChanged: boolean =
        JSON.stringify(base.value.fingerprint.alignItems) !==
          JSON.stringify(d.value.fingerprint.alignItems) ||
        JSON.stringify(base.value.fingerprint.divergeItems) !==
          JSON.stringify(d.value.fingerprint.divergeItems);
      const pickBase = pickFreeAlignDivergeItemV1({
        alignItems: base.value.fingerprint.alignItems,
        divergeItems: base.value.fingerprint.divergeItems,
      });
      const pickVar = pickFreeAlignDivergeItemV1({
        alignItems: d.value.fingerprint.alignItems,
        divergeItems: d.value.fingerprint.divergeItems,
      });
      const pickChanged: boolean = JSON.stringify(pickBase) !== JSON.stringify(pickVar);
      const freeHashChanged: boolean =
        base.value.questionnaire.freeAnswerHash !== d.value.questionnaire.freeAnswerHash;
      const outputHashChanged: boolean =
        base.value.audit.outputHash !== d.value.audit.outputHash;

      // Axis-only variants must move axes/align/pick; theme-only (F6/F7) moves freeExpression theme fields.
      if (variant.id === 'F6' || variant.id === 'F7') {
        assert.equal(freeExprChanged, true, `${variant.id}: freeExpression`);
        assert.notEqual(
          base.value.fingerprint.freeExpression.primaryReplyTheme,
          d.value.fingerprint.freeExpression.primaryReplyTheme,
          `${variant.id}: primaryReplyTheme`,
        );
      } else {
        assert.ok(
          axesChanged || alignChanged || pickChanged,
          `${variant.id}: free structural fingerprint unchanged`,
        );
      }
      assert.equal(freeHashChanged, true, `${variant.id}: freeAnswerHash`);
      assert.equal(outputHashChanged, true, `${variant.id}: outputHash`);

      assertEvidenceNonEmpty(
        d.value.fingerprint.alignItems,
        d.value.fingerprint.divergeItems,
        d.value.fingerprint.replyAffinity.ranked,
      );
      assertNoLeakage(JSON.stringify(d.value), variant.id);
    }
  });
});

describe('fp-v1 variance QA — paid-v1 answer variance', () => {
  const DOB = '1983-04-11';
  const STEM = 4;
  const FREE = freeSet();

  const PAID_VARIANTS: Array<{
    id: string;
    paid: Record<string, string> | null;
  }> = [
    { id: 'P0', paid: paidSet() },
    {
      id: 'P1',
      paid: paidSet({
        'paid.work_focus': 'paid.work_focus.pace',
        'paid.decision_friction': 'paid.decision_friction.fear_mistake',
      }),
    },
    {
      id: 'P2',
      paid: paidSet({
        'paid.decision_friction': 'paid.decision_friction.unclear_end',
      }),
    },
    {
      id: 'P3',
      paid: paidSet({
        'paid.relation_focus': 'paid.relation_focus.recovery',
        'paid.fatigue_signal': 'paid.fatigue_signal.long_stretch',
      }),
    },
    {
      id: 'P4',
      paid: paidSet({
        'paid.report_usage': 'paid.report_usage.note_take',
        'paid.reading_style': 'paid.reading_style.compare',
      }),
    },
    { id: 'P5', paid: null },
  ];

  it('same DOB same free different paid changes depth / signals / affinity / hashes', () => {
    const base = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: FREE,
      paidAnswerSet: PAID_VARIANTS[0]!.paid,
    });
    assert.equal(base.ok, true);
    if (!base.ok) return;

    for (const variant of PAID_VARIANTS.slice(1)) {
      const d = draftOf({
        birthDate: DOB,
        stemLaneIndex: STEM,
        freeAnswerSet: FREE,
        paidAnswerSet: variant.paid,
      });
      assert.equal(d.ok, true, variant.id);
      if (!d.ok) continue;

      assert.notDeepEqual(
        base.value.fingerprint.paidDepth,
        d.value.fingerprint.paidDepth,
        `${variant.id}: paidDepth`,
      );

      const biasChanged: boolean =
        JSON.stringify(base.value.fingerprint.paidDepth?.chapterBias ?? null) !==
        JSON.stringify(d.value.fingerprint.paidDepth?.chapterBias ?? null);
      const intensityChanged: boolean =
        JSON.stringify(base.value.fingerprint.intensity) !==
        JSON.stringify(d.value.fingerprint.intensity);
      const hesitationChanged: boolean =
        JSON.stringify(base.value.fingerprint.hesitation) !==
        JSON.stringify(d.value.fingerprint.hesitation);
      const readingOrUsageChanged: boolean =
        (base.value.fingerprint.paidDepth?.readingStyle ?? null) !==
          (d.value.fingerprint.paidDepth?.readingStyle ?? null) ||
        (base.value.fingerprint.paidDepth?.reportUsage ?? null) !==
          (d.value.fingerprint.paidDepth?.reportUsage ?? null);
      const affinityChanged: boolean =
        JSON.stringify(base.value.fingerprint.replyAffinity.ranked) !==
        JSON.stringify(d.value.fingerprint.replyAffinity.ranked);

      // Chapter-driving variants move bias/intensity/hesitation; P4 may move reading/report only.
      assert.ok(
        biasChanged || intensityChanged || hesitationChanged || readingOrUsageChanged,
        `${variant.id}: paidDepth signals unchanged`,
      );
      assert.equal(affinityChanged, true, `${variant.id}: replyAffinity`);
      assert.notEqual(
        base.value.questionnaire.paidAnswerHash,
        d.value.questionnaire.paidAnswerHash,
        `${variant.id}: paidAnswerHash`,
      );
      assert.notEqual(
        base.value.audit.outputHash,
        d.value.audit.outputHash,
        `${variant.id}: outputHash`,
      );

      if (variant.id === 'P2') {
        assert.equal(d.value.fingerprint.hesitation.present, true);
        assert.equal(d.value.fingerprint.hesitation.chapterHint, 'III');
      }
      if (variant.id === 'P5') {
        assert.equal(d.value.fingerprint.paidDepth, null);
        assert.equal(d.value.questionnaire.paidAnswerHash, null);
      }

      assertEvidenceNonEmpty(
        d.value.fingerprint.alignItems,
        d.value.fingerprint.divergeItems,
        d.value.fingerprint.replyAffinity.ranked,
      );
      assertNoLeakage(JSON.stringify(d.value), variant.id);
    }
  });
});

describe('fp-v1 variance QA — anti-template', () => {
  it('identical inputs → identical outputHash', () => {
    const input = {
      birthDate: '1977-08-20',
      stemLaneIndex: 2,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
    };
    const a = draftOf(input);
    const b = draftOf(input);
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.value.audit.outputHash, b.value.audit.outputHash);
    assert.deepEqual(a.value.fingerprint.dobBase, b.value.fingerprint.dobBase);
  });

  it('same free different DOB changes dobBase / align-diverge / outputHash', () => {
    const free = freeSet();
    const paid = paidSet();
    const a = draftOf({
      birthDate: '1963-03-10',
      stemLaneIndex: 1,
      freeAnswerSet: free,
      paidAnswerSet: paid,
    });
    const b = draftOf({
      birthDate: '2005-09-21',
      stemLaneIndex: 1,
      freeAnswerSet: free,
      paidAnswerSet: paid,
    });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notDeepEqual(a.value.fingerprint.dobBase, b.value.fingerprint.dobBase);
    const alignOrDivergeChanged =
      JSON.stringify(a.value.fingerprint.alignItems) !==
        JSON.stringify(b.value.fingerprint.alignItems) ||
      JSON.stringify(a.value.fingerprint.divergeItems) !==
        JSON.stringify(b.value.fingerprint.divergeItems);
    assert.equal(alignOrDivergeChanged, true);
    assert.notEqual(a.value.audit.outputHash, b.value.audit.outputHash);
  });

  it('evidence empty rate 0%; no score / birthDate / diagnosis fields', () => {
    const samples = [
      draftOf({
        birthDate: '1968-11-21',
        stemLaneIndex: 0,
        freeAnswerSet: freeSet(),
        paidAnswerSet: paidSet(),
      }),
      draftOf({
        birthDate: '1998-02-28',
        stemLaneIndex: 7,
        freeAnswerSet: freeSet({
          'free.distance_style': 'free.distance_style.solo_reset',
        }),
        paidAnswerSet: paidSet({
          'paid.decision_friction': 'paid.decision_friction.unclear_end',
        }),
      }),
      draftOf({
        birthDate: '2001-05-10',
        stemLaneIndex: 9,
        freeAnswerSet: freeSet({ 'free.primary_theme': 'free.primary_theme.tendency' }),
        paidAnswerSet: null,
      }),
    ];

    for (const s of samples) {
      assert.equal(s.ok, true);
      if (!s.ok) continue;
      assertEvidenceNonEmpty(
        s.value.fingerprint.alignItems,
        s.value.fingerprint.divergeItems,
        s.value.fingerprint.replyAffinity.ranked,
      );
      assertNoLeakage(JSON.stringify(s.value), 'anti-template sample');
    }
  });

  it('fail-closed on invalid DOB / bad stem / unknown answer_id', () => {
    assert.equal(
      buildIndividualizationFingerprintV1({
        birthDate: '2001-02-29',
        stemLaneIndex: 0,
        freeAnswerSet: freeSet(),
      }).ok,
      false,
    );
    assert.equal(
      buildIndividualizationFingerprintV1({
        birthDate: '1990-01-15',
        stemLaneIndex: 10,
        freeAnswerSet: freeSet(),
      }).ok,
      false,
    );
    assert.equal(
      buildIndividualizationFingerprintV1({
        birthDate: '1990-01-15',
        stemLaneIndex: 0,
        freeAnswerSet: freeSet({
          'free.start_style': 'free.start_style.not_a_real_id',
        }),
      }).ok,
      false,
    );
    assert.equal(
      buildIndividualizationFingerprintV1({
        birthDate: '1990-01-15',
        stemLaneIndex: 0,
        freeAnswerSet: freeSet(),
        paidAnswerSet: paidSet({
          'paid.work_focus': 'paid.work_focus.unknown',
        }),
      }).ok,
      false,
    );
  });
});

describe('fp-v1 variance QA — selectors-v1 and gmfn-v2', () => {
  const DOB = '1992-07-15';
  const STEM = 3;

  function assertSelectorDraftOk(
    draft: ReturnType<typeof buildIndividualizationDraftSnapshotV1>,
    label: string,
  ) {
    assert.equal(draft.ok, true, label);
    if (!draft.ok) return;
    assert.ok(draft.value.fingerprint.selectors, `${label}: selectors missing`);
    assert.equal(draft.value.fingerprint.selectors!.version, 'selectors-v1', label);
    assert.equal(
      draft.value.audit.sourceVersions.selectorVersion,
      'selectors-v1',
      label,
    );
    assert.equal(draft.value.audit.sourceVersions.fieldNamingVersion, 'gmfn-v2', label);
    assert.ok(
      draft.value.fingerprint.selectors!.freeBlockSelectorIds.length > 0,
      `${label}: empty free selector bundle`,
    );
    assertNoLeakage(JSON.stringify(draft.value), label);
  }

  it('selector-enabled drafts are present on representative variance fixtures', () => {
    for (const birthDate of DECADE_DOBS.slice(0, 3)) {
      assertSelectorDraftOk(
        draftOf({
          birthDate,
          stemLaneIndex: 2,
          freeAnswerSet: freeSet(),
          paidAnswerSet: paidSet(),
        }),
        birthDate,
      );
    }
  });

  it('same input determinism holds for selectors and gmfn-v2 hash', () => {
    const input = {
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
    };
    const a = draftOf(input);
    const b = draftOf(input);
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.deepEqual(a.value.fingerprint.selectors, b.value.fingerprint.selectors);
    assert.equal(a.value.audit.outputHash, b.value.audit.outputHash);
    assert.equal(a.value.audit.sourceVersions.fieldNamingVersion, 'gmfn-v2');
  });

  it('same DOB changed free answers produce selector and hash differences', () => {
    const base = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
    });
    const changed = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: freeSet({
        'free.distance_style': 'free.distance_style.solo_reset',
      }),
      paidAnswerSet: paidSet(),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notDeepEqual(base.value.fingerprint.selectors, changed.value.fingerprint.selectors);
    assert.notEqual(base.value.audit.outputHash, changed.value.audit.outputHash);
  });

  it('same DOB changed primary theme produces theme-dependent selector/hash difference', () => {
    const base = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: freeSet({ 'free.primary_theme': 'free.primary_theme.work' }),
      paidAnswerSet: paidSet(),
    });
    const theme = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: freeSet({ 'free.primary_theme': 'free.primary_theme.fatigue' }),
      paidAnswerSet: paidSet(),
    });
    assert.equal(base.ok && theme.ok, true);
    if (!base.ok || !theme.ok) return;
    assert.notDeepEqual(base.value.fingerprint.selectors, theme.value.fingerprint.selectors);
    assert.notEqual(base.value.audit.outputHash, theme.value.audit.outputHash);
  });

  it('paid answer change produces paid selector and gmfn-v2 hash difference', () => {
    const base = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
    });
    const changed = draftOf({
      birthDate: DOB,
      stemLaneIndex: STEM,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet({
        'paid.work_focus': 'paid.work_focus.pace',
        'paid.decision_friction': 'paid.decision_friction.fear_mistake',
        'paid.relation_focus': 'paid.relation_focus.timing',
        'paid.fatigue_signal': 'paid.fatigue_signal.long_stretch',
      }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notDeepEqual(base.value.fingerprint.paidDepth, changed.value.fingerprint.paidDepth);
    assert.notEqual(base.value.audit.outputHash, changed.value.audit.outputHash);
  });

  it('free-v1 full answer-state matrix connects to selector projection variance', () => {
    const starts = [
      'free.start_style.map_first',
      'free.start_style.try_first',
      'free.start_style.ask_first',
    ] as const;
    const decisions = [
      'free.decision_style.sort_first',
      'free.decision_style.deadline_first',
      'free.decision_style.wait_first',
    ] as const;
    const recoveries = [
      'free.recovery_style.pause_short',
      'free.recovery_style.shrink_task',
      'free.recovery_style.change_scene',
    ] as const;
    const distances = [
      'free.distance_style.close_careful',
      'free.distance_style.middle_steady',
      'free.distance_style.solo_reset',
    ] as const;
    const changes = [
      'free.change_style.observe_first',
      'free.change_style.adjust_fast',
      'free.change_style.rebuild_slow',
    ] as const;
    const themes = [
      'free.primary_theme.work',
      'free.primary_theme.relation',
      'free.primary_theme.fatigue',
      'free.primary_theme.tendency',
      'free.primary_theme.report_preview',
    ] as const;

    const hashes = new Set<string>();
    const selectorBundles = new Set<string>();
    let validCount = 0;

    for (const start of starts) {
      for (const decision of decisions) {
        for (const recovery of recoveries) {
          for (const distance of distances) {
            for (const change of changes) {
              for (const theme of themes) {
                const draft = draftOf({
                  birthDate: DOB,
                  stemLaneIndex: STEM,
                  freeAnswerSet: {
                    'free.start_style': start,
                    'free.decision_style': decision,
                    'free.recovery_style': recovery,
                    'free.distance_style': distance,
                    'free.change_style': change,
                    'free.primary_theme': theme,
                  },
                  paidAnswerSet: paidSet(),
                });
                assert.equal(draft.ok, true);
                if (!draft.ok) continue;
                validCount += 1;
                assert.ok(draft.value.fingerprint.selectors);
                assert.ok(
                  draft.value.fingerprint.selectors!.freeBlockSelectorIds.length > 0,
                );
                hashes.add(draft.value.audit.outputHash);
                selectorBundles.add(JSON.stringify(draft.value.fingerprint.selectors));
              }
            }
          }
        }
      }
    }

    assert.equal(validCount, 1215);
    assert.ok(selectorBundles.size > 1, 'selector bundle variance collapsed');
    assert.ok(hashes.size > 1, 'gmfn-v2 hash variance collapsed');
  });

  it('no mixed-version state and no selector omission collapse on valid drafts', () => {
    const draft = draftOf({
      birthDate: '1983-04-11',
      stemLaneIndex: 4,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.value.fingerprint.fingerprintSpecVersion, 'fp-v1');
    assert.equal(draft.value.fingerprint.selectors!.version, 'selectors-v1');
    assert.equal(draft.value.audit.sourceVersions.selectorVersion, 'selectors-v1');
    assert.equal(draft.value.audit.sourceVersions.fieldNamingVersion, 'gmfn-v2');
    assert.notEqual(
      JSON.stringify(draft.value.fingerprint).includes('"selectors":null'),
      true,
    );
    assert.notEqual(draft.value.audit.outputHash, '');
  });
});
