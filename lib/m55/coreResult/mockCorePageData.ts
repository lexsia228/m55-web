import type { CorePageData } from './types';

/** Reference mock — UI must render from `coreResult` SSOT, not this constant in production. */
export const mockCorePageData: CorePageData = {
  profile: {
    nickname: 't',
    birthDate: '1990-04-12',
  },
  coreResult: {
    coreType: 'TYPE_07',
    coreLabel: '核心追究型',
    coreSummary: '表面で終わらず、物事の核と意味をつかもうとする本質です。',
    coreAxisScores: {
      socialEnergy: 72,
      stability: 41,
      openness: 83,
      cooperation: 58,
      structure: 66,
    },
    axisDetails: [
      {
        key: 'socialEnergy',
        label: '人とのひらき方',
        score: 72,
        band: 'high',
        summary: '人との関わりの中でも、自分らしい推進力を出しやすい傾向があります。',
        strength: '会話や関係の中で流れをつくりやすい',
        caution: '広く応じすぎると疲れやすい',
      },
      {
        key: 'stability',
        label: '揺れへの反応',
        score: 41,
        band: 'mid-low',
        summary: '刺激や違和感を早く受け取りやすい傾向があります。',
        strength: '異変に早く気づける',
        caution: '情報量が多い場では揺れやすい',
      },
      {
        key: 'openness',
        label: '視点のひろがり',
        score: 83,
        band: 'very-high',
        summary: '新しい視点や未知の考え方を受け取りやすい傾向があります。',
        strength: '発想の幅が出やすい',
        caution: '選択肢が増えすぎると迷いやすい',
      },
      {
        key: 'cooperation',
        label: '関わりの調和',
        score: 58,
        band: 'mid',
        summary: '相手との温度差を見ながら関係を調整しやすい傾向があります。',
        strength: '無理のない配慮ができる',
        caution: '合わせすぎると本音が遅れやすい',
      },
      {
        key: 'structure',
        label: '進め方の軸',
        score: 66,
        band: 'high',
        summary: '自分なりの筋道を作りながら進めやすい傾向があります。',
        strength: '考えを整理して形にしやすい',
        caution: '整う前に着手を急がれるとやりにくい',
      },
    ],
    composition: {
      dominantAxes: ['openness', 'socialEnergy'],
      secondaryAxes: ['structure'],
    },
    affinities: [
      { type: 'TYPE_07', label: '核心追究型', score: 78 },
      { type: 'TYPE_03', label: '構造探求型', score: 71 },
      { type: 'TYPE_09', label: '関係洞察型', score: 63 },
      { type: 'TYPE_08', label: '推進整理型', score: 57 },
      { type: 'TYPE_05', label: '調和観測型', score: 49 },
    ],
    strengths: [
      '深く考え抜きやすい',
      '意味を見つける力がある',
      '理解を積み上げて言葉にしやすい',
    ],
    cautions: [
      '刺激が多いと迷いやすい',
      '考えすぎて決定が遅れやすい',
      '整理前に抱え込みやすい',
    ],
    workStyle: {
      summary: '裁量があり、深く考えて組み立てられる仕事で力を発揮しやすいです。',
      strengths: [
        '課題の本質を掘れる',
        '曖昧な情報を整理できる',
        '独自の視点を提案しやすい',
      ],
      cautions: [
        '雑音の多い環境では集中が削られやすい',
        '結論を急がれると不完全燃焼になりやすい',
      ],
    },
    relationships: {
      summary: '広く浅くより、少数でも深く信頼できる関係で安定しやすい傾向があります。',
      strengths: ['相手の内面変化に気づきやすい', '深い会話を築きやすい'],
      cautions: ['温度差に敏感で疲れやすい', '雑な関わりに消耗しやすい'],
    },
    love: {
      summary: '安心して心を開ける相手には深く入りますが、軽い関係には乗りにくい傾向があります。',
      strengths: ['関係を丁寧に育てやすい', '言葉の裏にある気持ちを受け取りやすい'],
      cautions: ['考えすぎてタイミングを逃しやすい', '曖昧な関係に消耗しやすい'],
    },
    engineVersion: 'm55-core-2026-04',
    lockedAt: '2026-04-04T00:00:00+09:00',
  },
};
