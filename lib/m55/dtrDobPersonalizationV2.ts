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

/**
 * S3 phase blend — 1 sentence appended to essenceRhythmNote.
 * Distinct phrasing from PHASE_HANDLING (which targets auxiliaryReading/s7).
 */
const S3_PHASE_BLEND: Readonly<Record<LunarPhaseBucket, string>> = {
  early: '月初めに近い生まれとして、始める前に手元を整えておくほど、動き出しがスムーズになります。',
  mid: '月の中頃の生まれとして、一度立てた流れを途中で確かめるほど、力が続きやすくなります。',
  late: '月の後半に近い生まれとして、終えるものを先に整えてから次へ進むほど、戻りやすくなります。',
};

/**
 * S1「あなたという人物」stem-indexed identity lead.
 * Each item is a short sentence about "自分の形・力の出やすい場面".
 * Different phrasing from STEM_RHYTHM_LEADS (which targets S3 essenceRhythmNote).
 */
const S1_STEM_IDENTITY_LEADS: readonly string[] = [
  '向きを先に決めると力が入りやすい形です。',
  '場の流れを読む力が自然に出やすい形です。',
  '表現が前に出ると反応が戻りやすい形です。',
  'ひとつに深く向き合うほど力が出やすい形です。',
  '続けることで力の伝わり方が安定する形です。',
  '育てる・まとめる力が前に出やすい形です。',
  '区切りをつけて進める力が前に出やすい形です。',
  '丁寧に整える力が輪郭として出やすい形です。',
  '外へのつながりで輪郭が立ち上がりやすい形です。',
  '静かに深く読む力が前に出やすい形です。',
] as const;

/**
 * S1 season context — connects birth season to "自分の輪郭/力の出やすさ".
 * Different framing from SEASON_GROUPS (which targets S3 essenceRhythmNote).
 */
const S1_SEASON_IDENTITY: Readonly<Record<SeasonGroup, string>> = {
  winter: '寒さが増す時期の生まれです。土台を先に整えるほど、力の出方が安定しやすくなります。',
  spring: '芽吹きの時期の生まれです。小さく始めて確かめるほど、自分の輪郭がはっきりしてきます。',
  summer: '熱が前に向きやすい時期の生まれです。休息のリズムを置くほど、力が長く続きやすくなります。',
  autumn: '整理の時期の生まれです。残すものを先に決めるほど、自分らしく動きやすくなります。',
};

/**
 * S2「構成と傾向の全体像」season context — converts season to 進め方・ペース.
 */
const S2_SEASON_COMPOSITION: Readonly<Record<SeasonGroup, string>> = {
  winter: '冬に近い時期の生まれとして、急に広げるより先に手順を整えるほど、進め方が安定しやすくなります。',
  spring: '春に近い時期の生まれとして、小さく始めて早めに確かめるほど、進め方が整いやすくなります。',
  summer: '夏に近い時期の生まれとして、動く前にペースを決めておくほど、後半の疲れを減らしやすくなります。',
  autumn: '秋に近い時期の生まれとして、残す課題を先に絞るほど、進め方を落ち着かせやすくなります。',
};

/**
 * S2 phase context — converts phase to 段取り・組み立て方.
 */
const S2_PHASE_COMPOSITION: Readonly<Record<LunarPhaseBucket, string>> = {
  early: '始める段階では、小さく試してから広げるほうが、全体を抱えすぎずに進めやすくなります。',
  mid: '進める段階では、一度立てた流れを短く確かめるほうが、後から戻りやすくなります。',
  late: '整える段階では、先に終えるものを決めてから動くほうが、次の一歩が軽くなります。',
};

/**
 * S4「自分の出やすい面」month context — converts lunar month to 力の出方・持続のコツ.
 * Focus: "この時期の生まれとして、力をどう出しやすくするか".
 */
const S4_MONTH_STRENGTHS: readonly string[] = [
  '年始に近い時期の生まれです。始めるよりも整えるほうが先に力が出やすくなります。',
  '寒暖が変わりやすい時期の生まれです。体のリズムを守るほど、力が安定しやすくなります。',
  '動きが戻りやすい時期の生まれです。小さく動いて確かめるほど、力を出しやすくなります。',
  '流れが整いやすい時期の生まれです。立てた流れを続けるほど、力が伝わりやすくなります。',
  '熱が上がる前の時期の生まれです。休息を先に置くほど、力が長く続きやすくなります。',
  '勢いが出やすい時期の生まれです。小さく始めて広げるほど、力を消耗しにくくなります。',
  '集中が強い時期の生まれです。切り替えをはっきり置くほど、力が安定しやすくなります。',
  '後半に入りやすい時期の生まれです。ペースを落とすほど、力が整いやすくなります。',
  '区切りに向かう時期の生まれです。一度立ち止まるほど、力が戻りやすくなります。',
  '落ち着く時期の生まれです。急いで決めずに確かめるほど、力を出しやすくなります。',
  '整える時期の生まれです。新しいことより手元を守るほど、力が合いやすくなります。',
  '折り返しに近い時期の生まれです。終えたことを確かめてから次へ進むほど、力が戻りやすくなります。',
] as const;

/**
 * S4 phase context — 力の持続・回復のコツ.
 */
const S4_PHASE_STRENGTHS: Readonly<Record<LunarPhaseBucket, string>> = {
  early: '始める場面では、手元から小さく動くほど、力が無理なく出やすくなります。',
  mid: '続ける場面では、短く区切って確かめるほど、力が持続しやすくなります。',
  late: '整える場面では、終えるものを先に決めてから次へ進むほど、力が戻りやすくなります。',
};

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
  const stemIdx = Math.max(0, Math.min(9, ctx.stemLaneIndex));
  const seasonKey = seasonGroupForTerm(ctx.boundaryMetadata.solarTermKey);
  const phaseKey = lunarPhaseBucket(ctx.boundaryMetadata.lunarDayKey);
  const monthIdx = lunarMonthIndex(ctx.boundaryMetadata.lunarMonthKey);

  const season = SEASON_GROUPS[seasonKey];
  const phase = PHASE_HANDLING[phaseKey];
  const month = MONTH_RHYTHMS[monthIdx]!;
  const stem = STEM_RHYTHM_LEADS[stemIdx]!;

  // S3 phase blend — 1 sentence added after month rhythm
  const s3PhaseBlend = S3_PHASE_BLEND[phaseKey];

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

  // S1: stem × season (自分の形/輪郭)
  const s1IdentityRhythmNote = [
    S1_STEM_IDENTITY_LEADS[stemIdx]!,
    S1_SEASON_IDENTITY[seasonKey],
  ].join('\n');

  // S2: season × phase (進め方/段取り)
  const s2CompositionRhythmNote = [
    S2_SEASON_COMPOSITION[seasonKey],
    S2_PHASE_COMPOSITION[phaseKey],
  ].join('\n');

  // S4: month × phase (力の出方/持続)
  const s4StrengthsRhythmNote = [
    S4_MONTH_STRENGTHS[monthIdx === 0 ? 0 : Math.min(monthIdx, 11)]!,
    S4_PHASE_STRENGTHS[phaseKey],
  ].join('\n');

  return {
    version: 'v2',
    dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    fingerprint,
    essenceRhythmNote: [
      '生年月日の細かなリズムから見ると、',
      stem,
      season,
      month,
      s3PhaseBlend,
      timeNote,
    ].join('\n').trim(),
    auxiliaryReading: [
      '生年月日の細かなリズムから見ると、日々の扱い方は次のように整えやすくなります。',
      phase,
      season,
    ].join('\n'),
    handlingHint: phase,
    s1IdentityRhythmNote,
    s2CompositionRhythmNote,
    s4StrengthsRhythmNote,
  };
}
