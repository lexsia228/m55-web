import {
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  PAIR_READING_CTA,
  SAFETY_PROFILE,
  SAFETY_SHORT_TEXT,
} from './pairReadingCatalog.v1';
import { buildCompatibilityFreeResultFragments, buildTeaserText, validateGuestFreeTeaser } from './pairReadingFragments.v1';
import {
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityRelationStatusId,
  type CompatibilityGuestInput,
  type CompatibilityGuestResultOutcome,
  type CompatibilityMappedChapter,
} from './pairReadingGuestContract';
import { derivePairAxisId } from './pairReadingFingerprint';
import { renderPairReading } from './pairReadingRenderer';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';
import {
  isCompleteCompatibilityCurrentContextV2,
  resolveFocusAnswer,
  toLegacyCurrentContextAnswers,
  type CompatibilityCurrentContextAnswersV2,
} from './currentContextContract.v2';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import type {
  ChapterId,
  PaidTopicId,
  PairAxisId,
  PairReadingInput,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';

export const PAIR_AXIS_PAID_CHAPTER_MAPPING: Readonly<Record<PairAxisId, ChapterId>> = {
  A1: 'ch_pair_gap',
  A2: 'ch_pair_gap',
  A3: 'ch_pair_gap',
  A4: 'ch_pair_gap',
};

export const TOPIC_PAID_CHAPTER_MAPPING: Readonly<Record<PaidTopicId, ChapterId>> = {
  T1: 'ch_topic_deep',
  T2: 'ch_topic_deep',
  T3: 'ch_topic_deep',
  T4: 'ch_topic_deep',
  T5: 'ch_topic_deep',
};

export const GUEST_TOPIC_BY_PAIR_AXIS: Readonly<Record<PairAxisId, PaidTopicId>> = {
  A1: 'T3',
  A2: 'T4',
  A3: 'T2',
  A4: 'T1',
};

type CompatibilityMatrixState = {
  relationStatusId: RelationStatusId;
  paidTopicId: PaidTopicId;
  temperatureId: TemperatureId;
  pairAxisOverride?: PairAxisId;
};

export function buildCompatibilityPublicResult(
  guestInput: CompatibilityGuestInput,
  relationStatusId: RelationStatusId,
  currentContextV2?: CompatibilityCurrentContextAnswersV2,
  stateOverride?: CompatibilityMatrixState,
  legacyCurrentContext?: CompatibilityCurrentContextAnswers,
): CompatibilityGuestResultOutcome {
  if (!isCompleteCompatibilityGuestInput(guestInput)) {
    return { ok: false, message: '二人分の有効な生年月日を入力してください。' };
  }
  if (!isValidCompatibilityRelationStatusId(relationStatusId)) {
    return { ok: false, message: '関係の段階を選んでください。' };
  }
  const hasV2 = Boolean(
    currentContextV2 &&
    isCompleteCompatibilityCurrentContextV2(currentContextV2, relationStatusId),
  );
  const legacyAnswers =
    hasV2 && (relationStatusId === 'R3' || relationStatusId === 'R6')
      ? toLegacyCurrentContextAnswers(currentContextV2!, relationStatusId)
      : legacyCurrentContext;

  const derivedAxis = derivePairAxisId(guestInput.personA, guestInput.personB);
  const state: CompatibilityMatrixState = stateOverride ?? {
    relationStatusId,
    paidTopicId: GUEST_TOPIC_BY_PAIR_AXIS[derivedAxis],
    temperatureId: 'E0',
  };
  const input: PairReadingInput = {
    schemaVersion: 'pair_reading_input_v1',
    personA: { role: 'personA', birthDate: guestInput.personA },
    personB: { role: 'personB', birthDate: guestInput.personB },
    relationStatusId: state.relationStatusId,
    paidTopicId: state.paidTopicId,
    temperatureId: state.temperatureId,
    pairAxisOverride: state.pairAxisOverride,
    productInternalName: PRODUCT_INTERNAL_NAME,
    productPublicName: PRODUCT_PUBLIC_NAME,
    safetyProfile: SAFETY_PROFILE,
  };
  const rendered = renderPairReading(input);
  if (!rendered.ok) {
    return { ok: false, message: '見取り図を組み立てられませんでした。入力を確認してください。' };
  }

  const personAUsesFirstPerspective =
    rendered.pairFingerprint.personADobHash <= rendered.pairFingerprint.personBDobHash;
  const free = buildCompatibilityFreeResultFragments({
    pairAxisId: rendered.pairFingerprint.pairAxisId,
    paidTopicId: state.paidTopicId,
    personAUsesFirstPerspective,
    relationStatusId: state.relationStatusId,
    recognitionOnly: hasV2,
  });
  const paidSnapshot = buildPaidCompatibilityReportV1({
    pairAxisId: rendered.pairFingerprint.pairAxisId,
    paidTopicId: state.paidTopicId,
    relationStatusId: state.relationStatusId,
    temperatureId: state.temperatureId,
    personAUsesFirstPerspective,
    ...(hasV2
      ? { currentContextV2: currentContextV2! }
      : legacyAnswers
        ? { currentContext: legacyAnswers }
        : {}),
    personABirthDate: guestInput.personA,
    personBBirthDate: guestInput.personB,
  });
  const allChapters = paidSnapshot.chapters.map((chapter) => ({
    chapterId: chapter.key,
    chapterTitle: chapter.title,
    actualContent: chapter.scene,
  }));
  const mappedIds = paidSnapshot.currentContext?.highlightedChapterKeys ?? [
    PAIR_AXIS_PAID_CHAPTER_MAPPING[rendered.pairFingerprint.pairAxisId],
    TOPIC_PAID_CHAPTER_MAPPING[state.paidTopicId],
  ] as const;
  const mappedChapters = mappedIds.map((chapterId, index) => {
    const chapter = allChapters.find((candidate) => candidate.chapterId === chapterId);
    if (!chapter) throw new Error('compatibility chapter mapping is incomplete');
    const preview = paidSnapshot.currentContext?.chapterPreview[index];
    return {
      ...chapter,
      freeConnection: index === 0 ? free.difference : free.relationshipDynamic,
      ...(preview
        ? {
          currentConnection: preview.reason,
          concreteValue: preview.concreteValue,
        }
        : {}),
    };
  }) as [CompatibilityMappedChapter, CompatibilityMappedChapter];

  const baseContext = paidSnapshot.currentContext;
  const focusLabel = hasV2
    ? resolveFocusAnswer(relationStatusId, currentContextV2!.focus)
    : baseContext?.focusLabel ?? 'これからの進め方';
  const freeContext = baseContext
    ? overlayPairFreeInsight(baseContext, {
        answersV2: hasV2 ? currentContextV2 : undefined,
        answers: legacyAnswers,
        pairAxisId: rendered.pairFingerprint.pairAxisId,
        personABirthDate: guestInput.personA,
        personBBirthDate: guestInput.personB,
        personAUsesFirstPerspective,
        focusLabel: baseContext.focusLabel,
        relationStatusId: state.relationStatusId,
      })
    : baseContext;

  const freeTeaserCandidate =
    state.relationStatusId === 'R1'
      ? buildTeaserText({
          pairAxisId: rendered.pairFingerprint.pairAxisId,
          paidTopicId: state.paidTopicId,
          safetyShortText: SAFETY_SHORT_TEXT,
          ctaText: PAIR_READING_CTA,
          relationStatusId: 'R1',
        })
      : rendered.freeTeaser.teaserText;
  const teaserValidation = validateGuestFreeTeaser({
    teaserText: freeTeaserCandidate,
    ctaText: PAIR_READING_CTA,
    dobs: [guestInput.personA, guestInput.personB],
    paidChapterBodies: rendered.paidReport.chapters.map((chapter) => chapter.chapterBody),
  });
  if (!teaserValidation.ok) {
    return {
      ok: false,
      message: '見取り図を組み立てられませんでした。入力を確認してください。',
    };
  }
  const freeTeaser = freeTeaserCandidate;

  return {
    ok: true,
    value: {
      free: overlayPairFreeDynamic(free, {
        answersV2: hasV2 ? currentContextV2 : undefined,
        answers: legacyAnswers,
        pairAxisId: rendered.pairFingerprint.pairAxisId,
        personABirthDate: guestInput.personA,
        personBBirthDate: guestInput.personB,
        personAUsesFirstPerspective,
        focusLabel,
        relationStatusId: state.relationStatusId,
      }),
      freeTeaser,
      ...(freeContext ? { currentContext: freeContext } : {}),
      mappedChapters,
      allChapters,
    },
  };
}

function overlayPairFreeInsight(
  base: NonNullable<ReturnType<typeof buildPaidCompatibilityReportV1>['currentContext']>,
  args: {
    answersV2?: CompatibilityCurrentContextAnswersV2;
    answers?: CompatibilityCurrentContextAnswers;
    pairAxisId: PairAxisId;
    personABirthDate: string;
    personBBirthDate: string;
    personAUsesFirstPerspective: boolean;
    focusLabel: string;
    relationStatusId: RelationStatusId;
  },
) {
  const insight = buildPairFreeInsightSpecV2({
    answersV2: args.answersV2,
    answers: args.answers,
    pairAxisId: args.pairAxisId,
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    focusLabel: args.focusLabel,
    relationStatusId: args.relationStatusId,
  });
  const relationshipLoopSteps = Object.freeze([
    insight.meshMoment,
    insight.mismatchEntry,
    insight.misreadLoop,
  ] as const);
  return Object.freeze({
    ...base,
    currentExpression: insight.betweenThem,
    relationshipLoopSteps,
    relationshipLoop: relationshipLoopSteps.map((step) => step.replace(/。$/u, '')).join('。') + '。',
    immediateAction: insight.reset,
  });
}

function overlayPairFreeDynamic(
  free: ReturnType<typeof buildCompatibilityFreeResultFragments>,
  args: {
    answersV2?: CompatibilityCurrentContextAnswersV2;
    answers?: CompatibilityCurrentContextAnswers;
    pairAxisId: PairAxisId;
    personABirthDate: string;
    personBBirthDate: string;
    personAUsesFirstPerspective: boolean;
    focusLabel: string;
    relationStatusId: RelationStatusId;
  },
) {
  if (!args.answersV2 && !args.answers) return free;
  const insight = buildPairFreeInsightSpecV2({
    answersV2: args.answersV2,
    answers: args.answers,
    pairAxisId: args.pairAxisId,
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    focusLabel: args.focusLabel,
    relationStatusId: args.relationStatusId,
  });
  return {
    ...free,
    relationshipDynamic: insight.betweenThem,
  };
}
