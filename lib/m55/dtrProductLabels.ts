/**
 * Canonical DTR Entry Report product labels (display-only SSOT).
 * Internal keys (m55_p:core_origin, DTR_CORE_STATIC_V1) must not appear as primary UI copy.
 */

/** JP tier-neutral saved-report label (shelf / owned surfaces). LP chrome uses PAID_DTR_LP. */
export const LABEL_PRODUCT_JP = 'プレミアムレポート';

/** @deprecated Internal legacy EN key only — do not render as primary public UI copy. */
export const LABEL_PRODUCT_EN = 'Entry Report';

/** Processing eyebrow + /dtr/core document title (tier-neutral). */
export const LABEL_SAVED_REPORT_METADATA_JP = 'M55 プレミアムレポート';

/** My owned surfaces — tier-neutral saved report name. */
export const LABEL_SAVED_REPORT_MY_JP = 'プレミアムレポート';

/** Saved artifact format (not ownership state). */
export const LABEL_FORMAT_SAVED = 'プレミアムレポート';

/** Owned state pill / badge. */
export const LABEL_STATE_OWNED = '保存済み';

/** Legacy export for My / catalog EN title. */
export const LABEL_ENTRY_REPORT = LABEL_PRODUCT_EN;

/** My page formal title (h1). */
export const MY_PAGE_TITLE = 'マイページ';

/** Hero body (My). */
export const MY_PAGE_HERO_BODY =
  'プレミアムレポートの状態や利用できるサービス、登録済みのプロフィールをここで確認できます。';

/** Signed-out My hub body. */
export const MY_SIGNED_OUT_HUB_BODY =
  'プレミアムレポートや利用状況を確認するには、サインインが必要です。';

/** §2 はじめて使う方へ */
export const MY_FIRST_TIME_GUIDE_TITLE = 'はじめて使う方へ';
export const MY_FIRST_TIME_GUIDE_BODY =
  '無料の見取り図は、メインページから始めます。ニックネームと生年月日を入力して、自分に出やすい輪郭を確認してください。';
export const MY_FIRST_TIME_CTA_LABEL = '無料の見取り図を開く';
export const MY_FIRST_TIME_CTA_HREF = '/home';

/** §3 あなたのプレミアムレポート */
export const MY_SAVED_REPORT_SECTION_TITLE = 'あなたのプレミアムレポート';
export const MY_SAVED_REPORT_INTRO_COMMON = 'プレミアムレポートの状態をここで確認できます。';
export const MY_SAVED_REPORT_INTRO_OWNED = '購入済みのプレミアムレポートは、ここから開けます。';
export const MY_SAVED_REPORT_LOADING = '利用状況を確認しています。';
export const MY_SAVED_REPORT_EMPTY_NO_PROFILE =
  'まだプレミアムレポートはありません。まずは無料の見取り図から始めてください。';
export const MY_SAVED_REPORT_EMPTY_READY =
  'まだプレミアムレポートはありません。内容と料金は商品ページで確認できます。';
export const MY_SAVED_REPORT_PROCESSING =
  'プレミアムレポートを準備しています。完了すると開けるようになります。';
export const MY_SAVED_REPORT_OWNED_NOTE_P1 =
  'プレミアムレポートは、購入時までに入力された情報をもとに作成・保存されています。';
export const MY_SAVED_REPORT_OWNED_NOTE_P2 =
  'ここでプロフィールを更新しても、購入済みのプレミアムレポートの内容は自動では変わりません。';
export const MY_SAVED_REPORT_VALUE_TITLE = 'プレミアムレポート';
export const MY_SAVED_REPORT_VALUE_BODY = '購入時の内容をそのまま読み返せます。';
export const MY_SAVED_REPORT_CTA_PLAN_LABEL = 'プレミアムレポートのプランを見る';
export const MY_SAVED_REPORT_CTA_PLAN_HREF = '/dtr/lp';
export const MY_SAVED_REPORT_CTA_OPEN_LABEL = 'プレミアムレポートを読み返す';
export const MY_SAVED_REPORT_CTA_OPEN_HREF = '/dtr/core';
/** Light owner → FULL upgrade (reply-tickets checkout lane). */
export const DTR_LIGHT_TO_FULL_UPGRADE_CTA_LABEL = 'フルに切り替える（¥600）';
export const DTR_LIGHT_TO_FULL_UPGRADE_NOTE =
  '追加読み解きを合計5件まで利用できます';
export const MY_SAVED_REPORT_ENT_ERROR =
  '利用状況を確認できませんでした。時間をおいて再度お試しください。';
export const MY_SAVED_REPORT_SNAP_ERROR =
  'プレミアムレポートの状態を確認できませんでした。時間をおいて再度お試しください。';

/** §3 / §4 state badges */
export const MY_BADGE_NOT_PURCHASED = '未購入';
export const MY_BADGE_PREPARING = '準備中';

/** §4 サービス一覧 */
export const MY_SERVICES_SECTION_TITLE = 'サービス一覧';
export const MY_SERVICES_INTRO =
  '利用できるサービスと、未購入・近日公開の状態を確認できます。';

/** §5 追加読み解き */
export const MY_CONSULT_SECTION_TITLE = '追加読み解き';
export const MY_CONSULT_BODY_PRE_OWNED =
  '追加読み解きは、プレミアムレポートに紐づく機能です。プレミアムレポートを利用できる状態になると、プレミアムレポート内から確認できます。';
export const MY_CONSULT_BODY_OWNED_P1 =
  '追加読み解きは、プレミアムレポートに紐づく機能です。1回の追加読み解きにつき、一つのテーマを書いて追加読み解きを確認します。';
export const MY_CONSULT_BODY_OWNED_P2 =
  '利用状況の確認と送信は、プレミアムレポートを開いたあとの追加読み解き画面で行えます。';
export const MY_CONSULT_CONTEXT_BODY =
  'プレミアムレポートをもとに、今気になっている一つのテーマを整理します。';
export const MY_CONSULT_USAGE_UNAVAILABLE =
  '追加読み解きの利用状況は、プレミアムレポートを開いて確認できます。';
export const MY_CONSULT_CTA_LABEL = '追加読み解きを始める';
export const MY_CONSULT_CTA_HREF = '/dtr/core#consultation-room';

/** §6 プロフィール */
export const MY_PROFILE_SECTION_TITLE = 'プロフィール';
export const MY_PROFILE_EDIT_CTA_LABEL = 'プロフィールを編集する';

/** §7 ヘルプ・お問い合わせ */
export const MY_HELP_SECTION_TITLE = 'ヘルプ・お問い合わせ';

/** Owned report list aria-label (My). */
export const MY_REPORT_LIST_ARIA_LABEL = 'プレミアムレポート一覧';

/** @deprecated Use MY_CONSULT_SECTION_TITLE */
export const MY_CONSULT_BLOCK_TITLE = MY_CONSULT_SECTION_TITLE;

/** @deprecated Use MY_CONSULT_BODY_PRE_OWNED */
export const MY_CONSULT_BLOCK_BODY = MY_CONSULT_BODY_PRE_OWNED;

/** DTR shelf overline. */
export const SHELF_OVERLINE = 'M55 プレミアムレポート';

/** Shelf hint when owned and snapshot ready. */
export const SHELF_HINT_OWNED_READY = 'プレミアムレポートをお持ちです。下のカードから開けます。';

/** Shelf hint when owned and snapshot pending. */
export const SHELF_HINT_OWNED_PENDING =
  'プレミアムレポートをお持ちです。本文の準備が完了すると開けます。';

export type DtrShelfAriaAction =
  | 'purchase'
  | 'expired'
  | 'open_ready'
  | 'open_not_ready'
  | 'connection_error';

/** aria-label prefix: saved-report JP for owned and unowned purchase surfaces. */
export function ariaLabelForDtrShelf(action: DtrShelfAriaAction, owned: boolean): string {
  const prefix = owned ? LABEL_SAVED_REPORT_MY_JP : LABEL_SAVED_REPORT_METADATA_JP;
  switch (action) {
    case 'purchase':
      return `${prefix} — ${MY_SAVED_REPORT_CTA_PLAN_LABEL}`;
    case 'expired':
      return `${prefix} — 期限切れ`;
    case 'open_ready':
      return `${LABEL_SAVED_REPORT_MY_JP} — ${LABEL_STATE_OWNED}。${MY_SAVED_REPORT_CTA_OPEN_LABEL}`;
    case 'open_not_ready':
      return `${LABEL_SAVED_REPORT_MY_JP} — ${LABEL_STATE_OWNED}。レポートの準備状況を確認する`;
    case 'connection_error':
      return `${prefix} — 接続を確認できませんでした`;
    default:
      return `${prefix} — レポート`;
  }
}
