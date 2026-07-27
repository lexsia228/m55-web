/**
 * Canonical Growth UI terminology — P1 affected surfaces only.
 * Do not use for repository-wide legacy rewrites.
 */

export const M55_COMMERCIAL_TERMINOLOGY = {
  freeEntry: '無料で見る',
  freeResult: '無料結果',
  premiumProduct: 'プレミアムレポート',
  additionalValue: '追加読み解き',
  trait: '資質',
  shareAction: 'この結果を共有する',
  recipientAction: '自分も無料で見る',
  returnToFreeResult: '無料結果に戻る',
  viewPremiumReport: 'プレミアムレポートを見る',
  premiumBridgeCta: '6問に答えて4章を作る',
  premiumQuestionHelper: '正解はありません。あとで回答を確認できます。',
  aboutM55: 'M55について',
  tenQualities: '10の資質',
  home: 'Home',
  menu: 'メニュー',
} as const;

/** Primary terms that must not appear in P1 Growth UI copy. */
export const M55_COMMERCIAL_FORBIDDEN_PRIMARY_TERMS = [
  '無料解析',
  '無料の読み解き',
  'Premium',
  'Entry Report',
  'AI往復券',
  '診断結果',
  '入口を共有',
] as const;

export type CommercialTerminologyKey = keyof typeof M55_COMMERCIAL_TERMINOLOGY;
