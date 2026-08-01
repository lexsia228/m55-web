/**
 * M55 Experience Control Plane v2 — editorial grammar contracts.
 */

export const EXPERIENCE_PAGE_BEATS = ['PROMISE', 'PROOF', 'NEXT_ACTION'] as const;
export type ExperiencePageBeat = (typeof EXPERIENCE_PAGE_BEATS)[number];

export const EXPERIENCE_RESULT_BEATS = [
  'identity',
  'recognition',
  'evidence',
  'scene',
  'continuation',
] as const;
export type ExperienceResultBeat = (typeof EXPERIENCE_RESULT_BEATS)[number];

export const EXPERIENCE_PRODUCT_BEATS = [
  'outcome',
  'included',
  'usage',
  'priceTruth',
  'nextAction',
] as const;
export type ExperienceProductBeat = (typeof EXPERIENCE_PRODUCT_BEATS)[number];

export const EXPERIENCE_EDITORIAL_RULES = {
  sentenceLengthMin: 25,
  sentenceLengthMax: 55,
  forbidConstructionInCta: true,
  chapterCountOnlyInProductSpec: true,
  resultSectionTitleEvidenceJa: '回答から見えた理由',
  forbidAbstractTerms: ['順序の好み', '輪郭', '外の刺激', '主パターン', '背景の構造'] as const,
} as const;

export const EXPERIENCE_TRAIT_FIELDS = [
  'traitName',
  'identityLine',
  'tagline',
  'recognitionStatement',
  'evidenceTemplates',
  'sceneTemplates',
  'shareStatement',
  'sharedEntryStatement',
  'premiumContinuation',
  'image',
  'accent',
] as const;
