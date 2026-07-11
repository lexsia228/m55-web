/**
 * Individualization outputHash (gmfn-v2 / selectors-v1 contract).
 */

import { createHash } from 'node:crypto';
import {
  FREE_BLOCK_SELECTOR_CATALOG_V1,
  PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1,
  RECOVERY_SELECTOR_IDS_V1,
  STRAIN_SELECTOR_IDS_V1,
} from './individualizationSelectorCatalogV1';
import type { IndividualizationSelectorBundleV1 } from './individualizationSelectorTypesV1';
import type { Result } from './types';
import {
  DOB_AXIS_LOOKUP_VERSION,
  FINGERPRINT_SPEC_VERSION,
  GENERATION_META_FIELD_NAMING_VERSION_V2,
  INDIVIDUALIZATION_SELECTOR_VERSION_V1,
  PRIMARY_THEME_REPLY_MAP_VERSION,
} from './versions';

export type OutputHashV2Input = {
  dobFp: string;
  freeAnswerHash: string;
  paidAnswerHash: string;
  templateBlockIds: readonly string[];
  engineVersion: string;
  catalogVersion: string;
  reportLogicVersion: string;
  selectorVersion: string;
  selectors: IndividualizationSelectorBundleV1;
};

function canonicalOrderedIds(
  catalogOrder: readonly string[],
  selected: readonly string[],
): string {
  const selectedSet = new Set(selected);
  return catalogOrder.filter((id) => selectedSet.has(id)).join(',');
}

function canonicalStrainSegment(bundle: IndividualizationSelectorBundleV1): string {
  return canonicalOrderedIds(STRAIN_SELECTOR_IDS_V1, bundle.strainSelectorIds);
}

function canonicalRecoverySegment(bundle: IndividualizationSelectorBundleV1): string {
  return canonicalOrderedIds(RECOVERY_SELECTOR_IDS_V1, bundle.recoverySelectorIds);
}

function canonicalFreeBlockSegment(bundle: IndividualizationSelectorBundleV1): string {
  const selectedSet = new Set(bundle.freeBlockSelectorIds);
  return FREE_BLOCK_SELECTOR_CATALOG_V1.filter((entry) => selectedSet.has(entry.id))
    .map((entry) => entry.id)
    .join(',');
}

function canonicalPaidChapterSegment(
  chapterIds: readonly string[],
  catalog: readonly { readonly id: string }[],
): string {
  return canonicalOrderedIds(
    catalog.map((entry) => entry.id),
    chapterIds,
  );
}

function validateInput(input: OutputHashV2Input): Result<string> | null {
  if (input.selectors == null) {
    return { ok: false, code: 'invalid_selector_bundle' };
  }

  if (input.selectorVersion !== INDIVIDUALIZATION_SELECTOR_VERSION_V1) {
    return { ok: false, code: 'unknown_selector_version' };
  }

  if (input.selectors.version !== INDIVIDUALIZATION_SELECTOR_VERSION_V1) {
    return { ok: false, code: 'selector_version_mismatch' };
  }

  if (input.selectors.version !== input.selectorVersion) {
    return { ok: false, code: 'selector_version_mismatch' };
  }

  if (input.selectors.freeBlockSelectorIds.length === 0) {
    return { ok: false, code: 'invalid_selector_bundle' };
  }

  const hasPaidChapterEmphasis =
    input.selectors.paidChapterEmphasisIds.chapter1.length > 0 ||
    input.selectors.paidChapterEmphasisIds.chapter2.length > 0 ||
    input.selectors.paidChapterEmphasisIds.chapter3.length > 0 ||
    input.selectors.paidChapterEmphasisIds.chapter4.length > 0;

  if (!hasPaidChapterEmphasis && input.paidAnswerHash.length > 0) {
    return { ok: false, code: 'invalid_selector_bundle' };
  }

  return null;
}

/**
 * Deterministic gmfn-v2 hash over gmfn-v1 base fields plus canonical selector identity.
 */
export function buildIndividualizationOutputHashV2(
  input: OutputHashV2Input,
): Result<string> {
  const validationError = validateInput(input);
  if (validationError) return validationError;

  const blocks = [...input.templateBlockIds].map(String).sort().join(',');
  const payload = [
    FINGERPRINT_SPEC_VERSION,
    DOB_AXIS_LOOKUP_VERSION,
    PRIMARY_THEME_REPLY_MAP_VERSION,
    GENERATION_META_FIELD_NAMING_VERSION_V2,
    input.dobFp,
    input.freeAnswerHash,
    input.paidAnswerHash,
    blocks,
    input.engineVersion,
    input.catalogVersion,
    input.reportLogicVersion,
    input.selectorVersion,
    canonicalStrainSegment(input.selectors),
    canonicalRecoverySegment(input.selectors),
    canonicalFreeBlockSegment(input.selectors),
    canonicalPaidChapterSegment(
      input.selectors.paidChapterEmphasisIds.chapter1,
      PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.I,
    ),
    canonicalPaidChapterSegment(
      input.selectors.paidChapterEmphasisIds.chapter2,
      PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.II,
    ),
    canonicalPaidChapterSegment(
      input.selectors.paidChapterEmphasisIds.chapter3,
      PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.III,
    ),
    canonicalPaidChapterSegment(
      input.selectors.paidChapterEmphasisIds.chapter4,
      PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1.IV,
    ),
  ].join('|');

  return {
    ok: true,
    value: createHash('sha256').update(payload).digest('hex'),
  };
}
