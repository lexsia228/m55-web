/**
 * Canonical Growth UI terminology — P1 affected surfaces only.
 * Do not use for repository-wide legacy rewrites.
 */

export const M55_COMMERCIAL_TERMINOLOGY = {
  /**
   * Canonical Free entry action label. The header used to read 「無料で見る」 while
   * HOME, the product map, the /core prerequisite gate and the closing CTA read
   * 「無料で見てみる」, so the same action carried two labels. Every Free entry
   * surface now derives from this single term.
   */
  freeEntry: '無料で見てみる',
  freeResult: '無料結果',
  premiumProduct: 'プレミアムレポート',
  additionalValue: '追加読み解き',
  trait: '資質',
  evidenceTitle: '回答から見えた理由',
  shareAction: 'この結果を共有する',
  recipientAction: '自分も無料で見る',
  returnToFreeResult: '無料結果に戻る',
  viewPremiumReport: 'プレミアムレポートを見る',
  /**
   * Outcome-led, not work-led. The label used to read 「プレミアムの6問へ進む」, which
   * put the answering work in the primary position; the question count now stays
   * in the supporting effort line next to the CTA.
   */
  premiumBridgeCta: 'プレミアムの読み解きへ進む',
  selectPlan: 'プランを選ぶ',
  saveResult: '結果を保存する',
  checkoutProceed: '支払い画面へ進む',
  /** Alias of `freeEntry`, kept for existing call sites. */
  freeStart: '無料で見てみる',
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
