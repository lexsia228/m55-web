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
  '向きが決まるほど力を出しやすくなります。日々のどこかに「今日の方向を決める」短い区切りを置くと、動き出しがスムーズになります。',
  '人とのあいだの流れを整える力があります。生活の変化が続く時期ほど、その力が使いやすくなります。',
  '表現と反応で場を動かす力があります。休息のリズムを先に決めるほど、長く安定しやすくなります。',
  'ひとつのことを深く整える力があります。静かな時間を確保するほど、自分らしく力を出しやすくなります。',
  '続ける力と手順を守る力があります。変化があるときほど、その理由を短く言葉にすると落ち着きやすくなります。',
  '育てる力とまとめ直す力があります。抱える量を先に決めるほど、無理なく力を使いやすくなります。',
  '線を引いて進める力があります。完了の区切りを短く置くほど、扱いやすくなります。',
  '細部を整える力があります。仕上げる時間と休む時間を分けるほど、安定しやすくなります。',
  '新しいつながりを探す力があります。広げる日と絞る日を意図的に分けるほど、消耗せずに続けやすくなります。',
  '小さな変化を読む力があります。気づいたことを短く言葉にして外に出すほど、ひとりで抱え込みにくくなります。',
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
  '月初めに近いリズムがあります。始める前の準備を短く置くと、落ち着いて進みやすくなります。',
  '寒さからほどけるリズムがあります。急に切り替えるより、少しずつ体を慣らすほうが整いやすくなります。',
  '動きが戻りやすいリズムがあります。小さく試して早めに出すほど、手ごたえを得やすくなります。',
  '流れを確かめるリズムがあります。進めながら見直す余白を置くほど、安定しやすくなります。',
  '熱が上がり始めるリズムがあります。休む場所を先に確保するほど、力を長く使いやすくなります。',
  '広げる前の準備リズムがあります。範囲を絞ってから動くほうが、負荷を減らしやすくなります。',
  '集中が強く出やすいリズムがあります。切り替えの合図を先に決めるほど、消耗を抑えやすくなります。',
  '余熱を整えるリズムがあります。ペースを落として確認するほど、戻りやすくなります。',
  '区切り直すリズムがあります。残すものを一度書き出すと、次の動きが見えやすくなります。',
  '深まりを確かめるリズムがあります。急いで決めず短く検討するほど、落ち着きやすくなります。',
  '土台に戻るリズムがあります。新しいことより手元の整備を先に置くほど、無理なく合いやすくなります。',
  '折り返しを意識しやすいリズムがあります。終えたことを確認してから次へ進むほど、安定しやすくなります。',
] as const;

const BIRTH_TIME_UNKNOWN_NOTE =
  '生まれ時刻が未入力の場合でも、ここでは一日の細かな時間より、大きな流れを中心に見ています。';

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
