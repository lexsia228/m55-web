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
import { checkNaturalness } from './dtrVisibleCopyNaturalness';
import {
  buildDobV2VisibleCopyEvent,
  emitGenerationQualityEvent,
} from './generationQualityAnalytics';

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
  let prefix = '';
  if (sectionId === 's1_identity' && ind.s1IdentityRhythmNote) {
    // v2-only: ind.s1IdentityRhythmNote absent in v1 → no prefix for existing snapshots.
    prefix = [ind.s1IdentityRhythmNote, ''].join('\n');
  } else if (sectionId === 's2_composition' && ind.s2CompositionRhythmNote) {
    // v2-only: ind.s2CompositionRhythmNote absent in v1.
    prefix = [ind.s2CompositionRhythmNote, ''].join('\n');
  } else if (sectionId === 's3_essence') {
    prefix = ['【この保存版だけの本質リズム】', ind.essenceRhythmNote, ''].join('\n');
  } else if (sectionId === 's4_strengths' && ind.s4StrengthsRhythmNote) {
    // v2-only: ind.s4StrengthsRhythmNote absent in v1.
    prefix = [ind.s4StrengthsRhythmNote, ''].join('\n');
  } else if (sectionId === 's7_work') {
    // auxiliaryReading already contains handlingHint; omit it here to prevent duplicate sentences.
    prefix = ['【この保存版だけの補助整理】', ind.auxiliaryReading, ''].join('\n');
  }

  // Analytics: emit DOB-v2 visible copy quality metrics (fire-and-forget; does not block)
  // The prefix text itself is NOT stored — only counts/scores derived from it.
  if (prefix) {
    try {
      emitGenerationQualityEvent(buildDobV2VisibleCopyEvent(
        prefix,
        checkNaturalness(prefix),
        {
          provider_id: 'fake_deterministic',
          chapter_id: sectionId,
          final_status: 'accepted',
        },
      ));
    } catch {
      // Intentionally swallowed: analytics must never break the compose path.
    }
  }

  return prefix;
}

export function toComposedPaidDtrIndividualizationAuditMeta(
  ind: PaidDtrIndividualization,
): PaidDtrIndividualizationAuditMeta {
  return toPaidDtrIndividualizationAuditMeta(ind);
}
