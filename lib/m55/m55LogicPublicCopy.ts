/**
 * M55 engine definition — shared SSOT for HOME (full) and /core free (compact).
 * Calendar-rhythm framing; no fortune-telling / AI-diagnosis language.
 */

/** 5-axis labels aligned with free /core public surface. */
export const M55_LOGIC_FIVE_AXES_JA =
  '人との距離、感じ取り方、発想、協調、段取り' as const;

export const M55_LOGIC_HOME_COPY = {
  titleJa: 'M55とは',
  bodyParagraphsJa: [
    'M55は、生年月日を10資質レーンへ分けるだけではありません。旧暦月・季節位置・日帯などの暦信号を重ねて、自分の動き方・疲れ方・戻し方まで見える保存版に整えます。',
    `無料では、生年月日を入口に、10資質レーンと${M55_LOGIC_FIVE_AXES_JA}の5つの視点で、いま出やすい輪郭を短く確認できます。`,
    '保存版では、同じ根拠を4章で深く読み返せます。本文は固定ルールで組み立てられ、同じ生年月日なら同じ読み方に戻れます。',
    '相談返書は別のレイヤーです。保存版に沿って、いまの1テーマだけ整理する返書です。会話を続ける形式ではありません。',
    '吉凶で決めつけたり、未来を当てるものではありません。自分を見つめ直すための、読み返せる見取り図です。',
  ] as const,
} as const;

export const M55_LOGIC_CORE_COPY = {
  titleJa: 'M55はこう見ています',
  bodyParagraphsJa: [
    'ここでは、生年月日を入口に、10資質レーンと5つの視点で今の輪郭を短く整理します。',
    '同じ資質レーンでも、生まれた日によって見え方は少し変わります。',
    '保存版では、同じ根拠を4章で深く読み返せます。相談返書は、保存版に沿って1テーマを整理します。',
  ] as const,
} as const;

/** Forbidden in M55 logic surfaces — for tests and audits. */
export const M55_LOGIC_FORBIDDEN_TERMS = [
  '必ず当たる',
  '未来を予測',
  'AI鑑定',
  '完全オリジナル',
  '数千通り',
  '全章唯一無二',
  '完全解析',
  '外部データ照合',
  '運命を断定',
  '科学的に証明',
  '科学的証明',
  '診断結果',
  '四柱推命',
  '宿曜',
  '算命学',
  '占い',
  '鑑定',
  '無制限チャット',
] as const;

export function m55LogicCopyBlob(): string {
  return [
    ...M55_LOGIC_HOME_COPY.bodyParagraphsJa,
    ...M55_LOGIC_CORE_COPY.bodyParagraphsJa,
  ].join('\n');
}
