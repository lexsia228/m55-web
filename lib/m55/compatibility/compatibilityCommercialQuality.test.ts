/**
 * Compatibility commercial UX quality — free conviction, bridge honesty,
 * paid first-30s composition, and the quiet personal → pair continuation.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCompatibilityPublicResult } from './pairReadingGuestResult';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (relative: string) => readFileSync(join(repoRoot, relative), 'utf8');

const GUEST = 'components/compatibility/CompatibilityGuestExperience.tsx';
const READER = 'components/compatibility/PaidCompatibilityReportReader.tsx';

const FIXTURES = [
  {
    id: 'F1',
    personA: '1982-02-28',
    personB: '1983-02-28',
    answers: {
      decisionPace: 'decide_now',
      disagreement: 'talk_now',
      distance: 'explain_space',
      expressionPace: 'words_soon',
      returnPattern: 'someone_reaches',
      focus: 'conversation_focus',
    },
  },
  {
    id: 'F2',
    personA: '1955-03-01',
    personB: '1997-06-15',
    answers: {
      decisionPace: 'decide_later',
      disagreement: 'take_space',
      distance: 'go_quiet',
      expressionPace: 'words_later',
      returnPattern: 'time_restores',
      focus: 'loop_focus',
    },
  },
  {
    id: 'F3',
    personA: '1968-08-15',
    personB: '2001-09-30',
    answers: {
      decisionPace: 'decide_varies',
      disagreement: 'one_carries',
      distance: 'space_is_hard',
      expressionPace: 'words_vary',
      returnPattern: 'return_is_hard',
      focus: 'distance_focus',
    },
  },
] as const satisfies readonly {
  id: string;
  personA: string;
  personB: string;
  answers: CompatibilityCurrentContextAnswers;
}[];

function buildFixture(index: number) {
  const fixture = FIXTURES[index]!;
  const outcome = buildCompatibilityPublicResult(
    { personA: fixture.personA, personB: fixture.personB },
    undefined,
    fixture.answers,
  );
  assert.equal(outcome.ok, true, `${fixture.id} must render`);
  if (!outcome.ok) throw new Error('unreachable');
  return outcome.value;
}

describe('free pair result renders a relationship dynamic, not two profiles', () => {
  it('surfaces the pair-level dynamic field in the free result', () => {
    const component = read(GUEST);
    assert.match(component, /result\.free\.relationshipDynamic/);
    assert.match(component, /この違いが、二人の間でどう動くか/);
    assert.match(component, /data-testid="compatibility-relationship-dynamic"/);
    assert.match(component, /PairResultSignature/);
    assert.match(component, /PairFreeShareCTA/);
  });

  it('names both sides and the consequence between them, across fixtures', () => {
    for (let index = 0; index < FIXTURES.length; index += 1) {
      const value = buildFixture(index);
      const dynamic = value.free.relationshipDynamic;
      assert.match(dynamic, /あなた側は/);
      assert.match(dynamic, /相手側は/);
      assert.match(dynamic, /そのため二人の間では/);
    }
  });

  it('varies materially across the three fixtures', () => {
    const outputs = FIXTURES.map((_, index) => buildFixture(index));
    const signatures = outputs.map((value) => [
      value.currentContext!.glanceLabel,
      value.currentContext!.currentExpression,
      value.currentContext!.relationshipLoopSteps.join('|'),
      value.currentContext!.immediateAction,
    ].join('␟'));
    assert.equal(new Set(signatures).size, FIXTURES.length);
  });
});

describe('free result completes before paid curiosity', () => {
  it('places the free summary above the paid bridge', () => {
    const component = read(GUEST);
    const summaryAt = component.indexOf('無料で読めるのは、ここまでです');
    const bridgeAt = component.indexOf('この二人の続きとして読めること');
    assert.ok(summaryAt > 0, 'free summary must exist');
    assert.ok(bridgeAt > 0, 'paid bridge must exist');
    assert.ok(summaryAt < bridgeAt, 'free summary must precede the paid bridge');
  });

  it('keeps a revisit explanation without urgency', () => {
    const component = read(GUEST);
    assert.match(component, /別の相手との関係を見るときは/);
    assert.doesNotMatch(component, /今だけ|残り\d|期間限定|急いで/);
  });
});

describe('paid bridge sells real report value, not chapter count', () => {
  it('does not lead with chapter counts in the guest bridge', () => {
    const component = read(GUEST);
    assert.doesNotMatch(component, /6章で受け取れる道具|6章の使い方|6つの場面を整理します/);
    assert.doesNotMatch(component, /今のfocus/);
  });

  it('lists benefits the paid report actually contains', () => {
    const component = read(GUEST);
    for (const benefit of [
      '二人それぞれの動き',
      'すれ違いが始まる場面',
      'そのまま使える一言',
      '今週一度だけ試すこと',
    ]) {
      assert.ok(component.includes(benefit), `bridge must offer ${benefit}`);
    }
  });

  it('keeps the purchase CTA behind the commerce env gate', () => {
    const component = read(GUEST);
    assert.match(component, /\{commerceEnabled \? \(/);
    const gateAt = component.indexOf('{commerceEnabled ? (');
    const purchaseAt = component.indexOf('/synastry/purchase/confirm');
    assert.ok(purchaseAt > gateAt, 'purchase link must sit inside the commerce gate');
  });

  it('states availability plainly instead of offering a dead action when gated', () => {
    const component = read(GUEST);
    assert.match(component, /styles\.bridgePending/);
    assert.match(component, /このレポートは現在準備中です/);
    assert.doesNotMatch(component, /styles\.(primaryLink|secondaryLink|bridgeActions)/);
    assert.doesNotMatch(component, /今だけ|残りわずか|お急ぎ|通知でお知らせ/);
  });
});

describe('paid report opening delivers the first thirty seconds', () => {
  it('surfaces A side, B side, reset entry, and first phrase before the chapters', () => {
    const component = read(READER);
    assert.match(component, /data-testid="paid-report-opening-moves"/);
    assert.match(component, /data-testid="paid-report-opening-handling"/);
    assert.match(component, /Aに出やすい動き/);
    assert.match(component, /Bに出やすい動き/);
    assert.match(component, /この連鎖を戻す入口/);
    assert.match(component, /最初に使える一言/);
    const openingAt = component.indexOf('paid-report-opening-moves');
    const stackAt = component.indexOf('styles.chapterStack');
    assert.ok(openingAt < stackAt, 'opening must precede the chapter stack');
  });

  it('differentiates the two sides in the lead chapter of each fixture', () => {
    for (const fixture of FIXTURES) {
      const snapshot = buildPaidCompatibilityReportV1({
        pairAxisId: 'A1',
        paidTopicId: 'T3',
        relationStatusId: 'R2',
        temperatureId: 'E0',
        personAUsesFirstPerspective: true,
        currentContext: fixture.answers,
      });
      const lead = snapshot.chapters.find(
        (chapter) => chapter.key === snapshot.highlightedChapterKeys[0],
      );
      assert.ok(lead, `${fixture.id} must resolve a lead chapter`);
      assert.notEqual(lead!.personAPerspective, lead!.personBPerspective);
      assert.ok(lead!.resetSteps[0]);
      assert.ok(lead!.usablePhrase);
    }
  });

  it('never repeats a whole sentence between the two sides in any chapter', () => {
    const sentences = (text: string) =>
      text
        .split('。')
        .map((part) => part.trim())
        .filter(Boolean);

    for (const personAUsesFirstPerspective of [true, false]) {
      for (const pairAxisId of ['A1', 'A2', 'A3', 'A4'] as const) {
        const snapshot = buildPaidCompatibilityReportV1({
          pairAxisId,
          paidTopicId: 'T3',
          relationStatusId: 'R2',
          temperatureId: 'E0',
          personAUsesFirstPerspective,
          currentContext: FIXTURES[0]!.answers,
        });
        for (const chapter of snapshot.chapters) {
          const bSide = new Set(
            sentences(chapter.personBPerspective).map((part) => part.replace(/\bB\b/gu, '')),
          );
          for (const part of sentences(chapter.personAPerspective)) {
            assert.ok(
              !bSide.has(part.replace(/\bA\b/gu, '')),
              `${pairAxisId}/${chapter.key} repeats "${part}" on both sides`,
            );
          }
        }
      }
    }
  });

  it('does not stamp the same advice into every chapter', () => {
    for (const fixture of FIXTURES) {
      const snapshot = buildPaidCompatibilityReportV1({
        pairAxisId: 'A3',
        paidTopicId: 'T2',
        relationStatusId: 'R3',
        temperatureId: 'E1',
        personAUsesFirstPerspective: true,
        currentContext: fixture.answers,
      });

      const counts = new Map<string, number>();
      for (const chapter of snapshot.chapters) {
        const body = [
          chapter.scene,
          ...chapter.relationshipLoop,
          ...chapter.resetSteps,
          chapter.usablePhrase,
          chapter.smallExperiment,
          chapter.reflectionQuestion,
        ].join('。');
        for (const raw of body.split('。')) {
          const sentence = raw.trim();
          if (sentence.length < 12) continue;
          counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
        }
      }

      // The experiment's scope rule is a standing format line, not advice.
      const STRUCTURAL_FRAME = '一回分の場面だけを見て、次も続けるかはそのあとで選びます';
      for (const [sentence, count] of counts) {
        if (sentence === STRUCTURAL_FRAME) continue;
        assert.ok(
          count <= 2,
          `${fixture.id}: "${sentence}" appears in ${count} of 6 chapters`,
        );
      }

      // Each chapter must offer its own phrase, experiment, and reset sequence.
      for (const field of ['usablePhrase', 'smallExperiment'] as const) {
        const values = snapshot.chapters.map((chapter) => chapter[field]);
        assert.equal(
          new Set(values).size,
          values.length,
          `${fixture.id}: ${field} repeats across chapters`,
        );
      }
      const resets = snapshot.chapters.map((chapter) => chapter.resetSteps.join('|'));
      assert.equal(new Set(resets).size, resets.length, `${fixture.id}: reset steps repeat`);
    }
  });

  it('titles the returning chapter by its scene, not as an about page', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      pairAxisId: 'A1',
      paidTopicId: 'T3',
      relationStatusId: 'R2',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
    });
    const about = snapshot.chapters.find((chapter) => chapter.key === 'ch_about');
    assert.equal(about?.title, '戻るときの最初の接点');
  });
});

describe('public naming ladder is consistent on compatibility surfaces', () => {
  it('drops the legacy 見取り図 term from the pair surfaces', () => {
    assert.doesNotMatch(read(GUEST), /見取り図/);
    assert.doesNotMatch(read(READER), /見取り図/);
  });

  it('keeps the canonical paid product name', () => {
    assert.match(read(GUEST), /二人の相性レポート/);
  });

  it('names the paid product the same way in the free teaser', () => {
    const teaser = buildFixture(0).freeTeaser;
    assert.match(teaser, /二人の相性レポート/);
    assert.doesNotMatch(teaser, /読み解きレポート|距離の読み解き/);
  });
});

describe('personal free result offers a quiet pair continuation', () => {
  it('links to the free pair route only', () => {
    const component = read('components/core/CorePairReadingCrossSell.tsx');
    assert.match(component, /pairReadingHref/);
    assert.doesNotMatch(component, /purchase|checkout|¥|1,480/);
  });

  it('sits after the Premium bridge so Premium stays primary', () => {
    const panel = read('components/core/CoreEssencePanel.tsx');
    const premiumAt = panel.indexOf('<CoreEntryReportCTASection');
    const pairAt = panel.indexOf('<CorePairReadingCrossSell');
    assert.ok(premiumAt > 0 && pairAt > 0);
    assert.ok(premiumAt < pairAt, 'Premium bridge must precede the pair continuation');
  });

  it('states the free, single-answerer truth without partner mind claims', () => {
    const copy = read('components/core/corePublicCopy.ts');
    assert.match(copy, /無料・ログイン不要。回答するのはあなた一人で/);
    assert.match(copy, /相手の気持ちを当てるものではありません/);
  });
});
