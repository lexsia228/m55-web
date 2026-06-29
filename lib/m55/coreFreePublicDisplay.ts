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
  monthRhythmNoteForContext,
  type CopySelectContext,
  type DayBand,
} from './coreFreeCompositionalGrammar';

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

const READING_STYLE_NOTES: Readonly<Record<string, string>> = {
  納得して組み立てる: '理由や順番を見つけながら、自分のペースで整えていく読み方',
  静かに深く見る: '表面で終わらず、意味の層まで確かめながら読む読み方',
  関係の温度を受け取る: '相手の空気を受け取りながら、自分の線引きも保つ読み方',
  落ち着いて確かめる: '動く前に状況を分解し、納得してから進む読み方',
  関係の空気を整える: '場の温度を整えながら、無理のない距離を保つ読み方',
  先に全体像をつかむ: '細部の前に、全体の流れを先に置く読み方',
  本質まで掘り下げる: '表面的な答えより、根っこまで確かめる読み方',
  まず動いて流れを作る: '完璧を待たず、小さく動いて流れを確かめる読み方',
  距離と言葉を読む: '言葉選びと距離感から、関係の負荷を見る読み方',
  全体をつなげて整える: 'バラバラな要素をつなげ、全体の流れに戻す読み方',
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

export function coreReadingStyleNoteFromCoreType(coreType: string): string | null {
  const display = coreTraitDisplayFromCoreType(coreType);
  return READING_STYLE_NOTES[display] ?? null;
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

export function freeCorePersonalizationFingerprint(result: CoreResult): string {
  const axes = freeCoreAxisRowsForResult(result);
  const lifestyle = freeCoreLifestyleTriptych(result);
  const align = freeCoreAlignSteps(result);
  const bullets = freeCoreObservationBullets(result);
  return [
    coreTraitDisplayFromCoreType(result.coreType),
    coreReadingStyleNoteFromCoreType(result.coreType) ?? '',
    ...axes.map((r) => `${r.tendency}|${r.life}|${r.load}`),
    ...lifestyle.map((c) => c.body),
    ...align.map((s) => s.body),
    ...bullets,
  ].join('\n');
}
