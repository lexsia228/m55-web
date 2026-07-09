/**
 * Individualization outputHash (gmfn-v1 / fp-v1 contract).
 */

import { createHash } from 'node:crypto';
import {
  DOB_AXIS_LOOKUP_VERSION,
  FINGERPRINT_SPEC_VERSION,
  GENERATION_META_FIELD_NAMING_VERSION,
  PRIMARY_THEME_REPLY_MAP_VERSION,
} from './versions';

export type OutputHashInput = {
  dobFp: string;
  freeAnswerHash: string;
  paidAnswerHash: string;
  templateBlockIds: readonly string[];
  engineVersion: string;
  catalogVersion: string;
  reportLogicVersion: string;
};

/**
 * Deterministic hash over required version + identity fields.
 * Does not include score or raw birthDate.
 */
export function buildIndividualizationOutputHashV1(input: OutputHashInput): string {
  const blocks = [...input.templateBlockIds].map(String).sort().join(',');
  const payload = [
    FINGERPRINT_SPEC_VERSION,
    DOB_AXIS_LOOKUP_VERSION,
    PRIMARY_THEME_REPLY_MAP_VERSION,
    GENERATION_META_FIELD_NAMING_VERSION,
    input.dobFp,
    input.freeAnswerHash,
    input.paidAnswerHash,
    blocks,
    input.engineVersion,
    input.catalogVersion,
    input.reportLogicVersion,
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}
