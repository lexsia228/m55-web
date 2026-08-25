import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  buildCanonicalCompatibilityPurchaseSnapshot,
} from './buildCanonicalCompatibilityPurchaseSnapshot';
import {
  buildPaidCompatibilityReportV1,
  paidCompatibilityChapterTitle,
  sceneInteractionIdFor,
} from './buildPaidCompatibilityReportV1';
import { isPaidCompatibilityReportSnapshot } from './compatibilityCommerceDb';
import {
  isCompleteCompatibilityCurrentContextV2,
  isValidStageFocus,
  questionsForRelationStage,
  resolveFocusAnswer,
  stagePremiumBridgeCopy,
  stageSafeFocusOptions,
  buildCompatibilityCurrentContextDisplayV2,
  toLegacyCurrentContextAnswers,
  type CompatibilityCurrentContextAnswersV2,
} from './currentContextContract.v2';
import {
  buildCompatibilityCurrentContextDisplay,
  COMPATIBILITY_CURRENT_CONTEXT_VERSION,
  type CompatibilityCurrentContextAnswers,
} from './currentContextContract.v1';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import { isValidCompatibilityRelationStatusId } from './pairReadingGuestContract';
import type { PaidCompatibilityChapter } from './buildPaidCompatibilityReportV1';
import { buildCompatibilityPublicResult } from './pairReadingGuestResult';
import { renderPairReading } from './pairReadingRenderer';
import { validateGuestFreeTeaser } from './pairReadingFragments.v1';
import {
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  PAIR_READING_CTA,
  SAFETY_PROFILE,
} from './pairReadingCatalog.v1';
import { countFullWidthChars, countSentencesJa } from './pairReadingSafetyAudit';
import { projectCompatibilityFreeNarrativeV1 } from '../narrative/projectCompatibilityFreeNarrativeV1';
import { buildPairManualV1 } from '../narrative/pairManualV1';

import type { RelationStatusId, PaidTopicId, TemperatureId, PairAxisId, PairReadingInput } from './pairReadingTypes';

const PREVIEW_FIXTURE_PATH = join(
  import.meta.dirname,
  '../../../components/compatibility/__preview__/PaidCompatibilityReportPreviewClient.tsx',
);

const JAPANESE_DUPLICATE_MOTION = /動きが見えやすい動きが見えます/;
const JAPANESE_COMPOSITION_DEFECTS = [
  JAPANESE_DUPLICATE_MOTION,
  /[AB]側側/u,
  /やすいが見えます/,
  /見えますが見えます/,
  /もう一度近づく前では/,
  /確かめる読み取りのずれ/,
  /相手の様子を見ながら様子を見たい/,
] as const;
const NAMED_JP_ARTIFACTS =
  /もう一度近づく前では|確かめる読み取りのずれ|相手の様子を見ながら様子を見たい/;
const R1_MANUAL_PARTNER_FORBIDDEN =
  /先に動かして|話を終わらせたくなる|終わらせたい|受け取った|返事|会話のあと|相手が.*したい|もう一方が.*たい|次に進みたい|置いて考えたい/;
const R1_MANUAL_HANDLING_FORBIDDEN =
  /書き留|試して|一度だけ|次に(話す|連絡)|してください|しなさい|戻りやすい|話すときのヒント/;

function r1PublicSurface() {
  return publicNarrativeSurface('R1');
}

function publicNarrativeSurface(stage: RelationStatusId) {
  const built = mustBuild(stage);
  const insight = buildPairFreeInsightSpecV2({
    answersV2: STAGE_ANSWERS[stage],
    pairAxisId: 'A2',
    personABirthDate: PAIR.personA,
    personBBirthDate: PAIR.personB,
    personAUsesFirstPerspective: true,
    focusLabel: stage === 'R1' ? 'これからの進め方' : '会話の進め方',
    relationStatusId: stage,
  });
  const narrative = projectCompatibilityFreeNarrativeV1({ spec: insight });
  const manual = buildPairManualV1({ spec: insight, completeness: 'short' });
  return { built, insight, narrative, manual };
}

function rendererPaidChapterBodies(
  topic: PaidTopicId,
  axis: PairAxisId,
  stage: RelationStatusId = 'R1',
): readonly string[] {
  const input: PairReadingInput = {
    schemaVersion: 'pair_reading_input_v1',
    personA: { role: 'personA', birthDate: PAIR.personA },
    personB: { role: 'personB', birthDate: PAIR.personB },
    relationStatusId: stage,
    paidTopicId: topic,
    temperatureId: 'E2',
    pairAxisOverride: axis,
    productInternalName: PRODUCT_INTERNAL_NAME,
    productPublicName: PRODUCT_PUBLIC_NAME,
    safetyProfile: SAFETY_PROFILE,
  };
  const rendered = renderPairReading(input);
  assert.equal(rendered.ok, true);
  if (!rendered.ok) throw new Error('unreachable');
  return rendered.paidReport.chapters.map((chapter) => chapter.chapterBody);
}

function validR1GuestTeaser(): string {
  const built = buildCompatibilityPublicResult(
    PAIR,
    'R1',
    STAGE_ANSWERS.R1,
    { relationStatusId: 'R1', paidTopicId: 'T2', temperatureId: 'E2', pairAxisOverride: 'A2' },
  );
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('unreachable');
  return built.value.freeTeaser;
}

function paidFieldsBlob(chapter: PaidCompatibilityChapter) {
  return [
    chapter.scene,
    chapter.personAPerspective,
    chapter.personBPerspective,
    chapter.relationshipLoop.join(' '),
    chapter.resetSteps.join(' '),
    chapter.usablePhrase,
    chapter.smallExperiment,
    chapter.reflectionQuestion,
  ].join('\n');
}
const TEMPERATURES: readonly TemperatureId[] = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'];
const PAIR_AXES: readonly PairAxisId[] = ['A1', 'A2', 'A3', 'A4'];
const PAID_TOPICS: readonly PaidTopicId[] = ['T1', 'T2', 'T3', 'T4', 'T5'];

const EXPECTED_EVIDENCE: Record<RelationStatusId, readonly string[]> = {
  R1: ['expressionPace', 'approachIntent'],
  R2: ['expressionPace', 'contactPace'],
  R3: ['decisionPace', 'disagreement', 'expressionPace', 'returnPattern'],
  R4: ['distance', 'expressionPace'],
  R5: ['reapproachReadiness', 'expressionPace', 'distance'],
  R6: ['decisionPace', 'disagreement', 'expressionPace', 'returnPattern'],
};

function previewFixtureStageIds(): string[] {
  const source = readFileSync(PREVIEW_FIXTURE_PATH, 'utf8');
  const exportBlock = source.slice(source.indexOf('PAID_COMPATIBILITY_PREVIEW_SYNTHETIC_REPORTS'));
  return [...exportBlock.matchAll(/relationStatusId:\s*'(R[1-6])'/g)].map((match) => match[1]!);
}

function freePublicBlob(stage: RelationStatusId) {
  const built = mustBuild(stage);
  const insight = buildPairFreeInsightSpecV2({
    answersV2: STAGE_ANSWERS[stage],
    pairAxisId: 'A2',
    personABirthDate: PAIR.personA,
    personBBirthDate: PAIR.personB,
    personAUsesFirstPerspective: true,
    focusLabel: stage === 'R1' ? 'これからの進め方' : '会話の進め方',
    relationStatusId: stage,
  });
  return [
    JSON.stringify(built.free),
    insight.betweenThem,
    insight.meshMoment,
    insight.mismatchEntry,
    insight.misreadLoop,
    insight.reset,
    built.currentContext?.relationshipLoop ?? '',
    built.currentContext?.readingGuide ?? '',
  ].join('\n');
}

const PAIR = { personA: '1990-03-12', personB: '1992-07-08' };
const LEGACY_V1_CONTEXT: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_soon',
  returnPattern: 'someone_reaches',
  focus: 'conversation_focus',
};
const RAW_RELATION_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const;
const RAW_ANSWER_IDS = [
  'decide_later',
  'talk_now',
  'someone_reaches',
  'words_soon',
  'light_contact',
  'wait_for_signal',
  'small_step_first',
] as const;

const STAGE_ANSWERS: Record<RelationStatusId, CompatibilityCurrentContextAnswersV2> = {
  R1: {
    expressionPace: 'words_later',
    approachIntent: 'unsure_yet',
  },
  R2: {
    expressionPace: 'words_soon',
    contactPace: 'light_contact',
  },
  R3: {
    decisionPace: 'decide_later',
    disagreement: 'talk_now',
    expressionPace: 'words_soon',
    returnPattern: 'someone_reaches',
  },
  R4: {
    distance: 'go_quiet',
    expressionPace: 'words_later',
  },
  R5: {
    reapproachReadiness: 'small_step_first',
    distance: 'explain_space',
    expressionPace: 'words_soon',
  },
  R6: {
    decisionPace: 'decide_varies',
    disagreement: 'take_space',
    expressionPace: 'words_vary',
    returnPattern: 'time_restores',
  },
};

const R1_FORBIDDEN =
  /会話のあと|話し始めた|意見が分かれ|二人で.*決めよう|すれ違ったあと|元の距離へ戻|戻ろうとする|戻るとき|返事を待つ|答えの前|受け取ったこと|付き合|交際|恋人|どちらも関係を|二人とも|相手は.*と思っている|相手も関係を/;
const R1_ZERO_CONTACT_FORBIDDEN =
  /受け取った反応|受け取った内容|返事が見えない|返事を待つ|会話を続ける|戻る|戻す|置かれた接点の重さを見てから、返す幅/;
const R1_CONTACT_FORBIDDEN =
  /連絡や会話のペース差|返事の速さだけで温度を決めない|受け取った内容|会話を続ける|返事を待つ|返事の速さ/;
const PARTNER_INNER_STATE =
  /Bには[^。]*(?:感じ|したい|置きたくなる|控えたい)|Bから見ると[^。]*(?:感じ|したい)|相手には[^。]*(?:感じ|したい)|B側には[^。]*(?:たいパターン|保ちたい|戻りたい|始めたい)/;
const PARTNER_FACTUAL_LOOP =
  /(?:^|[^側])Bが(?:.*感じ|.*受け取|.*抱え|.*時間を取|.*動)|(?:^|[^側])Bは(?:.*感じ|.*したい|.*する)/;
const STRUCTURAL_SCENE_ID =
  /^paid-compatibility:paid_compatibility_report_v1:ch_[a-z_]+:scene$/;
const R2_FORBIDDEN =
  /付き合|交際|恋人|結婚|相互の関係|お互いの関係|どちらも関係を|二人とも|相手は.*と思っている|相手も関係を/;
const CLAIM_FORBIDDEN = /相手は.*と思っている|相手も関係を大事に|二人とも.*したい|どちらも関係を|お互いの関係|相互の関係|相手も.*したい|相手も.*望んで/;
const FREE_HANDLING_FORBIDDEN =
  /書き留めて|確かめてください|確かめます|先に(置いて|書いて|伝えて|選んで|返して)|一度だけ(置|試)|返せる時間を|試してみ|やってみて|次に(話す|連絡)|短い一文を(書|送)|接点を(増や|提案)|結論ではなく.*(伝え|選んで|決め)|読んでください/;
const R4_SCENE_FORBIDDEN = /すれ違ったあと|意見が分かれ|二人で予定や次の動きを決めよう/;
const R5_SCENE_REQUIRED = /もう一度近づく|再接近|最初の接点/;

function mustBuild(stage: RelationStatusId) {
  const answers = STAGE_ANSWERS[stage];
  assert.equal(isCompleteCompatibilityCurrentContextV2(answers, stage), true);
  const outcome = buildCompatibilityPublicResult(PAIR, stage, answers);
  assert.equal(outcome.ok, true, `stage ${stage} must build`);
  if (!outcome.ok) throw new Error('unreachable');
  return outcome.value;
}

function paidSnapshot(stage: RelationStatusId) {
  return buildPaidCompatibilityReportV1({
    pairAxisId: 'A2',
    paidTopicId: 'T3',
    relationStatusId: stage,
    temperatureId: 'E0',
    personAUsesFirstPerspective: true,
    currentContextV2: STAGE_ANSWERS[stage],
    personABirthDate: PAIR.personA,
    personBBirthDate: PAIR.personB,
  });
}

function freeInsightBlob(stage: 'R1' | 'R2') {
  const insight = buildPairFreeInsightSpecV2({
    answersV2: STAGE_ANSWERS[stage],
    pairAxisId: 'A2',
    personABirthDate: PAIR.personA,
    personBBirthDate: PAIR.personB,
    personAUsesFirstPerspective: true,
    focusLabel: stage === 'R1' ? 'これからの進め方' : '会話の進め方',
    relationStatusId: stage,
  });
  return [
    insight.betweenThem,
    insight.meshMoment,
    insight.mismatchEntry,
    insight.misreadLoop,
    insight.reset,
    insight.premiumContinuation,
  ].join('\n');
}

function chapterFields(chapter: PaidCompatibilityChapter) {
  return [
    chapter.scene,
    chapter.personAPerspective,
    chapter.personBPerspective,
    chapter.relationshipLoop.join(' '),
    chapter.resetSteps.join(' '),
    chapter.usablePhrase,
    chapter.smallExperiment,
    chapter.reflectionQuestion,
  ].join('\n');
}

describe('relation stage semantic correction wave A', () => {
  for (const stage of RAW_RELATION_IDS) {
    it(`requires explicit stage ${stage} and never silently defaults to R2`, () => {
      const withoutStage = buildCompatibilityPublicResult(PAIR, '' as RelationStatusId, STAGE_ANSWERS[stage]);
      assert.equal(withoutStage.ok, false);
      const built = mustBuild(stage);
      assert.ok(built.currentContext);
      assert.notEqual(built.currentContext?.questionnaireContractVersion, undefined);
    });
  }

  it('accepts omitted focus and falls back to next-step emphasis', () => {
    const answers = { ...STAGE_ANSWERS.R1 };
    assert.equal(isCompleteCompatibilityCurrentContextV2(answers, 'R1'), true);
    const focus = resolveFocusAnswer('R1', undefined);
    assert.equal(focus, 'next_step_focus');
    const built = buildCompatibilityPublicResult(PAIR, 'R1', answers);
    assert.equal(built.ok, true);
  });

  it('rejects invalid focus values fail-closed', () => {
    const invalid = { ...STAGE_ANSWERS.R1, focus: 'not_an_answer' as CompatibilityCurrentContextAnswersV2['focus'] };
    assert.equal(isCompleteCompatibilityCurrentContextV2(invalid, 'R1'), false);
    const wrongStage = { ...STAGE_ANSWERS.R1, focus: 'loop_focus' as CompatibilityCurrentContextAnswersV2['focus'] };
    assert.equal(isCompleteCompatibilityCurrentContextV2(wrongStage, 'R1'), false);
    const persistedSkip = { ...STAGE_ANSWERS.R1, focus: 'skip_focus' as CompatibilityCurrentContextAnswersV2['focus'] };
    assert.equal(isCompleteCompatibilityCurrentContextV2(persistedSkip, 'R1'), false);
    assert.equal(isValidStageFocus('R1', 'conversation_focus'), true);
    assert.equal(isValidStageFocus('R1', 'loop_focus'), false);
    assert.equal(isValidStageFocus('R1', 'skip_focus'), false);
  });

  it('rejects unknown answer keys fail-closed', () => {
    const poisoned = { ...STAGE_ANSWERS.R1, approachIntent: 'custom' };
    assert.equal(isCompleteCompatibilityCurrentContextV2(poisoned, 'R1'), false);
  });

  it('materializes R1 free output without prior-interaction premises', () => {
    const built = mustBuild('R1');
    const insight = buildPairFreeInsightSpecV2({
      answersV2: STAGE_ANSWERS.R1,
      pairAxisId: 'A2',
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
      personAUsesFirstPerspective: true,
      focusLabel: 'これからの進め方',
      relationStatusId: 'R1',
    });
    const blob = [
      insight.betweenThem,
      insight.meshMoment,
      insight.mismatchEntry,
      insight.misreadLoop,
      insight.reset,
      built.free.relationshipDynamic,
    ].join('\n');
    assert.doesNotMatch(blob, R1_FORBIDDEN);
    assert.doesNotMatch(blob, CLAIM_FORBIDDEN);
    assert.match(insight.betweenThem, /まだ会話が始まっていない|会話がない/);
  });

  it('materializes R2 free output without reciprocity or mutual-intent premises', () => {
    const built = mustBuild('R2');
    const insight = buildPairFreeInsightSpecV2({
      answersV2: STAGE_ANSWERS.R2,
      pairAxisId: 'A2',
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R2',
    });
    const blob = [
      insight.betweenThem,
      insight.meshMoment,
      insight.mismatchEntry,
      insight.misreadLoop,
      insight.reset,
      built.free.relationshipDynamic,
    ].join('\n');
    assert.doesNotMatch(blob, R2_FORBIDDEN);
    assert.doesNotMatch(blob, CLAIM_FORBIDDEN);
    assert.match(insight.betweenThem, /やり取り|反応/);
  });

  it('throws when mapping R1/R2/R4/R5 to legacy established answers', () => {
    assert.throws(() => toLegacyCurrentContextAnswers(STAGE_ANSWERS.R1, 'R1'));
    assert.throws(() => toLegacyCurrentContextAnswers(STAGE_ANSWERS.R2, 'R2'));
    assert.throws(() => toLegacyCurrentContextAnswers(STAGE_ANSWERS.R4, 'R4'));
    assert.throws(() => toLegacyCurrentContextAnswers(STAGE_ANSWERS.R5, 'R5'));
  });

  it('keeps R1 paid chapters free of prior-interaction premises across all eight fields', () => {
    const snapshot = paidSnapshot('R1');
    for (const chapter of snapshot.chapters) {
      const blob = `${chapter.title}\n${chapterFields(chapter)}`;
      assert.doesNotMatch(blob, R1_FORBIDDEN, `R1 ${chapter.key} must stay premise-safe`);
      assert.doesNotMatch(blob, CLAIM_FORBIDDEN, `R1 ${chapter.key} claim`);
      assert.doesNotMatch(blob, PARTNER_FACTUAL_LOOP, `R1 ${chapter.key} partner factual`);
    }
    assert.doesNotMatch(paidCompatibilityChapterTitle('ch_about'), /戻る/);
    assert.match(snapshot.chapters.find((c) => c.key === 'ch_pair_gap')!.scene, /会話がない|近づく/);
  });

  it('keeps R2 semantics observational without dating/reciprocity claims across all eight fields', () => {
    const snapshot = paidSnapshot('R2');
    for (const chapter of snapshot.chapters) {
      assert.doesNotMatch(chapterFields(chapter), R2_FORBIDDEN, `R2 ${chapter.key}`);
      assert.doesNotMatch(chapterFields(chapter), CLAIM_FORBIDDEN, `R2 ${chapter.key} claim`);
    }
    assert.match(snapshot.chapters.find((c) => c.key === 'ch_other_pace')!.scene, /連絡|やり取り/);
  });

  it('keeps R1 and R2 free materialization free of paid handling value', () => {
    for (const stage of ['R1', 'R2'] as const) {
      const blob = freeInsightBlob(stage);
      assert.doesNotMatch(blob, FREE_HANDLING_FORBIDDEN, `${stage} free handling leak`);
    }
    const builtR1 = mustBuild('R1');
    const builtR2 = mustBuild('R2');
    const guestBlob = [
      builtR1.free.relationshipDynamic,
      builtR1.currentContext?.relationshipLoop ?? '',
      builtR2.free.relationshipDynamic,
      builtR2.currentContext?.relationshipLoop ?? '',
    ].join('\n');
    assert.doesNotMatch(guestBlob, FREE_HANDLING_FORBIDDEN, 'guest free surface handling leak');
  });

  for (const stage of ['R1', 'R2'] as const) {
    it(`keeps ${stage} paid chapters claim-safe across all six chapters and eight fields`, () => {
      const snapshot = paidSnapshot(stage);
      for (const chapter of snapshot.chapters) {
        const blob = chapterFields(chapter);
        assert.doesNotMatch(blob, CLAIM_FORBIDDEN, `${stage} ${chapter.key} claim`);
        assert.doesNotMatch(blob, PARTNER_FACTUAL_LOOP, `${stage} ${chapter.key} partner factual`);
      }
    });
  }

  for (const stage of ['R4', 'R5'] as const) {
    it(`keeps ${stage} paid chapters free of partner factual assertions`, () => {
      const snapshot = paidSnapshot(stage);
      for (const chapter of snapshot.chapters) {
        const blob = chapterFields(chapter);
        assert.doesNotMatch(blob, PARTNER_FACTUAL_LOOP, `${stage} ${chapter.key} partner factual`);
      }
    });
  }

  it('generates structural-only sceneInteractionId values for new reports', () => {
    const snapshot = paidSnapshot('R3');
    for (const chapter of snapshot.chapters) {
      assert.match(chapter.sceneInteractionId, STRUCTURAL_SCENE_ID, chapter.key);
      assert.equal(chapter.sceneInteractionId, sceneInteractionIdFor(chapter.key));
    }
    assert.equal(
      isPaidCompatibilityReportSnapshot({
        ...snapshot,
        chapters: snapshot.chapters.map((chapter, index) =>
          index === 0
            ? { ...chapter, sceneInteractionId: 'ch_you_pace:start:askxmap:near' }
            : chapter,
        ),
      }),
      true,
    );
  });

  it('rejects provider, account, email, and UUID poison in serialized snapshots', () => {
    const built = buildCanonicalCompatibilityPurchaseSnapshot(PAIR, 'R3', STAGE_ANSWERS.R3);
    assert.equal(built.ok, true);
    if (!built.ok) throw new Error('unreachable');
    const probes = [
      'user_abcdefghijklmnopqrstuv',
      'cus_abcdefghijklmnopqrstuv',
      'sub_abcdefghijklmnopqrstuv',
      'acct_abcdefghijklmnopqrstuv',
      'poison@example.com',
      '12345678-1234-4123-8123-123456789abc',
    ] as const;
    for (const probe of probes) {
      const poisoned = JSON.parse(JSON.stringify(built.snapshot)) as {
        relationshipSummary: string;
      } & typeof built.snapshot;
      poisoned.relationshipSummary = `${built.snapshot.relationshipSummary} ${probe}`;
      assert.equal(isPaidCompatibilityReportSnapshot(poisoned), false, probe);
    }
  });

  it('keeps R1 premium bridge free of established-interaction assumptions', () => {
    const bridge = stagePremiumBridgeCopy('R1');
    const blob = [
      bridge.deliverableLead,
      ...bridge.toolkitTiles.map((tile) => `${tile.title} ${tile.body}`),
      ...bridge.useCases,
    ].join('\n');
    assert.doesNotMatch(blob, /二人で次を決める速さ|すれ違い|戻し方|相手.*傾向/);
    for (const tile of bridge.toolkitTiles) {
      assert.ok(tile.title.length > 0);
      assert.ok(tile.body.length > 0);
    }
  });

  it('keeps R2 premium bridge labels stage-safe', () => {
    const bridge = stagePremiumBridgeCopy('R2');
    const blob = [
      bridge.deliverableLead,
      ...bridge.toolkitTiles.map((tile) => `${tile.title} ${tile.body}`),
      ...bridge.useCases,
    ].join('\n');
    assert.doesNotMatch(blob, /二人で次を決める速さ|すれ違いのあと|戻し方/);
  });

  it('keeps paid reader chrome stage-neutral', () => {
    const reader = readFileSync(
      join(import.meta.dirname, '../../../components/compatibility/PaidCompatibilityReportReader.tsx'),
      'utf8',
    );
    assert.doesNotMatch(reader, /すれ違った時に読む|距離を戻したい時に読む/);
    assert.doesNotMatch(reader, /この連鎖を戻す入口|この場面から戻るために|章一覧へ戻る/);
    assert.match(reader, /気になる章から読む/);
    assert.match(reader, /間合いを整えるときに読む/);
    assert.match(reader, /この連鎖の入口/);
    assert.match(reader, /この場面を整えるために/);
  });

  it('builds R1 preview fixture without wrong-stage focus', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T4',
      relationStatusId: 'R1',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
      currentContextV2: STAGE_ANSWERS.R1,
    });
    assert.equal(isPaidCompatibilityReportSnapshot(snapshot), true);
    assert.doesNotMatch(JSON.stringify(snapshot.currentContext), /distance_focus/);
  });

  it('accepts valid compatibility_current_context_v1 nested snapshots and rejects undeclared keys', () => {
    const built = buildCanonicalCompatibilityPurchaseSnapshot(PAIR, 'R3', STAGE_ANSWERS.R3);
    assert.equal(built.ok, true);
    if (!built.ok) throw new Error('unreachable');
    const withoutContext = JSON.parse(JSON.stringify(built.snapshot)) as typeof built.snapshot;
    delete (withoutContext as { currentContext?: unknown }).currentContext;
    assert.equal(isPaidCompatibilityReportSnapshot(withoutContext), true);
    const v1Context = buildCompatibilityCurrentContextDisplay(LEGACY_V1_CONTEXT);
    const withV1 = JSON.parse(JSON.stringify(built.snapshot)) as Record<string, unknown> & {
      currentContext?: ReturnType<typeof buildCompatibilityCurrentContextDisplay>;
    };
    withV1.currentContext = {
      ...v1Context,
      questionnaireContractVersion: COMPATIBILITY_CURRENT_CONTEXT_VERSION,
    };
    assert.equal(isPaidCompatibilityReportSnapshot(withV1), true);
    assert.equal(
      withV1.currentContext?.questionnaireContractVersion,
      COMPATIBILITY_CURRENT_CONTEXT_VERSION,
    );
    const v1Poisoned = JSON.parse(JSON.stringify(withV1)) as typeof withV1;
    (v1Poisoned.currentContext as Record<string, unknown>).unknownField = 'x';
    assert.equal(isPaidCompatibilityReportSnapshot(v1Poisoned), false);
    const v2Poisoned = JSON.parse(JSON.stringify(built.snapshot)) as typeof built.snapshot;
    (v2Poisoned.currentContext as Record<string, unknown>).approachIntent = 'custom';
    assert.equal(isPaidCompatibilityReportSnapshot(v2Poisoned), false);
  });

  it('does not inject synthetic distance into R3 materialization when distance was not collected', () => {
    const withoutDistance = paidSnapshot('R3');
    const withDistance = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T3',
      relationStatusId: 'R3',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
      currentContextV2: { ...STAGE_ANSWERS.R3, distance: 'go_quiet' },
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
    });
    const displayWithout = withoutDistance.currentContext!;
    const displayWith = withDistance.currentContext!;
    assert.doesNotMatch(displayWithout.relationshipLoop, /離れる前の説明を手がかり/);
    assert.doesNotMatch(displayWithout.relationshipLoop, /静かな時間の意味が見えず/);
    assert.match(displayWith.relationshipLoop, /静かな時間の意味が見えず/);
    const clueWithout = withoutDistance.chapters.find((chapter) => chapter.key === 'ch_today_clue')!;
    const clueWith = withDistance.chapters.find((chapter) => chapter.key === 'ch_today_clue')!;
    assert.doesNotMatch(clueWithout.scene, /今は距離が必要なとき、説明より先に静かになる/);
    assert.match(clueWith.scene, /今は距離が必要なとき、説明より先に静かになる/);
    assert.notEqual(clueWithout.scene, clueWith.scene);
  });

  it('does not inject synthetic distance into R6 materialization when distance was not collected', () => {
    const withoutDistance = paidSnapshot('R6');
    const display = withoutDistance.currentContext!;
    assert.doesNotMatch(display.relationshipLoop, /離れる前の説明を手がかり/);
    assert.doesNotMatch(display.relationshipLoop, /静かな時間の意味が見えず/);
    const clue = withoutDistance.chapters.find((chapter) => chapter.key === 'ch_today_clue')!;
    assert.doesNotMatch(clue.scene, /今は距離が必要な理由や時間は言葉にしやすい状態/);
    assert.doesNotMatch(clue.scene, /今は距離が必要なとき、説明より先に静かになる/);
  });

  it('keeps legacy-compatible distance semantics when distance was genuinely collected on R3', () => {
    const withDistance = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T3',
      relationStatusId: 'R3',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
      currentContextV2: { ...STAGE_ANSWERS.R3, distance: 'explain_space' },
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
    });
    assert.match(withDistance.currentContext!.relationshipLoop, /離れる前の説明を手がかり/);
    const clue = withDistance.chapters.find((chapter) => chapter.key === 'ch_today_clue')!;
    assert.match(clue.scene, /今は距離が必要な理由や時間は言葉にしやすい状態/);
  });

  it('keeps R3/R6 established-interaction semantics substantive', () => {
    for (const stage of ['R3', 'R6'] as const) {
      const snapshot = paidSnapshot(stage);
      const gap = snapshot.chapters.find((c) => c.key === 'ch_pair_gap')!;
      assert.match(gap.scene, /意見が分かれ|話の進め方/);
      assert.ok(gap.resetSteps.length >= 2);
      assert.ok(gap.relationshipLoop.length >= 3);
    }
  });

  it('keeps R4 and R5 semantically distinct on distance vs reapproach', () => {
    const r4 = paidSnapshot('R4');
    const r5 = paidSnapshot('R5');
    for (const chapter of r4.chapters) {
      const blob = chapterFields(chapter);
      assert.doesNotMatch(blob, R4_SCENE_FORBIDDEN, `R4 ${chapter.key}`);
      assert.doesNotMatch(blob, CLAIM_FORBIDDEN, `R4 ${chapter.key}`);
    }
    for (const chapter of r5.chapters) {
      const blob = chapterFields(chapter);
      assert.match(blob, R5_SCENE_REQUIRED, `R5 ${chapter.key}`);
      assert.doesNotMatch(blob, CLAIM_FORBIDDEN, `R5 ${chapter.key}`);
    }
    const r4About = r4.chapters.find((c) => c.key === 'ch_about')!;
    const r5About = r5.chapters.find((c) => c.key === 'ch_about')!;
    const r4Clue = r4.chapters.find((c) => c.key === 'ch_today_clue')!;
    const r5Clue = r5.chapters.find((c) => c.key === 'ch_today_clue')!;
    assert.match(r4About.scene, /距離が続|間合い/);
    assert.match(r5About.scene, /もう一度近づく|再接近/);
    assert.notEqual(r4About.scene, r5About.scene);
    assert.notEqual(r4Clue.scene, r5Clue.scene);
    assert.notEqual(
      r4.chapters.find((c) => c.key === 'ch_you_pace')!.scene,
      r5.chapters.find((c) => c.key === 'ch_you_pace')!.scene,
    );
  });

  it('varies paid chapter scenes materially across stages', () => {
    const scenes = (['R1', 'R3', 'R5'] as const).map(
      (stage) => paidSnapshot(stage).chapters.find((chapter) => chapter.key === 'ch_about')!.scene,
    );
    assert.equal(new Set(scenes).size, 3);
  });

  it('builds privacy-safe checkout snapshots with v2 display and no raw answer or relation IDs', () => {
    const built = buildCanonicalCompatibilityPurchaseSnapshot(
      PAIR,
      'R3',
      STAGE_ANSWERS.R3,
    );
    assert.equal(built.ok, true);
    if (!built.ok) throw new Error('unreachable');
    assert.equal(isPaidCompatibilityReportSnapshot(built.snapshot), true);
    const serialized = JSON.stringify(built.snapshot);
    assert.equal(built.snapshot.currentContext?.questionnaireContractVersion, 'compatibility_current_context_v2');
    for (const statusId of RAW_RELATION_IDS) {
      assert.doesNotMatch(serialized, new RegExp(`"${statusId}"`));
      assert.doesNotMatch(serialized, new RegExp(`:${statusId}(?="|$)`));
    }
    for (const answerId of RAW_ANSWER_IDS) {
      assert.doesNotMatch(serialized, new RegExp(answerId));
    }
    for (const chapter of built.snapshot.chapters) {
      assert.doesNotMatch(chapter.sceneInteractionId, /:R[1-6](?="|$)/);
      for (const statusId of RAW_RELATION_IDS) {
        assert.doesNotMatch(chapter.sceneInteractionId, new RegExp(statusId));
      }
      for (const answerId of RAW_ANSWER_IDS) {
        assert.doesNotMatch(chapter.sceneInteractionId, new RegExp(answerId));
      }
    }
  });

  it('rejects snapshots that smuggle raw relation IDs, answer IDs, or unknown keys', () => {
    const built = buildCanonicalCompatibilityPurchaseSnapshot(PAIR, 'R3', STAGE_ANSWERS.R3);
    assert.equal(built.ok, true);
    if (!built.ok) throw new Error('unreachable');
    const poisoned = JSON.parse(JSON.stringify(built.snapshot)) as {
      chapters: Array<{ sceneInteractionId: string }>;
    } & typeof built.snapshot;
    poisoned.chapters[0]!.sceneInteractionId = 'ch_you_pace:R3';
    assert.equal(isPaidCompatibilityReportSnapshot(poisoned), false);
    const topLevelExtra = JSON.parse(JSON.stringify(built.snapshot)) as Record<string, unknown>;
    topLevelExtra.relationStatusId = 'stage-redacted';
    assert.equal(isPaidCompatibilityReportSnapshot(topLevelExtra), false);
    const chapterExtra = JSON.parse(JSON.stringify(built.snapshot)) as {
      chapters: Array<Record<string, unknown>>;
    };
    chapterExtra.chapters[0]!.unknownField = 'x';
    assert.equal(isPaidCompatibilityReportSnapshot(chapterExtra), false);
    const legacy = JSON.parse(JSON.stringify(built.snapshot)) as typeof built.snapshot;
    delete (legacy as { currentContext?: unknown }).currentContext;
    assert.equal(isPaidCompatibilityReportSnapshot(legacy), true);
    const v2Built = buildCanonicalCompatibilityPurchaseSnapshot(PAIR, 'R1', STAGE_ANSWERS.R1);
    assert.equal(v2Built.ok, true);
    if (!v2Built.ok) throw new Error('unreachable');
    assert.equal(isPaidCompatibilityReportSnapshot(v2Built.snapshot), true);
    assert.equal(
      v2Built.snapshot.currentContext?.questionnaireContractVersion,
      'compatibility_current_context_v2',
    );
  });

  it('rejects invalid relation stage identifiers for restore and public build', () => {
    assert.equal(isValidCompatibilityRelationStatusId('R7'), false);
    assert.equal(isValidCompatibilityRelationStatusId('R2'), true);
    const invalid = buildCompatibilityPublicResult(PAIR, 'R7' as RelationStatusId, STAGE_ANSWERS.R2);
    assert.equal(invalid.ok, false);
  });

  it('exposes stage-specific question counts instead of fixed six mandatory questions', () => {
    assert.equal(questionsForRelationStage('R1').filter((q) => q.questionId !== 'focus').length, 2);
    assert.equal(questionsForRelationStage('R3').filter((q) => q.questionId !== 'focus').length, 4);
  });

  it('maps v2 answers to legacy-readable bodies without exposing raw IDs in display', () => {
    const legacy = toLegacyCurrentContextAnswers(STAGE_ANSWERS.R3, 'R3');
    assert.equal(legacy.decisionPace, 'decide_later');
    assert.equal(legacy.focus, 'next_step_focus');
  });

  for (const stage of ['R1', 'R2', 'R3', 'R6'] as const) {
    it(`materializes all eight paid fields for ${stage}`, () => {
      const snapshot = paidSnapshot(stage);
      for (const chapter of snapshot.chapters) {
        assert.ok(chapter.scene.trim().length > 0, `${stage} ${chapter.key} scene`);
        assert.ok(chapter.personAPerspective.trim().length > 0, `${stage} ${chapter.key} A`);
        assert.ok(chapter.personBPerspective.trim().length > 0, `${stage} ${chapter.key} B`);
        assert.ok(chapter.relationshipLoop.length >= 3, `${stage} ${chapter.key} loop`);
        assert.ok(chapter.resetSteps.length >= 2, `${stage} ${chapter.key} reset`);
        assert.ok(chapter.usablePhrase.trim().length > 0, `${stage} ${chapter.key} phrase`);
        assert.ok(chapter.smallExperiment.trim().length > 0, `${stage} ${chapter.key} experiment`);
        assert.ok(chapter.reflectionQuestion.trim().length > 0, `${stage} ${chapter.key} reflection`);
        assert.ok(chapter.sceneInteractionId.trim().length > 0, `${stage} ${chapter.key} id`);
      }
    });
  }

  for (const stage of ['R4', 'R5'] as const) {
    it(`materializes all eight paid fields for every ${stage} chapter`, () => {
      const snapshot = paidSnapshot(stage);
      for (const chapter of snapshot.chapters) {
        const blob = chapterFields(chapter);
        assert.ok(chapter.scene.trim().length > 0, `${stage} ${chapter.key} scene`);
        assert.doesNotMatch(blob, CLAIM_FORBIDDEN, `${stage} ${chapter.key}`);
        assert.ok(chapter.personAPerspective.trim().length > 0, `${stage} ${chapter.key} A`);
        assert.ok(chapter.personBPerspective.trim().length > 0, `${stage} ${chapter.key} B`);
        assert.ok(chapter.relationshipLoop.length >= 3, `${stage} ${chapter.key} loop`);
        assert.ok(chapter.resetSteps.length >= 2, `${stage} ${chapter.key} reset`);
        assert.ok(chapter.usablePhrase.trim().length > 0, `${stage} ${chapter.key} phrase`);
        assert.ok(chapter.smallExperiment.trim().length > 0, `${stage} ${chapter.key} experiment`);
        assert.ok(chapter.reflectionQuestion.trim().length > 0, `${stage} ${chapter.key} reflection`);
      }
    });
  }

  it('keeps R1 paid foundation and all six chapters free of zero-contact violations', () => {
    const snapshot = paidSnapshot('R1');
    const foundation = [
      snapshot.relationshipSummary,
      snapshot.sharedFoundation,
      snapshot.differentFoundation,
      snapshot.recurringLoop,
    ].join('\n');
    assert.doesNotMatch(foundation, R1_ZERO_CONTACT_FORBIDDEN);
    for (const chapter of snapshot.chapters) {
      const blob = `${chapter.title}\n${chapterFields(chapter)}`;
      assert.doesNotMatch(blob, R1_ZERO_CONTACT_FORBIDDEN, `R1 ${chapter.key} zero-contact`);
    }
  });

  it('keeps R1 free complete contract recognition-only', () => {
    const built = mustBuild('R1');
    const freeBlob = JSON.stringify(built.free);
    assert.doesNotMatch(freeBlob, FREE_HANDLING_FORBIDDEN);
    assert.doesNotMatch(freeBlob, R1_ZERO_CONTACT_FORBIDDEN);
    assert.ok(built.free.immediateAction.situation.length > 0);
    assert.ok(built.free.immediateAction.action.length > 0);
    assert.doesNotMatch(built.free.immediateAction.action, /てください|しよう|してみ|決めて/);
  });

  for (const stage of ['R2', 'R4', 'R5'] as const) {
    it(`materializes stage-safe focus metadata for every allowed ${stage} focus`, () => {
      const focuses = stageSafeFocusOptions(stage);
      for (const focus of focuses) {
        const answers = { ...STAGE_ANSWERS[stage], focus };
        const display = buildCompatibilityCurrentContextDisplayV2(answers, stage);
        const blob = [
          display.focusLabel,
          display.readingGuide,
          ...display.chapterPreview.map((item) => `${item.reason} ${item.concreteValue}`),
        ].join('\n');
        assert.doesNotMatch(blob, /二人で次を決める|元の距離へ戻る|付き合|交際/);
        const built = buildCompatibilityPublicResult(PAIR, stage, answers);
        assert.equal(built.ok, true);
        if (!built.ok) throw new Error('unreachable');
        assert.equal(built.value.mappedChapters.length, 2);
      }
      const omitted = buildCompatibilityCurrentContextDisplayV2(STAGE_ANSWERS[stage], stage);
      assert.equal(omitted.focusLabel.length > 0, true);
    });
  }

  it('does not let fabricated legacy fields alter R4/R5 user-visible output', () => {
    for (const stage of ['R4', 'R5'] as const) {
      const baseline = paidSnapshot(stage);
      const poisoned = buildPaidCompatibilityReportV1({
        pairAxisId: 'A2',
        paidTopicId: 'T3',
        relationStatusId: stage,
        temperatureId: 'E0',
        personAUsesFirstPerspective: true,
        currentContextV2: {
          ...STAGE_ANSWERS[stage],
          decisionPace: 'decide_now',
          disagreement: 'talk_now',
          returnPattern: 'return_is_hard',
        },
        personABirthDate: PAIR.personA,
        personBBirthDate: PAIR.personB,
      });
      assert.equal(JSON.stringify(baseline.chapters), JSON.stringify(poisoned.chapters));
      assert.equal(
        baseline.currentContext?.relationshipLoop,
        poisoned.currentContext?.relationshipLoop,
      );
    }
  });

  it('keeps R4 partner claims observable not motive-inferring', () => {
    const snapshot = paidSnapshot('R4');
    for (const chapter of snapshot.chapters) {
      const blob = chapterFields(chapter);
      assert.doesNotMatch(blob, /距離を置きたくなる/);
      assert.doesNotMatch(blob, PARTNER_INNER_STATE, `R4 ${chapter.key}`);
    }
  });

  it('validates exact R1–R6 preview inventory and production input contract', () => {
    const stageIds = previewFixtureStageIds();
    assert.deepEqual([...stageIds].sort(), [...RAW_RELATION_IDS].sort());
    assert.equal(new Set(stageIds).size, 6);
    assert.equal(stageIds.join(','), 'R1,R2,R3,R4,R5,R6');
    const previewSource = readFileSync(PREVIEW_FIXTURE_PATH, 'utf8');
    const buildPaidSource = readFileSync(
      join(import.meta.dirname, './buildPaidCompatibilityReportV1.ts'),
      'utf8',
    );
    assert.doesNotMatch(buildPaidSource, /PAID_COMPATIBILITY_PREVIEW_SYNTHETIC_REPORTS/);
    for (const stage of RAW_RELATION_IDS) {
      const fixtureMatch = previewSource.match(
        new RegExp(`id:\\s*'stage-r${stage.slice(1)}'[\\s\\S]*?relationStatusId:\\s*'${stage}'`),
      );
      assert.ok(fixtureMatch, `preview must include one fixture for ${stage}`);
      const answers = STAGE_ANSWERS[stage];
      assert.equal(isCompleteCompatibilityCurrentContextV2(answers, stage), true, stage);
      const snapshot = buildPaidCompatibilityReportV1({
        pairAxisId: 'A2',
        paidTopicId: 'T3',
        relationStatusId: stage,
        temperatureId: 'E0',
        personAUsesFirstPerspective: true,
        currentContextV2: answers,
      });
      assert.equal(isPaidCompatibilityReportSnapshot(snapshot), true, stage);
    }
  });

  it('rejects R4 answers that smuggle returnPattern', () => {
    assert.equal(
      questionsForRelationStage('R4').some((question) => question.questionId === 'returnPattern'),
      false,
    );
    const poisoned = { ...STAGE_ANSWERS.R4, returnPattern: 'someone_reaches' as const };
    assert.equal(isCompleteCompatibilityCurrentContextV2(poisoned, 'R4'), false);
    assert.equal(questionsForRelationStage('R4').filter((q) => q.questionId !== 'focus').length, 2);
  });

  it('materializes stage-specific evidenceQuestionIds for every native stage', () => {
    for (const stage of RAW_RELATION_IDS) {
      const insight = buildPairFreeInsightSpecV2({
        answersV2: STAGE_ANSWERS[stage],
        pairAxisId: 'A2',
        personABirthDate: PAIR.personA,
        personBBirthDate: PAIR.personB,
        personAUsesFirstPerspective: true,
        focusLabel: '会話の進め方',
        relationStatusId: stage,
      });
      assert.deepEqual([...insight.evidenceQuestionIds].sort(), [...EXPECTED_EVIDENCE[stage]].sort());
      assert.equal(insight.evidenceQuestionIds.includes('focus' as never), false);
    }
  });

  for (const topic of PAID_TOPICS) {
    for (const temperature of TEMPERATURES) {
      for (const axis of PAIR_AXES) {
        it(`keeps R1 paid materialization zero-contact safe for ${axis}/${topic}/${temperature}`, () => {
          const snapshot = buildPaidCompatibilityReportV1({
            pairAxisId: axis,
            paidTopicId: topic,
            relationStatusId: 'R1',
            temperatureId: temperature,
            personAUsesFirstPerspective: true,
            currentContextV2: STAGE_ANSWERS.R1,
            personABirthDate: PAIR.personA,
            personBBirthDate: PAIR.personB,
          });
          const foundation = [
            snapshot.relationshipSummary,
            snapshot.sharedFoundation,
            snapshot.differentFoundation,
            snapshot.recurringLoop,
          ].join('\n');
          const titles = snapshot.chapters.map((chapter) => chapter.title).join('\n');
          const chapters = snapshot.chapters.map((chapter) => chapterFields(chapter)).join('\n');
          const blob = `${foundation}\n${titles}\n${chapters}`;
          assert.doesNotMatch(blob, R1_FORBIDDEN, `${axis}/${topic}/${temperature}`);
          assert.doesNotMatch(blob, R1_ZERO_CONTACT_FORBIDDEN, `${axis}/${topic}/${temperature}`);
          assert.doesNotMatch(blob, R1_CONTACT_FORBIDDEN, `${axis}/${topic}/${temperature}`);
          assert.doesNotMatch(blob, PARTNER_INNER_STATE, `${axis}/${topic}/${temperature}`);
        });
      }
    }
  }

  it('keeps R1 partner perspectives observational without mind-reading', () => {
    const snapshot = paidSnapshot('R1');
    for (const chapter of snapshot.chapters) {
      assert.doesNotMatch(chapter.personBPerspective, PARTNER_INNER_STATE, chapter.key);
      assert.doesNotMatch(chapter.personBPerspective, /見えやすい状態に見え|控えたい状態/);
      assert.match(chapter.personBPerspective, /B側については|確かめにくい|決めにくい/);
    }
  });

  for (const stage of RAW_RELATION_IDS) {
    it(`keeps ${stage} complete free contract recognition-only`, () => {
      const blob = freePublicBlob(stage);
      assert.doesNotMatch(blob, FREE_HANDLING_FORBIDDEN, `${stage} free handling`);
      assert.doesNotMatch(blob, /てください|してみてください|試してみて|記録してみて/);
    });
  }

  for (const stage of ['R4', 'R5'] as const) {
    it(`keeps ${stage} partner claims uncertainty-safe in paid loops and perspectives`, () => {
      const snapshot = paidSnapshot(stage);
      for (const chapter of snapshot.chapters) {
        const blob = chapterFields(chapter);
        assert.doesNotMatch(blob, PARTNER_INNER_STATE, `${stage} ${chapter.key}`);
        assert.doesNotMatch(chapter.personBPerspective, /たいパターン|保ちたい|戻りたい|始めたい/);
      }
    });
  }

  it('materializes Japanese copy fixes in generated output', () => {
    const r5 = buildPairFreeInsightSpecV2({
      answersV2: STAGE_ANSWERS.R5,
      pairAxisId: 'A2',
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
      personAUsesFirstPerspective: true,
      focusLabel: '戻り方',
      relationStatusId: 'R5',
    });
    assert.match(r5.reset, /もう一度近づく前は、/);
    assert.doesNotMatch(r5.reset, /もう一度近づく前では、/);
    const r1 = paidSnapshot('R1');
    const r4 = paidSnapshot('R4');
    const loopBlob = r1.chapters
      .flatMap((chapter) => chapter.relationshipLoop)
      .concat(r4.chapters.flatMap((chapter) => chapter.relationshipLoop))
      .join('\n');
    assert.doesNotMatch(loopBlob, /動きが見えやすい動きが見えます/);
    assert.doesNotMatch(loopBlob, /確かめる読み取りのずれ/);
    const r1Approach = buildPairFreeInsightSpecV2({
      answersV2: { ...STAGE_ANSWERS.R1, approachIntent: 'wait_for_signal' },
      pairAxisId: 'A2',
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
      personAUsesFirstPerspective: true,
      focusLabel: 'これからの進め方',
      relationStatusId: 'R1',
    });
    assert.match(r1Approach.reset, /読み取りのずれが起きやすい/);
    assert.doesNotMatch(r1Approach.reset, /確かめる読み取りのずれ/);
  });

  it('keeps R1 free teasers zero-contact safe across topics', () => {
    const R1_TEASER_FORBIDDEN =
      /連絡や会話のペース差|すれ違いやすい場面|返事の速さ|会話の温度の続き方|反応しやすい場面/;
    for (const topic of PAID_TOPICS) {
      const built = buildCompatibilityPublicResult(
        PAIR,
        'R1',
        STAGE_ANSWERS.R1,
        {
          relationStatusId: 'R1',
          paidTopicId: topic,
          temperatureId: 'E2',
        },
      );
      assert.equal(built.ok, true, topic);
      if (!built.ok) throw new Error('unreachable');
      assert.doesNotMatch(built.value.freeTeaser, R1_TEASER_FORBIDDEN, `${topic} freeTeaser`);
      assert.match(built.value.freeTeaser, /まだ会話がない|言葉の出方|反応の見えなさ|距離の温度差|近づき方|気持ちの整え方/);
      const snapshot = buildPaidCompatibilityReportV1({
        pairAxisId: 'A2',
        paidTopicId: topic,
        relationStatusId: 'R1',
        temperatureId: 'E2',
        personAUsesFirstPerspective: true,
        currentContextV2: STAGE_ANSWERS.R1,
      });
      const teaserChapter = snapshot.chapters.find((chapter) => chapter.key === 'ch_topic_deep')!;
      assert.doesNotMatch(teaserChapter.scene, R1_TEASER_FORBIDDEN, `${topic} paid scene`);
    }
  });

  it('keeps R1 free complete surface recognition-only including partner uncertainty', () => {
    const built = mustBuild('R1');
    const blob = JSON.stringify(built.free);
    assert.doesNotMatch(blob, FREE_HANDLING_FORBIDDEN);
    assert.doesNotMatch(blob, R1_ZERO_CONTACT_FORBIDDEN);
    assert.doesNotMatch(built.free.perspectives.personB, /控えたい|したい|見えやすい傾向/);
    assert.match(built.free.perspectives.personB, /反応材料|決めにくい/);
    assert.doesNotMatch(built.free.immediateAction.action, /てください|しよう|してみ|決めて/);
  });

  it('keeps complete free contract free of paid handling value for R1', () => {
    const built = mustBuild('R1');
    const blob = JSON.stringify(built.free);
    assert.doesNotMatch(blob, /experiment|reset|usablePhrase|reflectionQuestion/i);
    assert.doesNotMatch(blob, FREE_HANDLING_FORBIDDEN);
  });

  it('materializes R1 public short manual without partner mind-reading or prior contact', () => {
    const { manual, narrative } = r1PublicSurface();
    const other = manual.slots.find((slot) => slot.id === 'other_tends');
    assert.ok(other, 'R1 short manual must include other_tends');
    const blob = [
      JSON.stringify(manual),
      narrative.openingHit.text,
      narrative.fusedDiscovery?.text ?? '',
      ...narrative.contextSections.map((section) => section.text),
      narrative.shareCandidates.map((candidate) => candidate.bodyJa).join('\n'),
    ].join('\n');
    assert.doesNotMatch(other!.bodyJa, R1_MANUAL_PARTNER_FORBIDDEN);
    assert.doesNotMatch(blob, R1_MANUAL_PARTNER_FORBIDDEN);
    assert.doesNotMatch(blob, R1_MANUAL_HANDLING_FORBIDDEN);
    assert.match(other!.bodyJa, /反応材料|決めにくい/);
    assert.equal(manual.slots.some((slot) => slot.id === 'return_path'), false);
    assert.equal(manual.slots.some((slot) => slot.id === 'pair_talk_hint'), false);
  });

  it('keeps R1 public manual recognition-only across PairManualBlock-facing slots', () => {
    const insight = buildPairFreeInsightSpecV2({
      answersV2: STAGE_ANSWERS.R1,
      pairAxisId: 'A2',
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
      personAUsesFirstPerspective: true,
      focusLabel: 'これからの進め方',
      relationStatusId: 'R1',
    });
    const manual = buildPairManualV1({ spec: insight, completeness: 'short' });
    for (const slot of manual.slots) {
      assert.doesNotMatch(slot.bodyJa, R1_MANUAL_HANDLING_FORBIDDEN, slot.id);
    }
    assert.doesNotMatch(manual.hiddenSpecJa, R1_MANUAL_HANDLING_FORBIDDEN);
  });

  for (const axis of PAIR_AXES) {
    for (const topic of PAID_TOPICS) {
      it(`validates final R1 guest teaser invariants for ${axis}/${topic}`, () => {
        const first = buildCompatibilityPublicResult(
          PAIR,
          'R1',
          STAGE_ANSWERS.R1,
          { relationStatusId: 'R1', paidTopicId: topic, temperatureId: 'E2', pairAxisOverride: axis },
        );
        assert.equal(first.ok, true, `${axis}/${topic}`);
        if (!first.ok) throw new Error('unreachable');
        const second = buildCompatibilityPublicResult(
          PAIR,
          'R1',
          STAGE_ANSWERS.R1,
          { relationStatusId: 'R1', paidTopicId: topic, temperatureId: 'E2', pairAxisOverride: axis },
        );
        assert.equal(second.ok, true);
        if (!second.ok) throw new Error('unreachable');
        assert.equal(first.value.freeTeaser, second.value.freeTeaser);
        const teaser = first.value.freeTeaser;
        assert.equal(countSentencesJa(teaser), 3);
        assert.ok(countFullWidthChars(teaser) >= 120 && countFullWidthChars(teaser) <= 220);
        const paidChapterBodies = rendererPaidChapterBodies(topic, axis);
        const validation = validateGuestFreeTeaser({
          teaserText: teaser,
          ctaText: PAIR_READING_CTA,
          dobs: [PAIR.personA, PAIR.personB],
          paidChapterBodies,
        });
        assert.equal(validation.ok, true, `${axis}/${topic} ${validation.ok ? '' : (validation as { message: string }).message}`);
        assert.ok(teaser.length > 0);
        assert.doesNotMatch(teaser, /連絡や会話のペース差|すれ違いやすい場面|返事の速さ/);
        assert.equal(teaser.split(PAIR_READING_CTA).length, 2);
      });
    }
  }

  it('rejects adversarial final guest teasers fail-closed with renderer-equivalent raw semantics', () => {
    const valid = validR1GuestTeaser();
    assert.equal(countSentencesJa(valid), 3);
    assert.ok(countFullWidthChars(valid) >= 120 && countFullWidthChars(valid) <= 220);

    const empty = validateGuestFreeTeaser({
      teaserText: '',
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(empty.ok, false);
    if (empty.ok) throw new Error('unreachable');
    assert.equal(empty.code, 'teaser_empty');

    const underlength = validateGuestFreeTeaser({
      teaserText: '短い。二文。だけ。',
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(underlength.ok, false);
    if (underlength.ok) throw new Error('unreachable');
    assert.equal(underlength.code, 'teaser_length');

    const padToOverlength = 221 - countFullWidthChars(valid) + 1;
    const rawOverlength = `${valid.slice(0, -1)}${'長'.repeat(padToOverlength)}。`;
    assert.ok(countFullWidthChars(rawOverlength) > 220);
    assert.equal(countSentencesJa(rawOverlength), 3);
    const overlength = validateGuestFreeTeaser({
      teaserText: rawOverlength,
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(overlength.ok, false);
    if (overlength.ok) throw new Error('unreachable');
    assert.equal(overlength.code, 'teaser_length');

    const leadingPad = ' '.repeat(countFullWidthChars(valid) > 220 ? 1 : 221 - countFullWidthChars(valid));
    const leadingWhitespace = `${leadingPad}${valid}`;
    assert.ok(countFullWidthChars(leadingWhitespace) > 220);
    assert.ok(countFullWidthChars(leadingWhitespace.trim()) <= 220);
    const leadingReject = validateGuestFreeTeaser({
      teaserText: leadingWhitespace,
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(leadingReject.ok, false);
    if (leadingReject.ok) throw new Error('unreachable');
    assert.equal(leadingReject.code, 'teaser_length');

    const trailingPad = ' '.repeat(221 - countFullWidthChars(valid));
    const trailingWhitespace = `${valid}${trailingPad}`;
    assert.ok(countFullWidthChars(trailingWhitespace) > 220);
    const trailingReject = validateGuestFreeTeaser({
      teaserText: trailingWhitespace,
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(trailingReject.ok, false);
    if (trailingReject.ok) throw new Error('unreachable');
    assert.equal(trailingReject.code, 'teaser_length');

    const wrongSentenceCount = validateGuestFreeTeaser({
      teaserText:
        'この二文だけの負のコントロール用テキストは、文数検証のために意図的に三文化していません。第二文として同じく十分な長さを確保するためのフィラー文字列を続けて、合計文字数が百二十文字を超えるようにしています。',
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(wrongSentenceCount.ok, false);
    if (wrongSentenceCount.ok) throw new Error('unreachable');
    assert.equal(wrongSentenceCount.code, 'teaser_sentence_count');

    const dobLeak = validateGuestFreeTeaser({
      teaserText: valid.replace('組み合わせ', PAIR.personA),
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(dobLeak.ok, false);
    if (dobLeak.ok) throw new Error('unreachable');
    assert.equal(dobLeak.code, 'teaser_unsafe');

    const deepening = validateGuestFreeTeaser({
      teaserText:
        'この2人は、気持ちの強さよりも、反応の出方の違いが見えやすい組み合わせです。今日見る一つの手がかりでは、入口の小ささや間合いの置き方が見えやすく、先に動くより整えるほうが自然に感じられます。占いではありませんが、二人の相性レポートで開けます。',
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(deepening.ok, false);
    if (deepening.ok) throw new Error('unreachable');
    assert.equal(deepening.code, 'teaser_unsafe');

    const duplicateCta = validateGuestFreeTeaser({
      teaserText: valid.replace('で開けます。', `と${PAIR_READING_CTA}で開けます。`),
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
    });
    assert.equal(duplicateCta.ok, false);
    if (duplicateCta.ok) throw new Error('unreachable');
    assert.equal(duplicateCta.code, 'teaser_cta_duplicate');

    const nearDuplicate = validateGuestFreeTeaser({
      teaserText: valid,
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
      paidChapterBodies: rendererPaidChapterBodies('T2', 'A2'),
    });
    assert.equal(nearDuplicate.ok, true);
    const selfNearDuplicate = validateGuestFreeTeaser({
      teaserText: valid,
      ctaText: PAIR_READING_CTA,
      dobs: [PAIR.personA, PAIR.personB],
      paidChapterBodies: [valid],
    });
    assert.equal(selfNearDuplicate.ok, false);
    if (selfNearDuplicate.ok) throw new Error('unreachable');
    assert.equal(selfNearDuplicate.code, 'teaser_paid_duplicate');
  });

  for (const stage of ['R1', 'R4', 'R5'] as const) {
    it(`materializes ${stage} relationship loops without duplicate side labels`, () => {
      const snapshot = buildPaidCompatibilityReportV1({
        pairAxisId: 'A2',
        paidTopicId: 'T2',
        relationStatusId: stage,
        temperatureId: 'E2',
        personAUsesFirstPerspective: true,
        currentContextV2: STAGE_ANSWERS[stage],
        personABirthDate: PAIR.personA,
        personBBirthDate: PAIR.personB,
      });
      const loops = snapshot.chapters.flatMap((chapter) => chapter.relationshipLoop);
      const blob = loops.join('\n');
      assert.doesNotMatch(blob, /[AB]側側/u, `${stage} relationshipLoop`);
      if (stage === 'R1') {
        assert.match(blob, /反応材料が少ない/);
        assert.doesNotMatch(blob, /受け取った|返事|会話のあと/);
      }
      if (stage === 'R4') {
        assert.match(blob, /間合いの見え方だけでは/);
        assert.doesNotMatch(blob, /B側が.*したい|B側には.*したい/);
      }
      if (stage === 'R5') {
        assert.match(blob, /再接近を望んでいるとは限らず/);
        assert.doesNotMatch(blob, /B側が再接近を望んでいる[^と]/);
      }
    });
  }

  it('scans complete paid matrix across R1–R6 for Japanese composition defects', () => {
    let scanCount = 0;
    for (const stage of RAW_RELATION_IDS) {
      for (const topic of PAID_TOPICS) {
        for (const temperature of TEMPERATURES) {
          for (const axis of PAIR_AXES) {
            scanCount += 1;
            const snapshot = buildPaidCompatibilityReportV1({
              pairAxisId: axis,
              paidTopicId: topic,
              relationStatusId: stage,
              temperatureId: temperature,
              personAUsesFirstPerspective: true,
              currentContextV2: STAGE_ANSWERS[stage],
              personABirthDate: PAIR.personA,
              personBBirthDate: PAIR.personB,
            });
            const blob = snapshot.chapters.map((chapter) => paidFieldsBlob(chapter)).join('\n');
            for (const defect of JAPANESE_COMPOSITION_DEFECTS) {
              assert.doesNotMatch(blob, defect, `${stage}/${axis}/${topic}/${temperature}`);
            }
          }
        }
      }
    }
    assert.equal(scanCount, 720);
  });

  for (const stage of RAW_RELATION_IDS) {
    it(`materializes ${stage} public narrative/manual Free surface without paid handling leakage`, () => {
      const { built, narrative, manual } = publicNarrativeSurface(stage);
      const blob = [
        built.freeTeaser,
        JSON.stringify(manual),
        narrative.openingHit.text,
        narrative.fusedDiscovery?.text ?? '',
        ...narrative.contextSections.map((section) => section.text),
        narrative.shareCandidates.map((candidate) => candidate.bodyJa).join('\n'),
        ...manual.slots.map((slot) => slot.bodyJa),
        manual.hiddenSpecJa,
      ].join('\n');
      assert.doesNotMatch(blob, FREE_HANDLING_FORBIDDEN, `${stage} narrative/manual handling`);
      assert.equal(manual.slots.some((slot) => slot.id === 'return_path'), false);
      assert.equal(manual.slots.some((slot) => slot.id === 'pair_talk_hint'), false);
      if (stage === 'R1') {
        assert.doesNotMatch(blob, R1_MANUAL_PARTNER_FORBIDDEN);
        assert.doesNotMatch(blob, R1_MANUAL_HANDLING_FORBIDDEN);
        assert.doesNotMatch(blob, R1_ZERO_CONTACT_FORBIDDEN);
        const other = manual.slots.find((slot) => slot.id === 'other_tends');
        if (other) {
          assert.match(other.bodyJa, /反応材料|決めにくい/);
        }
      }
      if (stage === 'R4' || stage === 'R5') {
        assert.doesNotMatch(blob, PARTNER_INNER_STATE);
      }
    });
  }
});
