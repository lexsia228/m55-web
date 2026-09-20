/**
 * Illustrative pre-purchase Premium sample — static catalog assembly only.
 * Not visitor-personalized. Does not call the paid report composer.
 */
import { HOME_PREMIUM_PREVIEW_FIXTURE } from './homePreviewFixtures';
import { M55_METHOD_CANONICAL_COPY } from './method/m55MethodAuthority';
import { PAID_DTR_CHAPTERS, PAID_DTR_LP } from './paidDtrProductCopy';
import {
  PAID_CHAPTER_EMPHASIS_EXPLANATION_V1,
} from './paidResult/paidChapterEmphasisCopyV1';
import type { PaidChapterEmphasisIdV1 } from './individualization/individualizationSelectorTypesV1';

export const SELF_PREMIUM_SAMPLE_PREVIEW_ID =
  'self.premium.sample.preview.illustrative_q1_align_work_v1' as const;

export const SELF_PREMIUM_SAMPLE_EMPHASIS_ANSWER_IDS = [
  'paid.work_focus.priority',
  'paid.decision_friction.too_many',
  'paid.relation_focus.words',
  'paid.fatigue_signal.after_push',
  'paid.recovery_sequence.pause_first',
  'paid.restart_condition.overview_first',
] as const;

export const SELF_PREMIUM_SAMPLE_EMPHASIS_CATALOG_IDS = [
  'paid_ch2__work_focus_priority',
  'paid_ch2__decision_friction_too_many',
  'paid_ch3__relation_focus_words',
  'paid_ch4__fatigue_signal_after_push',
  'paid_ch4__recovery_sequence_pause_first',
  'paid_ch4__restart_condition_overview_first',
] as const satisfies readonly PaidChapterEmphasisIdV1[];

export const SELF_PREMIUM_SAMPLE_LABEL_JA = '見本' as const;

export const SELF_PREMIUM_SAMPLE_DISCLAIMER_JA =
  'これは購入後のプレミアムレポートの読み方の例です。あなたの回答から作られたものではありません。' as const;

const HERO_REVISIT_SENTENCE_JA =
  '購入後は、購入時の入力を土台にしたレポートを開き直せます。' as const;

function catalogExplanation(id: PaidChapterEmphasisIdV1): string {
  const text = PAID_CHAPTER_EMPHASIS_EXPLANATION_V1[id];
  if (!text?.trim()) {
    throw new Error(`missing paid catalog explanation: ${id}`);
  }
  return text;
}

function heroRevisitSentenceJa(): string {
  if (!PAID_DTR_LP.hero.bodyJa.includes(HERO_REVISIT_SENTENCE_JA)) {
    throw new Error('revisit sentence missing from PAID_DTR_LP.hero.bodyJa');
  }
  return HERO_REVISIT_SENTENCE_JA;
}

export type SelfPremiumSamplePassageRole =
  | 'recognition'
  | 'explanation'
  | 'why'
  | 'structure'
  | 'condition'
  | 'consequence'
  | 'handling'
  | 'next';

export type SelfPremiumSamplePassage = {
  readonly role: SelfPremiumSamplePassageRole;
  readonly textJa: string;
};

export type SelfPremiumSampleChapter = {
  readonly id: (typeof PAID_DTR_CHAPTERS)[number]['id'];
  readonly roman: string;
  readonly titleJa: string;
  readonly tocTagJa: string;
  readonly passagesJa: readonly SelfPremiumSamplePassage[];
};

const CHAPTER_I = PAID_DTR_CHAPTERS[0];
const CHAPTER_II = PAID_DTR_CHAPTERS[1];
const CHAPTER_III = PAID_DTR_CHAPTERS[2];
const CHAPTER_IV = PAID_DTR_CHAPTERS[3];

export const SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE = {
  sampleId: SELF_PREMIUM_SAMPLE_PREVIEW_ID,
  labelJa: SELF_PREMIUM_SAMPLE_LABEL_JA,
  disclaimerJa: SELF_PREMIUM_SAMPLE_DISCLAIMER_JA,
  productTitleJa: HOME_PREMIUM_PREVIEW_FIXTURE.productTitleJa,
  layer1Ja: M55_METHOD_CANONICAL_COPY.questionnaireBirthFoundationJa,
  layer2Ja: M55_METHOD_CANONICAL_COPY.questionnaireFoundationJa,
  layer3Ja: M55_METHOD_CANONICAL_COPY.premiumDifferencePremiumJa,
  revisitJa: heroRevisitSentenceJa(),
  emphasisAnswerIds: SELF_PREMIUM_SAMPLE_EMPHASIS_ANSWER_IDS,
  chapters: [
    {
      id: CHAPTER_I.id,
      roman: CHAPTER_I.roman,
      titleJa: CHAPTER_I.title,
      tocTagJa: CHAPTER_I.tocTag,
      passagesJa: [
        { role: 'recognition', textJa: CHAPTER_I.helpsUnderstandJa },
        {
          role: 'explanation',
          textJa: catalogExplanation('paid_ch1__baseline_landscape'),
        },
        {
          role: 'explanation',
          textJa: catalogExplanation('paid_ch1__expression_mirror'),
        },
        {
          role: 'explanation',
          textJa: catalogExplanation('paid_ch1__align_diverge_bridge'),
        },
      ],
    },
    {
      id: CHAPTER_II.id,
      roman: CHAPTER_II.roman,
      titleJa: CHAPTER_II.title,
      tocTagJa: CHAPTER_II.tocTag,
      passagesJa: [
        {
          role: 'why',
          textJa: catalogExplanation('paid_ch2__work_focus_priority'),
        },
        {
          role: 'structure',
          textJa: catalogExplanation('paid_ch2__decision_friction_too_many'),
        },
      ],
    },
    {
      id: CHAPTER_III.id,
      roman: CHAPTER_III.roman,
      titleJa: CHAPTER_III.title,
      tocTagJa: CHAPTER_III.tocTag,
      passagesJa: [
        {
          role: 'condition',
          textJa: catalogExplanation('paid_ch3__relation_focus_words'),
        },
      ],
    },
    {
      id: CHAPTER_IV.id,
      roman: CHAPTER_IV.roman,
      titleJa: CHAPTER_IV.title,
      tocTagJa: CHAPTER_IV.tocTag,
      passagesJa: [
        {
          role: 'consequence',
          textJa: catalogExplanation('paid_ch4__fatigue_signal_after_push'),
        },
        {
          role: 'handling',
          textJa: catalogExplanation('paid_ch4__recovery_sequence_pause_first'),
        },
        {
          role: 'next',
          textJa: catalogExplanation('paid_ch4__restart_condition_overview_first'),
        },
      ],
    },
  ],
} as const satisfies {
  sampleId: typeof SELF_PREMIUM_SAMPLE_PREVIEW_ID;
  labelJa: typeof SELF_PREMIUM_SAMPLE_LABEL_JA;
  disclaimerJa: typeof SELF_PREMIUM_SAMPLE_DISCLAIMER_JA;
  productTitleJa: string;
  layer1Ja: string;
  layer2Ja: string;
  layer3Ja: string;
  revisitJa: string;
  emphasisAnswerIds: typeof SELF_PREMIUM_SAMPLE_EMPHASIS_ANSWER_IDS;
  chapters: readonly SelfPremiumSampleChapter[];
};
