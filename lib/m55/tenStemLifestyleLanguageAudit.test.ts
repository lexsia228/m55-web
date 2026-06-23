import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { ENGINE_VERSION_V2 } from './compositeStem/constants';
import { TYPE_CATALOG, typeIndexFromStemLane } from './coreResult/typeCatalog';
import {
  compositionStructureVizForStem,
  essenceStabilityVizForStem,
  identityDesignVizForStem,
  runDtrEngine,
} from './dtrEngine';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';
import {
  PAID_DTR_CHAPTER_GRAPH_CAPTIONS,
  PAID_DTR_DRAWER_SECTION_DISPLAY_TITLE_BY_ID,
} from './paidDtrProductCopy';

const LOCKED_PUBLIC_TITLES = [
  'プレジデント',
  'プランナー',
  'インフルエンサー',
  'クリエイター',
  'マネージャー',
  'プロデューサー',
  'エグゼキューター',
  'デザイナー',
  'グローバルリーダー',
  'アナリスト',
] as const;

/** stem1 / Ⅱ章「仕事・これからの進め方」— Phase2 business-org tone removal (display copy only). */
const CH2_PHASE2_STEM1_FORBIDDEN_TERMS = [
  '接続と調整の能力',
  '合意より先に',
  '短い打ち返し',
  '中間確認',
  '舵取りのない集団',
  '優先を言語化',
  '関わり方の更新',
] as const;

/** stem1 / Ⅰ章 composition structure viz — Phase2 residual lifestyle copy (display copy only). */
const CH1_PHASE2_STEM1_COMPOSITION_VIZ_FORBIDDEN_TERMS = [
  '感受が関わりとして',
  '安定が土台',
  '適応が過剰',
  '置き去りになります',
] as const;

const CH1_PHASE2_STEM1_COMPOSITION_VIZ_REQUIRED_TERMS = [
  '場の空気を感じ取る力',
  '合わせすぎて、気づかないうちに自分の気持ち',
] as const;

const CH1_OPTIONAL_FINAL_STEM1_PATTERN_CAPTION_FORBIDDEN_TERMS = [
  'ことが大切です',
] as const;

const CH1_OPTIONAL_FINAL_STEM1_PATTERN_CAPTION_REQUIRED_TERMS = [
  '自分はここにいる',
  '短く確かめるだけで戻りやすくなります',
] as const;

const FORBIDDEN_TERMS = [
  '業務',
  'ステークホルダー',
  'PM',
  'プロジェクト型',
  '全体最適',
  '個別最適',
  '整流',
  '決裁',
  '権限',
  '報告',
  '少数精鋭',
  '品質管理',
  'コンテンツ制作',
  '専門性',
  '説明責任',
  '合意形成',
  '改善サイクル',
  'ボトルネック',
  'KPI',
  '戦略',
  '職能',
  '会議',
  '実務',
] as const;

const RESIDUAL_OLD_TONE_TERMS = [
  '傾向が重なる様子',
  'ハブ調整型',
  '流量を調整',
  '関わり方の命名',
  '安定のスイッチ',
  '依存関係の形成',
  '決断の遅さ',
  'スピードが必要な場面',
  '後手に回る',
  '話し合いが空転',
  '誰が何を決めれば良いか',
] as const;

const HARD_ABSTRACT_TERMS = [
  '構造として言語化',
  '意味を輸送',
  '正統派',
  '射程',
  '取り組み単位',
  '品質基準',
  '判断軸',
  '再現性',
  'レビュー',
  '締め切り',
  '打ち合わせ',
  '越境',
] as const;

const OCCUPATIONAL_TECHNICAL_TERMS = [
  '状況モデル',
  '長期取り組み',
  '品質の均一化',
  '品質保証',
  'ブランド',
  '後工程',
  '成果物',
  '四半期単位',
  '仕様',
  '体系',
  '指標',
] as const;

const TEXT_QUALITY_MICRO_REGRESSION_PATTERNS: readonly { label: string; pattern: RegExp }[] = [
  { label: '重なるところは〜重なります', pattern: /重なるところは、.*重なります/ },
  { label: '柔らかい思考', pattern: /柔らかい思考/ },
  { label: '場所・関係を支える安定感', pattern: /場所・関係を支える安定感/ },
] as const;

const GRAMMAR_REGRESSION_PATTERNS: readonly { label: string; pattern: RegExp }[] = [
  { label: 'つなぐできる', pattern: /つなぐできる/ },
  { label: 'つなぐする', pattern: /つなぐする/ },
  { label: '区切り明確', pattern: /区切り明確/ },
  { label: '原因を何が', pattern: /原因を何が/ },
  { label: 'するできる', pattern: /するできる/ },
  { label: 'するすること', pattern: /するすること/ },
  { label: 'ことする', pattern: /ことする/ },
  { label: 'ことできる', pattern: /ことできる/ },
  { label: 'としてとして', pattern: /としてとして/ },
  { label: 'のの', pattern: /(?<!も)のの(?![ぁ-ん])/ },
  { label: '言葉で説明できるできる', pattern: /言葉で説明できるできる/ },
  { label: '言葉にするできる', pattern: /言葉にするできる/ },
  { label: 'になるでき', pattern: /になるでき/ },
  { label: '言葉になるでき', pattern: /言葉になるでき/ },
  { label: 'が言葉になるでき', pattern: /が言葉になるでき/ },
] as const;

const HARD_ENDING_PATTERNS: readonly { label: string; pattern: RegExp }[] = [
  { label: 'することができます', pattern: /することができます/ },
  { label: '行う', pattern: /行う/ },
  { label: 'に対して', pattern: /に対して/ },
  { label: 'における', pattern: /における/ },
  { label: 'として機能', pattern: /として機能/ },
  { label: 'を実現', pattern: /を実現/ },
  { label: 'を担う', pattern: /を担う/ },
  { label: 'に寄与', pattern: /に寄与/ },
  { label: 'を促進', pattern: /を促進/ },
  { label: '最適化', pattern: /最適化/ },
] as const;

const CAUTION_TERMS = [
  '仕事',
  '役割',
  '評価',
  '環境',
  '現場',
  '分析',
  '検証',
  'データ',
  '判断',
  '方針',
  '提案',
  '運用',
  '管理',
  '設計',
  '構造',
  'モデル',
] as const;

const POSITIVE_LIFESTYLE_TERMS = [
  '自分',
  'あなた',
  '日々',
  '毎日',
  '暮らし',
  '近い人',
  '距離',
  '疲れ',
  '消耗',
  '余白',
  '休む',
  '整える',
  '戻す',
  '迷う',
  '感じる',
  '気づく',
  '見直す',
  '話す',
  '続ける',
  '関わり方',
  '歩幅',
  '手ごたえ',
  '安心',
  'ひとり時間',
  '小さな変化',
  '抱えすぎる',
  '受け渡し',
  '向き合う',
  'ほどく',
  '自分の扱い方',
] as const;

const MIN_POSITIVE_SIGNALS_PER_LANE = 3;

const CONTEXT_TRIGGER_RULES: readonly { label: string; pattern: RegExp }[] = [
  { label: '仕事+評価', pattern: /仕事.{0,24}評価|評価.{0,24}仕事/ },
  { label: '仕事+成果', pattern: /仕事.{0,24}成果|成果.{0,24}仕事/ },
  { label: '役割+責任', pattern: /役割.{0,24}責任|責任.{0,24}役割/ },
  { label: '管理+品質', pattern: /管理.{0,24}品質|品質.{0,24}管理/ },
  { label: '運用+設計', pattern: /運用.{0,24}設計|設計.{0,24}運用/ },
  { label: '現場+改善', pattern: /現場.{0,24}改善|改善.{0,24}現場/ },
  { label: '判断+軸', pattern: /判断.{0,8}軸|軸.{0,8}判断/ },
  { label: 'データ+検証', pattern: /データ.{0,24}検証|検証.{0,24}データ/ },
  { label: 'モデル+構造', pattern: /モデル.{0,24}構造|構造.{0,24}モデル/ },
  { label: 'ブランド+品質', pattern: /ブランド.{0,24}品質|品質.{0,24}ブランド/ },
  { label: '締め切り+成果物', pattern: /締め切り.{0,24}成果物|成果物.{0,24}締め切り|区切り.{0,24}成果物/ },
] as const;

type CautionAllowRule = {
  term: (typeof CAUTION_TERMS)[number];
  pattern: RegExp;
  reason: string;
};

const CAUTION_ALLOWLIST: readonly CautionAllowRule[] = [
  {
    term: '判断',
    pattern:
      /判断が前に進|判断が宙に浮|判断が固ま|判断が遅|判断が求め|判断を促|感情に流されずに判断|今できる最善の判断|洞察が判断|判断に接続|判断に時間|判断を保留|判断を支配|判断を出せ|判断を苦手|判断を先に|判断の言語化|自分の判断/,
    reason: '自分の決め方・迷いの生活語',
  },
  {
    term: '分析',
    pattern: /静観分析型|focusPool|読み直し|読み解/,
    reason: '観測特性ラベルまたは読み直し文脈',
  },
  {
    term: '提案',
    pattern: /会話の提案|段階を提案|一歩を提案|近い人に提案/,
    reason: '関係・会話の生活語',
  },
  {
    term: 'データ',
    pattern: /データや事実/,
    reason: '観測を事実に戻す生活語',
  },
  {
    term: '環境',
    pattern: /雑音の多い環境/,
    reason: '集中が削られる生活場面',
  },
  {
    term: '管理',
    pattern: /自分の時間を管理|消耗を整える/,
    reason: '生活文脈の自己管理のみ',
  },
] as const;

const STEM_DTR_ONLY_CAUTION_TERMS = new Set<(typeof CAUTION_TERMS)[number]>([
  '方針',
  '運用',
  '設計',
  '構造',
  'モデル',
  '検証',
  '評価',
  '仕事',
  '役割',
  '現場',
]);

const MAX_CAUTION_TERM_OCCURRENCES: Partial<Record<(typeof CAUTION_TERMS)[number], number>> = {
  方針: 0,
  運用: 0,
  設計: 0,
  構造: 0,
  モデル: 0,
  判断: 12,
  分析: 4,
  提案: 2,
  データ: 1,
  環境: 1,
  管理: 1,
  検証: 0,
  評価: 0,
  仕事: 0,
  役割: 0,
  現場: 0,
};

function djb2Fingerprint(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

function typeCatalogCopy(lane: number): string {
  const seed = TYPE_CATALOG[typeIndexFromStemLane(lane)]!;
  const chunks: string[] = [];
  collectStrings(
    {
      coreLabel: seed.coreLabel,
      coreSummary: seed.coreSummary,
      strengths: seed.strengths,
      cautions: seed.cautions,
      workStyle: seed.workStyle,
      relationships: seed.relationships,
      love: seed.love,
    },
    chunks,
  );
  return chunks.join('\n');
}

function stemCatalogCopy(lane: number): string {
  const stem = TEN_STEM_DISPLAY[lane]!;
  return [stem.displayOneLine, ...stem.keywordPool, ...stem.focusPool].join('\n');
}

function stem1Chapter2UserFacingCopy(): string {
  const envelope = runDtrEngine(
    {
      birthDate: '2000-06-15',
      nickname: 'lifestyle-audit',
      locale: 'ja-JP',
      contextScope: 'dtr',
    },
    {
      stemLaneIndex: 1,
      engineVersion: ENGINE_VERSION_V2,
      derivation: 'm55_composite_stem_v2_p_lunar',
      contractVersion: 'v2',
    },
  );
  const byId = new Map(envelope.payload.fullSections.map((section) => [section.id, section.body]));
  const viz = essenceStabilityVizForStem(1);
  return [
    byId.get('s3_essence') ?? '',
    byId.get('s4_strengths') ?? '',
    byId.get('s7_work') ?? '',
    viz.stabilize,
    viz.maximize,
    viz.collapse,
    viz.guard,
  ].join('\n');
}

function ch2Phase2Stem1ForbiddenHits(copy: string): string[] {
  return CH2_PHASE2_STEM1_FORBIDDEN_TERMS.filter((term) => copy.includes(term));
}

function stem1CompositionVizCopy(): string {
  const viz = compositionStructureVizForStem(1);
  return [viz.strengthEmergence, viz.flipRisk].join('\n');
}

function ch1Phase2Stem1CompositionVizForbiddenHits(copy: string): string[] {
  return CH1_PHASE2_STEM1_COMPOSITION_VIZ_FORBIDDEN_TERMS.filter((term) => copy.includes(term));
}

function ch1Phase2Stem1CompositionVizRequiredHits(copy: string): string[] {
  return CH1_PHASE2_STEM1_COMPOSITION_VIZ_REQUIRED_TERMS.filter((term) => !copy.includes(term));
}

function stem1PatternCaptionCopy(): string {
  const viz = compositionStructureVizForStem(1);
  return viz.patternCaption;
}

function ch1OptionalFinalStem1PatternCaptionForbiddenHits(copy: string): string[] {
  return CH1_OPTIONAL_FINAL_STEM1_PATTERN_CAPTION_FORBIDDEN_TERMS.filter((term) => copy.includes(term));
}

function ch1OptionalFinalStem1PatternCaptionRequiredHits(copy: string): string[] {
  return CH1_OPTIONAL_FINAL_STEM1_PATTERN_CAPTION_REQUIRED_TERMS.filter((term) => !copy.includes(term));
}

function dtrEngineCopy(lane: number): string {
  const envelope = runDtrEngine(
    {
      birthDate: '2000-06-15',
      nickname: 'lifestyle-audit',
      locale: 'ja-JP',
      contextScope: 'dtr',
    },
    {
      stemLaneIndex: lane,
      engineVersion: ENGINE_VERSION_V2,
      derivation: 'm55_composite_stem_v2_p_lunar',
      contractVersion: 'v2',
    },
  );
  const sectionChunks: string[] = [];
  for (const section of envelope.payload.fullSections) {
    sectionChunks.push(section.title, section.summary, section.body);
  }
  const vizChunks: string[] = [];
  collectStrings(identityDesignVizForStem(lane), vizChunks);
  collectStrings(compositionStructureVizForStem(lane), vizChunks);
  collectStrings(essenceStabilityVizForStem(lane), vizChunks);
  return [...sectionChunks, ...vizChunks].join('\n');
}

function paidDtrProductDisplayCopy(): string {
  return [
    ...Object.values(PAID_DTR_CHAPTER_GRAPH_CAPTIONS),
    ...Object.values(PAID_DTR_DRAWER_SECTION_DISPLAY_TITLE_BY_ID),
  ].join('\n');
}

function stemAndDtrCopy(lane: number): string {
  return [stemCatalogCopy(lane), dtrEngineCopy(lane)].join('\n');
}

function laneUserFacingCopy(lane: number): string {
  return [stemAndDtrCopy(lane), typeCatalogCopy(lane)].join('\n');
}

function patternHits(copy: string, rules: readonly { label: string; pattern: RegExp }[]): string[] {
  return rules.filter((rule) => rule.pattern.test(copy)).map((rule) => rule.label);
}

function forbiddenHits(copy: string): string[] {
  return FORBIDDEN_TERMS.filter((term) => copy.includes(term));
}

function residualOldToneHits(copy: string): string[] {
  return RESIDUAL_OLD_TONE_TERMS.filter((term) => copy.includes(term));
}

function hardAbstractHits(copy: string): string[] {
  return HARD_ABSTRACT_TERMS.filter((term) => copy.includes(term));
}

function occupationalHits(copy: string): string[] {
  return OCCUPATIONAL_TECHNICAL_TERMS.filter((term) => copy.includes(term));
}

function countTerm(copy: string, term: string): number {
  let count = 0;
  let idx = copy.indexOf(term);
  while (idx !== -1) {
    count += 1;
    idx = copy.indexOf(term, idx + term.length);
  }
  return count;
}

function unallowedCautionHits(copy: string, scope: 'all' | 'stemDtr' = 'all'): string[] {
  const hits: string[] = [];
  for (const term of CAUTION_TERMS) {
    if (scope === 'all' && STEM_DTR_ONLY_CAUTION_TERMS.has(term)) continue;
    if (scope === 'stemDtr' && !STEM_DTR_ONLY_CAUTION_TERMS.has(term)) continue;

    const occurrences = countTerm(copy, term);
    if (occurrences === 0) continue;

    const max = MAX_CAUTION_TERM_OCCURRENCES[term];
    if (max !== undefined && occurrences > max) {
      hits.push(`${term}(count=${occurrences}>${max})`);
      continue;
    }

    const allowed = CAUTION_ALLOWLIST.some((rule) => rule.term === term && rule.pattern.test(copy));
    if (!allowed) hits.push(term);
  }
  return hits;
}

function positiveSignals(copy: string): string[] {
  return POSITIVE_LIFESTYLE_TERMS.filter((term) => copy.includes(term));
}

function splitSentences(copy: string): string[] {
  return copy
    .split(/\n+/)
    .flatMap((block) => block.split(/。/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function rhythmFailures(copy: string): string[] {
  const failures = new Set<string>();
  for (const sentence of splitSentences(copy)) {
    if (sentence.length > 90) failures.add(`long_sentence(${sentence.length})`);
    if (sentence.length > 45 && !sentence.includes('、') && !sentence.includes('，')) {
      failures.add(`long_without_comma(${sentence.length})`);
    }
    if (/(?<!も)のの(?![ぁ-ん])/.test(sentence)) failures.add('no_no_chain');
    if (/(?:[^。、\n]{0,3}の){4,}/.test(sentence)) failures.add('no_chain_dense');
  }
  return [...failures];
}

function representativeBodyFingerprint(lane: number): string {
  const envelope = runDtrEngine(
    {
      birthDate: '2000-06-15',
      nickname: 'lifestyle-audit',
      locale: 'ja-JP',
      contextScope: 'dtr',
    },
    {
      stemLaneIndex: lane,
      engineVersion: ENGINE_VERSION_V2,
      derivation: 'm55_composite_stem_v2_p_lunar',
      contractVersion: 'v2',
    },
  );
  const body = envelope.payload.fullSections.map((s) => s.body).join('\n');
  return djb2Fingerprint(body);
}

describe('tenStem lifestyle language audit — lane coverage', () => {
  it('covers lanes 0–9 with locked publicTitle and non-empty displayOneLine', () => {
    assert.equal(TEN_STEM_DISPLAY.length, 10);
    for (let lane = 0; lane < 10; lane += 1) {
      const stem = TEN_STEM_DISPLAY[lane]!;
      assert.equal(stem.publicTitle, LOCKED_PUBLIC_TITLES[lane], `lane ${lane}: publicTitle lock`);
      assert.ok(stem.displayOneLine.trim().length > 0, `lane ${lane}: displayOneLine non-empty`);
    }
  });

  it('fullSections body source is non-empty for all 10 lanes', () => {
    for (let lane = 0; lane < 10; lane += 1) {
      const copy = dtrEngineCopy(lane);
      assert.ok(copy.trim().length > 0, `lane ${lane}: dtrEngine copy non-empty`);
    }
  });
});

describe('tenStem lifestyle language audit — stem1 chapter II phase2 copy', () => {
  it('stem1 (プランナー) chapter II surfaces have no business/org phase2 forbidden phrases', () => {
    const copy = stem1Chapter2UserFacingCopy();
    assert.deepEqual(ch2Phase2Stem1ForbiddenHits(copy), [], 'stem1 chapter II phase2 forbidden');
  });
});

describe('tenStem lifestyle language audit — stem1 chapter I phase2 composition viz copy', () => {
  it('stem1 (プランナー) composition structure viz has no phase2 residual forbidden phrases', () => {
    const copy = stem1CompositionVizCopy();
    assert.deepEqual(
      ch1Phase2Stem1CompositionVizForbiddenHits(copy),
      [],
      'stem1 chapter I composition viz phase2 forbidden',
    );
  });

  it('stem1 (プランナー) composition structure viz includes phase2 lifestyle replacements', () => {
    const copy = stem1CompositionVizCopy();
    assert.deepEqual(
      ch1Phase2Stem1CompositionVizRequiredHits(copy),
      [],
      'stem1 chapter I composition viz phase2 required',
    );
  });
});

describe('tenStem lifestyle language audit — stem1 chapter I optional final pattern caption copy', () => {
  it('stem1 (プランナー) patternCaption has no optional-final forbidden phrase', () => {
    const copy = stem1PatternCaptionCopy();
    assert.deepEqual(
      ch1OptionalFinalStem1PatternCaptionForbiddenHits(copy),
      [],
      'stem1 chapter I patternCaption optional-final forbidden',
    );
  });

  it('stem1 (プランナー) patternCaption includes optional-final lifestyle replacements', () => {
    const copy = stem1PatternCaptionCopy();
    assert.deepEqual(
      ch1OptionalFinalStem1PatternCaptionRequiredHits(copy),
      [],
      'stem1 chapter I patternCaption optional-final required',
    );
  });
});

describe('tenStem lifestyle language audit — paid DTR display copy', () => {
  it('paidDtrProductCopy display titles have no residual old-tone phrases', () => {
    const copy = paidDtrProductDisplayCopy();
    assert.deepEqual(residualOldToneHits(copy), [], 'paidDtrProductCopy residual old tone');
  });
});

describe('tenStem lifestyle language audit — forbidden and caution terms', () => {
  for (let lane = 0; lane < 10; lane += 1) {
    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no residual old-tone phrases in stem+dtr copy`, () => {
      const copy = stemAndDtrCopy(lane);
      assert.deepEqual(residualOldToneHits(copy), [], `lane ${lane} residual old tone`);
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no forbidden work/org terms`, () => {
      const copy = laneUserFacingCopy(lane);
      assert.deepEqual(forbiddenHits(copy), [], `lane ${lane} forbidden`);
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no hard abstract/system terms`, () => {
      const copy = laneUserFacingCopy(lane);
      assert.deepEqual(hardAbstractHits(copy), [], `lane ${lane} hard abstract`);
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no occupational/technical terms in stem+dtr copy`, () => {
      const copy = stemAndDtrCopy(lane);
      assert.deepEqual(occupationalHits(copy), [], `lane ${lane} occupational`);
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) caution terms are allowlisted or absent`, () => {
      const all = laneUserFacingCopy(lane);
      const stemDtr = stemAndDtrCopy(lane);
      const hits = [...unallowedCautionHits(all, 'all'), ...unallowedCautionHits(stemDtr, 'stemDtr')];
      assert.deepEqual(hits, [], `lane ${lane} caution`);
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no occupational context trigger pairs`, () => {
      const copy = stemAndDtrCopy(lane);
      assert.deepEqual(patternHits(copy, CONTEXT_TRIGGER_RULES), [], `lane ${lane} context trigger`);
    });
  }
});

describe('tenStem lifestyle language audit — grammar and tone regressions', () => {
  for (let lane = 0; lane < 10; lane += 1) {
    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no text-quality micro regression patterns in stem+dtr copy`, () => {
      const copy = stemAndDtrCopy(lane);
      assert.deepEqual(
        patternHits(copy, TEXT_QUALITY_MICRO_REGRESSION_PATTERNS),
        [],
        `lane ${lane} text-quality micro regression`,
      );
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no grammar regression patterns`, () => {
      const copy = stemAndDtrCopy(lane);
      assert.deepEqual(patternHits(copy, GRAMMAR_REGRESSION_PATTERNS), [], `lane ${lane} grammar`);
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) has no hard ending/particle patterns in stem+dtr copy`, () => {
      const copy = stemAndDtrCopy(lane);
      assert.deepEqual(patternHits(copy, HARD_ENDING_PATTERNS), [], `lane ${lane} hard ending`);
    });

    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) passes rhythm guards in stem+dtr copy`, () => {
      const copy = stemAndDtrCopy(lane);
      assert.deepEqual(rhythmFailures(copy), [], `lane ${lane} rhythm`);
    });
  }
});

describe('tenStem lifestyle language audit — positive lifestyle signals', () => {
  const laneSignals: string[][] = [];

  for (let lane = 0; lane < 10; lane += 1) {
    it(`lane ${lane} (${LOCKED_PUBLIC_TITLES[lane]}) includes sufficient lifestyle vocabulary`, () => {
      const copy = laneUserFacingCopy(lane);
      const signals = positiveSignals(copy);
      laneSignals[lane] = signals;
      assert.ok(
        signals.length >= MIN_POSITIVE_SIGNALS_PER_LANE,
        `lane ${lane}: positive signals ${signals.length} < ${MIN_POSITIVE_SIGNALS_PER_LANE}`,
      );
      assert.deepEqual(hardAbstractHits(copy), [], `lane ${lane}: blocked by hard abstract`);
      assert.deepEqual(occupationalHits(stemAndDtrCopy(lane)), [], `lane ${lane}: blocked by occupational`);
    });
  }

  it('positive signal sets are not identical across all lanes', () => {
    const serialized = laneSignals.map((signals) => signals.sort().join('|'));
    assert.ok(new Set(serialized).size > 1, 'all lanes share identical positive signal set');
  });
});

describe('tenStem lifestyle language audit — lane individuality', () => {
  it('displayOneLine values are not all identical', () => {
    const lines = TEN_STEM_DISPLAY.map((stem) => stem.displayOneLine);
    assert.equal(new Set(lines).size, lines.length);
  });

  it('representative body fingerprints are not all identical', () => {
    const fingerprints = Array.from({ length: 10 }, (_, lane) => representativeBodyFingerprint(lane));
    assert.equal(new Set(fingerprints).size, fingerprints.length);
  });
});

export function lifestyleAuditLaneReport(lane: number) {
  const all = laneUserFacingCopy(lane);
  const stemDtr = stemAndDtrCopy(lane);
  return {
    lane,
    publicTitle: TEN_STEM_DISPLAY[lane]!.publicTitle,
    displayOneLine: TEN_STEM_DISPLAY[lane]!.displayOneLine,
    forbidden: forbiddenHits(all),
    residualOldTone: residualOldToneHits(stemDtr),
    hardAbstract: hardAbstractHits(all),
    occupational: occupationalHits(stemDtr),
    grammar: patternHits(stemDtr, GRAMMAR_REGRESSION_PATTERNS),
    hardEnding: patternHits(stemDtr, HARD_ENDING_PATTERNS),
    rhythm: rhythmFailures(stemDtr),
    contextTriggers: patternHits(stemDtr, CONTEXT_TRIGGER_RULES),
    caution: [...unallowedCautionHits(all, 'all'), ...unallowedCautionHits(stemDtr, 'stemDtr')],
    positiveSignals: positiveSignals(all),
  };
}
