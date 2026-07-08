/**
 * Account / data control public copy SSOT (display-only).
 * Deletion is support-request only — no automated deletion promises.
 */

/** Public-facing support contact (display + mailto only). */
export const M55_PUBLIC_SUPPORT_EMAIL = 'support@m-55.jp';
export const M55_PUBLIC_SUPPORT_MAILTO = `mailto:${M55_PUBLIC_SUPPORT_EMAIL}` as const;

/** My — subsection under ヘルプ・お問い合わせ */
export const ACCOUNT_DATA_MY_SECTION_TITLE = 'アカウント削除・データ消去';

export const ACCOUNT_DATA_MY_BODY_P1 =
  'アカウントや登録データの削除をご希望の方は、サポート窓口から申請してください。';

export const ACCOUNT_DATA_MY_BODY_P2 =
  '法令・決済・不正防止などの理由で保持が必要な記録を除き、対象範囲を確認のうえ対応します。';

export const ACCOUNT_DATA_MY_DEVICE_NOTE =
  'この端末に保存されたプロフィールや無料の見取り図の情報は、サーバー上のデータとは別に消去が必要です。';

export const ACCOUNT_DATA_REQUEST_CTA_LABEL = '削除・データ消去を申請する';

export const ACCOUNT_DATA_REQUEST_HREF = '/support#account-data-deletion';

/** Support — anchor section */
export const ACCOUNT_DATA_SUPPORT_SECTION_ID = 'account-data-deletion';

export const ACCOUNT_DATA_SUPPORT_SECTION_TITLE = 'アカウント削除・データ消去の申請';

export const ACCOUNT_DATA_SUPPORT_INTRO =
  'アカウントや登録データの削除は、サポート窓口で申請を受け付けます。';

export const ACCOUNT_DATA_SUPPORT_REQUEST_INFO =
  '申請時には、登録に使用したメールアドレスと、削除を希望する対象をお知らせください。';

export const ACCOUNT_DATA_SUPPORT_TARGET_EXAMPLES = [
  'アカウント',
  'プロフィール',
  '保存版',
  '追加読み解き',
  'この端末に保存された情報',
] as const;

export const ACCOUNT_DATA_SUPPORT_AFTER_VERIFY =
  '本人確認後、削除対象と保持が必要な記録を確認し、対応内容をご案内します。';

export const ACCOUNT_DATA_SUPPORT_SECURITY_NOTE =
  'パスワードや決済カード情報は送らないでください。';

export const ACCOUNT_DATA_SUPPORT_SAVED_REPORT_BOUNDARY =
  'マイページの保存版削除と、アカウント削除・データ消去の申請は別の手続きです。';

export const ACCOUNT_DATA_SUPPORT_RETENTION_BOUNDARY =
  '法令・決済・不正防止・監査等により保持が必要な記録は、削除対象外となる場合があります。';

export const ACCOUNT_DATA_SUPPORT_CONTACT_NOTE =
  '申請は、本ページ上部の問い合わせ先へご連絡ください。';

/** Privacy — アカウント・データの削除 */
export const ACCOUNT_DATA_PRIVACY_SECTION_TITLE = 'アカウント・データの削除';

export const ACCOUNT_DATA_PRIVACY_INTRO =
  'アカウントや登録データの削除をご希望の場合は、サポート窓口から申請できます。';

export const ACCOUNT_DATA_PRIVACY_AFTER_VERIFY =
  '本人確認後、法令・決済・不正防止などの理由で保持が必要な記録を除き、対象範囲を確認のうえ対応します。';

export const ACCOUNT_DATA_PRIVACY_DEVICE_P1 =
  'プロフィールや無料の見取り図などの一部情報は、利用中の端末内に保存される場合があります。';

export const ACCOUNT_DATA_PRIVACY_DEVICE_P2 =
  '端末内の情報とサーバー上の情報は別に管理されるため、消去方法も異なります。';

export const ACCOUNT_DATA_PRIVACY_DEVICE_P3 =
  '削除申請時に、端末内データの消去についても案内します。';

export const ACCOUNT_DATA_PRIVACY_SAVED_REPORT_BOUNDARY =
  '保存版をマイページから削除する操作と、アカウント削除・登録データ消去の申請は別の手続きです。';

export const ACCOUNT_DATA_PRIVACY_REQUEST_LINK_LABEL = 'アカウント削除・データ消去の申請';
