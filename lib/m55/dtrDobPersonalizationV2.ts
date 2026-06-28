/**
 * Paid DTR DOB personalization v2.
 * Deterministic static corpus only: no AI, no network, no trait rejudgment.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';

export const DOB_PERSONALIZATION_V2_CATALOG_VERSION = 'dob-v2-2026-06' as const;

type LunarPhaseBucket = 'early' | 'mid' | 'late';
type SeasonGroup = 'winter' | 'spring' | 'summer' | 'autumn';

const STEM_RHYTHM_LEADS: readonly string[] = [
  '向きを決めてから動く力が、日々の区切りと結びつきやすい読み取りです。',
  '人との間にある流れを整える力が、生活の変化と結びつきやすい読み取りです。',
  '表現と反応で場を動かす力が、休息の置き方で安定しやすい読み取りです。',
  'ひとつのことを深く整える力が、静かな時間の確保で戻りやすい読み取りです。',
  '続ける力と手順を守る力が、変化の理由を言葉にすると落ち着きやすい読み取りです。',
  '育てる力とまとめ直す力が、抱える量を先に決めると働きやすい読み取りです。',
  '線を引いて進める力が、完了の区切りを短く置くと扱いやすい読み取りです。',
  '細部を整える力が、仕上げる時間と休む時間を分けると安定しやすい読み取りです。',
  '新しい接続を探す力が、広げる日と絞る日を分けると戻りやすい読み取りです。',
  '小さな変化を読む力が、気づきを短く外に出すと孤立しにくい読み取りです。',
] as const;

const SEASON_GROUPS: Readonly<Record<SeasonGroup, string>> = {
  winter: '冷えや静けさが増える時期の生まれとして、急に広げるより先に土台を温めるほど、力の出方が安定します。',
  spring: '立ち上がりの気配が強い時期の生まれとして、小さく始めて短く確かめるほど、流れを整えやすくなります。',
  summer: '熱量が外へ向きやすい時期の生まれとして、動く前に休息と水分のリズムを置くほど、後半の消耗を減らせます。',
  autumn: '見直しと整理に向きやすい時期の生まれとして、残すものを先に決めるほど、無理のない集中に戻りやすくなります。',
};

const PHASE_HANDLING: Readonly<Record<LunarPhaseBucket, string>> = {
  early: '始める場面では、最初から大きく抱えず、試す範囲を小さく切ると扱いやすくなります。',
  mid: '続ける場面では、一度置いた流れを途中で確かめる時間を入れると、疲れが溜まりにくくなります。',
  late: '区切る場面では、終えるものと残すものを分けてから動くと、次の一歩が軽くなります。',
};

const MONTH_RHYTHMS: readonly string[] = [
  '月初めに近いリズムがあり、始める前の準備を短く置くと落ち着きやすい読み取りです。',
  '寒さからほどけるリズムがあり、急な切り替えより、少しずつ体を慣らすほうが合いやすい読み取りです。',
  '動きが戻りやすいリズムがあり、小さな試行を早めに出すほど、手ごたえを得やすい読み取りです。',
  '流れを確かめるリズムがあり、進めながら見直す余白を置くと安定しやすい読み取りです。',
  '熱が上がり始めるリズムがあり、休む場所を先に確保すると、力を長く使いやすい読み取りです。',
  '広げる前の準備リズムがあり、範囲を絞ってから動くほうが負荷を減らしやすい読み取りです。',
  '集中が強く出やすいリズムがあり、切り替えの合図を決めると消耗を抑えやすい読み取りです。',
  '余熱を整えるリズムがあり、ペースを落として確認するほど戻りやすい読み取りです。',
  '区切り直すリズムがあり、残すものを一度書き出すと、次の動きが見えやすい読み取りです。',
  '深まりを確かめるリズムがあり、急いで決めず短く検討すると落ち着きやすい読み取りです。',
  '土台に戻るリズムがあり、新しいことより手元の整備を先に置くと合いやすい読み取りです。',
  '折り返しを意識しやすいリズムがあり、終えたことを確認してから次へ進むと安定しやすい読み取りです。',
] as const;

const BIRTH_TIME_UNKNOWN_NOTE =
  '生まれ時刻が未入力のため、生活リズムは正午基準で静かに補正した読み取りです。';

function djb2Hex(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function seasonGroupForTerm(key: string): SeasonGroup {
  if (/^(xiaohan|dahan|lidong|xiaoxue|daxue|dongzhi)$/.test(key)) return 'winter';
  if (/^(lichun|yushui|jingzhe|chunfen|qingming|guyu)$/.test(key)) return 'spring';
  if (/^(lixia|xiaoman|mangzhong|xiazhi|xiaoshu|dashu)$/.test(key)) return 'summer';
  return 'autumn';
}

function lunarPhaseBucket(lunarDayKey: string): LunarPhaseBucket {
  const dayToken = lunarDayKey.split('-').pop() ?? '1';
  const day = Number.parseInt(dayToken, 10);
  if (!Number.isFinite(day) || day <= 10) return 'early';
  if (day <= 20) return 'mid';
  return 'late';
}

function lunarMonthIndex(lunarMonthKey: string): number {
  const monthToken = lunarMonthKey.split('-').pop() ?? '1';
  const month = Number.parseInt(monthToken, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return 0;
  return month - 1;
}

export function buildPaidDtrIndividualizationV2FromEngineContext(
  ctx: EngineContextJson,
): PaidDtrIndividualization {
  const season = SEASON_GROUPS[seasonGroupForTerm(ctx.boundaryMetadata.solarTermKey)];
  const phase = PHASE_HANDLING[lunarPhaseBucket(ctx.boundaryMetadata.lunarDayKey)];
  const month = MONTH_RHYTHMS[lunarMonthIndex(ctx.boundaryMetadata.lunarMonthKey)];
  const stem = STEM_RHYTHM_LEADS[Math.max(0, Math.min(9, ctx.stemLaneIndex))]!;
  const timeNote = ctx.normalizedBirthContext.birthTimeUnknown
    ? `\n${BIRTH_TIME_UNKNOWN_NOTE}`
    : '';
  const fingerprint = `dobv2-${djb2Hex([
    DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    ctx.stemLaneIndex,
    ctx.boundaryMetadata.solarTermKey,
    ctx.boundaryMetadata.lunarDayKey,
    ctx.boundaryMetadata.lunarMonthKey,
    ctx.normalizedBirthContext.birthTimeUnknown ? 'unknown-time' : 'known-time',
  ].join('|'))}`;

  return {
    version: 'v2',
    dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    fingerprint,
    essenceRhythmNote: [
      '生年月日の細かなリズムから見ると、',
      stem,
      season,
      month,
      timeNote,
    ].join('\n').trim(),
    auxiliaryReading: [
      '生年月日の細かなリズムから見ると、日々の扱い方は次のように整えやすくなります。',
      phase,
      season,
    ].join('\n'),
    handlingHint: phase,
  };
}
