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
} from './questionnaireCopyV1';
import {
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

  it('journey stepper maps phases', () => {
    assert.equal(resolveJourneyStep('INTRO').step, 'questions');
    assert.equal(resolveJourneyStep('QUESTIONNAIRE', 1, FREE_FIVE_QUESTION_COUNT).questionLabel, '2/5');
    assert.equal(resolveJourneyStep('QUESTIONNAIRE', undefined, undefined, true).step, 'interest');
    assert.equal(resolveJourneyStep('RESULT').step, 'result');
  });

  it('reveal transition respects reduced motion', () => {
    assert.equal(revealTransitionDurationMs(true), 0);
    assert.equal(revealTransitionDurationMs(false), FREE_REVEAL_TRANSITION_MS);
  });
});

describe('guest free journey presentation copy', () => {
  it('profile intake does not lead with account save wording', () => {
    assert.equal(GUEST_PROFILE_INTAKE_COPY_V1.titleJa, '無料の見取り図を開く');
    assert.equal(GUEST_PROFILE_INTAKE_COPY_V1.primaryActionJa, '見取り図を始める');
    assert.doesNotMatch(GUEST_PROFILE_INTAKE_COPY_V1.titleJa, /プロフィールを保存/);
    assert.doesNotMatch(GUEST_PROFILE_INTAKE_COPY_V1.primaryActionJa, /保存して開く/);
  });

  it('handoff copy reflects five questions and current interest', () => {
    assert.match(GUEST_PROFILE_HANDOFF_COPY_V1.subJa, /5つの問いと今の関心/);
    assert.doesNotMatch(GUEST_PROFILE_HANDOFF_COPY_V1.subJa, /6問/);
    assert.doesNotMatch(GUEST_PROFILE_HANDOFF_COPY_V1.subJa, /6つの問い/);
  });

  it('re-answer confirmation copy present', () => {
    assert.match(REANSWER_CONFIRM_COPY_V1.titleJa, /見直しますか/);
    assert.equal(REANSWER_CONFIRM_COPY_V1.finalizeJa, 'この回答で結果を更新');
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

  it('CoreLockedState uses the approved six-question free-entry copy', () => {
    const src = read('components/core/CoreLockedState.tsx');
    assert.match(src, /生年月日と6つの質問/);
    assert.match(src, /自然に力を発揮しやすい場面/);
    assert.doesNotMatch(src, /5つの問いと今の関心/);
  });

  it('CoreEssencePanel keeps committed vs draft answer separation', () => {
    const src = read('components/core/CoreEssencePanel.tsx');
    assert.match(src, /committedAnswers/);
    assert.match(src, /draftAnswers/);
    assert.match(src, /CoreFreeResultSummaryHub/);
    assert.match(src, /promoteGuestProfileToClerkUser/);
  });
});

describe('free self-understanding semantics copy', () => {
  it('Q6 avoids paid-intent questionnaire wording', () => {
    const serialized = JSON.stringify(FREE_CURRENT_INTEREST_COPY_V1);
    assert.doesNotMatch(serialized, /あとでじっくり読み返せる形にしたい/);
    assert.doesNotMatch(serialized, /いちばん読み返してみたい/);
    assert.match(FREE_CURRENT_INTEREST_COPY_V1.questionJa, /今の自分を客観的に見るなら/);
    assert.match(FREE_CURRENT_INTEREST_COPY_V1.sceneContextJa, /迷う場合は「自分全体をまとめて見たい」を選べます/);
    assert.match(
      FREE_CURRENT_INTEREST_COPY_V1.choices.map((c) => c.labelJa).join('\n'),
      /自分全体をまとめて見たい/,
    );
  });

  it('free flow copy uses the approved six-question wording', () => {
    const flowSources = [
      read('components/core/CoreFreeIntroSection.tsx'),
      read('components/core/CoreFreeJourneyStepper.tsx'),
      read('components/core/CoreFiveViewResultSection.tsx'),
      read('components/core/CoreLockedState.tsx'),
      read('lib/m55/freeResult/guestFreeJourneyCopyV1.ts'),
      read('lib/m55/freeResult/questionnaireCopyV1.ts'),
    ].join('\n');
    assert.match(flowSources, /6つの質問/);
    assert.match(flowSources, /5つの問い/);
    assert.match(flowSources, /今の関心/);
  });

  it('intro section uses the approved free-entry burden copy', () => {
    const src = read('components/core/CoreFreeIntroSection.tsx');
    assert.match(src, /無料解析・6つの質問/);
    assert.match(src, /無料・6つの質問/);
    assert.match(src, /6つの質問を始める/);
  });

  it('result summary hub separates focus theme label', () => {
    const src = read('components/core/CoreFreeResultSummaryHub.tsx');
    assert.match(src, /今回、先に見るテーマ/);
    assert.match(src, /focusThemeLabelJa/);
    assert.match(src, /いまの表れ方/);
  });
});

describe('free journey stepper presentation', () => {
  it('renders four stages with responsive grid contract', () => {
    const src = read('components/core/CoreFreeJourneyStepper.tsx');
    assert.match(src, /基本情報/);
    assert.match(src, /5つの問い/);
    assert.match(src, /今の関心/);
    assert.match(src, /見取り図/);
    assert.match(src, /aria-current=\{current \? 'step' : undefined\}/);
    assert.match(src, /gridTemplateColumns: `repeat\(\$\{columns\}, minmax\(0, 1fr\)\)`/);
    assert.match(src, /w >= 900 \? 4 : 2/);
    assert.doesNotMatch(src, /freeJourneyStepperItemFinal/);
    assert.doesNotMatch(src, /isolated/);
  });

  it('public header keeps the same navigation language across viewports', () => {
    const src = read('components/shell/PublicHeader.tsx');
    assert.match(src, /href: '\/core', label: '無料解析'/);
    assert.match(src, /href: '\/dtr', label: '結果・レポート'/);
    assert.match(src, /href: '\/my', label: 'マイページ'/);
    assert.doesNotMatch(src, /shortLabel|compactNav/);
    assert.match(src, /ログイン/);
  });
});
