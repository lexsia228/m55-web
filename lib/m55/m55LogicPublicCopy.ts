/**
 * M55 engine definition — shared SSOT for HOME (full) and /core free (compact).
 * Calendar-rhythm framing; no fortune-telling / AI-diagnosis language.
 */
import { M55_PUBLIC_COMMERCIAL_TRUTH } from './analysisAuthorityReferenceModel';

/** 5-axis labels aligned with free /core public surface. */
export const M55_LOGIC_FIVE_AXES_JA =
  '人との距離、感じ取り方、発想、協調、段取り' as const;

export const M55_LOGIC_HOME_COPY = {
  titleJa: 'M55とは',
  bodyParagraphsJa: [
    M55_PUBLIC_COMMERCIAL_TRUTH.summaryJa,
    `個人の無料見取り図では、生年月日から得る無料用の手がかりと、5つの傾向質問・今の関心1問の合計6回答を重ね、${M55_LOGIC_FIVE_AXES_JA}の5つの視点で現在の輪郭を確認できます。`,
    M55_PUBLIC_COMMERCIAL_TRUTH.processing.personalSavedJa,
    M55_PUBLIC_COMMERCIAL_TRUTH.processing.personalAdditionalJa,
    '未来予測や吉凶の断定、医学的・心理学的な診断ではありません。自分を見つめ直すための、読み返せる見取り図です。',
  ] as const,
} as const;

export const M55_LOGIC_CORE_COPY = {
  titleJa: 'M55はこう見ています',
  bodyParagraphsJa: [
    'ここでは、生年月日から得る無料用の暦の手がかりを入口に、5つの傾向質問と今の関心1問を重ね、現在の輪郭を整理します。',
    '同じ暦の土台でも、現在の回答が変われば表れ方の見取り図も変わります。',
    '保存版では、無料6回答に購入前の追加6回答と、より詳細な暦の手がかりを重ねて4章へ深めます。追加読み解きは、保存版に沿って1テーマを整理します。',
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
