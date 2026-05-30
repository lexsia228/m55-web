/**
 * Canonical DTR Entry Report product labels (display-only SSOT).
 * Internal keys (m55_p:core_origin, DTR_CORE_STATIC_V1) must not appear as primary UI copy.
 */

/** JP primary product name — owned and reader surfaces. */
export const LABEL_PRODUCT_JP = '本質の読み解き';

/** EN auxiliary — unowned / LP / My / unowned aria only. */
export const LABEL_PRODUCT_EN = 'Entry Report';

/** Saved artifact format (not ownership state). */
export const LABEL_FORMAT_SAVED = '保存版';

/** Owned state pill / badge. */
export const LABEL_STATE_OWNED = '保存済み';

/** Legacy export for My / catalog EN title. */
export const LABEL_ENTRY_REPORT = LABEL_PRODUCT_EN;

/** Signed-out My hub body. */
export const MY_SIGNED_OUT_HUB_BODY =
  '保存版レポートや利用状況を確認するには、サインインが必要です。';

/** Owned report list aria-label (My). */
export const MY_REPORT_LIST_ARIA_LABEL = '保存版レポート一覧';

/** My consult block title. */
export const MY_CONSULT_BLOCK_TITLE = '相談返書（保存版に紐づく）';

/** My consult block body. */
export const MY_CONSULT_BLOCK_BODY =
  '相談は保存版レポートに紐づく範囲です。汎用チャットではなく、無制限の相談でもありません。';

/** DTR shelf overline. */
export const SHELF_OVERLINE = 'M55 保存版';

/** Shelf hint when owned and snapshot ready. */
export const SHELF_HINT_OWNED_READY = '保存版をお持ちです。下のカードから開けます。';

/** Shelf hint when owned and snapshot pending. */
export const SHELF_HINT_OWNED_PENDING =
  '保存版をお持ちです。本文の準備が完了すると開けます。';

export type DtrShelfAriaAction =
  | 'purchase'
  | 'expired'
  | 'open_ready'
  | 'open_not_ready'
  | 'connection_error';

/** aria-label prefix: JP product for owned; EN auxiliary for unowned. */
export function ariaLabelForDtrShelf(action: DtrShelfAriaAction, owned: boolean): string {
  const prefix = owned ? LABEL_PRODUCT_JP : LABEL_PRODUCT_EN;
  switch (action) {
    case 'purchase':
      return `${prefix} — 入手する`;
    case 'expired':
      return `${prefix} — 期限切れ`;
    case 'open_ready':
      return `${LABEL_PRODUCT_JP} — ${LABEL_STATE_OWNED}。レポートを開く`;
    case 'open_not_ready':
      return `${LABEL_PRODUCT_JP} — ${LABEL_STATE_OWNED}。レポートの準備状況を確認する`;
    case 'connection_error':
      return `${prefix} — 接続を確認できませんでした`;
    default:
      return `${prefix} — レポート`;
  }
}
