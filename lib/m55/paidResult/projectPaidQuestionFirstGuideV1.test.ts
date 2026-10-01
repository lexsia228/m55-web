import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';
import type { PremiumPurchasedSemanticProjectionV1 } from '../narrative/buildPremiumPurchasedSemanticProjectionV1';
import { PAID_CHAPTER_EMPHASIS_COPY_V1 } from './paidChapterEmphasisCopyV1';
import { projectPaidQuestionFirstGuideV1 } from './projectPaidQuestionFirstGuideV1';

type ConsequenceIds = PremiumPurchasedSemanticProjectionV1['paidSemanticConsequenceIds'];

const EXACT_IDS: ConsequenceIds = {
  chapter2: ['paid_ch2__work_focus_priority', 'paid_ch2__decision_friction_too_many'],
  chapter3: ['paid_ch3__relation_focus_words'],
  chapter4: [
    'paid_ch4__fatigue_signal_after_push',
    'paid_ch4__recovery_sequence_pause_first',
    'paid_ch4__restart_condition_overview_first',
  ],
};

const SELECTOR_ID_PATTERN =
  /paid_ch[1-4]__|paid\.(work_focus|decision_friction|relation_focus|fatigue_signal|recovery_sequence|restart_condition)/;

function guideFor(ids: ConsequenceIds | null) {
  if (!ids) return projectPaidQuestionFirstGuideV1(null);
  return projectPaidQuestionFirstGuideV1({ paidSemanticConsequenceIds: ids });
}

function visibleText(guide: ReturnType<typeof projectPaidQuestionFirstGuideV1>): string {
  return [
    guide.overlineJa,
    guide.titleJa,
    guide.leadJa,
    guide.revealNoteJa ?? '',
    ...guide.entries.flatMap((entry) => [
      entry.labelJa,
      entry.sublabelJa,
      entry.chapterLabelJa,
      ...entry.personalizedFocusLinesJa,
    ]),
  ].join('\n');
}

describe('projectPaidQuestionFirstGuideV1', () => {
  it('enables personalized reveal for the exact 2 / 1 / 3 consequence shape', () => {
    const guide = guideFor(EXACT_IDS);
    assert.equal(guide.reveal, 'EXACT_PAID_REVEAL');
    assert.equal(guide.entries[0].personalizedFocusLinesJa.length, 2);
    assert.equal(guide.entries[1].personalizedFocusLinesJa.length, 1);
    assert.equal(guide.entries[2].personalizedFocusLinesJa.length, 3);
    assert.equal(guide.leadJa, '今、気になっているテーマから読み進められます。');
    assert.equal(
      guide.revealNoteJa,
      'あなたの6問への回答をもとに、このレポートでは次のポイントを重点的に扱っています。',
    );
  });

  it('keeps reveal when consequence order differs inside a chapter', () => {
    const guide = guideFor({
      ...EXACT_IDS,
      chapter2: ['paid_ch2__decision_friction_fear_mistake', 'paid_ch2__work_focus_boundary'],
      chapter4: [
        'paid_ch4__restart_condition_shrink_scope',
        'paid_ch4__fatigue_signal_before_start',
        'paid_ch4__recovery_sequence_small_start',
      ],
    });
    assert.equal(guide.reveal, 'EXACT_PAID_REVEAL');
    assert.equal(
      guide.entries[0].personalizedFocusLinesJa[0],
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch2__work_focus_boundary,
    );
    assert.equal(
      guide.entries[0].personalizedFocusLinesJa[1],
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch2__decision_friction_fear_mistake,
    );
  });

  it('routes work, relationship, and rest to chapters 2, 3, and 4', () => {
    const guide = guideFor(EXACT_IDS);
    assert.deepEqual(
      guide.entries.map((entry) => [entry.id, entry.panel, entry.chapterLabelJa]),
      [
        ['theme-work', 'chapter-2', 'Ⅱ 構造を読む'],
        ['theme-relationship', 'chapter-3', 'Ⅲ 無理を知る'],
        ['theme-rest', 'chapter-4', 'Ⅳ 楽に扱う'],
      ],
    );
    assert.equal(guide.entries[0].labelJa, '仕事・これからの進め方');
    assert.equal(guide.entries[1].labelJa, '恋人・近い人との向き合い方');
    assert.equal(guide.entries[2].labelJa, '疲れたときの戻り方');
  });

  it('uses existing emphasis copy for user-facing focus lines', () => {
    const guide = guideFor(EXACT_IDS);
    assert.deepEqual(guide.entries[0].personalizedFocusLinesJa, [
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch2__work_focus_priority,
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch2__decision_friction_too_many,
    ]);
    assert.deepEqual(guide.entries[1].personalizedFocusLinesJa, [
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch3__relation_focus_words,
    ]);
    assert.deepEqual(guide.entries[2].personalizedFocusLinesJa, [
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch4__fatigue_signal_after_push,
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch4__recovery_sequence_pause_first,
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch4__restart_condition_overview_first,
    ]);
  });

  it('does not emit internal selector ids as visible strings', () => {
    const guide = guideFor(EXACT_IDS);
    assert.doesNotMatch(visibleText(guide), SELECTOR_ID_PATTERN);
    const serialized = JSON.stringify(guide);
    assert.equal(serialized.includes('paid_ch2__work_focus_priority'), false);
    assert.equal(serialized.includes('paid.work_focus'), false);
  });

  it('falls back to navigation-only when projection is null', () => {
    const guide = guideFor(null);
    assert.equal(guide.reveal, 'NAVIGATION_ONLY');
    assert.equal(guide.leadJa, '今、気になっているテーマから読み進められます。');
    assert.equal(guide.revealNoteJa, null);
    for (const entry of guide.entries) {
      assert.deepEqual(entry.personalizedFocusLinesJa, []);
    }
  });

  it('falls back when chapter 2 is incomplete', () => {
    const guide = guideFor({
      ...EXACT_IDS,
      chapter2: ['paid_ch2__work_focus_priority'],
    });
    assert.equal(guide.reveal, 'NAVIGATION_ONLY');
  });

  it('falls back when chapter 3 is incomplete', () => {
    const guide = guideFor({
      ...EXACT_IDS,
      chapter3: [],
    });
    assert.equal(guide.reveal, 'NAVIGATION_ONLY');
  });

  it('falls back when chapter 4 is incomplete', () => {
    const guide = guideFor({
      ...EXACT_IDS,
      chapter4: [
        'paid_ch4__fatigue_signal_after_push',
        'paid_ch4__recovery_sequence_pause_first',
      ],
    });
    assert.equal(guide.reveal, 'NAVIGATION_ONLY');
  });

  it('falls back when an unexpected consequence is present', () => {
    const guide = guideFor({
      ...EXACT_IDS,
      chapter2: [
        'paid_ch2__work_focus_priority',
        'paid_ch2__decision_friction_too_many',
        'paid_ch2__start_rhythm',
      ],
    });
    assert.equal(guide.reveal, 'NAVIGATION_ONLY');
    assert.equal(guide.revealNoteJa, null);
  });

  it('falls back when a consequence id is duplicated', () => {
    const guide = guideFor({
      ...EXACT_IDS,
      chapter2: ['paid_ch2__work_focus_priority', 'paid_ch2__work_focus_priority'],
    });
    assert.equal(guide.reveal, 'NAVIGATION_ONLY');
  });

  it('falls back when a consequence family is on the wrong chapter', () => {
    const guide = guideFor({
      ...EXACT_IDS,
      chapter2: ['paid_ch2__work_focus_priority', 'paid_ch3__relation_focus_timing' as PaidChapterEmphasisIdV1],
    });
    assert.equal(guide.reveal, 'NAVIGATION_ONLY');
  });

  it('keeps all three navigation entries in the navigation-only fallback', () => {
    const cases: Array<ConsequenceIds | null> = [
      null,
      { ...EXACT_IDS, chapter2: ['paid_ch2__work_focus_pace'] },
      { ...EXACT_IDS, chapter3: [] },
      {
        ...EXACT_IDS,
        chapter4: ['paid_ch4__fatigue_signal_long_stretch'],
      },
    ];
    for (const ids of cases) {
      const guide = guideFor(ids);
      assert.equal(guide.reveal, 'NAVIGATION_ONLY');
      assert.equal(guide.titleJa, '今知りたいことから読む');
      assert.equal(guide.leadJa, '今、気になっているテーマから読み進められます。');
      assert.equal(guide.revealNoteJa, null);
      assert.deepEqual(
        guide.entries.map((entry) => entry.id),
        ['theme-work', 'theme-relationship', 'theme-rest'],
      );
      assert.deepEqual(
        guide.entries.map((entry) => entry.panel),
        ['chapter-2', 'chapter-3', 'chapter-4'],
      );
    }
  });
});
