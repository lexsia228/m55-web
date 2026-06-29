/**
 * /core free surface — living-language display aliases and DOB-flavored copy.
 * Internal engine labels (coreLabel, TYPE_*) stay unchanged; only user-facing text uses this layer.
 */
import { AXIS_ORDER } from './coreResult/axisMeta';
import type { AxisBand, AxisKey, CoreResult } from './coreResult/types';
import { AXIS_FORMAL_JA } from '../../components/core/corePublicAxisLabels';
import { observationTraitNameFromCoreLabel } from './publicStemDisplay';

/** Internal trait token → user-facing living phrase (no 「型」). */
const CORE_TRAIT_DISPLAY_ALIAS: Readonly<Record<string, string>> = {
  観測深化: '静かに深く見る',
  共鳴受容: '関係の温度を受け取る',
  構造探求: '納得して組み立てる',
  静観分析: '落ち着いて確かめる',
  調和観測: '関係の空気を整える',
  直観展開: '先に全体像をつかむ',
  核心追究: '本質まで掘り下げる',
  推進整理: 'まず動いて流れを作る',
  関係洞察: '距離と言葉を読む',
  統合設計: '全体をつなげて整える',
  感受拡張: '変化を受け取りやすい',
  推進先行: 'まず動いて流れを作る',
  調和優先: '関係の空気を整える',
  慎重整理: '整えてから進める',
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

type DayBand = 'early' | 'mid' | 'late';

type FreeCopyContext = {
  birthDate: string;
  day: number;
  month: number;
  dayBand: DayBand;
  stemLaneIndex: number;
};

const DAY_BAND_LEAD: Readonly<Record<DayBand, string>> = {
  early: '月初めに近い生まれでは、',
  mid: '月の中頃の生まれでは、',
  late: '月の後半に近い生まれでは、',
};

const MONTH_RHYTHM_NOTE: readonly string[] = [
  '年始に近い時期の生まれとして、始める前に手元を整えるほど動きやすくなります。',
  '寒暖が変わりやすい時期の生まれとして、体のリズムを守るほど安定しやすくなります。',
  '動きが戻りやすい時期の生まれとして、小さく試して確かめるほど力が出やすくなります。',
  '流れを整えやすい時期の生まれとして、立てた流れを続けるほど扱いやすくなります。',
  '熱が上がる前の時期の生まれとして、休息を先に置くほど長く続きやすくなります。',
  '勢いが出やすい時期の生まれとして、範囲を絞ってから動くほど消耗しにくくなります。',
  '集中が強い時期の生まれとして、切り替えをはっきり置くほど安定しやすくなります。',
  '後半に入りやすい時期の生まれとして、ペースを落として確認するほど整いやすくなります。',
  '区切りに向かう時期の生まれとして、一度立ち止まるほど戻りやすくなります。',
  '落ち着く時期の生まれとして、急いで決めず短く検討するほど落ち着きやすくなります。',
  '整える時期の生まれとして、新しいことより手元を守るほど合いやすくなります。',
  '折り返しに近い時期の生まれとして、終えたことを確かめてから次へ進むほど安定しやすくなります。',
];

type AxisCopyVariant = {
  tendencyHi: string;
  tendencyLo: string;
  lifeHi: readonly string[];
  lifeLo: readonly string[];
  loadHi: readonly string[];
  loadLo: readonly string[];
};

const FREE_AXIS_COPY: Readonly<Record<AxisKey, AxisCopyVariant>> = {
  socialEnergy: {
    tendencyHi: '人との距離を選びながら、必要な場面では自然に前に出やすい',
    tendencyLo: '近い人との関係を深く育てるほうが、力が出やすい',
    lifeHi: [
      '初対面が続く場では、思ったより消耗しやすくなります。少人数の場面のほうが、自分らしさが出やすいです。',
      '会議や雑談が続く日ほど、静かに整える時間を先に置くと、後半の負荷を抑えやすくなります。',
    ],
    lifeLo: [
      '近い人との関係では、急に広げるより、安心できる相手と深く関わるほうが力が出やすくなります。',
      '広く浅い関係より、信頼できる相手との距離を大切にするほうが、日常が整いやすくなります。',
    ],
    loadHi: [
      '予定が詰まるほど、返事の速度だけが先に走りやすく、余白が削られやすくなります。',
      '初対面が続くと、笑顔のまま疲れが残りやすく、早めに距離を整えたくなります。',
    ],
    loadLo: [
      '急に距離を求められると、本音より様子を見る時間が長くなりやすくなります。',
      '初動の自己開示が遅れ、意図と違う距離感に見られやすくなることがあります。',
    ],
  },
  stability: {
    tendencyHi: '小さな変化や違和感に早く気づきやすい',
    tendencyLo: '大きな揺れより、日常の温度差に敏感になりやすい',
    lifeHi: [
      '小さな変化や違和感に早く気づきやすいぶん、予定や空気が急に変わると疲れが残りやすくなります。',
      '空気の変化を先に拾うほど、早めに整えを取りにいける一方、刺激が続くと余白が削られやすくなります。',
    ],
    lifeLo: [
      '急な変更より、少し前から分かる変化のほうが、自分のペースを保ちやすくなります。',
      '静かな環境ほど力が出やすく、雑音や中断が続くと、判断の速度が落ちやすくなります。',
    ],
    loadHi: [
      '予定が次々に変わると、体より先に神経が張り続けやすく、夜に疲れが残りやすくなります。',
      '刺激が多い場では、違和感を抱えたまま進み、後から一気に消耗しやすくなります。',
    ],
    loadLo: [
      '急な変更が重なると、整える前に次へ進み、本来のペースを取り戻しにくくなります。',
      '変化の予告がないと、安心条件が崩れた感覚が続きやすくなります。',
    ],
  },
  openness: {
    tendencyHi: '別の可能性を見つけるほうが自然',
    tendencyLo: '一つの見方を深く確かめるほうが自然',
    lifeHi: [
      'ひとつの見方に固定するより、別の可能性を見つけるほうが自然です。ただし、選択肢が増えすぎると迷いやすくなります。',
      '新しい視点を受け取りやすいぶん、話題が増えると、手元の整理が追いつきにくくなることがあります。',
    ],
    lifeLo: [
      '深く一つに向き合うほど輪郭がはっきりし、拡散的な流れが続くと焦点が定まりにくくなります。',
      '守りの視点で現実的に詰めるほうが得意で、急に選択肢だけ増えると負荷になりやすくなります。',
    ],
    loadHi: [
      '選択肢が増えすぎると、決める前に比較が続き、着手が遅れやすくなります。',
      '話題が次々に増えると、どれを残すか決めきれず、疲れが静かにたまりやすくなります。',
    ],
    loadLo: [
      '新しい打ち手を急かされると、納得より速度が先に立ち、後から戻りにくくなります。',
      '拡散した情報の中では、自分の軸が見えにくくなり、判断が重く感じられやすくなります。',
    ],
  },
  cooperation: {
    tendencyHi: '相手の温度を見ながら関係を保ちやすい',
    tendencyLo: '自分の線引きが見えているほうが関係を整えやすい',
    lifeHi: [
      '相手に合わせすぎるより、自分の線引きが見えているほうが関係を整えやすくなります。',
      '場の空気を整えられる一方、期待を飲み込みすぎると、本音が後回しになりやすくなります。',
    ],
    lifeLo: [
      '距離をはっきり保てるほど負荷を抑えやすく、曖昧な期待が続くと消耗しやすくなります。',
      '断りやすい線引きがあるほど、近い人との関係も長く続きやすくなります。',
    ],
    loadHi: [
      '合わせが続くと、本音の言語化が遅れ、後からまとめて疲れやすくなります。',
      '見えにくい調整役を引き受けると、自分の意見が後回しになりやすくなります。',
    ],
    loadLo: [
      '距離を取りすぎると、冷たく見られやすく、関係の温度差に負荷を感じやすくなります。',
      '断りが遅れると、小さな依頼が積み上がり、後から整えにくくなります。',
    ],
  },
  structure: {
    tendencyHi: 'やることの順番が見えると動きやすい',
    tendencyLo: '整えてから進むほうが、力が出やすい',
    lifeHi: [
      'やることの順番が見えると動きやすくなります。急に押し切られるより、先に整理する時間があるほうが力が出やすい形です。',
      '段取りが見える場面ほど本来の力が出やすく、見通しが途切れると整え直しに時間を取りやすくなります。',
    ],
    lifeLo: [
      '柔らかく進める場面では場をつなぎやすい一方、段取りが曖昧だと着手が遅れやすくなります。',
      '急な変更より、先に流れを確認できるほうが、日常の判断が安定しやすくなります。',
    ],
    loadHi: [
      '整う前に着手を急かされると、納得より速度が先に立ち、後から戻りにくくなります。',
      '見通しが途切れると、手元の整理に時間を取り、全体のペースが止まりやすくなります。',
    ],
    loadLo: [
      '段取りが曖昧なまま進むと、どこから手を付けるか迷い、着手が遅れやすくなります。',
      '優先順位が見えないと、小さな判断が重なり、疲れが残りやすくなります。',
    ],
  },
};

export function birthDateFromCoreResult(result: CoreResult): string {
  const m = result.lockedAt.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? '';
}

function parseBirthDateParts(birthDate: string): { day: number; month: number; dayBand: DayBand } {
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { day: 15, month: 6, dayBand: 'mid' };
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dayBand: DayBand = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
  return { day, month, dayBand };
}

function buildFreeCopyContext(result: CoreResult): FreeCopyContext {
  const birthDate = birthDateFromCoreResult(result);
  const { day, month, dayBand } = parseBirthDateParts(birthDate);
  return {
    birthDate,
    day,
    month,
    dayBand,
    stemLaneIndex: result.stemLaneIndex,
  };
}

function variantIndex(ctx: FreeCopyContext, axisIndex: number, poolSize: number): number {
  if (poolSize <= 1) return 0;
  return (ctx.day + ctx.month + ctx.stemLaneIndex + axisIndex) % poolSize;
}

function isHighBand(band: AxisBand): boolean {
  return band === 'very-high' || band === 'high';
}

export function coreTraitDisplayFromCoreLabel(coreLabel: string): string {
  const internal = observationTraitNameFromCoreLabel(coreLabel);
  return CORE_TRAIT_DISPLAY_ALIAS[internal] ?? internal;
}

export function coreReadingStyleNoteFromCoreLabel(coreLabel: string): string | null {
  const display = coreTraitDisplayFromCoreLabel(coreLabel);
  return READING_STYLE_NOTES[display] ?? null;
}

export function freeCoreMonthRhythmNote(ctx: FreeCopyContext): string {
  const idx = Math.max(0, Math.min(11, ctx.month - 1));
  return MONTH_RHYTHM_NOTE[idx]!;
}

export type FreeCoreAxisRow = {
  formal: string;
  tendency: string;
  life: string;
  load: string;
};

export function freeCoreAxisRowsForResult(result: CoreResult): FreeCoreAxisRow[] {
  const ctx = buildFreeCopyContext(result);
  const byKey = new Map(result.axisDetails.map((d) => [d.key, d]));
  const dayLead = DAY_BAND_LEAD[ctx.dayBand];

  return AXIS_ORDER.map((key, axisIndex) => {
    const detail = byKey.get(key)!;
    const copy = FREE_AXIS_COPY[key];
    const hi = isHighBand(detail.band);
    const pool = hi ? copy.lifeHi : copy.lifeLo;
    const loadPool = hi ? copy.loadHi : copy.loadLo;
    const vi = variantIndex(ctx, axisIndex, pool.length);
    const lifeCore = pool[vi] ?? pool[0]!;
    const loadCore = loadPool[vi % loadPool.length] ?? loadPool[0]!;

    const life =
      axisIndex === 0
        ? `${dayLead}${lifeCore.charAt(0).toLowerCase()}${lifeCore.slice(1)}`
        : lifeCore;

    return {
      formal: AXIS_FORMAL_JA[key],
      tendency: hi ? copy.tendencyHi : copy.tendencyLo,
      life,
      load: loadCore,
    };
  });
}

export function freeCoreLifestyleTriptych(result: CoreResult): readonly { title: string; body: string }[] {
  const ctx = buildFreeCopyContext(result);
  const stem = ctx.stemLaneIndex;
  const monthNote = freeCoreMonthRhythmNote(ctx);
  const dayNote =
    ctx.dayBand === 'early'
      ? '始める前に短く整える時間を置くと、動き出しがスムーズになりやすいです。'
      : ctx.dayBand === 'mid'
        ? '一度立てた流れを途中で確かめると、疲れがたまりにくくなります。'
        : '終えるものを先に決めてから次へ進むと、戻りやすくなります。';

  const workBodies = [
    '整った流れの中では、理解の深さと丁寧さが信頼につながりやすくなります。結論を急かされないほど、本来の質が出やすいです。',
    '段取りが見える場面ほど力が出やすく、急な変更が続くと整え直しに時間を取りやすくなります。',
    '小さく始めて確かめるほど、手ごたえを得やすく、最初から抱えすぎないほうが安定しやすいです。',
  ];
  const relationBodies = [
    '広く浅く関わるより、信頼できる相手と深くつながるほうが自然です。少人数のほうが負荷がたまりにくいです。',
    '相手の温度を見すぎると本音が後回しになりやすいので、線引きを短く言葉にすると整いやすくなります。',
    '距離感が読みにくい場面では、一度ペースを落として確認するほうが、関係を続けやすくなります。',
  ];
  const closeBodies = [
    '安心できる距離が保てるほど、本来のやさしさや誠実さが出やすくなります。親しい相手との約束や衝突の場面では、落ち着いて言葉を選びやすいです。',
    '近い関係ほど言葉に力が入りやすいので、短く具体に伝えるほうが、誤解が減りやすくなります。',
    '期待を飲み込みすぎないほうが、長く続く関係を保ちやすくなります。',
  ];

  const wi = (stem + ctx.day) % workBodies.length;
  const ri = (stem + ctx.month) % relationBodies.length;
  const ci = (ctx.day + ctx.month) % closeBodies.length;

  return [
    {
      title: '仕事や判断の場面で',
      body: `${workBodies[wi]!} ${monthNote}`,
    },
    {
      title: '人との距離感の中で',
      body: `${relationBodies[ri]!} ${dayNote}`,
    },
    {
      title: '近い関係の中で',
      body: closeBodies[ci]!,
    },
  ] as const;
}

export function freeCoreAlignSteps(result: CoreResult): readonly { phase: string; body: string }[] {
  const ctx = buildFreeCopyContext(result);
  const dominant = result.composition.dominantAxes[0] ?? 'structure';
  const base: Record<AxisKey, readonly [string, string, string]> = {
    socialEnergy: [
      '少人数で整えられる時間を先に置く',
      '初対面が続く予定の前後に、短い余白を確保する',
      '距離を急に広げないよう、返事の速度を一度落とす',
    ],
    stability: [
      '変化の多い日ほど、睡眠と食事のリズムを先に整える',
      '予定が急に変わる前に、一度立ち止まって確認する',
      '小さな違和感を抱えたまま進まないよう、短くメモする',
    ],
    openness: [
      '選択肢を増やす前に、いまの論点を一つに絞る',
      '話題が増えたら、残すものを先に決める',
      '深掘りする時間と、切り替える時間を分ける',
    ],
    cooperation: [
      '合わせる前に、自分の線引きを短く言葉にする',
      '期待を飲み込みそうな場面では、一度保留する',
      '調整役が続く日は、自分の意見を一つだけ先に出す',
    ],
    structure: [
      'やることの順番を先に見える形にする',
      '急な変更が来たら、整え直す時間を短く確保する',
      '完璧を待たず、小さく始めてから整える',
    ],
  };
  const steps = base[dominant] ?? base.structure;
  const offset = ctx.dayBand === 'early' ? 0 : ctx.dayBand === 'mid' ? 1 : 2;
  return [
    { phase: 'まず', body: steps[offset % 3]! },
    { phase: '次に', body: steps[(offset + 1) % 3]! },
    { phase: 'そして', body: steps[(offset + 2) % 3]! },
  ];
}

export function freeCoreObservationBullets(result: CoreResult): string[] {
  const ctx = buildFreeCopyContext(result);
  const rhythm =
    ctx.dayBand === 'early'
      ? '始める前に短く整えると、動き出しがスムーズになりやすいです。'
      : ctx.dayBand === 'late'
        ? '終えるものを先に決めると、次の一歩が軽くなりやすいです。'
        : '途中で一度確かめると、疲れがたまりにくくなります。';
  const fromEngine = [
    result.strengths[0],
    result.strengths[1],
    result.cautions[0],
    rhythm,
    freeCoreMonthRhythmNote(ctx),
  ].filter((s): s is string => Boolean(s?.trim()));
  return fromEngine.slice(0, 5);
}

export function freeCorePersonalizationFingerprint(result: CoreResult): string {
  const axes = freeCoreAxisRowsForResult(result);
  const lifestyle = freeCoreLifestyleTriptych(result);
  const align = freeCoreAlignSteps(result);
  const bullets = freeCoreObservationBullets(result);
  return [
    coreTraitDisplayFromCoreLabel(result.coreLabel),
    coreReadingStyleNoteFromCoreLabel(result.coreLabel) ?? '',
    ...axes.map((r) => `${r.tendency}|${r.life}|${r.load}`),
    ...lifestyle.map((c) => c.body),
    ...align.map((s) => s.body),
    ...bullets,
  ].join('\n');
}
