import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  FREE_REVEAL_TRANSITION_MS,
  isQuestionnaireCompleteForComposition,
  resolveInitialUxPhase,
  resolveJourneyStep,
  revealTransitionDurationMs,
  shouldHideResultDuringQuestionnaire,
  shouldShowHero,
  shouldShowIntro,
  shouldShowQuestionnaire,
  shouldShowReanswerFinalize,
  shouldShowRevealing,
  shouldShowResultSections,
  transitionOnIntroStart,
  transitionOnQuestionnaireComplete,
  transitionOnReanswerEditStart,
  transitionOnRevealComplete,
} from './coreFreeRevealUxState';
import {
  FREE_CURRENT_INTEREST_COPY_V1,
  FREE_FIVE_QUESTION_COUNT,
  FREE_QUESTIONNAIRE_COPY_V1,
} from './questionnaireCopyV1';
import {
  FREE_RESULT_SHARE_COPY_V1,
  GUEST_PROFILE_HANDOFF_COPY_V1,
  GUEST_PROFILE_INTAKE_COPY_V1,
  REANSWER_CONFIRM_COPY_V1,
} from './guestFreeJourneyCopyV1';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('core free reveal UX state', () => {
  it('starts at QUESTIONNAIRE when profile is complete (DOB entered once in modal)', () => {
    assert.equal(resolveInitialUxPhase(true), 'QUESTIONNAIRE');
    assert.equal(resolveInitialUxPhase(false), 'INTRO');
    assert.equal(shouldShowIntro('INTRO'), true);
    assert.equal(shouldShowHero('QUESTIONNAIRE'), false);
    assert.equal(shouldHideResultDuringQuestionnaire('QUESTIONNAIRE'), true);
  });

  it('intro start shows questionnaire and hides hero', () => {
    const phase = transitionOnIntroStart();
    assert.equal(phase, 'QUESTIONNAIRE');
    assert.equal(shouldShowQuestionnaire(phase), true);
    assert.equal(shouldShowHero(phase), false);
    assert.equal(shouldShowResultSections(phase), false);
  });

  it('first questionnaire completion reaches REVEALING before RESULT', () => {
    const revealing = transitionOnQuestionnaireComplete(false);
    assert.equal(revealing, 'REVEALING');
    assert.equal(shouldShowRevealing(revealing), true);
    assert.equal(shouldShowHero(revealing), false);

    const result = transitionOnRevealComplete();
    assert.equal(result, 'RESULT');
    assert.equal(shouldShowHero(result), true);
    assert.equal(shouldShowResultSections(result), true);
  });

  it('re-answer flow uses REANSWER_FINAL before reveal', () => {
    const finalize = transitionOnQuestionnaireComplete(true);
    assert.equal(finalize, 'REANSWER_FINAL');
    assert.equal(shouldShowReanswerFinalize(finalize), true);
    assert.equal(shouldShowHero(finalize), false);
    assert.equal(shouldHideResultDuringQuestionnaire(finalize), true);
  });

  it('composition only builds after RESULT with committed answers', () => {
    assert.equal(isQuestionnaireCompleteForComposition('QUESTIONNAIRE', true), false);
    assert.equal(isQuestionnaireCompleteForComposition('REANSWER_FINAL', true), false);
    assert.equal(isQuestionnaireCompleteForComposition('RESULT', true), true);
    assert.equal(isQuestionnaireCompleteForComposition('RESULT', false), false);
  });

  it('re-answer edit returns to questionnaire and hides hero', () => {
    const phase = transitionOnReanswerEditStart();
    assert.equal(phase, 'QUESTIONNAIRE');
    assert.equal(shouldShowHero(phase), false);
    assert.equal(shouldShowQuestionnaire(phase), true);
  });

  it('journey stepper maps phases without pre-result interest', () => {
    assert.equal(resolveJourneyStep('INTRO').step, 'profile');
    assert.equal(resolveJourneyStep('QUESTIONNAIRE', 0, FREE_FIVE_QUESTION_COUNT).questionLabel, '1/5');
    assert.equal(resolveJourneyStep('RESULT').step, 'result');
  });

  it('reveal transition respects reduced motion', () => {
    assert.equal(revealTransitionDurationMs(true), 0);
    assert.equal(revealTransitionDurationMs(false), FREE_REVEAL_TRANSITION_MS);
  });
});

describe('guest free journey presentation copy', () => {
  it('profile intake does not lead with account save wording', () => {
    assert.equal(GUEST_PROFILE_INTAKE_COPY_V1.titleJa, '無料結果を開く');
    assert.equal(GUEST_PROFILE_INTAKE_COPY_V1.primaryActionJa, '無料で見てみる');
    assert.doesNotMatch(GUEST_PROFILE_INTAKE_COPY_V1.titleJa, /プロフィールを保存/);
    assert.doesNotMatch(GUEST_PROFILE_INTAKE_COPY_V1.primaryActionJa, /保存して開く/);
  });

  it('handoff copy reflects five questions only', () => {
    assert.match(GUEST_PROFILE_HANDOFF_COPY_V1.subJa, /5つの問い/);
    assert.doesNotMatch(GUEST_PROFILE_HANDOFF_COPY_V1.subJa, /今の関心/);
    assert.doesNotMatch(GUEST_PROFILE_HANDOFF_COPY_V1.subJa, /6問/);
    assert.doesNotMatch(GUEST_PROFILE_HANDOFF_COPY_V1.subJa, /6つの問い/);
  });

  it('re-answer confirmation copy present', () => {
    assert.match(REANSWER_CONFIRM_COPY_V1.titleJa, /もう一度見ますか/);
    assert.equal(REANSWER_CONFIRM_COPY_V1.confirmJa, '回答を変えて、もう一度見る');
    assert.equal(REANSWER_CONFIRM_COPY_V1.finalizeJa, 'この回答で結果を更新');
  });

  it('share copy stays privacy-safe', () => {
    assert.doesNotMatch(FREE_RESULT_SHARE_COPY_V1.shareTextJa, /生年月日|回答|ニックネーム/);
    assert.equal(FREE_RESULT_SHARE_COPY_V1.shareUrlPath, '/r');
  });
});

describe('guest free journey source guards', () => {
  it('BirthProfileIntakeLayer uses guest-first copy module', () => {
    const src = read('components/profile/BirthProfileIntakeLayer.tsx');
    assert.match(src, /guestFreeJourneyCopyV1/);
    assert.doesNotMatch(src, /プロフィールを保存/);
    assert.doesNotMatch(src, /保存して開く/);
  });

  it('CoreAnalysisLoading removes multi-scene fake analysis', () => {
    const src = read('components/core/CoreAnalysisLoading.tsx');
    assert.doesNotMatch(src, /複数の視点を照合しています/);
    assert.doesNotMatch(src, /PARTICLE_SEEDS/);
    assert.match(src, /GUEST_PROFILE_HANDOFF_COPY_V1/);
  });

  it('CoreFiveViewResultSection uses safe re-answer label', () => {
    const src = read('components/core/CoreFiveViewResultSection.tsx');
    assert.match(src, /回答を見直す/);
    assert.doesNotMatch(src, /もう一度答える/);
  });

  it('Core locked path is inline segmented intake with home link', () => {
    const src = read('components/core/CoreFreeProfileIntakeSection.tsx');
    assert.match(src, /CoreFreeSegmentedDobFields/);
    assert.match(src, /m55-core-locked-home-link/);
    assert.doesNotMatch(src, /今の関心/);
  });

  it('CoreEssencePanel keeps committed vs draft answer separation', () => {
    const src = read('components/core/CoreEssencePanel.tsx');
    assert.match(src, /committedAnswers/);
    assert.match(src, /draftAnswers/);
    assert.match(src, /CoreFreeResultSummaryHub/);
    assert.match(src, /ensureCompleteFreeAnswerSet/);
    assert.match(src, /promoteGuestProfileToClerkUser/);
  });
});

describe('free self-understanding semantics copy', () => {
  it('legacy theme copy remains for post-purchase compatibility only', () => {
    const serialized = JSON.stringify(FREE_CURRENT_INTEREST_COPY_V1);
    assert.doesNotMatch(serialized, /あとでじっくり読み返せる形にしたい/);
    assert.doesNotMatch(serialized, /いちばん読み返してみたい/);
    assert.match(FREE_CURRENT_INTEREST_COPY_V1.questionJa, /今の自分を客観的に見るなら/);
    assert.match(
      FREE_CURRENT_INTEREST_COPY_V1.choices.map((c) => c.labelJa).join('\n'),
      /自分全体をまとめて見たい/,
    );
  });

  it('free flow copy removes pre-result theme step and duplicate DOB in /core', () => {
    const flowSources = [
      read('components/core/CoreFreeJourneyStepper.tsx'),
      read('components/core/CoreFreeQuestionnaireLayer.tsx'),
      read('components/core/CoreFiveViewResultSection.tsx'),
      read('components/core/CoreFreeProfileIntakeSection.tsx'),
      read('lib/m55/freeResult/guestFreeJourneyCopyV1.ts'),
    ].join('\n');
    assert.match(flowSources, /5つの問い/);
    assert.doesNotMatch(flowSources, /今の関心/);
    assert.equal(FREE_QUESTIONNAIRE_COPY_V1.length, FREE_FIVE_QUESTION_COUNT);
  });

  it('result summary hub is concise — two reasons only', () => {
    const src = read('components/core/CoreFreeResultSummaryHub.tsx');
    assert.match(src, /conciseWhyJa/);
    assert.doesNotMatch(src, /今回の結論/);
    assert.doesNotMatch(src, /今日の一歩/);
  });
});

describe('free journey stepper presentation', () => {
  it('renders three stages with responsive grid contract', () => {
    const src = read('components/core/CoreFreeJourneyStepper.tsx');
    assert.match(src, /基本情報/);
    assert.match(src, /5つの問い/);
    assert.match(src, /無料結果/);
    assert.doesNotMatch(src, /今の関心/);
    assert.doesNotMatch(src, /見取り図/);
    assert.match(src, /aria-current=\{current \? 'step' : undefined\}/);
    assert.match(src, /gridTemplateColumns: `repeat\(\$\{columns\}, minmax\(0, 1fr\)\)`/);
    assert.match(src, /w >= 900 \? 3 : 2/);
    assert.doesNotMatch(src, /freeJourneyStepperItemFinal/);
    assert.doesNotMatch(src, /isolated/);
  });

  it('public header uses a mobile menu instead of compact labels on narrow viewports', () => {
    const src = read('components/shell/PublicHeader.tsx');
    assert.doesNotMatch(src, /shortLabel/);
    assert.doesNotMatch(src, /compactNav/);
    assert.match(src, /メニュー/);
    assert.match(src, /aria-controls="m55-public-mobile-menu"/);
    assert.match(src, /ログイン/);
  });
});
