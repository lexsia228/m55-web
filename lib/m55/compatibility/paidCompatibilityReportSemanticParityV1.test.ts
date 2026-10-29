import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPaidCompatibilityReportV1,
  paidCompatibilityNaturalActionJa,
  paidCompatibilityPhrasePurpose,
} from './buildPaidCompatibilityReportV1';
import {
  preparePaidCompatibilityChapterForDisplay,
  preparePaidCompatibilityReportForDisplay,
  stripGenerationContractForLegacyFixture,
  UNCORRECTABLE_RELATIONSHIP_LOOP_LINE,
  UNCORRECTABLE_SELF_PERSPECTIVE,
} from './paidCompatibilityReportDisplayV1';
import { CHAPTER_IDS } from './pairReadingCatalog.v1';
import type { RelationStatusId } from './pairReadingTypes';

const BASE = {
  pairAxisId: 'A1' as const,
  paidTopicId: 'T3' as const,
  temperatureId: 'E0' as const,
};

const STATUSES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const satisfies readonly RelationStatusId[];

function buildLegacyFixture(
  relationStatusId: RelationStatusId,
  personAUsesFirstPerspective: boolean,
) {
  return stripGenerationContractForLegacyFixture(
    buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId,
      personAUsesFirstPerspective,
    }),
  );
}

function buyerMotionFromPerspective(text: string): string | null {
  const motionMatch = text.match(/あなたは、(.+?)ことがあります/u);
  if (motionMatch?.[1]) {
    return motionMatch[1].trim();
  }
  const perceptionMatch = text.match(/あなたには、(.+?)可能性があります/u);
  return perceptionMatch?.[1]?.trim() ?? null;
}

function loopBuyerActionSnippet(chapter: {
  relationshipLoop: readonly string[];
}): string | null {
  const match = chapter.relationshipLoop.join('').match(
    /あなたから見ると、(.+?)動きが見えやすい/u,
  );
  return match?.[1]?.trim() ?? null;
}

describe('paid compatibility semantic parity — generation', () => {
  for (const relationStatusId of STATUSES) {
    for (const personAUsesFirstPerspective of [true, false] as const) {
      it(`aligns buyer perspective, loop, and depth for ${relationStatusId} / perspective=${personAUsesFirstPerspective}`, () => {
        const snapshot = buildPaidCompatibilityReportV1({
          ...BASE,
          relationStatusId,
          personAUsesFirstPerspective,
        });
        const opposite = buildPaidCompatibilityReportV1({
          ...BASE,
          relationStatusId,
          personAUsesFirstPerspective: !personAUsesFirstPerspective,
        });

        for (const key of CHAPTER_IDS) {
          const chapter = snapshot.chapters.find((item) => item.key === key)!;
          const oppositeChapter = opposite.chapters.find((item) => item.key === key)!;
          assert.ok(chapter);

          if (relationStatusId !== 'R1') {
            assert.notEqual(
              chapter.personAPerspective,
              oppositeChapter.personAPerspective,
              `${relationStatusId}/${key} buyer perspective must follow semantic order`,
            );
          }

          assert.match(chapter.personAPerspective, /あなた/);
          assert.match(chapter.relationshipLoop.join(''), /あなたから見ると/);
          const loopAction = loopBuyerActionSnippet(chapter);
          assert.ok(loopAction, `${relationStatusId}/${key} loop must include buyer action`);
          if (!personAUsesFirstPerspective && relationStatusId !== 'R1') {
            assert.doesNotMatch(
              chapter.relationshipLoop.join(''),
              /あなたが先に動くと、相手からは返事を急かされている/,
            );
          }
        }
      });
    }
  }

  it('regression: R2 false ch_pair_gap has no duplicate partner actor label', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R2',
      personAUsesFirstPerspective: false,
    });
    const chapter = snapshot.chapters.find((item) => item.key === 'ch_pair_gap')!;
    assert.doesNotMatch(
      chapter.relationshipLoop.join(''),
      /相手には、相手の/,
    );
    assert.match(
      chapter.relationshipLoop.join(''),
      /相手から見ると、返事を整えるために間を取りたい動きが見える/,
    );
  });

  it('regression Codex: R6 false ch1 misread follows second-slot buyer motion', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R6',
      personAUsesFirstPerspective: false,
    });
    const chapter = snapshot.chapters.find((item) => item.key === 'ch_you_pace')!;
    const loopBlob = chapter.relationshipLoop.join('');
    assert.match(
      chapter.personAPerspective,
      /考えを整理するために、返事まで少し間を置く/,
    );
    assert.doesNotMatch(loopBlob, /返事を急かされている/);
    assert.doesNotMatch(loopBlob, /あなたが先に動くと、相手からは返事を急かされている/);
  });

  it('regression Codex: R1 false ch2 loop does not double-label partner reception', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R1',
      personAUsesFirstPerspective: false,
    });
    const chapter = snapshot.chapters.find((item) => item.key === 'ch_other_pace')!;
    const loopBlob = chapter.relationshipLoop.join('');
    assert.doesNotMatch(loopBlob, /相手には、相手の/);
    assert.match(loopBlob, /自分だけが考えているように見えやすい/);
    assert.doesNotMatch(
      chapter.personAPerspective,
      /あまり動きたくない/,
      'R1 buyer baseline must not collapse to generic second-slot motion',
    );
  });

  it('regression: R1 loop has no raw A/B role markers', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R1',
      personAUsesFirstPerspective: false,
    });
    const blob = snapshot.chapters.map((chapter) => chapter.relationshipLoop.join('')).join('\n');
    assert.doesNotMatch(blob, /Aには|Bには/);
  });

  it('regression: R2 false ch_you_pace maps second-slot motion to buyer', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R2',
      personAUsesFirstPerspective: false,
    });
    const chapter = snapshot.chapters.find((item) => item.key === 'ch_you_pace')!;
    const expected = paidCompatibilityNaturalActionJa('返す前に言葉を整える時間を取りたい');
    assert.match(chapter.personAPerspective, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(chapter.relationshipLoop.join(''), /返す前に言葉を整える時間を取りたい/);
  });
});

describe('paid compatibility R1 phrase purpose', () => {
  it('classifies all R1 catalog phrases as introspective', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R1',
      personAUsesFirstPerspective: true,
    });
    for (const chapter of snapshot.chapters) {
      assert.equal(
        paidCompatibilityPhrasePurpose('R1', chapter.key, chapter.usablePhrase),
        'introspective',
        chapter.key,
      );
    }
  });
});

describe('legacy snapshot field-level display safety', () => {
  for (const relationStatusId of STATUSES) {
    for (const personAUsesFirstPerspective of [true, false] as const) {
      it(`preserves verifiable fields for Base legacy ${relationStatusId} / ${personAUsesFirstPerspective}`, () => {
        const legacy = buildLegacyFixture(relationStatusId, personAUsesFirstPerspective);
        const source = legacy.chapters[0]!;
        const prepared = preparePaidCompatibilityReportForDisplay(legacy);
        const displayed = prepared.chapters[0]!;
        assert.equal(displayed.scene, source.scene);
        assert.equal(displayed.usablePhrase, source.usablePhrase);
        assert.equal(displayed.smallExperiment, source.smallExperiment);
        assert.equal(displayed.reflectionQuestion, source.reflectionQuestion);
        assert.notEqual(displayed.personAPerspective, UNCORRECTABLE_SELF_PERSPECTIVE);
        assert.doesNotMatch(displayed.personAPerspective, /Aには|Bには/);
      });
    }
  }

  it('replaces only unsafe relationshipLoop lines when stale A/B markers appear', () => {
    const legacy = buildLegacyFixture('R2', true);
    const sourcePersonA = legacy.chapters[0]!.personAPerspective;
    const poisoned = {
      ...legacy,
      chapters: legacy.chapters.map((chapter, index) =>
        index === 0
          ? {
              ...chapter,
              relationshipLoop: Object.freeze([
                'あなたから見ると、動きが見えやすいことがあります',
                'Aには関心のなさのように見えやすいことがあります',
                '相手については、いまの間合いの見え方だけでは内側の動きまでは確かめにくい状態です',
              ]),
            }
          : chapter,
      ),
    };
    const prepared = preparePaidCompatibilityReportForDisplay(poisoned);
    const first = prepared.chapters[0]!;
    assert.equal(first.personAPerspective, sourcePersonA);
    assert.match(first.relationshipLoop[0] ?? '', /安全に整えられない|場面と整え方/);
    assert.equal(first.relationshipLoop[0], UNCORRECTABLE_RELATIONSHIP_LOOP_LINE);
    assert.equal(first.smallExperiment, legacy.chapters[0]!.smallExperiment);
  });

  it('field fallback on inverted legacy perspectives without contract', () => {
    const legacyChapter = {
      key: 'ch_pair_gap' as const,
      number: 3,
      title: 'テスト',
      scene: '場面',
      personAPerspective: '相手から見ると、動きが見えやすいことがあります。',
      personBPerspective: 'あなたから見ると、別の動きが見えやすいことがあります。',
      relationshipLoop: ['a', 'b', 'c'],
      resetSteps: ['b', 'c'],
      phraseSpeaker: 'either' as const,
      usablePhrase: '近づくかどうかは後で決めて、今は短い一文だけ書き留めない？',
      smallExperiment: '実験',
      reflectionQuestion: '振り返り',
      sceneInteractionId: 'paid-compatibility:paid_compatibility_report_v1:ch_pair_gap:scene',
    };
    const prepared = preparePaidCompatibilityChapterForDisplay(legacyChapter, undefined, 'R1');
    assert.match(prepared.chapter.personAPerspective, /安全に整えられない/);
    assert.match(prepared.chapter.personBPerspective, /安全に整えられない/);
    assert.equal(prepared.chapter.relationshipLoop[0], UNCORRECTABLE_RELATIONSHIP_LOOP_LINE);
    assert.equal(prepared.chapter.scene, '場面');
    assert.equal(prepared.chapter.smallExperiment, '実験');
  });
});
