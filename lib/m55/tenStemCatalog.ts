/**
 * Layer3 display labels for ten stems (M55_TEN_STEM_PROFESSIONAL_MAPPING_SSOT_20260324_v1).
 * Not personality typing; observation / professional-title metaphor only.
 */
export type TenStemDisplay = {
  stemChar: string;
  publicTitle: string;
  symbol: string;
  displayOneLine: string;
  /** 2–4 short display keywords (calm, non-diagnostic) */
  keywordPool: string[];
  /** 2–4 short focus areas */
  focusPool: string[];
};

export const TEN_STEM_DISPLAY: readonly TenStemDisplay[] = [
  {
    stemChar: '甲',
    publicTitle: 'プレジデント',
    symbol: '大樹',
    displayOneLine: '大きな方針を示し、周囲の進む向きを定める人',
    keywordPool: ['方針', '静かな推進', '観察'],
    focusPool: ['本質', '整理', '選択'],
  },
  {
    stemChar: '乙',
    publicTitle: 'プランナー',
    symbol: '蔓',
    displayOneLine: 'しなやかな戦略で、人と流れをつなぐ人',
    keywordPool: ['接続', '調整', '余白'],
    focusPool: ['関係性', '設計', 'ペース'],
  },
  {
    stemChar: '丙',
    publicTitle: 'インフルエンサー',
    symbol: '太陽',
    displayOneLine: '周囲の空気を変え、流れを前へ動かす人',
    keywordPool: ['表現', '熱量', '前進'],
    focusPool: ['伝達', '場の整え', '一歩'],
  },
  {
    stemChar: '丁',
    publicTitle: 'クリエイター',
    symbol: '灯火',
    displayOneLine: '静かな集中で、独自の表現を磨き上げる人',
    keywordPool: ['集中', '仕上げ', '質'],
    focusPool: ['深さ', '反復', '基準'],
  },
  {
    stemChar: '戊',
    publicTitle: 'マネージャー',
    symbol: '山',
    displayOneLine: '安定した運用で、崩れない土台を守る人',
    keywordPool: ['運用', '土台', '継続'],
    focusPool: ['リスク', '手順', '持続'],
  },
  {
    stemChar: '己',
    publicTitle: 'プロデューサー',
    symbol: '大地',
    displayOneLine: '人や企画の芽を見つけ、育てて形にする人',
    keywordPool: ['育成', '統合', '段取り'],
    focusPool: ['資源', '優先順位', '合意'],
  },
  {
    stemChar: '庚',
    publicTitle: 'エグゼキューター',
    symbol: '鋼',
    displayOneLine: '迷いなく実行し、必要な線引きを行う人',
    keywordPool: ['実行', '明確さ', '線引き'],
    focusPool: ['規律', '優先', '完了'],
  },
  {
    stemChar: '辛',
    publicTitle: 'デザイナー',
    symbol: '宝石',
    displayOneLine: '繊細な感性で、完成度と美しさを引き上げる人',
    keywordPool: ['感性', '仕上げ', '調和'],
    focusPool: ['品質', '余白', '細部'],
  },
  {
    stemChar: '壬',
    publicTitle: 'グローバルリーダー',
    symbol: '大海',
    displayOneLine: '既存の枠を越え、新しい接続先をひらく人',
    keywordPool: ['越境', '接続', '探索'],
    focusPool: ['機会', '学習', '射程'],
  },
  {
    stemChar: '癸',
    publicTitle: 'アナリスト',
    symbol: '雨',
    displayOneLine: '小さな変化を拾い、深く読み解く人',
    keywordPool: ['洞察', '観測', '精緻'],
    focusPool: ['分析', '記録', '改善'],
  },
] as const;
