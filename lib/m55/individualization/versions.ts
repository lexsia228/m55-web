/**
 * fp-v1 individualization version constants (pure; no I/O).
 */

export const FINGERPRINT_SPEC_VERSION = 'fp-v1' as const;
export const DOB_AXIS_LOOKUP_VERSION = 'dal-v1' as const;
export const PRIMARY_THEME_REPLY_MAP_VERSION = 'ptrm-v1' as const;
export const GENERATION_META_FIELD_NAMING_VERSION = 'gmfn-v1' as const;
export const GENERATION_META_FIELD_NAMING_VERSION_V2 = 'gmfn-v2' as const;
export const FREE_QUESTIONNAIRE_VERSION = 'free-v1' as const;
export const PAID_QUESTIONNAIRE_VERSION = 'paid-v1' as const;
export const REPLY_QUESTION_CATALOG_VERSION = 'reply-v1' as const;
export const INDIVIDUALIZATION_SELECTOR_VERSION_V1 = 'selectors-v1' as const;

export type FingerprintSpecVersion = typeof FINGERPRINT_SPEC_VERSION;
export type DobAxisLookupVersion = typeof DOB_AXIS_LOOKUP_VERSION;
export type PrimaryThemeReplyMapVersion = typeof PRIMARY_THEME_REPLY_MAP_VERSION;
export type GenerationMetaFieldNamingVersion = typeof GENERATION_META_FIELD_NAMING_VERSION;
export type IndividualizationSelectorVersionV1 =
  typeof INDIVIDUALIZATION_SELECTOR_VERSION_V1;
