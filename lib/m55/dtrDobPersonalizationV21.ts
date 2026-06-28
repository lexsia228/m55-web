/**
 * Paid DTR DOB personalization v2.1.
 * Uses exact 24 solarTerms × 5 lunarDayBands × 12 lunarMonths × 10 stems
 * for materially higher uniqueness than v2.
 *
 * Deterministic static corpus only: no AI, no network, no trait rejudgment.
 * Existing dob-v2-2026-06 snapshots are routed to the v2 builder — not here.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from './dtrDobPersonalizationV2';

// ── Utility ───────────────────────────────────────────────────────────────────

function djb2Hex(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// ── DOB signal resolvers ──────────────────────────────────────────────────────

/** 5-band lunar day: 1–6 / 7–12 / 13–18 / 19–24 / 25–30 */
type DayBand = 0 | 1 | 2 | 3 | 4;

function dayBandOf(lunarDayKey: string): DayBand {
  const dayToken = lunarDayKey.split('-').pop() ?? '1';
  const d = Number.parseInt(dayToken, 10);
  if (!Number.isFinite(d) || d <= 6) return 0;
  if (d <= 12) return 1;
  if (d <= 18) return 2;
  if (d <= 24) return 3;
  return 4;
}

function lunarMonthIdx(lunarMonthKey: string): number {
  const t = lunarMonthKey.split('-').pop() ?? '1';
  const m = Number.parseInt(t, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return 0;
  return m - 1;
}

// Maps solarTermKey → 0-based index 0–23
const SOLAR_TERM_ORDER: ReadonlyMap<string, number> = new Map([
  ['xiaohan', 0], ['dahan', 1], ['lichun', 2], ['yushui', 3],
  ['jingzhe', 4], ['chunfen', 5], ['qingming', 6], ['guyu', 7],
  ['lixia', 8], ['xiaoman', 9], ['mangzhong', 10], ['xiazhi', 11],
  ['xiaoshu', 12], ['dashu', 13], ['liqiu', 14], ['chushu', 15],
  ['bailu', 16], ['qiufen', 17], ['hanlu', 18], ['shuangjiang', 19],
  ['lidong', 20], ['xiaoxue', 21], ['daxue', 22], ['dongzhi', 23],
]);

function solarTermIdx(key: string): number {
  return SOLAR_TERM_ORDER.get(key) ?? 0;
}

// ── S1: 自分の輪郭・力の出やすい状況（stem × exact solarTerm） ──────────────

// 10 stems × 24 terms = 240 variants for S1.
// First, 24 solarTerm short phrases (自分の形への接続語):
const S1_SOLAR_TERM_NOTES: readonly string[] = [
  '厳しい寒さの中で生まれた形として、内から整えるほど力が出やすくなります。',          // xiaohan 0
  '寒さが最も深まる時期の生まれとして、土台を先に温めるほど動き出しやすくなります。',    // dahan 1
  '立春に近い時期の生まれとして、静かに始める形が合いやすくなります。',                 // lichun 2
  '雨水の頃の生まれとして、ゆっくりほどけながら動く形が安定しやすくなります。',          // yushui 3
  '目覚めの季節に近い生まれとして、動きのきっかけを小さく置くほど力が出やすくなります。', // jingzhe 4
  '春分に近い時期の生まれとして、バランスを先に確かめるほど進めやすくなります。',        // chunfen 5
  '清明の頃の生まれとして、始めたことを短く確かめながら進む形が合います。',              // qingming 6
  '穀雨に近い時期の生まれとして、準備を丁寧に置くほど力の出方が安定します。',            // guyu 7
  '立夏に近い時期の生まれとして、動きが出やすい反面、休息を先に置くほど整いやすくなります。', // lixia 8
  '小満の頃の生まれとして、少しずつ満たしていく形が力の出方に合っています。',             // xiaoman 9
  '芒種の頃の生まれとして、動きながら確かめていく形が合いやすくなります。',               // mangzhong 10
  '夏至に近い時期の生まれとして、熱量を一点に絞るほど輪郭が立ちやすくなります。',         // xiazhi 11
  '小暑に近い時期の生まれとして、動く前にペースを決めるほど後半が整いやすくなります。',   // xiaoshu 12
  '大暑の頃の生まれとして、力が外に向きやすい形です。休息を先に置くほど続きやすくなります。', // dashu 13
  '立秋に近い時期の生まれとして、見直しに向きやすい形が力として出やすくなります。',       // liqiu 14
  '処暑の頃の生まれとして、熱を落ち着かせながら次へ進む形が安定しやすくなります。',       // chushu 15
  '白露に近い時期の生まれとして、丁寧に整える力が輪郭として出やすくなります。',           // bailu 16
  '秋分に近い時期の生まれとして、残すものを先に決めるほど力が集まりやすくなります。',     // qiufen 17
  '寒露に近い時期の生まれとして、深く見ていく力が輪郭として出やすくなります。',           // hanlu 18
  '霜降の頃の生まれとして、冷えをゆっくり受け取りながら整える形が合います。',             // shuangjiang 19
  '立冬に近い時期の生まれとして、内に向かう力が安定の源になりやすくなります。',           // lidong 20
  '小雪の頃の生まれとして、動きを絞って深く進む形が力の出方に合います。',                 // xiaoxue 21
  '大雪に近い時期の生まれとして、静かに蓄えた力が整いやすくなります。',                   // daxue 22
  '冬至に近い時期の生まれとして、折り返し点として力を立て直しやすい形です。',              // dongzhi 23
] as const;

// 10 stem identity leads (same as v2, authoritative)
const S1_STEM_LEADS: readonly string[] = [
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

// ── S2: 進め方・段取り（exact solarTerm × dayBand） ──────────────────────────

// 24 solarTerm composition context
const S2_SOLAR_TERM_NOTES: readonly string[] = [
  '真冬の深さに近い生まれとして、急に広げるより先に手順を整えるほど進め方が安定します。', // xiaohan 0
  '寒さの底から動き出す時期の生まれとして、小さく始めるほど扱いやすくなります。',         // dahan 1
  '春の始まりに近い生まれとして、最初の一手を小さく置くほど、動き出しが整いやすくなります。', // lichun 2
  '解けはじめる時期の生まれとして、ゆっくり段取りを温めるほど整いやすくなります。',        // yushui 3
  '芽吹きの気配が出る頃の生まれとして、動き出す前の準備を短く置くほど流れがつかみやすくなります。', // jingzhe 4
  '春分に近い生まれとして、進め方のバランスを先に決めるほど、後から修正しやすくなります。', // chunfen 5
  '清らかに進める時期の生まれとして、こまめに確かめながら進むほど整います。',              // qingming 6
  '準備が実る頃の生まれとして、段取りを先に丁寧に置くほど動きやすくなります。',            // guyu 7
  '動きが出てくる頃の生まれとして、ペースを先に決めておくほど後半が整いやすくなります。',  // lixia 8
  '充実感が出やすい時期の生まれとして、少しずつ積み上げる進め方が合いやすくなります。',    // xiaoman 9
  '動きながら仕上げていく頃の生まれとして、完了の区切りを短く置くほど扱いやすくなります。', // mangzhong 10
  '勢いが頂点に近い時期の生まれとして、集中を一点に絞るほど進め方が安定します。',          // xiazhi 11
  '熱が出やすい時期の生まれとして、動く前のペース確認を先に置くほど後半の消耗を減らせます。', // xiaoshu 12
  '力が最も強く出る頃の生まれとして、範囲を絞ってから進むほど消耗しにくくなります。',      // dashu 13
  '見直しと整理に向きやすい時期の生まれとして、残す課題を先に絞るほど落ち着いて進めます。', // liqiu 14
  '熱が落ち着く頃の生まれとして、確かめながら次へ移行する進め方が合いやすくなります。',    // chushu 15
  '精緻に整える頃の生まれとして、丁寧に確かめながら進むほど安定しやすくなります。',        // bailu 16
  '秋分に近い生まれとして、残す課題を先に絞り、整えてから次へ進むほど落ち着きやすくなります。', // qiufen 17
  '深みが出る頃の生まれとして、じっくり確認してから進むほど段取りが整います。',            // hanlu 18
  '寒さが増す前の時期の生まれとして、手元を整えてから次へ動くほど安定しやすくなります。',  // shuangjiang 19
  '冬に入る頃の生まれとして、先に手順を整えてから動くほど進め方が安定します。',            // lidong 20
  '静かに深める頃の生まれとして、動きを絞って丁寧に進むほど整いやすくなります。',          // xiaoxue 21
  '寒さが深まる時期の生まれとして、範囲を先に決めるほど無理なく進めやすくなります。',      // daxue 22
  '折り返しに近い時期の生まれとして、整えてから次を始めるほど進め方が安定します。',         // dongzhi 23
] as const;

// 5 dayBand segment notes for S1 (自分の輪郭・力のタイミング)
const S1_DAYBAND_NOTES: readonly [string, string, string, string, string] = [
  '月の初めに近い生まれとして、新しく始める前に向きを確かめるほど力が入りやすくなります。',
  '月の序盤に近い生まれとして、小さく試しながら進むほど自分の形が出やすくなります。',
  '月の中頃の生まれとして、一度立てた方向を確かめるほど力が安定しやすくなります。',
  '月の後半に近い生まれとして、整えてから次へ向かうほど力の出方が落ち着きやすくなります。',
  '月末に近い生まれとして、まとめてから次の向きを決めるほど力が整いやすくなります。',
];

// 5 dayBand segment notes for S2 (段取り・組み立て方)
const S2_DAYBAND_NOTES: readonly [string, string, string, string, string] = [
  '月の初めに近いリズムとして、始める前に一手だけ準備を置くほど段取りが整いやすくなります。',
  '月の序盤に近いリズムとして、試す範囲を絞りながら進むほど扱いやすくなります。',
  '月の中頃のリズムとして、一度立てた流れを短く確かめるほど後から戻りやすくなります。',
  '月の後半に近いリズムとして、終えるものを先に決めてから動くほど次の一手が軽くなります。',
  '月末に近いリズムとして、整理してから次へ移るほど、新たな段取りがつかみやすくなります。',
];

// ── S3: 安定条件・本質（solarTerm × lunarMonth × dayBand） ──────────────────

// 24 solarTerm essence notes (安定の核心)
const S3_SOLAR_TERM_ESSENCE: readonly string[] = [
  '寒さが最も深い頃の生まれとして、静けさの中に力を蓄えるほど本質が安定します。',           // xiaohan 0
  '冬の底から力を温める頃の生まれとして、土台を先に置くほど安定しやすくなります。',          // dahan 1
  '春の始まりに近い生まれとして、準備を丁寧に置くほど本来の力が出やすくなります。',          // lichun 2
  '解ける季節に近い生まれとして、ゆっくりほどけながら力が出やすい形があります。',            // yushui 3
  '芽吹きの頃の生まれとして、小さく始めることが安定の入り口になりやすい形です。',            // jingzhe 4
  '春分に近い生まれとして、バランスをとることが安定の核心になりやすくなります。',             // chunfen 5
  '清らかに進む時期の生まれとして、こまめに確かめることが本来の力につながります。',           // qingming 6
  '準備が実る頃の生まれとして、整えてから動く形が本来の安定につながります。',                 // guyu 7
  '動きが増す頃の生まれとして、休息のリズムを先に確保するほど安定しやすくなります。',         // lixia 8
  '充実感が出る頃の生まれとして、少しずつ満たす形が安定の核心になります。',                   // xiaoman 9
  '動きながら仕上げる頃の生まれとして、完了の区切りが安定の支えになります。',                 // mangzhong 10
  '勢いが頂点に近い時期の生まれとして、絞る力が安定の核心になりやすくなります。',             // xiazhi 11
  '熱が出やすい頃の生まれとして、ペースを守るほど本来の安定が保ちやすくなります。',           // xiaoshu 12
  '最も熱量が強い頃の生まれとして、絞ることが安定の核心になります。',                         // dashu 13
  '見直しと整理の頃の生まれとして、残すものを先に決めることが安定に直結します。',             // liqiu 14
  '熱が落ち着く頃の生まれとして、確かめながら移行する形が安定しやすくなります。',             // chushu 15
  '精緻に整える頃の生まれとして、丁寧さが安定の源になりやすい形です。',                       // bailu 16
  '秋分に近い生まれとして、バランスを守ることが安定の核心になります。',                       // qiufen 17
  '深みが出る頃の生まれとして、じっくり確認することが安定の土台になります。',                 // hanlu 18
  '寒さが増す前の頃の生まれとして、手元を整えてから動く形が安定に合います。',                 // shuangjiang 19
  '冬の入り口の頃の生まれとして、内に向かう力が安定の核心になりやすくなります。',             // lidong 20
  '静かに深める頃の生まれとして、動きを絞ることが安定につながります。',                       // xiaoxue 21
  '寒さが深まる時期の生まれとして、深く蓄えた力が安定の支えになります。',                     // daxue 22
  '折り返しに近い時期の生まれとして、整えてから次を始める形が安定に合います。',               // dongzhi 23
] as const;

// 5 dayBand phase blend for S3
const S3_DAYBAND_PHASE: readonly [string, string, string, string, string] = [
  '月の初めに近い生まれとして、手元から整えておくほど動き出しがスムーズになります。',
  '月の序盤に近い生まれとして、試す範囲を小さく切るほど安定が保ちやすくなります。',
  '月の中頃の生まれとして、一度立てた流れを途中で確かめるほど力が続きやすくなります。',
  '月の後半に近い生まれとして、終えるものを先に整えてから次へ進むほど戻りやすくなります。',
  '月末に近い生まれとして、整理してから次の月へ向かうほど安定しやすくなります。',
];

// ── S4: 生活・疲れ・戻し方（lunarMonth × dayBand） ────────────────────────────

// 12 lunar month life notes (力の出方・持続)
const S4_LUNAR_MONTH_NOTES: readonly string[] = [
  '年始に近い時期の生まれです。整えることを先に置くほど、力が無理なく出やすくなります。',
  '寒暖が変わりやすい時期の生まれです。体のリズムを丁寧に守るほど、力が安定しやすくなります。',
  '動きが戻ってくる時期の生まれです。小さく動いて早めに確かめるほど、力を整えやすくなります。',
  '流れが整いやすい時期の生まれです。立てた流れを続けるほど、力が伝わりやすくなります。',
  '熱が上がる前の時期の生まれです。休息を先に確保するほど、力が長く続きやすくなります。',
  '勢いが出やすい時期の生まれです。小さく始めて広げるほど、力を消耗しにくくなります。',
  '集中が出やすい時期の生まれです。切り替えをはっきり置くほど、力が安定しやすくなります。',
  '後半に向かう時期の生まれです。ペースを落として確かめるほど、力が整いやすくなります。',
  '区切りへ向かう時期の生まれです。一度立ち止まって確かめるほど、力が戻りやすくなります。',
  '落ち着きが出る時期の生まれです。急がずに確かめるほど、力を出しやすくなります。',
  '手元を整える時期の生まれです。新しいことより手元を守るほど、力が合いやすくなります。',
  '折り返しに近い時期の生まれです。終えたことを確かめてから次へ進むほど、力が戻りやすくなります。',
] as const;

// 5 dayBand recovery notes for S4 (疲れ・戻し方)
const S4_DAYBAND_RECOVERY: readonly [string, string, string, string, string] = [
  '月の初めに近い生まれとして、始めたことを小さく確かめるほど疲れが溜まりにくくなります。',
  '月の序盤に近い生まれとして、試す量を絞るほど回復しやすくなります。',
  '月の中頃の生まれとして、短く区切って休む時間を入れるほど、力が持続しやすくなります。',
  '月の後半に近い生まれとして、終えるものを先に決めてから動くほど、力が戻りやすくなります。',
  '月末に近い生まれとして、整理してから次の月へ向かうほど、回復しやすくなります。',
];

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildPaidDtrIndividualizationV21FromEngineContext(
  ctx: EngineContextJson,
): PaidDtrIndividualization {
  const stemIdx = Math.max(0, Math.min(9, ctx.stemLaneIndex));
  const stIdx = solarTermIdx(ctx.boundaryMetadata.solarTermKey);
  const band = dayBandOf(ctx.boundaryMetadata.lunarDayKey);
  const mIdx = lunarMonthIdx(ctx.boundaryMetadata.lunarMonthKey);

  // S1: stem lead + exact solarTerm note + dayBand note
  const s1IdentityRhythmNote = [
    S1_STEM_LEADS[stemIdx]!,
    S1_SOLAR_TERM_NOTES[stIdx]!,
    S1_DAYBAND_NOTES[band],
  ].join('\n');

  // S2: solarTerm composition note + dayBand note
  const s2CompositionRhythmNote = [
    S2_SOLAR_TERM_NOTES[stIdx]!,
    S2_DAYBAND_NOTES[band],
  ].join('\n');

  // S3: full essence note = solarTerm essence + dayBand phase blend
  const essenceRhythmNote = [
    '生年月日の細かなリズムから見ると、',
    S3_SOLAR_TERM_ESSENCE[stIdx]!,
    S3_DAYBAND_PHASE[band],
  ].join('\n').trim();

  // S4: lunarMonth note + dayBand recovery note
  const s4StrengthsRhythmNote = [
    S4_LUNAR_MONTH_NOTES[mIdx]!,
    S4_DAYBAND_RECOVERY[band],
  ].join('\n');

  // S7 auxiliary (same structure as v2 for compat)
  const auxiliaryReading = [
    '生年月日の細かなリズムから見ると、日々の扱い方は次のように整えやすくなります。',
    S2_DAYBAND_NOTES[band],
    S3_SOLAR_TERM_ESSENCE[stIdx]!,
  ].join('\n');

  const handlingHint = S2_DAYBAND_NOTES[band];

  const fingerprint = `dobv21-${djb2Hex([
    DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    ctx.stemLaneIndex,
    ctx.boundaryMetadata.solarTermKey,
    ctx.boundaryMetadata.lunarDayKey,
    ctx.boundaryMetadata.lunarMonthKey,
    ctx.normalizedBirthContext.birthTimeUnknown ? 'unknown-time' : 'known-time',
  ].join('|'))}`;

  return {
    version: 'v2',
    dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    fingerprint,
    essenceRhythmNote,
    auxiliaryReading,
    handlingHint,
    s1IdentityRhythmNote,
    s2CompositionRhythmNote,
    s4StrengthsRhythmNote,
  };
}
