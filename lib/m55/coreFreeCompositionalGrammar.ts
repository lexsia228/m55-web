/**
 * /core free compositional copy grammar — small slot parts + selectors.
 * No per-trait full essays; DOB / axis / band combinations produce variation.
 */
import { AXIS_ORDER } from './coreResult/axisMeta';
import type { AxisBand, AxisKey, CoreResult } from './coreResult/types';

export type DayBand = 'early' | 'mid' | 'late';

export type CopySelectContext = {
  coreType: string;
  publicTrait: string;
  dominantAxis: AxisKey;
  secondaryAxis: AxisKey;
  birthDate: string;
  day: number;
  month: number;
  dayBand: DayBand;
  monthBand: number;
  stemLaneIndex: number;
};

const DAY_BAND_LEAD: Readonly<Record<DayBand, string>> = {
  early: '月初めに近い生まれでは、',
  mid: '月の中頃の生まれでは、',
  late: '月の後半に近い生まれでは、',
};

/** Short trait micro-inserts (phrase-level, not full paragraphs). */
const TRAIT_MICRO: Readonly<Record<string, string>> = {
  TYPE_01: '意味の層まで確かめると',
  TYPE_02: '相手の温度を受け取りながら',
  TYPE_03: '順番が見えると',
  TYPE_04: '落ち着いて分解すると',
  TYPE_05: '場の空気を整えながら',
  TYPE_06: '全体像が先に見えると',
  TYPE_07: '根っこまで確かめると',
  TYPE_08: '小さく動いて流れを作ると',
  TYPE_09: '距離と言葉を読むと',
  TYPE_10: '全体をつなげて整えると',
};

const MONTH_RHYTHM_NOTE: readonly string[] = [
  '始める前に手元を整えるほど、力が出やすくなります。',
  '体のリズムを守るほど、日常が安定しやすくなります。',
  '小さく試して確かめるほど、手ごたえを得やすくなります。',
  '立てた流れを続けるほど、扱いやすくなります。',
  '休息を先に置くほど、長く続きやすくなります。',
  '範囲を絞ってから動くほど、無理がたまりにくくなります。',
  '切り替えをはっきり置くほど、整えやすくなります。',
  'ペースを落として確認するほど、戻しやすくなります。',
  '一度立ち止まるほど、読み返しやすくなります。',
  '短く検討するほど、落ち着きやすくなります。',
  '手元を守るほど、日常に合いやすくなります。',
  '終えたことを確かめてから次へ進むほど、安定しやすくなります。',
];

const DAY_RHYTHM_NOTE: Readonly<Record<DayBand, string>> = {
  early: '始める前に短く整えると、動き出しがスムーズになりやすいです。',
  mid: '途中で一度確かめると、疲れがたまりにくくなります。',
  late: '終えるものを先に決めると、次の一歩が軽くなりやすいです。',
};

const MONTH_DAY_TAIL: Readonly<Record<DayBand, string>> = {
  early: '始め方にも合いやすくなります。',
  mid: '途中のペースにも合いやすくなります。',
  late: '区切りにも合いやすくなります。',
};

/** Axis0 openings — と/条件形で dayBand lead と二重「では」を避ける。 */
const LIFE_AXIS0_OPEN: Readonly<Record<AxisKey, { hi: readonly string[]; lo: readonly string[] }>> = {
  socialEnergy: {
    hi: ['初対面が続く場面では少人数を選ぶと', '会議や雑談が続く日は余白を先に置くと'],
    lo: ['信頼できる相手との距離を大切にすると', '近い人との関係を深く育てると'],
  },
  stability: {
    hi: ['予定や空気が急に変わる日は', '刺激が続く場では早めに整えると'],
    lo: ['静かな環境を先に整えると', '変化の予告がある流れを保つと'],
  },
  openness: {
    hi: ['選択肢が増える場面では', '話題が次々に増える日は'],
    lo: ['一つの論点に向き合う時間を確保すると', '深く詰める場面では'],
  },
  cooperation: {
    hi: ['合わせが続く場面では', '調整役が求められる日は'],
    lo: ['線引きをはっきり置ける関係を選ぶと', '期待が曖昧になりやすい場では'],
  },
  structure: {
    hi: ['段取りが見える場面では', '優先順位がはっきりした流れでは'],
    lo: ['整えてから着手すると', '急な変更が重なる場面では'],
  },
};

function traitEmbedLead(traitMicro: string): string {
  if (traitMicro.endsWith('ながら')) {
    return traitMicro.replace(/ながら$/, 'やすいぶん、');
  }
  const toHodo: Readonly<Record<string, string>> = {
    '順番が見えると': '順番を先に置くほど',
    '全体をつなげて整えると': '全体をつなげて整えるほど',
    '意味の層まで確かめると': '意味の層まで確かめるほど',
    '落ち着いて分解すると': '落ち着いて分解するほど',
    '全体像が先に見えると': '全体像を先に置くほど',
    '根っこまで確かめると': '根っこまで確かめるほど',
    '小さく動いて流れを作ると': '小さく動いて流れを作るほど',
    '距離と言葉を読むと': '距離と言葉を読むほど',
  };
  return toHodo[traitMicro] ?? traitMicro.replace(/と$/, 'ほど');
}

function finishEffect(effect: string): string {
  const trimmed = effect.trim();
  if (trimmed.includes('一方、')) {
    const [positive, negative] = trimmed.split('一方、');
    const pos = positive!.trim();
    const neg = negative!.trim().replace(/やすい$/, 'すぎると').replace(/にくい$/, 'すぎると');
    return `${pos}一方、${neg}疲れが残りやすくなります。`;
  }
  if (trimmed.endsWith('やすい')) return `${trimmed.replace(/やすい$/, 'やすく')}なります。`;
  if (trimmed.endsWith('にくい')) return `${trimmed.replace(/にくい$/, 'にくく')}なります。`;
  return `${trimmed}。`;
}

function finishAxis0Tail(effect: string): string {
  const trimmed = effect.trim();
  if (trimmed.includes('一方、')) {
    const [positive, negative] = trimmed.split('一方、');
    const pos = positive!.trim();
    const neg = negative!.trim().replace(/やすい$/, 'すぎると').replace(/にくい$/, 'すぎると');
    return `、${pos}一方、${neg}疲れが残りやすくなります。`;
  }
  if (trimmed.startsWith('深く関わる')) {
    return '、深く関わる力が出やすくなります。';
  }
  return `、${finishEffect(trimmed)}`;
}

function weaveTraitLife(scene: string, effect: string, traitMicro: string): string {
  const embed = traitEmbedLead(traitMicro);
  if (traitMicro.endsWith('ながら')) {
    if (effect.includes('一方、')) {
      const [, negative] = effect.split('一方、');
      const neg = negative!.trim();
      if (neg.includes('期待') || neg.includes('本音')) {
        return `${embed}期待を飲み込みすぎると、疲れが残りやすくなります。`;
      }
      return `${embed}${neg.replace(/やすい$/, 'すぎると')}疲れが残りやすくなります。`;
    }
    return `${scene}では、${embed}${finishEffect(effect)}`;
  }
  const outcome = effect.includes('一方、') ? effect.split('一方、')[0]!.trim() : effect.trim();
  const tail = outcome
    .replace(/本来の力が出やすい$/, '本来の力が出やすくなります。')
    .replace(/力が出やすい$/, '力が出やすくなります。')
    .replace(/動きやすい$/, '動きやすくなります。')
    .replace(/整いやすい$/, '整いやすくなります。')
    .replace(/出やすい$/, '出やすくなります。');
  return `${scene}では、${embed}${tail.endsWith('。') ? tail : `${tail}。`}`;
}

function monthRhythmWithDayBand(ctx: CopySelectContext): string {
  const base = MONTH_RHYTHM_NOTE[ctx.monthBand]!;
  const tail = MONTH_DAY_TAIL[ctx.dayBand];
  return `${base.replace(/。$/, '')}。${tail}`;
}

function composeLifeCore(scene: string, effect: string, traitMicro?: string): string {
  if (traitMicro) return weaveTraitLife(scene, effect, traitMicro);
  return `${scene}では、${finishEffect(effect)}`;
}

function composeAxis0Life(ctx: CopySelectContext, axisKey: AxisKey, hi: boolean): string {
  const openPool = LIFE_AXIS0_OPEN[axisKey][hi ? 'hi' : 'lo'];
  const effectPool = LIFE_EFFECT[axisKey][hi ? 'hi' : 'lo'];
  const scenePool = LIFE_SCENE[axisKey][hi ? 'hi' : 'lo'];
  const oi = selectIndex(ctx, 1, openPool.length);
  const ei = selectIndex(ctx, 2, effectPool.length);
  const opening = openPool[oi] ?? openPool[0]!;
  const effect = effectPool[ei] ?? effectPool[0]!;
  const traitMicro = axisKey === ctx.dominantAxis ? TRAIT_MICRO[ctx.coreType] : undefined;

  let body: string;
  if (traitMicro) {
    const scene = scenePool[selectIndex(ctx, 4, scenePool.length)] ?? scenePool[0]!;
    body = weaveTraitLife(scene, effect, traitMicro);
  } else if (opening.endsWith('と')) {
    body = `${opening}${finishAxis0Tail(effect)}`;
  } else if (opening.endsWith('は') || opening.endsWith('では')) {
    body = `${opening}、${finishEffect(effect)}`;
  } else {
    body = `${opening}${finishEffect(effect)}`;
  }

  return `${DAY_BAND_LEAD[ctx.dayBand]}${body.charAt(0).toLowerCase()}${body.slice(1)}${monthRhythmWithDayBand(ctx)}`;
}

/** Tendency hook slots — axis × band only. */
const TENDENCY_SLOT: Readonly<Record<AxisKey, { hi: readonly string[]; lo: readonly string[] }>> = {
  socialEnergy: {
    hi: ['必要な場面では自然に前に出やすい', '人との距離を選びながら、場に合わせて動きやすい'],
    lo: ['近い関係を深く育てるほうが、力が出やすい', '少人数のほうが、自分らしさが出やすい'],
  },
  stability: {
    hi: ['小さな変化や違和感に、早めに気づきやすい', '空気の温度差を、先に拾いやすい'],
    lo: ['急な揺れより、日常の温度差に敏感になりやすい', '静かな環境ほど、判断が安定しやすい'],
  },
  openness: {
    hi: ['別の可能性を見つけるほうが自然', '視点を増やしながら、手元を整理しやすい'],
    lo: ['一つの見方を深く確かめるほうが自然', '守りの視点で、現実的に詰めやすい'],
  },
  cooperation: {
    hi: ['相手の温度を見ながら、関係を保ちやすい', '場の空気に合わせながら、距離を整えやすい'],
    lo: ['自分の線引きが見えているほうが、関係を整えやすい', 'はっきりした距離感のほうが、負荷を抑えやすい'],
  },
  structure: {
    hi: ['段取りが見えると、動きやすい', '優先順位がはっきりすると、力が出やすい'],
    lo: ['整えてから進むほうが、力が出やすい', '流れを確認してから着手すると、安定しやすい'],
  },
};

/** Life scene + effect slots — composed at runtime. */
const LIFE_SCENE: Readonly<Record<AxisKey, { hi: readonly string[]; lo: readonly string[] }>> = {
  socialEnergy: {
    hi: ['初対面が続く場', '会議や雑談が続く日'],
    lo: ['近い人との関係', '信頼できる相手との距離'],
  },
  stability: {
    hi: ['予定や空気が急に変わる日', '刺激が続く場'],
    lo: ['静かな環境', '変化の予告がある流れ'],
  },
  openness: {
    hi: ['選択肢が増える場面', '話題が次々に増える日'],
    lo: ['一つの論点に向き合う時間', '深く詰める場面'],
  },
  cooperation: {
    hi: ['合わせが続く場面', '調整役が求められる日'],
    lo: ['線引きをはっきり置ける関係', '期待が曖昧になりやすい場'],
  },
  structure: {
    hi: ['段取りが見える場面', '優先順位がはっきりした流れ'],
    lo: ['段取りが曖昧なまま進む日', '急な変更が重なる場面'],
  },
};

const LIFE_EFFECT: Readonly<Record<AxisKey, { hi: readonly string[]; lo: readonly string[] }>> = {
  socialEnergy: {
    hi: ['自分らしさが出やすい一方、無理がたまりやすい', '力が出やすい一方、余白が削られやすい'],
    lo: ['深く関わるほど力が出やすい', '日常が整いやすい'],
  },
  stability: {
    hi: ['早めに整えを取りにいける一方、刺激が続くと疲れが残りやすい', '違和感に気づきやすい一方、神経が張り続けやすい'],
    lo: ['自分のペースを保ちやすい', '判断の速度が落ちにくい'],
  },
  openness: {
    hi: ['視点を広げやすい一方、手元の整理が追いつきにくい', '可能性を見つけやすい一方、迷いが増えやすい'],
    lo: ['輪郭がはっきりしやすい', '焦点が定まりやすい'],
  },
  cooperation: {
    hi: ['関係を保ちやすい一方、本音が後回しになりやすい', '場を整えやすい一方、期待を飲み込みやすい'],
    lo: ['負荷を抑えやすい', '関係を長く続けやすい'],
  },
  structure: {
    hi: ['本来の力が出やすい', '動きやすい一方、見通しが途切れると整え直しに時間を取りやすい'],
    lo: ['着手前に整えやすい', '日常の判断が安定しやすい'],
  },
};

const LOAD_SCENE: Readonly<Record<AxisKey, { hi: readonly string[]; lo: readonly string[] }>> = {
  socialEnergy: {
    hi: ['予定が詰まるほど', '初対面が続くと'],
    lo: ['急に距離を求められると', '初動の自己開示が遅れると'],
  },
  stability: {
    hi: ['予定が次々に変わると', '刺激が多い場では'],
    lo: ['急な変更が重なると', '変化の予告がないと'],
  },
  openness: {
    hi: ['選択肢が増えすぎると', '話題が次々に増えると'],
    lo: ['新しい打ち手を急かされると', '情報が拡散すると'],
  },
  cooperation: {
    hi: ['合わせが続くと', '見えにくい調整役を引き受けると'],
    lo: ['距離を取りすぎると', '断りが遅れると'],
  },
  structure: {
    hi: ['整う前に着手を急かされると', '見通しが途切れると'],
    lo: ['段取りが曖昧なまま進むと', '優先順位が見えないと'],
  },
};

const LOAD_EFFECT: Readonly<Record<AxisKey, { hi: readonly string[]; lo: readonly string[] }>> = {
  socialEnergy: {
    hi: ['返事の速度だけが先に走り、無理がたまりやすい', '笑顔のまま疲れが残り、早めに距離を整えたくなる'],
    lo: ['様子を見る時間が長くなり、意図と違う距離感に見られやすい', '本音より距離調整に時間がかかりやすい'],
  },
  stability: {
    hi: ['神経が張り続け、夜に疲れが残りやすい', '違和感を抱えたまま進み、後から消耗しやすい'],
    lo: ['整える前に次へ進み、ペースを取り戻しにくい', '安心条件が崩れた感覚が続きやすい'],
  },
  openness: {
    hi: ['比較が続き、着手が遅れやすい', 'どれを残すか決めきれず、疲れが静かにたまる'],
    lo: ['納得より速度が先に立ち、後から戻りにくい', '自分の軸が見えにくく、判断が重く感じられやすい'],
  },
  cooperation: {
    hi: ['本音の言語化が遅れ、後からまとめて疲れやすい', '自分の意見が後回しになりやすい'],
    lo: ['冷たく見られやすく、関係の温度差に負荷を感じやすい', '小さな依頼が積み上がり、後から整えにくい'],
  },
  structure: {
    hi: ['納得より速度が先に立ち、後から戻りにくい', '手元の整理に時間を取り、全体のペースが止まりやすい'],
    lo: ['どこから手を付けるか迷い、着手が遅れやすい', '小さな判断が重なり、疲れが残りやすい'],
  },
};

const RECOVERY_MICRO: Readonly<Record<AxisKey, readonly string[]>> = {
  socialEnergy: ['短い余白を確保すると戻しやすい', '距離を一度整えると、読み返しやすい'],
  stability: ['リズムを先に整えると、戻しやすい', '小さな違和感を短くメモすると、整えやすい'],
  openness: ['論点を一つに絞ると、戻しやすい', '残すものを先に決めると、整えやすい'],
  cooperation: ['線引きを短く言葉にすると、戻しやすい', '一度保留すると、読み返しやすい'],
  structure: ['順番を見える形にすると、戻しやすい', '整え直す時間を短く確保すると、整えやすい'],
};

const SCENE_WORK: readonly string[] = [
  '整った流れの中では、丁寧さが信頼につながりやすくなります。結論を急かされないほど、本来の質が出やすいです。',
  '段取りが見える場面ほど力が出やすく、急な変更が続くと整え直しに時間を取りやすくなります。',
  '小さく始めて確かめるほど手ごたえを得やすく、最初から抱えすぎないほうが安定しやすいです。',
];

const SCENE_RELATION: readonly string[] = [
  '信頼できる相手と深くつながるほうが自然です。少人数のほうが、無理がたまりにくいです。',
  '相手の温度を見すぎると本音が後回しになりやすいので、線引きを短く言葉にすると整えやすくなります。',
  '距離感が読みにくい場面では、一度ペースを落として確認するほうが、関係を続けやすくなります。',
];

const SCENE_CLOSE: readonly string[] = [
  '安心できる距離が保てるほど、やさしさや誠実さが出やすくなります。近い関係ほど、短く具体に伝えるほうが誤解が減りやすいです。',
  '期待を飲み込みすぎないほうが、長く続く関係を保ちやすくなります。',
  '衝突の場面では、落ち着いて言葉を選ぶほうが、読み返しやすい関係を残しやすいです。',
];

const RECOVERY_STEP: Readonly<Record<AxisKey, readonly [string, string, string]>> = {
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

const SUMMARY_LEAD: readonly string[] = [
  'ふだんの輪郭は、保存版で読み返す土台になります。',
  'いま見えている傾向は、今の悩みを読み直す入口になります。',
  'ここまでの整理は、4章の保存版へつながる入口です。',
];

export function isHighBand(band: AxisBand): boolean {
  return band === 'very-high' || band === 'high';
}

export function selectIndex(ctx: CopySelectContext, salt: number, poolSize: number): number {
  if (poolSize <= 1) return 0;
  const typeNum = Number(ctx.coreType.replace(/\D/g, '')) || 0;
  return (ctx.day + ctx.month + ctx.stemLaneIndex + salt + typeNum) % poolSize;
}

export function buildCopySelectContext(
  result: CoreResult,
  birthDate: string,
  publicTrait: string,
): CopySelectContext {
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const month = m ? Number(m[2]) : 6;
  const day = m ? Number(m[3]) : 15;
  const dayBand: DayBand = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
  const dominant = result.composition.dominantAxes[0] ?? 'structure';
  const secondary = result.composition.dominantAxes[1] ?? result.composition.secondaryAxes[0] ?? 'cooperation';
  return {
    coreType: result.coreType,
    publicTrait,
    dominantAxis: dominant,
    secondaryAxis: secondary,
    birthDate,
    day,
    month,
    dayBand,
    monthBand: Math.max(0, Math.min(11, month - 1)),
    stemLaneIndex: result.stemLaneIndex,
  };
}

function composeLifeLine(
  ctx: CopySelectContext,
  axisKey: AxisKey,
  axisIndex: number,
  hi: boolean,
): string {
  if (axisIndex === 0) {
    return composeAxis0Life(ctx, axisKey, hi);
  }

  const scenePool = LIFE_SCENE[axisKey][hi ? 'hi' : 'lo'];
  const effectPool = LIFE_EFFECT[axisKey][hi ? 'hi' : 'lo'];
  const si = selectIndex(ctx, axisIndex * 3 + 1, scenePool.length);
  const ei = selectIndex(ctx, axisIndex * 3 + 2, effectPool.length);
  const scene = scenePool[si] ?? scenePool[0]!;
  const effect = effectPool[ei] ?? effectPool[0]!;
  const traitMicro = axisKey === ctx.dominantAxis ? TRAIT_MICRO[ctx.coreType] : undefined;
  let line = composeLifeCore(scene, effect, traitMicro);
  if (axisIndex === (ctx.month + ctx.stemLaneIndex) % 5) {
    line = `${line}${DAY_RHYTHM_NOTE[ctx.dayBand]}`;
  }
  return line;
}

function composeLoadLine(ctx: CopySelectContext, axisKey: AxisKey, axisIndex: number, hi: boolean): string {
  const scenePool = LOAD_SCENE[axisKey][hi ? 'hi' : 'lo'];
  const effectPool = LOAD_EFFECT[axisKey][hi ? 'hi' : 'lo'];
  const recoveryPool = RECOVERY_MICRO[axisKey];
  const si = selectIndex(ctx, axisIndex * 5 + 3, scenePool.length);
  const ei = selectIndex(ctx, axisIndex * 5 + 4, effectPool.length);
  const ri = selectIndex(ctx, axisIndex + ctx.month, recoveryPool.length);
  const scene = scenePool[si] ?? scenePool[0]!;
  const effect = effectPool[ei] ?? effectPool[0]!;
  const recovery = recoveryPool[ri] ?? recoveryPool[0]!;
  return `${scene}、${effect}。${recovery}。`;
}

function composeTendencyLine(ctx: CopySelectContext, axisKey: AxisKey, axisIndex: number, hi: boolean): string {
  const pool = TENDENCY_SLOT[axisKey][hi ? 'hi' : 'lo'];
  const base = pool[selectIndex(ctx, axisIndex, pool.length)] ?? pool[0]!;
  if (axisIndex !== 0 || ctx.dominantAxis !== axisKey) return base;
  const traitLead = TRAIT_MICRO[ctx.coreType];
  return traitLead ? `${traitLead}、${base}` : base;
}

export type GrammarAxisRow = {
  formal: string;
  tendency: string;
  life: string;
  load: string;
};

export function composeAxisRows(
  ctx: CopySelectContext,
  axisDetails: CoreResult['axisDetails'],
  formalLabels: Record<AxisKey, string>,
): GrammarAxisRow[] {
  const byKey = new Map(axisDetails.map((d) => [d.key, d]));
  return AXIS_ORDER.map((key, axisIndex) => {
    const detail = byKey.get(key)!;
    const hi = isHighBand(detail.band);
    return {
      formal: formalLabels[key],
      tendency: composeTendencyLine(ctx, key, axisIndex, hi),
      life: composeLifeLine(ctx, key, axisIndex, hi),
      load: composeLoadLine(ctx, key, axisIndex, hi),
    };
  });
}

export function composeLifestyleTriptych(ctx: CopySelectContext): readonly { title: string; body: string }[] {
  const monthNote = MONTH_RHYTHM_NOTE[ctx.monthBand]!;
  const dayNote = DAY_RHYTHM_NOTE[ctx.dayBand];
  const wi = selectIndex(ctx, 10, SCENE_WORK.length);
  const ri = selectIndex(ctx, 11 + ctx.month, SCENE_RELATION.length);
  const ci = selectIndex(ctx, 12 + ctx.day, SCENE_CLOSE.length);
  return [
    {
      title: '仕事や判断の場面で',
      body: `${SCENE_WORK[wi]!} ${monthNote}`,
    },
    {
      title: '人との距離感の中で',
      body: `${SCENE_RELATION[ri]!} ${dayNote}`,
    },
    {
      title: '近い関係の中で',
      body: SCENE_CLOSE[ci]!,
    },
  ] as const;
}

export function composeAlignSteps(ctx: CopySelectContext): readonly { phase: string; body: string }[] {
  const steps = RECOVERY_STEP[ctx.dominantAxis] ?? RECOVERY_STEP.structure;
  const offset = ctx.dayBand === 'early' ? 0 : ctx.dayBand === 'mid' ? 1 : 2;
  return [
    { phase: 'まず', body: steps[offset % 3]! },
    { phase: '次に', body: steps[(offset + 1) % 3]! },
    { phase: 'そして', body: steps[(offset + 2) % 3]! },
  ];
}

export function composeObservationBullets(
  ctx: CopySelectContext,
  result: CoreResult,
): string[] {
  const rhythm = DAY_RHYTHM_NOTE[ctx.dayBand];
  const summaryLead = SUMMARY_LEAD[selectIndex(ctx, 20, SUMMARY_LEAD.length)]!;
  const fromEngine = [
    result.strengths[0],
    result.strengths[1],
    result.cautions[0],
    rhythm,
    summaryLead,
  ].filter((s): s is string => Boolean(s?.trim()));
  return fromEngine.slice(0, 5);
}

export function monthRhythmNoteForContext(ctx: CopySelectContext): string {
  return monthRhythmWithDayBand(ctx);
}
