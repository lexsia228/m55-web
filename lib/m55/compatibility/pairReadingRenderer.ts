/**
 * Pair reading pure deterministic renderer.
 * No fetch / DB / AI / network / POST.
 */

import {
  DISPLAY_NAME_A_DEFAULT,
  DISPLAY_NAME_B_DEFAULT,
  PAIR_READING_CTA,
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  SAFETY_PROFILE,
  SAFETY_SHORT_TEXT,
  getChapterTitle,
  PAID_TOPIC_IDS,
  PAIR_AXIS_IDS,
  RELATION_STATUS_IDS,
  TEMPERATURE_IDS,
} from './pairReadingCatalog.v1';
import {
  PERSON_A_BODY,
  PERSON_B_BODY,
  buildPairGapBody,
  buildTeaserText,
  buildTodayClueBody,
  buildTopicDeepBody,
  getAboutBody,
  PAIR_READING_FRAGMENT_SET_VERSION,
} from './pairReadingFragments.v1';
import {
  buildLaneId,
  buildOutputHash,
  buildPairFingerprint,
  isValidBirthDate,
} from './pairReadingFingerprint';
import {
  auditPairReadingText,
  countFullWidthChars,
  countSentencesJa,
  findTeaserDeepeningLeakage,
  textsAreNearDuplicates,
} from './pairReadingSafetyAudit';
import type {
  ChapterId,
  FreeTeaserSnapshot,
  GenerationMeta,
  PaidChapter,
  PaidReportSnapshot,
  PairReadingInput,
  PairReadingRenderOutcome,
  SafetyFlags,
  TemperatureId,
} from './pairReadingTypes';

export const PAIR_RENDERER_VERSION = 'pair_renderer_v1' as const;

function isCatalogId<T extends string>(id: string, allowed: readonly T[]): id is T {
  return (allowed as readonly string[]).includes(id);
}

export function validatePairReadingInput(input: PairReadingInput): { ok: true } | { ok: false; code: string; message: string } {
  if (input.schemaVersion !== 'pair_reading_input_v1') {
    return { ok: false, code: 'bad_schema', message: 'schemaVersion mismatch' };
  }
  if (input.productPublicName !== PRODUCT_PUBLIC_NAME) {
    return { ok: false, code: 'product_name_drift', message: 'productPublicName lock failed' };
  }
  if (input.productInternalName !== PRODUCT_INTERNAL_NAME) {
    return { ok: false, code: 'product_internal_drift', message: 'productInternalName lock failed' };
  }
  if (input.safetyProfile !== SAFETY_PROFILE) {
    return { ok: false, code: 'safety_profile_drift', message: 'safetyProfile lock failed' };
  }
  if (input.personA.role !== 'personA' || input.personB.role !== 'personB') {
    return { ok: false, code: 'bad_roles', message: 'person roles must be personA/personB' };
  }
  if (!isValidBirthDate(input.personA.birthDate) || !isValidBirthDate(input.personB.birthDate)) {
    return { ok: false, code: 'invalid_dob', message: 'invalid birthDate' };
  }
  if (!isCatalogId(input.relationStatusId, RELATION_STATUS_IDS)) {
    return { ok: false, code: 'unknown_status', message: 'unknown relationStatusId' };
  }
  if (!isCatalogId(input.paidTopicId, PAID_TOPIC_IDS)) {
    return { ok: false, code: 'unknown_topic', message: 'unknown paidTopicId' };
  }
  const temperatureId = input.temperatureId ?? 'E0';
  if (!isCatalogId(temperatureId, TEMPERATURE_IDS)) {
    return { ok: false, code: 'unknown_temperature', message: 'unknown temperatureId' };
  }
  if (input.pairAxisOverride && !isCatalogId(input.pairAxisOverride, PAIR_AXIS_IDS)) {
    return { ok: false, code: 'unknown_axis', message: 'unknown pairAxisOverride' };
  }
  return { ok: true };
}

function baseSafetyFlags(args: {
  disclaimerPresent: boolean;
  containsPaidDeepening: boolean;
}): SafetyFlags {
  return {
    noScore: true,
    noGuarantee: true,
    noAdvice: true,
    noAdult: true,
    noRawDob: true,
    disclaimerPresent: args.disclaimerPresent,
    containsPaidDeepening: args.containsPaidDeepening,
  };
}

function assembleChapter(args: {
  chapterId: ChapterId;
  body: string;
  topicId: PairReadingInput['paidTopicId'];
  relationStatusId: PairReadingInput['relationStatusId'];
  temperatureId: TemperatureId;
  pairAxisId: NonNullable<PairReadingInput['pairAxisOverride']> | string;
  pairDifferenceType: string;
  fragmentIds: string[];
}): PaidChapter {
  const pairAxisId = args.pairAxisId as PairReadingInput['pairAxisOverride'] & string;
  return {
    chapterId: args.chapterId,
    chapterTitle: getChapterTitle(args.chapterId, args.topicId),
    chapterBody: args.body,
    sourceKeys: {
      pairAxisId: pairAxisId as never,
      relationStatusId: args.relationStatusId,
      paidTopicId: args.topicId,
      temperatureId: args.temperatureId,
      pairDifferenceType: args.pairDifferenceType as never,
      fragmentIds: args.fragmentIds,
    },
    safetyFlags: baseSafetyFlags({
      disclaimerPresent: args.chapterId === 'ch_about',
      containsPaidDeepening: args.chapterId === 'ch_topic_deep',
    }),
  };
}

/**
 * Render free teaser + paid 6-chapter report. Fail-closed on unsafe output.
 */
export function renderPairReading(input: PairReadingInput): PairReadingRenderOutcome {
  const validated = validatePairReadingInput(input);
  if (!validated.ok) return validated;

  const temperatureId: TemperatureId = input.temperatureId ?? 'E0';
  const fp = buildPairFingerprint({ ...input, temperatureId });
  const laneId = buildLaneId({
    relationStatusId: input.relationStatusId,
    paidTopicId: input.paidTopicId,
    temperatureId,
    pairAxisId: fp.pairAxisId,
  });

  const dobs = [input.personA.birthDate, input.personB.birthDate] as const;

  const teaserText = buildTeaserText({
    pairAxisId: fp.pairAxisId,
    paidTopicId: input.paidTopicId,
    safetyShortText: SAFETY_SHORT_TEXT,
    ctaText: PAIR_READING_CTA,
  });

  const teaserLen = countFullWidthChars(teaserText);
  const teaserSentences = countSentencesJa(teaserText);
  const teaserLeak = findTeaserDeepeningLeakage(teaserText);
  const teaserAudit = auditPairReadingText(teaserText, { dobs });

  if (teaserSentences !== 3) {
    return { ok: false, code: 'teaser_sentence_count', message: `expected 3 sentences, got ${teaserSentences}` };
  }
  if (teaserLen < 120 || teaserLen > 220) {
    return { ok: false, code: 'teaser_length', message: `teaser length ${teaserLen} out of 120-220` };
  }
  if (teaserLeak.length > 0 || !teaserAudit.ok) {
    return {
      ok: false,
      code: 'teaser_unsafe',
      message: [...teaserLeak, ...teaserAudit.hits].join(','),
    };
  }

  const topicDeep = buildTopicDeepBody({
    paidTopicId: input.paidTopicId,
    relationStatusId: input.relationStatusId,
  });
  const todayClue = buildTodayClueBody({
    paidTopicId: input.paidTopicId,
    relationStatusId: input.relationStatusId,
    temperatureId,
  });
  const about = getAboutBody();

  const chapters: PaidChapter[] = [
    assembleChapter({
      chapterId: 'ch_you_pace',
      body: PERSON_A_BODY,
      topicId: input.paidTopicId,
      relationStatusId: input.relationStatusId,
      temperatureId,
      pairAxisId: fp.pairAxisId,
      pairDifferenceType: fp.pairDifferenceType,
      fragmentIds: ['personA_v1'],
    }),
    assembleChapter({
      chapterId: 'ch_other_pace',
      body: PERSON_B_BODY,
      topicId: input.paidTopicId,
      relationStatusId: input.relationStatusId,
      temperatureId,
      pairAxisId: fp.pairAxisId,
      pairDifferenceType: fp.pairDifferenceType,
      fragmentIds: ['personB_v1'],
    }),
    assembleChapter({
      chapterId: 'ch_pair_gap',
      body: buildPairGapBody(fp.pairAxisId),
      topicId: input.paidTopicId,
      relationStatusId: input.relationStatusId,
      temperatureId,
      pairAxisId: fp.pairAxisId,
      pairDifferenceType: fp.pairDifferenceType,
      fragmentIds: [`pairAxis_${fp.pairAxisId}`],
    }),
    assembleChapter({
      chapterId: 'ch_topic_deep',
      body: topicDeep,
      topicId: input.paidTopicId,
      relationStatusId: input.relationStatusId,
      temperatureId,
      pairAxisId: fp.pairAxisId,
      pairDifferenceType: fp.pairDifferenceType,
      fragmentIds: [`topic_${input.paidTopicId}`, `status_${input.relationStatusId}`],
    }),
    assembleChapter({
      chapterId: 'ch_today_clue',
      body: todayClue,
      topicId: input.paidTopicId,
      relationStatusId: input.relationStatusId,
      temperatureId,
      pairAxisId: fp.pairAxisId,
      pairDifferenceType: fp.pairDifferenceType,
      fragmentIds: [`clue_${input.paidTopicId}`, `temp_${temperatureId}`],
    }),
    assembleChapter({
      chapterId: 'ch_about',
      body: about,
      topicId: input.paidTopicId,
      relationStatusId: input.relationStatusId,
      temperatureId,
      pairAxisId: fp.pairAxisId,
      pairDifferenceType: fp.pairDifferenceType,
      fragmentIds: ['disclaimer_v1'],
    }),
  ];

  if (chapters.length !== 6) {
    return { ok: false, code: 'chapter_count', message: 'chapters must be 6' };
  }
  if (chapters[5]?.chapterId !== 'ch_about') {
    return { ok: false, code: 'ch_about_missing', message: 'ch_about required' };
  }

  for (const ch of chapters) {
    const audit = auditPairReadingText(ch.chapterBody, {
      dobs,
      checkCommands: ch.chapterId === 'ch_today_clue',
    });
    if (!audit.ok) {
      return {
        ok: false,
        code: 'chapter_unsafe',
        message: `${ch.chapterId}:${audit.hits.join(',')}`,
      };
    }
    if (textsAreNearDuplicates(teaserText, ch.chapterBody)) {
      return { ok: false, code: 'teaser_paid_duplicate', message: `${ch.chapterId} duplicates teaser` };
    }
  }

  const fragmentIds = chapters.flatMap((c) => c.sourceKeys.fragmentIds);
  const outputHash = buildOutputHash({
    inputHash: fp.inputHash,
    pairHash: fp.pairHash,
    laneId,
    teaserText,
    chapterBodies: chapters.map((c) => c.chapterBody),
    fragmentIds,
  });

  // Ensure hash payload path never embeds raw DOB (defense in depth for tests).
  if (outputHash.includes(input.personA.birthDate) || outputHash.includes(input.personB.birthDate)) {
    return { ok: false, code: 'hash_dob_leak', message: 'raw DOB leaked into hash' };
  }

  const generationMeta: GenerationMeta = {
    pair_spec_version: 'pair_reading_arch_v1',
    question_flow_version: 'pair_qflow_v1',
    paid_topic_taxonomy_version: 'pair_topic_tax_v1',
    safety_profile_version: SAFETY_PROFILE,
    renderer_version: PAIR_RENDERER_VERSION,
    pair_fingerprint_version: 'pair_fp_v1',
    input_hash: fp.inputHash,
    output_hash: outputHash,
    personA_dob_hash: fp.personADobHash,
    personB_dob_hash: fp.personBDobHash,
    pair_hash: fp.pairHash,
    no_raw_dob_in_output: true,
    forbidden_wording_audit: 'pass',
    disclaimer_presence: 'pass',
    free_paid_boundary_audit: 'pass',
    product_name_lock_ok: true,
  };

  const freeTeaser: FreeTeaserSnapshot = {
    teaserId: `teaser_${fp.inputHash.slice(0, 12)}`,
    schemaVersion: 'pair_teaser_v1',
    pairAxisId: fp.pairAxisId,
    relationStatusId: input.relationStatusId,
    paidTopicId: input.paidTopicId,
    temperatureId,
    teaserText,
    ctaText: PAIR_READING_CTA,
    safetyShortText: SAFETY_SHORT_TEXT,
    noScoreFlag: true,
    noGuaranteeFlag: true,
    noRawDobFlag: true,
    containsPaidDeepening: false,
    productPublicName: PRODUCT_PUBLIC_NAME,
    generationMeta,
  };

  const paidReport: PaidReportSnapshot = {
    reportId: `report_${fp.inputHash.slice(0, 12)}`,
    schemaVersion: 'pair_report_v1',
    productPublicName: PRODUCT_PUBLIC_NAME,
    productInternalName: PRODUCT_INTERNAL_NAME,
    safetyProfile: SAFETY_PROFILE,
    displayNameA: input.personA.nickname?.trim() || DISPLAY_NAME_A_DEFAULT,
    displayNameB: input.personB.nickname?.trim() || DISPLAY_NAME_B_DEFAULT,
    chapters,
    sourceKeys: {
      pairAxisId: fp.pairAxisId,
      relationStatusId: input.relationStatusId,
      paidTopicId: input.paidTopicId,
      temperatureId,
      pairDifferenceType: fp.pairDifferenceType,
      fragmentIds: [...fragmentIds, PAIR_READING_FRAGMENT_SET_VERSION],
      laneId,
    },
    safetyFlags: baseSafetyFlags({
      disclaimerPresent: true,
      containsPaidDeepening: false,
    }),
    generationMeta,
    pairFingerprint: fp,
  };

  // Final visible blob audit
  const visible = [teaserText, ...chapters.map((c) => `${c.chapterTitle}\n${c.chapterBody}`)].join('\n');
  const finalAudit = auditPairReadingText(visible, { dobs });
  if (!finalAudit.ok) {
    return { ok: false, code: 'final_audit_fail', message: finalAudit.hits.join(',') };
  }

  return {
    ok: true,
    laneId,
    pairFingerprint: fp,
    freeTeaser,
    paidReport,
  };
}
