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
    displayOneLine: '自分の進め方が見えたときに、力が出やすい人',
    keywordPool: ['進め方', '静かな推進', '観察'],
    focusPool: ['本質', '整理', '選択'],
  },
  {
    stemChar: '乙',
    publicTitle: 'プランナー',
    symbol: '蔓',
    displayOneLine: '人との距離や流れを読み、受け渡しを整えやすい人',
    keywordPool: ['接続', '調整', '余白'],
    focusPool: ['関係性', '整え方', 'ペース'],
  },
  {
    stemChar: '丙',
    publicTitle: 'インフルエンサー',
    symbol: '太陽',
    displayOneLine: '近い人との場の空気を読み、動き出しやすくする人',
    keywordPool: ['表現', '熱量', '前進'],
    focusPool: ['伝達', '場の整え', '一歩'],
  },
  {
    stemChar: '丁',
    publicTitle: 'クリエイター',
    symbol: '深層',
    displayOneLine: '材料を集め、比べながら形を整えていく人',
    keywordPool: ['集中', '仕上げ', '質'],
    focusPool: ['深さ', '反復', '基準'],
  },
  {
    stemChar: '戊',
    publicTitle: 'マネージャー',
    symbol: '山',
    displayOneLine: '日々のリズムを整え、崩れにくい土台を守りやすい人',
    keywordPool: ['続け方', '基盤', '継続'],
    focusPool: ['リスク', '手順', '持続'],
  },
  {
    stemChar: '己',
    publicTitle: 'プロデューサー',
    symbol: '大地',
    displayOneLine: '人や、まだ形の前のものを見つけ、育てて形にする人',
    keywordPool: ['育成', '統合', '段取り'],
    focusPool: ['資源', '優先順位', '合意'],
  },
  {
    stemChar: '庚',
    publicTitle: 'エグゼキューター',
    symbol: '鋼',
    displayOneLine: '判断が固まったときに、迷いなく動き出しやすい人',
    keywordPool: ['実行', '明確さ', '線引き'],
    focusPool: ['規律', '優先', '完了'],
  },
  {
    stemChar: '辛',
    publicTitle: 'デザイナー',
    symbol: '宝石',
    displayOneLine: '細かな違和感に気づき、納得できる形まで整えやすい人',
    keywordPool: ['感性', '仕上げ', '調和'],
    focusPool: ['品質', '余白', '細部'],
  },
  {
    stemChar: '壬',
    publicTitle: 'グローバルリーダー',
    symbol: '大海',
    displayOneLine: 'いつもの枠を越え、新しいつながりをひらきやすい人',
    keywordPool: ['ひらき', '接続', '探索'],
    focusPool: ['機会', '学習', '見通し'],
  },
  {
    stemChar: '癸',
    publicTitle: 'アナリスト',
    symbol: '雨',
    displayOneLine: '全体を見渡し、つながりを整えてから動く人',
    keywordPool: ['洞察', '観測', '精緻'],
    focusPool: ['分析', '記録', '改善'],
  },
] as const;
