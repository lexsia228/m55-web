import {
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  SAFETY_PROFILE,
} from './pairReadingCatalog.v1';
import { buildCompatibilityFreeResultFragments } from './pairReadingFragments.v1';
import {
  COMPATIBILITY_GUEST_DEFAULT_STATE,
  isCompleteCompatibilityGuestInput,
  type CompatibilityGuestInput,
  type CompatibilityGuestResultOutcome,
  type CompatibilityMappedChapter,
  type CompatibilityPublicChapter,
} from './pairReadingGuestContract';
import { derivePairAxisId } from './pairReadingFingerprint';
import { renderPairReading } from './pairReadingRenderer';
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

function firstParagraph(value: string): string {
  return value.split(/\n\s*\n/u)[0]?.trim() ?? value.trim();
}

function toPublicChapter(chapter: {
  chapterId: ChapterId;
  chapterTitle: string;
  chapterBody: string;
}): CompatibilityPublicChapter {
  return {
    chapterId: chapter.chapterId,
    chapterTitle: chapter.chapterTitle,
    actualContent: firstParagraph(chapter.chapterBody),
  };
}

export function buildCompatibilityPublicResult(
  guestInput: CompatibilityGuestInput,
  stateOverride?: CompatibilityMatrixState,
): CompatibilityGuestResultOutcome {
  if (!isCompleteCompatibilityGuestInput(guestInput)) {
    return { ok: false, message: '二人分の有効な生年月日を入力してください。' };
  }

  const derivedAxis = derivePairAxisId(guestInput.personA, guestInput.personB);
  const state: CompatibilityMatrixState = stateOverride ?? {
    ...COMPATIBILITY_GUEST_DEFAULT_STATE,
    paidTopicId: GUEST_TOPIC_BY_PAIR_AXIS[derivedAxis],
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
  });
  const allChapters = rendered.paidReport.chapters.map(toPublicChapter);
  const mappedIds = [
    PAIR_AXIS_PAID_CHAPTER_MAPPING[rendered.pairFingerprint.pairAxisId],
    TOPIC_PAID_CHAPTER_MAPPING[state.paidTopicId],
  ] as const;
  const mappedChapters = mappedIds.map((chapterId, index) => {
    const chapter = allChapters.find((candidate) => candidate.chapterId === chapterId);
    if (!chapter) throw new Error('compatibility chapter mapping is incomplete');
    return {
      ...chapter,
      freeConnection: index === 0 ? free.difference : free.relationshipDynamic,
    };
  }) as [CompatibilityMappedChapter, CompatibilityMappedChapter];

  return {
    ok: true,
    value: {
      free,
      freeTeaser: rendered.freeTeaser.teaserText,
      mappedChapters,
      allChapters,
    },
  };
}
