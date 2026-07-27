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
  it('starts at INTRO with DOB-ready flow', () => {
    assert.equal(resolveInitialUxPhase(), 'INTRO');
    assert.equal(shouldShowIntro('INTRO'), true);
    assert.equal(shouldShowHero('INTRO'), false);
    assert.equal(shouldHideResultDuringQuestionnaire('INTRO'), true);
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
    assert.equal(resolveJourneyStep('INTRO').step, 'questions');
    assert.equal(resolveJourneyStep('QUESTIONNAIRE', 1, FREE_FIVE_QUESTION_COUNT).questionLabel, '2/5');
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
    assert.equal(GUEST_PROFILE_INTAKE_COPY_V1.primaryActionJa, '無料結果を始める');
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
    assert.match(REANSWER_CONFIRM_COPY_V1.titleJa, /見直しますか/);
    assert.equal(REANSWER_CONFIRM_COPY_V1.finalizeJa, 'この回答で結果を更新');
  });

  it('share copy stays privacy-safe', () => {
    assert.doesNotMatch(FREE_RESULT_SHARE_COPY_V1.shareTextJa, /生年月日|回答|ニックネーム/);
    assert.equal(FREE_RESULT_SHARE_COPY_V1.shareUrlPath, '/core');
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

  it('CoreLockedState uses five questions without current interest', () => {
    const src = read('components/core/CoreLockedState.tsx');
    assert.match(src, /5つの問い/);
    assert.doesNotMatch(src, /今の関心/);
    assert.doesNotMatch(src, /6問/);
    assert.doesNotMatch(src, /6つの問い/);
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

  it('free flow copy removes pre-result theme step', () => {
    const flowSources = [
      read('components/core/CoreFreeIntroSection.tsx'),
      read('components/core/CoreFreeJourneyStepper.tsx'),
      read('components/core/CoreFreeQuestionnaireLayer.tsx'),
      read('components/core/CoreFiveViewResultSection.tsx'),
      read('components/core/CoreLockedState.tsx'),
      read('lib/m55/freeResult/guestFreeJourneyCopyV1.ts'),
    ].join('\n');
    assert.match(flowSources, /5つの問い/);
    assert.doesNotMatch(flowSources, /今の関心/);
    assert.doesNotMatch(flowSources, /6問/);
    assert.doesNotMatch(flowSources, /6つの問い/);
    assert.doesNotMatch(flowSources, /6つの短い問い/);
    assert.equal(FREE_QUESTIONNAIRE_COPY_V1.length, FREE_FIVE_QUESTION_COUNT);
  });

  it('intro section is continuous DOB step 1/6', () => {
    const src = read('components/core/CoreFreeIntroSection.tsx');
    assert.match(src, /生年月日を入力してください/);
    assert.match(src, /無料結果づくりを始める/);
    assert.match(src, /CoreFreeSegmentedDobFields/);
    assert.doesNotMatch(src, /今の関心/);
    assert.doesNotMatch(src, /5つの問いを始める/);
  });

  it('result summary hub leads with depth blocks and omits action prescription', () => {
    const src = read('components/core/CoreFreeResultSummaryHub.tsx');
    assert.match(src, /今回の結論/);
    assert.match(src, /そう読める3つの理由/);
    assert.match(src, /自分では気づきにくい一面/);
    assert.doesNotMatch(src, /今日の一歩/);
    assert.doesNotMatch(src, /今回、先に見るテーマ/);
    assert.doesNotMatch(src, /smallActionJa/);
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
