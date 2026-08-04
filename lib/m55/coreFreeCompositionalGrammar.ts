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
  birthDateHash: number;
  day: number;
  month: number;
  dayBand: DayBand;
  monthBand: number;
  stemLaneIndex: number;
  socialBand: AxisBand;
  cooperationBand: AxisBand;
  opennessBand: AxisBand;
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
  '一度立ち止まるほど、次の動きを選びやすくなります。',
  '短く検討するほど、落ち着きやすくなります。',
  '手元を守るほど、日常に合いやすくなります。',
  '終えたことを確かめてから次へ進むほど、安定しやすくなります。',
];

const DAY_RHYTHM_NOTE: Readonly<Record<DayBand, string>> = {
  early: '始める前に短く整えると、最初の一歩が軽くなりやすいです。',
  mid: '途中で一度確かめると、疲れがたまりにくくなります。',
  late: '終えるものを先に決めると、次の一歩が選びやすくなります。',
};

const MONTH_DAY_TAIL: Readonly<Record<DayBand, string>> = {
  early: '始め方が自然に決まりやすくなります。',
  mid: '途中のペースを保ちやすくなります。',
  late: '区切りを置きやすくなります。',
};

/** 条件 scene → 解決動作（life 文に必ず挿入）。 */
const CONDITIONAL_LIFE_ACTION: Readonly<Record<string, string>> = {
  期待が曖昧になりやすい場: '先に線引きを短く言葉にすると、',
};

const CONDITIONAL_AXIS0_ACTION: Readonly<Record<string, string>> = {
  '期待が曖昧になりやすい場では': '先に線引きを短く言葉にすると、',
};

/** Axis0 openings — と/条件形で dayBand lead と二重「では」を避ける。 */
const LIFE_AXIS0_OPEN: Readonly<Record<AxisKey, { hi: readonly string[]; lo: readonly string[] }>> = {
  socialEnergy: {
    hi: ['初対面が続く日は、少人数で関われるほうが', '会議や雑談が続く日は、余白を先に置くと'],
    lo: ['信頼できる相手との距離を大切にすると', '近い人との関係を深く育てると'],
  },
  stability: {
    hi: ['予定や空気が急に変わる日は', '刺激が続く場では'],
    lo: ['静かな環境を先に整えると', '変化の予告がある流れを保つと'],
  },
  openness: {
    hi: ['選択肢が増える場面では', '話題が次々に増える日は'],
    lo: ['一つの論点に向き合う時間を確保すると', '深く詰める場面では'],
  },
  cooperation: {
    hi: ['合わせが続く場面では', '調整役が求められる日は'],
    lo: ['線引きをはっきり置ける関係では', '期待が曖昧になりやすい場では'],
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

function formatContrastNegative(neg: string): string {
  const n = neg.trim();
  if (n.includes('追いつ') && n.includes('にく')) return '手元の整理が追いつかなくなると';
  if (n.includes('本音')) return '本音が後回しになりすぎると';
  if (n.includes('期待') && n.includes('飲み込')) return '期待を飲み込みすぎると';
  if (n.includes('迷い')) return '迷いが増えると';
  if (n.includes('神経')) return '神経が張り続けると';
  if (n.includes('無理') && n.includes('たま')) return '無理がたまりすぎると';
  if (n.endsWith('やすい')) return n.replace(/やすい$/, 'すぎると');
  if (n.endsWith('にくい')) return n.replace(/にくい$/, 'くなると');
  return `${n}と`;
}

function finishEffect(effect: string): string {
  const trimmed = effect.trim();
  if (trimmed.includes('一方、')) {
    const [positive, negative] = trimmed.split('一方、');
    const pos = positive!.trim();
    const neg = formatContrastNegative(negative!.trim());
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
    const neg = formatContrastNegative(negative!.trim());
    return `、${pos}一方、${neg}疲れが残りやすくなります。`;
  }
  if (trimmed.startsWith('深く関わる')) {
    return '、深く関わる力が出やすくなります。';
  }
  return `、${finishEffect(trimmed)}`;
}

function axis0PositiveFinish(effect: string): string {
  const pos = effect.includes('一方、') ? effect.split('一方、')[0]!.trim() : effect.trim();
  if (pos.endsWith('やすい')) return `${pos.replace(/やすい$/, 'やすく')}なります。`;
  if (pos.endsWith('にくい')) return `${pos.replace(/にくい$/, 'にくく')}なります。`;
  if (pos.startsWith('深く関わる')) return '深く関わる力が出やすくなります。';
  return finishEffect(pos);
}

function finishLoadMain(scene: string, effect: string): string {
  const trimmed = effect.trim();
  if (trimmed.endsWith('たくなる')) {
    return `${scene}、${trimmed.replace(/たくなる$/, 'たくなります')}。`;
  }
  if (trimmed.endsWith('たまる')) {
    return `${scene}、${trimmed.replace(/たまる$/, 'たまりやすくなります')}。`;
  }
  if (trimmed.endsWith('なりやすい')) {
    return `${scene}、${trimmed.replace(/なりやすい$/, 'なりやすくなります')}。`;
  }
  if (trimmed.endsWith('やすい')) {
    return `${scene}、${trimmed.replace(/やすい$/, 'やすく')}なります。`;
  }
  if (trimmed.endsWith('にくい')) {
    return `${scene}、${trimmed.replace(/にくい$/, 'にくく')}なります。`;
  }
  if (trimmed.endsWith('ます') || trimmed.endsWith('です')) {
    return `${scene}、${trimmed}。`;
  }
  return `${scene}、${trimmed}。`;
}

function finishRecoveryLine(recovery: string): string {
  const trimmed = recovery.trim().replace(/。$/, '');
  if (trimmed.endsWith('ます') || trimmed.endsWith('です')) return `${trimmed}。`;
  if (trimmed.endsWith('戻しやすい')) return `${trimmed.replace(/戻しやすい$/, '戻しやすく')}なります。`;
  if (trimmed.endsWith('整えやすい')) return `${trimmed.replace(/整えやすい$/, '整えやすく')}なります。`;
  if (trimmed.endsWith('やすい')) return `${trimmed.replace(/やすい$/, 'やすく')}なります。`;
  return `${trimmed}。`;
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
      return `${embed}${formatContrastNegative(neg)}疲れが残りやすくなります。`;
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
  const action = CONDITIONAL_LIFE_ACTION[scene];
  if (action) {
    return `${scene}では、${action}${finishEffect(effect)}`;
  }
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
  } else if (opening.endsWith('が')) {
    body = `${opening}${axis0PositiveFinish(effect)}`;
  } else if (opening.endsWith('は') || opening.endsWith('では')) {
    const axis0Action = CONDITIONAL_AXIS0_ACTION[opening] ?? '';
    body = `${opening}${axis0Action}${finishEffect(effect)}`;
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
    lo: ['段取りを先に確認できる日', '急な変更が重なる場面'],
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
    hi: ['返事の速度だけが先に走り、無理がたまりやすい', '笑顔のまま疲れが残りやすい'],
    lo: ['様子を見る時間が長くなり、意図と違う距離感に見られやすい', '本音より距離調整に時間がかかりやすい'],
  },
  stability: {
    hi: ['神経が張り続け、夜に疲れが残りやすい', '違和感を抱えたまま進み、後から消耗しやすい'],
    lo: ['整える前に次へ進み、ペースを取り戻しにくい', '安心条件が崩れた感覚が続きやすい'],
  },
  openness: {
    hi: ['比較が続き、着手が遅れやすい', 'どれを残すか決めきれず、疲れが静かにたまりやすい'],
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
  socialEnergy: [
    '短い余白を確保すると、戻しやすくなります',
    '早めに距離を整えると、関係も自分のペースも戻しやすくなります',
  ],
  stability: [
    'リズムを先に整えると、戻しやすくなります',
    '小さな違和感を短くメモすると、整えやすくなります',
  ],
  openness: [
    '論点を一つに絞ると、戻しやすくなります',
    '残すものを先に決めると、整えやすくなります',
  ],
  cooperation: [
    '線引きを短く言葉にすると、戻しやすくなります',
    '一度保留すると、ペースを取り戻しやすくなります',
  ],
  structure: [
    '順番を見える形にすると、戻しやすくなります',
    '整え直す時間を短く確保すると、整えやすくなります',
  ],
};

const SCENE_WORK_LEAD: Readonly<Record<AxisKey, readonly string[]>> = {
  socialEnergy: [
    '必要な場面では前に出やすく、',
    '少人数の場では深く関わりやすく、',
    '初対面が続く日は余白を先に置くと、',
  ],
  stability: [
    '日常のリズムが保てると、',
    '小さな違和感を早めに拾えると、',
    '静かな環境を先に整えると、',
  ],
  openness: [
    '視点を広げられる場面では、',
    '一つの論点に向き合えると、',
    '深く詰める時間があると、',
  ],
  cooperation: [
    '相手の温度を見ながら進めると、',
    '線引きがはっきりしていると、',
    '合わせが続く場面では、',
  ],
  structure: [
    '段取りが見える場面ほど力が出やすく、',
    '整ってから着手できると、',
    '優先順位がはっきりした流れでは、',
  ],
};

const SCENE_WORK_OUTCOME: readonly string[] = [
  '結論を急かされないほど、本来の質が出やすいです。',
  '小さく始めて確かめるほど、手ごたえを得やすいです。',
  '急な変更が続くと、整え直しに時間を取りやすくなります。',
  '最初から抱えすぎないほうが、負荷がたまりにくいです。',
];

const SCENE_RELATION_SOCIAL_HI: readonly string[] = [
  '相手の温度を見すぎると本音が後回しになりやすいので、線引きを短く言葉にすると整えやすくなります。',
  '合わせが続く場面では、一度ペースを落として確認するほうが、関係を続けやすくなります。',
  '初対面が続く予定の前後に、短い余白を確保すると、距離を整えやすくなります。',
];

const SCENE_RELATION_SOCIAL_LO: readonly string[] = [
  '信頼できる相手と深くつながるほうが自然です。少人数のほうが、無理がたまりにくいです。',
  '距離感が読みにくい場面では、短く具体に伝えるほうが、誤解が減りやすいです。',
  '近い人とのやり取りでは、一度区切りを置くほうが、負荷がたまりにくいです。',
];

const SCENE_RELATION_COOP_HI: readonly string[] = [
  '調整役が続く日は、自分の意見を一つだけ先に出すと、負荷を抑えやすくなります。',
  '期待を飲み込みそうな場面では、一度保留すると、ペースを取り戻しやすくなります。',
];

const SCENE_RELATION_COOP_LO: readonly string[] = [
  '線引きをはっきり置ける関係ほど、長く続きやすいです。',
  '合わせる前に、自分の線引きを短く言葉にすると、関係を整えやすくなります。',
];

const SCENE_CLOSE_POOL: readonly string[] = [
  '安心できる距離が保てるほど、やさしさや誠実さが出やすくなります。近い関係ほど、短く具体に伝えるほうが誤解が減りやすいです。',
  '期待を飲み込みすぎないほうが、長く続く関係を保ちやすくなります。',
  '衝突の場面では、落ち着いて言葉を選ぶほうが、あとから振り返っても崩れにくい関係を残しやすいです。',
  '近い人との約束では、一度区切りを置くほうが、負荷がたまりにくいです。',
  '本音を短く言葉にすると、近い関係が続きやすくなります。',
  '小さな違和感を抱えたまま進まないほうが、関係を戻しやすくなります。',
  '相手の温度を確かめてから進むほうが、誤解が減りやすいです。',
  '距離を急に広げないよう、返事の速度を一度落とすと、関係を整えやすくなります。',
  '近い人との時間を先に確保すると、日常が整いやすくなります。',
  '保留を一度置くと、次のやり取りを選びやすくなります。',
];

const RECOVERY_STEP_POOL: Readonly<Record<AxisKey, readonly string[]>> = {
  socialEnergy: [
    '少人数で整えられる時間を先に置く',
    '初対面が続く予定の前後に、短い余白を確保する',
    '距離を急に広げないよう、返事の速度を一度落とす',
    '疲れが見えたら、一度人数を絞る',
    '近い人との時間を先に確保する',
  ],
  stability: [
    '変化の多い日ほど、睡眠と食事のリズムを先に整える',
    '予定が急に変わる前に、一度立ち止まって確認する',
    '小さな違和感を抱えたまま進まないよう、短くメモする',
    '刺激が多い日は、休息を先に置く',
    'ペースを落としてから次へ進む',
  ],
  openness: [
    '選択肢を増やす前に、いまの論点を一つに絞る',
    '話題が増えたら、残すものを先に決める',
    '深掘りする時間と、切り替える時間を分ける',
    '比較が続く前に、残す軸を一つ決める',
    '視点を増やす前に、手元を一つに絞る',
  ],
  cooperation: [
    '合わせる前に、自分の線引きを短く言葉にする',
    '期待を飲み込みそうな場面では、一度保留する',
    '調整役が続く日は、自分の意見を一つだけ先に出す',
    '進める前に、相手へ確認する一文を置く',
    '本音を後回しにしそうな場面では、短く言葉にする',
  ],
  structure: [
    'やることの順番を先に見える形にする',
    '急な変更が来たら、整え直す時間を短く確保する',
    '完璧を待たず、小さく始めてから整える',
    'まず今日やることを一つに絞る',
    '先に終えるものを決める',
    '迷ったら、手元の順番だけ書き出す',
    '進める前に、相手へ確認する一文を置く',
  ],
};

const PAID_HOOK_BY_AXIS: Readonly<Record<AxisKey, string>> = {
  structure:
    'いま見えた輪郭は、プレミアムレポートでは「どこから整えると戻りやすいか」まで、仕事・人間関係・戻し方の中で読み返せます。',
  cooperation:
    'いま見えた輪郭は、プレミアムレポートでは「どこで無理を飲み込みやすいか」まで、仕事・人間関係・戻し方の中で読み返せます。',
  openness:
    'いま見えた輪郭は、プレミアムレポートでは「何を広げて、何を残すか」まで、仕事・人間関係・戻し方の中で読み返せます。',
  stability:
    'いま見えた輪郭は、プレミアムレポートでは「疲れが残りやすい条件と戻し方」まで、仕事・人間関係・戻し方の中で読み返せます。',
  socialEnergy:
    'いま見えた輪郭は、プレミアムレポートでは「人との距離で力が出る場面と疲れやすい条件」まで、仕事・人間関係・戻し方の中で読み返せます。',
};

const CLOSING_SUMMARY_BY_AXIS: Readonly<Record<AxisKey, readonly string[]>> = {
  socialEnergy: [
    '必要な場面で前に出る力があるぶん、予定が詰まると疲れが残りやすい方です。',
    '少人数で深く関われるほど輪郭がはっきりする一方、初対面が続くと無理がたまりやすい方です。',
  ],
  stability: [
    '静かな流れの中では感受性が生きやすい一方、切り替えが急になると疲れが残りやすい方です。',
    '日常のリズムを守る力があるぶん、予定が次々に変わると神経が張り続けやすい方です。',
  ],
  openness: [
    '選択肢を広げる力があるぶん、増えすぎると手元が散らかりやすい方です。',
    '一つの論点に向き合えるほど深さが出やすい一方、比較が続くと迷いが残りやすい方です。',
  ],
  cooperation: [
    '人に合わせる力があるぶん、期待を飲み込みすぎると疲れが残りやすい方です。',
    '場の空気を整える力があるぶん、本音が後ろに回ると負荷がたまりやすい方です。',
  ],
  structure: [
    '順番が見えると判断が安定しやすい一方、段取り前に進むと手元が散らかりやすい方です。',
    '整えてから動く力があるぶん、見通しが途切れるとペースが止まりやすい方です。',
  ],
};

const CLOSING_RECOVERY_BY_AXIS: Readonly<Record<AxisKey, readonly string[]>> = {
  socialEnergy: [
    '短い余白を確保すると、距離もペースも戻しやすくなります。',
    '早めに距離を整えると、関係も自分のペースも戻しやすくなります。',
  ],
  stability: [
    'リズムを先に整えると、戻しやすくなります。',
    '小さな違和感を短くメモすると、整えやすくなります。',
  ],
  openness: [
    '残すものを先に決めると、次に動く場所が見えやすくなります。',
    '論点を一つに絞ると、手元が整いやすくなります。',
  ],
  cooperation: [
    '線引きを短く言葉にすると、戻しやすくなります。',
    '一度保留すると、ペースを取り戻しやすくなります。',
  ],
  structure: [
    '順番を見える形にすると、次に動く場所が見えやすくなります。',
    '整え直す時間を短く確保すると、ペースを取り戻しやすくなります。',
  ],
};

const SUMMARY_LEAD: readonly string[] = [
  'ふだんの輪郭は、プレミアムレポートで読み返す土台になります。',
  'いま見えている傾向は、今の悩みを読み直す手がかりになります。',
  'ここまでの整理は、プレミアムレポートへつながる土台になります。',
];

export function isHighBand(band: AxisBand): boolean {
  return band === 'very-high' || band === 'high';
}

export function birthDateHash(birthDate: string): number {
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 371 + Number(m[2]) * 31 + Number(m[3]);
}

export function selectIndex(ctx: CopySelectContext, salt: number, poolSize: number): number {
  if (poolSize <= 1) return 0;
  const typeNum = Number(ctx.coreType.replace(/\D/g, '')) || 0;
  const secondaryNum = AXIS_ORDER.indexOf(ctx.secondaryAxis);
  const traitSeed = ctx.publicTrait.length;
  const seed =
    ctx.day +
    ctx.month * 3 +
    ctx.stemLaneIndex * 7 +
    salt * 13 +
    typeNum * 17 +
    secondaryNum * 19 +
    ctx.monthBand * 23 +
    traitSeed * 29 +
    (ctx.birthDateHash % 997);
  return ((seed % poolSize) + poolSize) % poolSize;
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
  const byKey = new Map(result.axisDetails.map((d) => [d.key, d]));
  return {
    coreType: result.coreType,
    publicTrait,
    dominantAxis: dominant,
    secondaryAxis: secondary,
    birthDate,
    birthDateHash: birthDateHash(birthDate),
    day,
    month,
    dayBand,
    monthBand: Math.max(0, Math.min(11, month - 1)),
    stemLaneIndex: result.stemLaneIndex,
    socialBand: byKey.get('socialEnergy')?.band ?? 'mid',
    cooperationBand: byKey.get('cooperation')?.band ?? 'mid',
    opennessBand: byKey.get('openness')?.band ?? 'mid',
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
  return `${finishLoadMain(scene, effect)}${finishRecoveryLine(recovery)}`;
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

function composeWorkSceneBody(ctx: CopySelectContext): string {
  const leadPool = SCENE_WORK_LEAD[ctx.dominantAxis] ?? SCENE_WORK_LEAD.structure;
  const lead = leadPool[selectIndex(ctx, 10, leadPool.length)] ?? leadPool[0]!;
  const outcome = SCENE_WORK_OUTCOME[selectIndex(ctx, 11, SCENE_WORK_OUTCOME.length)]!;
  return `${lead}${outcome}`;
}

function composeRelationSceneBody(ctx: CopySelectContext): string {
  const socialPool = isHighBand(ctx.socialBand) ? SCENE_RELATION_SOCIAL_HI : SCENE_RELATION_SOCIAL_LO;
  const coopPool = isHighBand(ctx.cooperationBand) ? SCENE_RELATION_COOP_HI : SCENE_RELATION_COOP_LO;
  const useCoop = selectIndex(ctx, 15, 2) === 0;
  const pool = useCoop ? coopPool : socialPool;
  return pool[selectIndex(ctx, 16 + ctx.month, pool.length)] ?? pool[0]!;
}

function composeCloseSceneBody(ctx: CopySelectContext): string {
  return SCENE_CLOSE_POOL[selectIndex(ctx, 12 + ctx.stemLaneIndex, SCENE_CLOSE_POOL.length)]!;
}

function sceneRhythmTail(ctx: CopySelectContext, target: 0 | 1): string {
  if (target === 0) {
    return MONTH_RHYTHM_NOTE[ctx.monthBand]!.replace(/。$/, '') + '。';
  }
  const altMid = '区切りを一度置くと、ペースを保ちやすくなります。';
  const altLate = '終える順番を先に決めると、次が選びやすくなります。';
  if (ctx.dayBand === 'mid') return altMid;
  if (ctx.dayBand === 'late') return altLate;
  return DAY_RHYTHM_NOTE[ctx.dayBand];
}

export function composeLifestyleTriptych(ctx: CopySelectContext): readonly { title: string; body: string }[] {
  const work = composeWorkSceneBody(ctx);
  const relation = composeRelationSceneBody(ctx);
  const close = composeCloseSceneBody(ctx);
  const tailTarget = selectIndex(ctx, 14, 3);
  const workBody = tailTarget === 0 ? `${work} ${sceneRhythmTail(ctx, 0)}` : work;
  const relationBody = tailTarget === 1 ? `${relation} ${sceneRhythmTail(ctx, 1)}` : relation;
  return [
    { title: '仕事や判断の場面で', body: workBody },
    { title: '人との距離感の中で', body: relationBody },
    { title: '近い関係の中で', body: close },
  ] as const;
}

export function sceneOpeningPair(body: string): string {
  const parts = body.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
  return parts.slice(0, 2).join('');
}

export function composeAlignSteps(ctx: CopySelectContext): readonly { phase: string; body: string }[] {
  const primaryPool = RECOVERY_STEP_POOL[ctx.dominantAxis] ?? RECOVERY_STEP_POOL.structure;
  const secondaryPool = RECOVERY_STEP_POOL[ctx.secondaryAxis] ?? [];
  const picks: string[] = [];

  const pickFrom = (pool: readonly string[], salt: number) => {
    if (pool.length === 0 || picks.length >= 3) return;
    const step = pool[selectIndex(ctx, salt, pool.length)]!;
    if (!picks.includes(step)) picks.push(step);
  };

  pickFrom(primaryPool, 40);
  pickFrom(primaryPool, 41);
  for (let salt = 42; picks.length < 3 && salt < 48; salt++) {
    pickFrom(secondaryPool, salt);
  }
  const merged = [...primaryPool];
  for (const step of secondaryPool) {
    if (!merged.includes(step)) merged.push(step);
  }
  for (let salt = 48; picks.length < 3 && salt < 55; salt++) {
    pickFrom(merged, salt);
  }
  while (picks.length < 3) {
    picks.push(`短く立ち止まって、次の一歩を一つ選ぶ`);
  }
  return [
    { phase: 'まず', body: picks[0]! },
    { phase: '次に', body: picks[1]! },
    { phase: 'そして', body: picks[2]! },
  ];
}

export function composePaidHook(ctx: CopySelectContext): string {
  return PAID_HOOK_BY_AXIS[ctx.dominantAxis] ?? PAID_HOOK_BY_AXIS.structure;
}

export function composeClosingSummary(ctx: CopySelectContext): { line1: string; line2: string } {
  const summaryPool = CLOSING_SUMMARY_BY_AXIS[ctx.dominantAxis] ?? CLOSING_SUMMARY_BY_AXIS.structure;
  const recoveryPool = CLOSING_RECOVERY_BY_AXIS[ctx.dominantAxis] ?? CLOSING_RECOVERY_BY_AXIS.structure;
  const line1 = summaryPool[selectIndex(ctx, 60, summaryPool.length)]!;
  const line2 = recoveryPool[selectIndex(ctx, 61, recoveryPool.length)]!;
  return { line1, line2 };
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
