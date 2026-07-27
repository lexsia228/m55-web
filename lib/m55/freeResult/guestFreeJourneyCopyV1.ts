/**
 * Guest-first free journey presentation copy (UI only).
 */

export const GUEST_PROFILE_INTAKE_COPY_V1 = {
  titleJa: '無料結果を開く',
  leadJa: 'この入力は、無料結果を表示するために使います。',
  loginHintJa: 'ログインは結果をあとから開くときに使えます。',
  primaryActionJa: '無料結果を始める',
} as const;

export const GUEST_PROFILE_HANDOFF_COPY_V1 = {
  leadJa: '入力を受け取りました',
  subJa: '続いて、5つの問いを確認します',
} as const;

export const GUEST_SAVE_RESULT_COPY_V1 = {
  titleJa: 'この結果をあとから開く',
  bodyJa: '無料でログインすると、同じ結果をマイページから開けます。保存しても内容は変わりません。',
  actionJa: '結果を保存する',
} as const;

/**
 * Legacy share copy constants — Growth share UI uses privacySafeShareCardV1.
 * Kept for source-guard tests; do not include DOB/answers.
 */
export const FREE_RESULT_SHARE_COPY_V1 = {
  titleJa: 'この結果を共有する',
  bodyJa: '生年月日や回答は含まれません。資質名と短い一文だけを共有できます。',
  actionJa: '共有する',
  shareTextJa: 'M55で、いつもの動き方を無料で見てみた。',
  shareUrlPath: '/r',
  copiedJa: 'リンクをコピーしました',
  unavailableJa: '共有できませんでした。もう一度お試しください。',
} as const;

export const REANSWER_CONFIRM_COPY_V1 = {
  titleJa: '回答を変えて、もう一度見ますか？',
  bodyJa:
    '生年月日はそのまま残ります。現在の結果は、新しい回答を確定するまで変わりません。',
  cancelJa: 'キャンセル',
  confirmJa: '回答を変えて、もう一度見る',
  finalizeJa: 'この回答で結果を更新',
  finalizeTitleJa: 'この回答で結果を更新しますか？',
} as const;
