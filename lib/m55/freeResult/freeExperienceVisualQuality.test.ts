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
      const map = AXIS_OWNERSHIP[question.questionId as keyof typeof AXIS_OWNERSHIP];
      assert.ok(map, `missing axis ownership for ${question.questionId}`);
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

  it('result hero uses substantial mobile art and keeps desktop two-column', () => {
    const hero = read('components/core/CoreFreeResultLeadSection.tsx');
    const css = read('components/core/CoreExperience.module.css');
    assert.match(hero, /freeResultHero/);
    assert.match(hero, /m55-free-result-trait-image/);
    assert.match(hero, /imagePath/);
    assert.doesNotMatch(hero, /freeResultLeadGrid/);
    assert.match(css, /aspect-ratio:\s*3\s*\/\s*4/);
    assert.match(css, /min-height:\s*min\(68dvh,\s*26rem\)/);
    assert.doesNotMatch(css, /max-height:\s*48vw/);
    assert.match(css, /@media \(min-width: 900px\)[\s\S]*grid-template-columns: minmax\(0, 1\.15fr\) minmax\(0, 0\.95fr\)/);
  });

  it('share preview uses public-safe trait artwork and no private inputs', () => {
    const chooser = read('components/narrative/ShareCardChooser.tsx');
    const preview = read('components/narrative/PublicShareCardPreview.tsx');
    const shareCss = read('components/narrative/NarrativeShare.module.css');
    assert.match(chooser, /resolvePublicStemDisplay/);
    assert.match(chooser, /imagePath=\{traitImagePath\}/);
    assert.match(preview, /cardArtImage/);
    assert.match(preview, /自分に出やすい傾向/);
    assert.doesNotMatch(preview, /birthDate|nickname/);
    assert.match(shareCss, /\.optionArt \{[\s\S]*aspect-ratio:\s*4\s*\/\s*5/);
    assert.doesNotMatch(shareCss, /\.optionArt \{[\s\S]*height:\s*4\.5rem/);
  });

  it('no fixed Premium CTA overlays Free-result content', () => {
    const sticky = read('components/core/CorePremiumStickyCta.tsx');
    const essence = read('components/core/CoreEssencePanel.tsx');
    assert.match(sticky, /return null/);
    assert.match(sticky, /CORE_INLINE_PREMIUM_BRIDGE_HREF|viewSavedPlansHref/);
    assert.doesNotMatch(sticky, /premiumStickyBar/);
    assert.doesNotMatch(sticky, /m55-premium-sticky-cta/);
    assert.match(essence, /CorePremiumStickyCta/);
  });

  it('390 journey stepper stays three columns and task shell excludes footer', () => {
    const stepper = read('components/core/CoreFreeJourneyStepper.tsx');
    const css = read('components/core/CoreExperience.module.css');
    const essence = read('components/core/CoreEssencePanel.tsx');
    assert.doesNotMatch(stepper, /useStepperColumns|repeat\(\$\{columns\}/);
    assert.match(css, /freeJourneyStepperList \{[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
    assert.doesNotMatch(css, /freeJourneyStepperList \{\s*grid-template-columns: 1fr/);
    assert.match(essence, /m55-free-journey-task/);
    assert.match(css, /freeJourneyTaskShell \{[\s\S]*min-height: calc\(100dvh - 5\.75rem\)/);
  });

  it('core-share uses governed sticky-header scroll offset', () => {
    const css = read('components/core/CoreExperience.module.css');
    const shareCss = read('components/narrative/NarrativeShare.module.css');
    assert.match(css, /\.coreShareAnchor \{[\s\S]*scroll-margin-top: calc\(4\.75rem/);
    assert.match(shareCss, /\.chooser \{[\s\S]*scroll-margin-top: calc\(4\.75rem/);
  });

  it('focus-visible rings exist for DOB, questionnaire, and share chooser', () => {
    const css = read('components/core/CoreExperience.module.css');
    const shareCss = read('components/narrative/NarrativeShare.module.css');
    assert.match(css, /freeSegmentedDobInputYear:focus-visible/);
    assert.match(css, /freeQuestionnaireChoice:focus-visible/);
    assert.match(css, /freeQuestionnairePrimaryBtn:focus-visible/);
    assert.match(shareCss, /\.option:focus-visible/);
    assert.match(css, /box-shadow: 0 0 0 3px rgba\(107, 95, 168/);
  });

  it('ten-views overview shows all ten identities without ranking copy', () => {
    const page = read('components/pages/M55TenViews.tsx');
    assert.match(page, /m55-ten-views-system-overview/);
    assert.match(page, /順位ではありません/);
    assert.equal((page.match(/overview-\$\{card\.persona\}/g) ?? []).length, 1);
    assert.match(page, /viewCards\.map/);
    assert.doesNotMatch(page, /systemOverview[\s\S]*おすすめ|人気|最適/);
  });
});
