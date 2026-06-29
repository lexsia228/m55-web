/**
 * /core free surface — living-language display aliases and compositional DOB copy.
 * Keys use stable coreType ids (TYPE_01–10); body text uses slot grammar, not per-trait essays.
 */
import { AXIS_FORMAL_JA } from '../../components/core/corePublicAxisLabels';
import type { CoreResult } from './coreResult/types';
import {
  buildCopySelectContext,
  composeAlignSteps,
  composeAxisRows,
  composeLifestyleTriptych,
  composeObservationBullets,
  composePaidHook,
  monthRhythmNoteForContext,
  type CopySelectContext,
  type DayBand,
} from './coreFreeCompositionalGrammar';
import { coreHeroSelfLanguageFingerprint } from './coreHeroSelfLanguage';

/** coreType → user-facing living phrase (no 「型」). */
const CORE_TRAIT_DISPLAY_BY_TYPE: Readonly<Record<string, string>> = {
  TYPE_01: '静かに深く見る',
  TYPE_02: '関係の温度を受け取る',
  TYPE_03: '納得して組み立てる',
  TYPE_04: '落ち着いて確かめる',
  TYPE_05: '関係の空気を整える',
  TYPE_06: '先に全体像をつかむ',
  TYPE_07: '本質まで掘り下げる',
  TYPE_08: 'まず動いて流れを作る',
  TYPE_09: '距離と言葉を読む',
  TYPE_10: '全体をつなげて整える',
};

export type { CopySelectContext, DayBand };

export function birthDateFromCoreResult(result: CoreResult): string {
  const m = result.lockedAt.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? '';
}

function resolveCopyContext(result: CoreResult): CopySelectContext {
  const birthDate = birthDateFromCoreResult(result);
  const publicTrait = coreTraitDisplayFromCoreType(result.coreType);
  return buildCopySelectContext(result, birthDate, publicTrait);
}

export function coreTraitDisplayFromCoreType(coreType: string): string {
  return CORE_TRAIT_DISPLAY_BY_TYPE[coreType.trim()] ?? coreType.trim();
}

export function freeCoreMonthRhythmNote(ctx: CopySelectContext): string {
  return monthRhythmNoteForContext(ctx);
}

export type FreeCoreAxisRow = {
  formal: string;
  tendency: string;
  life: string;
  load: string;
};

export function freeCoreAxisRowsForResult(result: CoreResult): FreeCoreAxisRow[] {
  const ctx = resolveCopyContext(result);
  return composeAxisRows(ctx, result.axisDetails, AXIS_FORMAL_JA);
}

export function freeCoreLifestyleTriptych(result: CoreResult): readonly { title: string; body: string }[] {
  return composeLifestyleTriptych(resolveCopyContext(result));
}

export function freeCoreAlignSteps(result: CoreResult): readonly { phase: string; body: string }[] {
  return composeAlignSteps(resolveCopyContext(result));
}

export function freeCoreObservationBullets(result: CoreResult): string[] {
  const ctx = resolveCopyContext(result);
  return composeObservationBullets(ctx, result);
}

export function freeCorePaidHook(result: CoreResult): string {
  return composePaidHook(resolveCopyContext(result));
}

export function collectFreeCoreDynamicCopy(result: CoreResult): string[] {
  const ctx = resolveCopyContext(result);
  const axes = composeAxisRows(ctx, result.axisDetails, AXIS_FORMAL_JA);
  const lifestyle = composeLifestyleTriptych(ctx);
  const align = composeAlignSteps(ctx);
  const bullets = composeObservationBullets(ctx, result);
  return [
    ...coreHeroSelfLanguageFingerprint(result).split('\n'),
    ...axes.flatMap((row) => [row.tendency, row.life, row.load]),
    ...lifestyle.map((card) => card.body),
    ...align.map((step) => step.body),
    ...bullets,
    freeCorePaidHook(result),
  ];
}

export function freeCorePersonalizationFingerprint(result: CoreResult): string {
  return collectFreeCoreDynamicCopy(result).join('\n');
}
