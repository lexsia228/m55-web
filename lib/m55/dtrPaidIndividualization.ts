/**
 * Paid DTR — deterministic DOB/v2 individualization layer (no API, no trait rejudgment).
 * User-facing fragments derived from stored v2 boundary metadata only.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { CompositeStemResult } from './compositeStem/types';

export type PaidDtrIndividualization = {
  /** Stable v2 display fingerprint — same profile input => same value. */
  fingerprint: string;
  /** Calm auxiliary reading for chapter intros / consult grounding. */
  auxiliaryReading: string;
  /** Calm handling hint for s7「日々の取扱いヒント」. */
  handlingHint: string;
  /** Calm month-rhythm note for s3「本質と安定の条件」. */
  essenceRhythmNote: string;
};

export type PaidDtrIndividualizationAuditMeta = {
  fingerprint: string;
  auxiliaryReading: string;
  handlingHint: string;
  essenceRhythmNote: string;
};

/** Solar term keys → calm season rhythm (no raw term names in output). */
const SOLAR_TERM_SEASON_READINGS: Readonly<Record<string, string>> = {
  xiaohan: '冬の後半です。体と心を温めながら、次の一歩を静かに準備しやすい時期の読み取りです。',
  dahan: '寒さが深まる時期です。急いで動くより、土台を整えてから進むほうが負荷が出にくい読み取りです。',
  lichun: '春の立ち上がりです。小さな芽吹きを大事にし、急がず輪郭を整えやすい時期の読み取りです。',
  yushui: '春の準備期です。潤いを足しながら、ペースをゆっくり整えやすい時期の読み取りです。',
  jingzhe: '春の息吹が強まる時期です。眠っていた動きが戻りやすいので、区切りを短く取る読み取りです。',
  chunfen: '昼と夜のバランスが整う時期です。生活リズムを整えると、力の出方が安定しやすい読み取りです。',
  qingming: '春の澄んだ時期です。余計なものを手放し、必要なものだけを残すと軽くなる読み取りです。',
  guyu: '春の終わりに近づく時期です。一度立てた流れを確かめてから次へ進む読み取りです。',
  lixia: '夏の入り口です。勢いより、休息と水分のリズムを先に整える読み取りです。',
  xiaoman: '夏へ向かう準備期です。小さく試してから広げるほうが無理が出にくい読み取りです。',
  mangzhong: '忙しさが増えやすい時期です。一度に抱えず、順番を決めると戻りやすい読み取りです。',
  xiazhi: '昼が長い時期です。集中と休息の切り替えをはっきりさせると安定しやすい読み取りです。',
  xiaoshu: '暑さが本格化する前です。ペースを落として、体調を先に守る読み取りです。',
  dashu: '暑さが強い時期です。冷却と休息を先に確保すると、後半の消耗が減りやすい読み取りです。',
  liqiu: '秋の入り口です。一度区切りをつけ、残りを見直すと整えやすい読み取りです。',
  chushu: '残暑の時期です。無理に前へ進まず、短い区切りで確かめる読み取りです。',
  bailu: '秋の澄んだ時期です。言葉を少なくし、必要な要点だけを残すと軽くなる読み取りです。',
  qiufen: '昼夜のバランスが再び整う時期です。生活のリズムを整えると戻りやすい読み取りです。',
  hanlu: '秋の深まりです。急いで決めず、一度立ち止まってから動く読み取りです。',
  shuangjiang: '冷えが増える時期です。体と心を温めながら、小さく試す読み取りです。',
  lidong: '冬の入り口です。新しいことを始めるより、土台を整えるほうが合いやすい読み取りです。',
  xiaoxue: '冬の静けさが増す時期です。一人の時間を確保すると輪郭が戻りやすい読み取りです。',
  daxue: '冬が深まる時期です。急がず、短い区切りで確かめる読み取りです。',
  dongzhi: '一年の折り返しに近い時期です。区切りをつけてから次の一歩を考える読み取りです。',
};

const DEFAULT_SEASON_READING =
  '季節の切り替わりを意識すると、ペースの調整がしやすい時期の読み取りです。';

type LunarPhaseBucket = 'early' | 'mid' | 'late';

const LUNAR_PHASE_HANDLING: Readonly<Record<LunarPhaseBucket, string>> = {
  early:
    '始めるときは、小さく試してから広げる方が、無理が出にくい扱い方の読み取りです。',
  mid:
    '続けるときは、一度立てた流れを短い区切りで確かめると、落ち着きやすい扱い方の読み取りです。',
  late:
    '区切るときは、一度手を止めて残りを見直すと、戻りやすい扱い方の読み取りです。',
};

/** Lunar month number (1–12) → calm essence rhythm (no raw month keys in output). */
const LUNAR_MONTH_ESSENCE_READINGS: Readonly<Record<number, string>> = {
  1: '年の始めに近い時期の生まれです。いきなり大きく動くより、生活の土台を確かめてから始めるほうが落ち着きやすい読み取りです。',
  2: '冬から春へ移りゆく時期の生まれです。寒暖の差を意識し、ペースをゆっくり整えると力の出方が安定しやすい読み取りです。',
  3: '春の息吹が戻りやすい時期の生まれです。小さな一歩から始め、区切りを短く取るほうが無理が出にくい読み取りです。',
  4: '春が深まる時期の生まれです。一度立てた流れを確かめてから次へ進むと、戻りやすい読み取りです。',
  5: '初夏に近づく時期の生まれです。勢いより休息と水分のリズムを先に整えると、後半の消耗が減りやすい読み取りです。',
  6: '夏へ向かう準備期の生まれです。小さく試してから広げるほうが、負荷が出にくい読み取りです。',
  7: '夏の盛りに近い時期の生まれです。集中と休息の切り替えをはっきりさせると、安定しやすい読み取りです。',
  8: '夏の後半に入る時期の生まれです。ペースを落とし、体調を先に守るほうが整えやすい読み取りです。',
  9: '秋の入り口に近い時期の生まれです。一度区切りをつけ、残りを見直すと戻りやすい読み取りです。',
  10: '秋が深まる時期の生まれです。急いで決めず、短い区切りで確かめるほうが落ち着きやすい読み取りです。',
  11: '冬の入り口に近い時期の生まれです。新しいことを始めるより、土台を整えるほうが合いやすい読み取りです。',
  12: '一年の折り返しに近い時期の生まれです。区切りをつけてから次の一歩を考えると、輪郭が戻りやすい読み取りです。',
};

const DEFAULT_ESSENCE_RHYTHM_NOTE =
  '月ごとの生活リズムを意識すると、ペースの調整がしやすい読み取りです。';

const BIRTH_TIME_UNKNOWN_ESSENCE_PREFIX =
  '生まれ時刻が未入力のため、生活リズムは正午基準で整理した読み取りです。';

const FORBIDDEN_USERFacingSubstrings = [
  '甲乙丙丁',
  '戊己庚辛',
  '壬癸',
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
  'solarTerm',
  'lunarDay',
  'lunarMonth',
  'boundaryMetadata',
  'engine_context_json',
  'engine_context',
  'stemLane',
  'stemChar',
  'djb2:',
  'm55_day_boundary',
  'p_lunar',
  'composite',
  'このタイプ',
] as const;

function lunarPhaseBucket(lunarDayKey: string): LunarPhaseBucket {
  const dayToken = lunarDayKey.split('-').pop() ?? '1';
  const day = Number.parseInt(dayToken, 10);
  if (!Number.isFinite(day) || day <= 10) return 'early';
  if (day <= 20) return 'mid';
  return 'late';
}

function seasonReadingForTerm(solarTermKey: string): string {
  return SOLAR_TERM_SEASON_READINGS[solarTermKey] ?? DEFAULT_SEASON_READING;
}

function lunarMonthNumberFromKey(lunarMonthKey: string): number | null {
  const monthToken = lunarMonthKey.split('-').pop() ?? '';
  const month = Number.parseInt(monthToken, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  return month;
}

function essenceRhythmNoteForMonth(lunarMonthKey: string, birthTimeUnknown: boolean): string {
  const month = lunarMonthNumberFromKey(lunarMonthKey);
  const base = month != null ? (LUNAR_MONTH_ESSENCE_READINGS[month] ?? DEFAULT_ESSENCE_RHYTHM_NOTE) : DEFAULT_ESSENCE_RHYTHM_NOTE;
  if (!birthTimeUnknown) return base;
  return `${BIRTH_TIME_UNKNOWN_ESSENCE_PREFIX}\n${base}`;
}

export function buildPaidDtrIndividualizationFromEngineContext(
  ctx: EngineContextJson,
): PaidDtrIndividualization {
  const { boundaryMetadata, normalizedBirthContext } = ctx;
  const seasonReading = seasonReadingForTerm(boundaryMetadata.solarTermKey);
  const handlingHint = LUNAR_PHASE_HANDLING[lunarPhaseBucket(boundaryMetadata.lunarDayKey)];
  const auxiliaryReading = [seasonReading, handlingHint].join('\n');
  const essenceRhythmNote = essenceRhythmNoteForMonth(
    boundaryMetadata.lunarMonthKey,
    normalizedBirthContext.birthTimeUnknown,
  );

  return {
    fingerprint: ctx.displayFingerprint,
    auxiliaryReading,
    handlingHint,
    essenceRhythmNote,
  };
}

export function buildPaidDtrIndividualizationFromComposite(
  composite: CompositeStemResult,
): PaidDtrIndividualization {
  return buildPaidDtrIndividualizationFromEngineContext({
    engineVersion: composite.engineVersion,
    inputVersion: composite.inputVersion,
    correctionVersion: composite.correctionVersion,
    calculationMode: composite.calculationMode,
    stemLaneIndex: composite.stemLaneIndex,
    stemChar: composite.stemChar,
    normalizedBirthContext: composite.normalizedBirthContext,
    boundaryMetadata: composite.boundaryMetadata,
    staticFingerprint: composite.staticFingerprint,
    displayFingerprint: composite.displayFingerprint,
  });
}

export function toPaidDtrIndividualizationAuditMeta(
  ind: PaidDtrIndividualization,
): PaidDtrIndividualizationAuditMeta {
  return {
    fingerprint: ind.fingerprint,
    auxiliaryReading: ind.auxiliaryReading,
    handlingHint: ind.handlingHint,
    essenceRhythmNote: ind.essenceRhythmNote,
  };
}

/** Prefix inserted into paid s7 before catalog body. */
export function buildPaidDtrS7IndividualizationPrefix(ind: PaidDtrIndividualization): string {
  return ['【この保存版だけの補助整理】', ind.auxiliaryReading, ind.handlingHint, ''].join('\n');
}

/** Prefix inserted into paid s3 before catalog body (consult excerpt captures from start). */
export function buildPaidDtrS3IndividualizationPrefix(ind: PaidDtrIndividualization): string {
  return ['【この保存版だけの本質リズム】', ind.essenceRhythmNote, ''].join('\n');
}

/** Guard for tests — user-facing fragments must not leak internal keys. */
export function findForbiddenPaidIndividualizationLeak(text: string): string | null {
  for (const token of FORBIDDEN_USERFacingSubstrings) {
    if (text.includes(token)) return token;
  }
  return null;
}
