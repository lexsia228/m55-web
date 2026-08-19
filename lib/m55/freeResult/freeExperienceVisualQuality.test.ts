import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  FREE_CHANGE_ANSWER_TO_TENDENCY,
  FREE_DECISION_ANSWER_TO_TENDENCY,
  FREE_DISTANCE_ANSWER_TO_TENDENCY,
  FREE_RECOVERY_ANSWER_TO_TENDENCY,
  FREE_START_ANSWER_TO_TENDENCY,
} from '../individualization/answerIdMapsV1';
import { parseAndValidateDobInput, validateSegmentedDob } from './segmentedDobInputV1';
import {
  FREE_FIVE_QUESTION_COUNT,
  FREE_FIVE_QUESTIONS_COPY_V1,
} from './questionnaireCopyV1';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const AXIS_OWNERSHIP = {
  'free.start_style': FREE_START_ANSWER_TO_TENDENCY,
  'free.decision_style': FREE_DECISION_ANSWER_TO_TENDENCY,
  'free.recovery_style': FREE_RECOVERY_ANSWER_TO_TENDENCY,
  'free.distance_style': FREE_DISTANCE_ANSWER_TO_TENDENCY,
  'free.change_style': FREE_CHANGE_ANSWER_TO_TENDENCY,
} as const;

describe('free experience visual quality — DOB / questions / footer / hero / share / sticky', () => {
  it('restores segmented DOB on /core intake and shared profile modal', () => {
    const intake = read('components/core/CoreFreeProfileIntakeSection.tsx');
    const modal = read('components/profile/BirthProfileIntakeLayer.tsx');
    const panel = read('components/core/CoreEssencePanel.tsx');
    assert.match(intake, /CoreFreeSegmentedDobFields/);
    assert.match(panel, /CoreFreeProfileIntakeSection/);
    assert.doesNotMatch(modal, /type="date"/);
    assert.match(modal, /m55-free-segmented-dob/);
    assert.match(modal, /validateSegmentedDob/);
    assert.match(intake, /type="text"/);
  });

  it('keeps canonical ISO DOB output from segmented validation', () => {
    const ok = validateSegmentedDob({ year: '1983', month: '2', day: '28' });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.birthDate, '1983-02-28');
    const pasted = parseAndValidateDobInput('19830228');
    assert.equal(pasted.ok, true);
    if (pasted.ok) assert.equal(pasted.birthDate, '1983-02-28');
  });

  it('five questions keep frozen IDs and 1:1 scoring-axis ownership', () => {
    assert.equal(FREE_FIVE_QUESTION_COUNT, 5);
    assert.deepEqual(
      FREE_FIVE_QUESTIONS_COPY_V1.map((q) => q.questionId),
      ['free.start_style', 'free.decision_style', 'free.recovery_style', 'free.distance_style', 'free.change_style'],
    );
    for (const question of FREE_FIVE_QUESTIONS_COPY_V1) {
      const map = AXIS_OWNERSHIP[question.questionId];
      assert.equal(question.choices.length, 3);
      const labels = question.choices.map((c) => c.labelJa);
      assert.equal(new Set(labels).size, 3, `overlapping labels on ${question.questionId}`);
      for (const choice of question.choices) {
        assert.ok(choice.answerId.startsWith(`${question.questionId}.`));
        assert.ok(choice.answerId in map, `unmapped answer ${choice.answerId}`);
      }
    }
  });

  it('footer does not repeat primary product navigation', () => {
    const footer = read('app/_components/PublicFooter.tsx');
    assert.match(footer, /サポート/);
    assert.match(footer, /\/legal\/refund/);
    assert.match(footer, /\/legal\/terms/);
    assert.match(footer, /\/legal\/privacy/);
    assert.match(footer, /\/legal\/tokushoho/);
    assert.doesNotMatch(footer, /10の資質/);
    assert.doesNotMatch(footer, /プレミアムレポート/);
    assert.doesNotMatch(footer, /href: '\/ten-views'/);
    assert.doesNotMatch(footer, /href: '\/dtr\/lp'/);
  });

  it('result hero uses authoritative trait image as primary visual', () => {
    const hero = read('components/core/CoreFreeResultLeadSection.tsx');
    assert.match(hero, /freeResultHero/);
    assert.match(hero, /m55-free-result-trait-image/);
    assert.match(hero, /imagePath/);
    assert.doesNotMatch(hero, /freeResultLeadGrid/);
  });

  it('share preview uses public-safe trait artwork and no private inputs', () => {
    const chooser = read('components/narrative/ShareCardChooser.tsx');
    const preview = read('components/narrative/PublicShareCardPreview.tsx');
    assert.match(chooser, /resolvePublicStemDisplay/);
    assert.match(chooser, /imagePath=\{traitImagePath\}/);
    assert.match(preview, /cardArtImage/);
    assert.match(preview, /自分に出やすい傾向/);
    assert.doesNotMatch(preview, /birthDate|nickname/);
  });

  it('desktop sticky Premium CTA is disabled so it cannot cover content', () => {
    const sticky = read('components/core/CorePremiumStickyCta.tsx');
    const css = read('components/core/CoreExperience.module.css');
    assert.match(sticky, /min-width: 1024px/);
    assert.match(sticky, /stickyEnabled = visible && !isDesktop/);
    assert.match(css, /@media \(min-width: 1024px\)/);
    assert.match(css, /display: none !important;/);
  });
});
