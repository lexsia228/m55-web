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
