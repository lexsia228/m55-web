/**
 * Version-aware paid DTR individualization composer.
 * This module must not read fulfillment flags; callers pass stored engine context only.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import {
  buildPaidDtrIndividualizationV1FromEngineContext,
  toPaidDtrIndividualizationAuditMeta,
  type PaidDtrIndividualization,
  type PaidDtrIndividualizationAuditMeta,
  type PaidDtrIndividualizationVersion,
} from './dtrPaidIndividualization';
import { buildPaidDtrIndividualizationV2FromEngineContext } from './dtrDobPersonalizationV2';

export function resolvePaidIndividualizationVersion(
  ctx: Pick<EngineContextJson, 'paidIndividualizationVersion'>,
): PaidDtrIndividualizationVersion {
  return ctx.paidIndividualizationVersion === 'v2' ? 'v2' : 'v1';
}

export function composePaidIndividualizationFromEngineContext(
  ctx: EngineContextJson,
): PaidDtrIndividualization {
  const version = resolvePaidIndividualizationVersion(ctx);
  if (version === 'v2') return buildPaidDtrIndividualizationV2FromEngineContext(ctx);
  return buildPaidDtrIndividualizationV1FromEngineContext(ctx);
}

export function buildPaidDtrSectionIndividualizationPrefix(
  sectionId: string,
  ind: PaidDtrIndividualization,
): string {
  if (sectionId === 's3_essence') {
    return ['【この保存版だけの本質リズム】', ind.essenceRhythmNote, ''].join('\n');
  }
  if (sectionId === 's7_work') {
    return ['【この保存版だけの補助整理】', ind.auxiliaryReading, ind.handlingHint, ''].join('\n');
  }
  return '';
}

export function toComposedPaidDtrIndividualizationAuditMeta(
  ind: PaidDtrIndividualization,
): PaidDtrIndividualizationAuditMeta {
  return toPaidDtrIndividualizationAuditMeta(ind);
}
