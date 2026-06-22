import type { AffinityItem, AxisKey, CoreResult } from './types';

export type TypeCatalogSeed = {
  coreType: string;
  coreLabel: string;
  coreSummary: string;
  coreAxisScores: Record<AxisKey, number>;
  strengths: string[];
  cautions: string[];
  workStyle: CoreResult['workStyle'];
  relationships: CoreResult['relationships'];
  love: CoreResult['love'];
};

/** 天干レーン 0–9 と 1:1。初版の正式ラベル（再訪・ロジック更新後もスナップショット優先）。 */
export const TYPE_CATALOG: readonly TypeCatalogSeed[] = [
  {
    coreType: 'TYPE_01',
    coreLabel: '観測深化型',
    coreSummary:
      '表面で終わらず、小さな差分や意味の層を拾い上げて深めようとする本質です。静かに精度を上げるタイプの観測です。',
    coreAxisScores: {
      socialEnergy: 52,
      stability: 58,
      openness: 62,
      cooperation: 60,
      structure: 72,
    },
    strengths: [
      '細部まで丁寧に見渡しやすい',
      '言葉にする前に整理が進みやすい',
      '一度理解したことを、何度見ても同じように確かめやすい',
    ],
    cautions: [
      '情報量が多いと止まりどころを作りにくい',
      '考えが深まるほど決定が遅れやすい',
      '自分のペースが周囲とずれると疲れやすい',
    ],
    workStyle: {
      summary:
        'ひとりで深く向き合える時間と、静かな余白があるときに力が出やすい観測です。割り込みが少ないほど輪郭がはっきりします。',
      strengths: [
        '気づきの前提を洗い出しやすい',
        '基準や手順を整えやすい',
        'ばらつきを抑えやすい',
      ],
      cautions: [
        '結論を急かされると不完全燃焼になりやすい',
        '同時進行が増えると負荷が跳ねやすい',
      ],
    },
    relationships: {
      summary:
        '広く浅くより、少人数でも信頼できる距離で落ち着きやすい傾向があります。',
      strengths: ['相手の言葉のニュアンスを拾いやすい', '深い対話を段階的に築きやすい'],
      cautions: ['温度差に敏感で消耗しやすい', '曖昧な期待が続くと負荷が溜まりやすい'],
    },
    love: {
      summary:
        '安心できる相手にはゆっくり深く入ります。軽いテンポだけの関係には乗りにくい観測です。',
      strengths: ['関係を丁寧に育てやすい', '相手の変化に気づきやすい'],
      cautions: ['考えすぎてタイミングを逃しやすい', '曖昧な関係に疲れやすい'],
    },
  },
  {
    coreType: 'TYPE_02',
    coreLabel: '共鳴受容型',
    coreSummary:
      '相手の温度や空気を受け取り、関係の中でバランスを保とうとする本質です。調整と受容の観測が強いタイプです。',
    coreAxisScores: {
      socialEnergy: 64,
      stability: 55,
      openness: 58,
      cooperation: 78,
      structure: 48,
    },
    strengths: [
      '場の空気を読み取りやすい',
      '相手の立場に寄り添いやすい',
      '衝突の前に整えを入れやすい',
    ],
    cautions: [
      '合わせすぎると本音が後回しになりやすい',
      '期待を飲み込みやすい',
      '境界線が曖昧だと疲れが抜けにくい',
    ],
    workStyle: {
      summary:
        '近い人との距離を整えながら、少しずつ前に進めるときに力が出しやすい観測です。',
      strengths: ['人との距離の橋渡しがしやすい', '近い人の温度を揃えやすい', '雰囲気を壊さずに伝えやすい'],
      cautions: ['見えにくい関わりに偏りやすい', '断りにくい依頼を抱えやすい'],
    },
    relationships: {
      summary: '安心できる相手とは深くつながりやすい一方、雑な関わりには敏感です。',
      strengths: ['小さな変化に気づきやすい', '相手の良さを言語化しやすい'],
      cautions: ['距離感のズレに傷きやすい', '沈黙を不安に読み取りやすい'],
    },
    love: {
      summary: '安心条件が満たされると深く開きます。軽さだけを求められると戸惑いやすいです。',
      strengths: ['相手の安心感を育てやすい', '細やかな配慮ができる'],
      cautions: ['本音の遅れが誤解につながりやすい', '期待のすり合わせが後回しになりやすい'],
    },
  },
  {
    coreType: 'TYPE_03',
    coreLabel: '構造探求型',
    coreSummary:
      '物事の骨格や因果をつかみ、筋の良い形に直そうとする本質です。整理と構造化の観測が前に出やすいタイプです。',
    coreAxisScores: {
      socialEnergy: 48,
      stability: 62,
      openness: 70,
      cooperation: 52,
      structure: 80,
    },
    strengths: [
      '複雑さを段階に分けやすい',
      '再現できる手順を作りやすい',
      '抜け漏れに気づきやすい',
    ],
    cautions: [
      '完璧な設計を求めすぎて着手が遅れやすい',
      '感情論と設計論のズレに疲れやすい',
      '急な仕様変更に負荷が出やすい',
    ],
    workStyle: {
      summary:
        '散らかったことを順番に整え、自分が納得できる形に近づけられるときに伸びやすい観測です。',
      strengths: ['バラバラを順番にしやすい', '無理の出方を先に見やすい', '整え方を言葉にしやすい'],
      cautions: ['曖昧なまま進む場にストレスが出やすい', '結論が先に決まると納得しにくい'],
    },
    relationships: {
      summary: '誠実さと一貫性がある関係で安心しやすいです。',
      strengths: ['約束を守る姿勢が伝わりやすい', '問題を冷静に言語化しやすい'],
      cautions: ['論理優先に見えて冷たく誤解されやすい', '感情表現が遅れやすい'],
    },
    love: {
      summary: '信頼の積み重ねを重視します。軽いノリだけだと距離を置きやすいです。',
      strengths: ['関係のルールを丁寧に作りやすい', '長期的な視点を持ちやすい'],
      cautions: ['慎重さが遠慮に見えやすい', '理想と現実のギャップに悩みやすい'],
    },
  },
  {
    coreType: 'TYPE_04',
    coreLabel: '静観分析型',
    coreSummary:
      '動きの前に観測を置き、状況を分解してから動こうとする本質です。静けさの中で精度を上げるタイプの観測です。',
    coreAxisScores: {
      socialEnergy: 42,
      stability: 68,
      openness: 66,
      cooperation: 54,
      structure: 74,
    },
    strengths: [
      '感情に流されずに判断しやすい',
      'データや事実に立ち返りやすい',
      '長期の変化を追いやすい',
    ],
    cautions: [
      '初動が遅れて機会損失しやすい',
      '静かさが無関心に見えやすい',
      '刺激の多い場では疲れやすい',
    ],
    workStyle: {
      summary: '静かに観察し、小さな変化から読み直せる時間があるときに力を発揮しやすいです。',
      strengths: ['気づきを確かめやすい', '戻し方の線を引きやすい', '冷静に整理しやすい'],
      cautions: ['急かされる場で窮屈に感じやすい', '雑な合意に違和感を抱えやすい'],
    },
    relationships: {
      summary: '深い信頼ができる相手とは静かに長く続きやすいです。',
      strengths: ['相手のペースを尊重しやすい', '衝突を拡大しにくい'],
      cautions: ['温度感の差を説明しにくい', '本音の共有が遅れやすい'],
    },
    love: {
      summary: '心を開くまでに時間がかかりやすい一方、深い安心では強いです。',
      strengths: ['相手を急かしにくい', '誠実さがにじみ出やすい'],
      cautions: ['好意のサインが分かりにくい', '考えすぎて一歩が遅れやすい'],
    },
  },
  {
    coreType: 'TYPE_05',
    coreLabel: '調和観測型',
    coreSummary:
      '全体のバランスを見ながら、衝突をほどいて進めようとする本質です。調和と観測の両立が出やすいタイプです。',
    coreAxisScores: {
      socialEnergy: 58,
      stability: 60,
      openness: 56,
      cooperation: 72,
      structure: 58,
    },
    strengths: [
      '対立の火種に早く気づきやすい',
      '合意の土台を作りやすい',
      '場の温度を均しやすい',
    ],
    cautions: [
      '全員満足を狙いすぎて決めにくい',
      '自分の希望が後回しになりやすい',
      '板挟みで消耗しやすい',
    ],
    workStyle: {
      summary:
        '近い人との距離や、日々の流れを整えながら進めるときに伸びやすいです。',
      strengths: ['優先順位のすり合わせがしやすい', '場を前に進めやすい', '空気を壊さずに論点化しやすい'],
      cautions: ['判断が遅れると窮屈に感じやすい', '貢献が見えにくい'],
    },
    relationships: {
      summary: '穏やかで対等な関係を好みやすい傾向があります。',
      strengths: ['相手の良い意図を拾いやすい', '謝罪や修復のきっかけを作りやすい'],
      cautions: ['極端な上下関係に負荷が出やすい', '沈黙の誤読に悩みやすい'],
    },
    love: {
      summary: '安心と対等さが揃うと深く入りやすいです。',
      strengths: ['日常の小さな合意を積み上げやすい', '相手の努力を認めやすい'],
      cautions: ['本音の遅れがすれ違いになりやすい', '理想の関係像に疲れやすい'],
    },
  },
  {
    coreType: 'TYPE_06',
    coreLabel: '直観展開型',
    coreSummary:
      'ひらめきと勢いで仮説を広げ、場を前に動かそうとする本質です。展開と熱量の観測が前に出やすいタイプです。',
    coreAxisScores: {
      socialEnergy: 76,
      stability: 44,
      openness: 82,
      cooperation: 58,
      structure: 52,
    },
    strengths: [
      '新しい打ち手を切り出しやすい',
      '場の空気を前向きにしやすい',
      '短時間で仮説を立てやすい',
    ],
    cautions: [
      '細部の詰めが後回しになりやすい',
      '刺激が途切れると集中が落ちやすい',
      '反対意見に強く反応しやすい',
    ],
    workStyle: {
      summary:
        '近い人との場に熱量があり、反応が返ってくるときに力を発揮しやすい観測です。',
      strengths: ['気づきを言葉にしやすい', '場の温度を上げやすい', '初速を出しやすい'],
      cautions: ['落ち着いて整える段階で飽きやすい', '細かな手続きに負荷が出やすい'],
    },
    relationships: {
      summary: '明るくオープンに見えやすい一方、深い安心までに時間がかかることもあります。',
      strengths: ['会話のきっかけを作りやすい', '場を明るく保ちやすい'],
      cautions: ['軽さに誠実さが足りないと誤解されやすい', '深い話が遅れやすい'],
    },
    love: {
      summary: '楽しさと新しさがあり、心を開く速度は比較的早い傾向があります。',
      strengths: ['デートや会話の提案がしやすい', '相手を楽しませやすい'],
      cautions: ['真剣さの温度差ですれ違いやすい', '刺激依存に見えやすい'],
    },
  },
  {
    coreType: 'TYPE_07',
    coreLabel: '核心追究型',
    coreSummary:
      '表面で終わらず、物事の核と意味をつかもうとする本質です。深さと筋の良さを優先する観測が強いタイプです。',
    coreAxisScores: {
      socialEnergy: 72,
      stability: 41,
      openness: 83,
      cooperation: 58,
      structure: 66,
    },
    strengths: [
      '本質に近い問いを立てやすい',
      '曖昧さを言語化しやすい',
      '理解を積み上げて伝えやすい',
    ],
    cautions: [
      '刺激が多いと迷いやすい',
      '考えすぎて決定が遅れやすい',
      '整理前に抱え込みやすい',
    ],
    workStyle: {
      summary:
        '深く考えて整えられる時間と、自分の範囲が分かるときに力を発揮しやすい観測です。',
      strengths: ['悩みの本質を掘れる', '曖昧な気持ちを整理できる', '自分の視点を伝えやすい'],
      cautions: ['雑音の多い環境では集中が削られやすい', '結論を急がれると不完全燃焼になりやすい'],
    },
    relationships: {
      summary: '少数でも深い信頼関係で安定しやすい傾向があります。',
      strengths: ['相手の内面変化に気づきやすい', '深い会話を築きやすい'],
      cautions: ['温度差に敏感で疲れやすい', '雑な関わりに消耗しやすい'],
    },
    love: {
      summary: '安心して心を開ける相手には深く入りますが、軽い関係には乗りにくい傾向があります。',
      strengths: ['関係を丁寧に育てやすい', '言葉の裏にある気持ちを受け取りやすい'],
      cautions: ['考えすぎてタイミングを逃しやすい', '曖昧な関係に消耗しやすい'],
    },
  },
  {
    coreType: 'TYPE_08',
    coreLabel: '推進整理型',
    coreSummary:
      '迷いを減らし、次の一手を決めて進めようとする本質です。実行と整理のバランスが取りやすいタイプの観測です。',
    coreAxisScores: {
      socialEnergy: 62,
      stability: 58,
      openness: 54,
      cooperation: 56,
      structure: 78,
    },
    strengths: [
      '期限と優先を付けやすい',
      'チームを前に進めやすい',
      '抜け道を塞ぎやすい',
    ],
    cautions: [
      'スピード優先で温度感が荒く見えやすい',
      '細部にこだわる相手と衝突しやすい',
      '自分の疲れに気づくのが遅れやすい',
    ],
    workStyle: {
      summary:
        '優先順位が見え、完了まで自分のペースで進められるときに力を出しやすいです。',
      strengths: ['やることを分解しやすい', '止まりどころを特定しやすい', '判断を促しやすい'],
      cautions: ['近い人への配慮が後回しになりやすい', '言葉が厳しめに伝わりやすい'],
    },
    relationships: {
      summary: '約束と行動の一貫性を重視しやすい傾向があります。',
      strengths: ['頼られると応えやすい', '問題を先に切り分けやすい'],
      cautions: ['正論優先に見えやすい', '相手の感情の置き場を作りにくい'],
    },
    love: {
      summary: '誠実さと明確さがあると安心しやすいです。',
      strengths: ['関係の次の一歩を提案しやすい', '守るべき線を引きやすい'],
      cautions: ['スピードの差ですれ違いやすい', 'ロマンスより現実に寄り見えやすい'],
    },
  },
  {
    coreType: 'TYPE_09',
    coreLabel: '関係洞察型',
    coreSummary:
      '人と人の間に起きていることを読み取り、関係性の質を上げようとする本質です。洞察と配慮の観測が強いタイプです。',
    coreAxisScores: {
      socialEnergy: 68,
      stability: 52,
      openness: 64,
      cooperation: 76,
      structure: 52,
    },
    strengths: [
      '相手の本音の手前を察しやすい',
      '対話の流れを整えやすい',
      '小さな違和感に気づきやすい',
    ],
    cautions: [
      '他人の感情を抱え込みやすい',
      '距離を取ると冷たく見えやすい',
      '解決できない問題に引きずられやすい',
    ],
    workStyle: {
      summary:
        '近い人の言葉や距離に関わる場面で、力を発揮しやすい観測です。',
      strengths: ['相手の不安を言葉にしやすい', '信頼を積み上げやすい', '対立を小さく収束しやすい'],
      cautions: ['感情の負荷が積み上がりやすい', '貢献が見えにくい'],
    },
    relationships: {
      summary: '深い相互理解がある関係で力を発揮しやすいです。',
      strengths: ['相手の強みを引き出しやすい', '謝罪と修復の対話がしやすい'],
      cautions: ['期待のすり合わせが曖昧だと疲れやすい', '過干渉に見えやすい'],
    },
    love: {
      summary: '相手の気持ちを大切にし、丁寧な関係を好みやすい傾向があります。',
      strengths: ['小さなサインに気づきやすい', '安心感を育てやすい'],
      cautions: ['読みすぎて疲れやすい', '自分の欲求が後回しになりやすい'],
    },
  },
  {
    coreType: 'TYPE_10',
    coreLabel: '統合設計型',
    coreSummary:
      'バラバラの要素を一つの形にまとめ、全体として意味を持たせようとする本質です。統合と設計の観測が前に出やすいタイプです。',
    coreAxisScores: {
      socialEnergy: 56,
      stability: 60,
      openness: 74,
      cooperation: 66,
      structure: 76,
    },
    strengths: [
      '全体像を俯瞰しやすい',
      '優先順位を付け替えやすい',
      '関係者を一つの物語に乗せやすい',
    ],
    cautions: [
      '全体を見ようとするほど、自分の感覚を後回しにしやすい',
      '責任範囲が広がりやすい',
      '細部のオーナーシップが曖昧になりやすい',
    ],
    workStyle: {
      summary:
        'バラバラの要素をひとつの流れにまとめ、全体の見通しが立つときに力を発揮しやすい観測です。',
      strengths: ['進め方の見通しを描きやすい', '近い人をひとつの流れに寄せやすい', '整理した言葉を伝えやすい'],
      cautions: ['細かな日々の負荷に疲れやすい', '判断の遅れに苛立ちやすい'],
    },
    relationships: {
      summary: '長期的な信頼と共通の目標がある関係で安定しやすいです。',
      strengths: ['関係の次の段階を提案しやすい', '相手の強みを配置しやすい'],
      cautions: ['設計思考が冷たく見えやすい', '感情の置き場を後回しにしやすい'],
    },
    love: {
      summary: '将来像や価値観の一致を重視しやすい傾向があります。',
      strengths: ['二人の関係の設計図を描きやすい', '長く続く安心を作りやすい'],
      cautions: ['理想が高く現実との差に悩みやすい', '相手のペースとのズレに気づきにくい'],
    },
  },
] as const;

export function typeIndexFromStemLane(stemLaneIndex: number): number {
  return ((stemLaneIndex % 10) + 10) % 10;
}

export function affinityForTypeIndex(self: number): AffinityItem[] {
  const items: AffinityItem[] = [];
  for (let j = 0; j < 10; j++) {
    if (j === self) continue;
    const d = Math.abs(self - j);
    const ring = Math.min(d, 10 - d);
    const score = Math.max(12, 100 - ring * 11);
    const t = TYPE_CATALOG[j]!;
    items.push({ type: t.coreType, label: t.coreLabel, score });
  }
  return items
    .sort((a, b) => (b.score - a.score) || a.type.localeCompare(b.type))
    .slice(0, 5);
}
