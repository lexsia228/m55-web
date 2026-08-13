/**
 * LIVE Stripe Checkout customer-facing copy.
 * Authority: Product.description on the four existing LIVE Products.
 * Checkout sessions send `price` only — no product_data override.
 *
 * Names stay on the Stripe Product objects. This module freezes the
 * payment-moment descriptions so provider copy cannot silently drift.
 */

import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  DTR_CORE_FULL_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_V1_PRODUCT_KEY,
} from './reply/replyTicketCheckoutConstants';

export const STRIPE_CHECKOUT_PUBLIC_COPY_VERSION = 'm55-stripe-checkout-public-copy-v1' as const;

export const STRIPE_CHECKOUT_LEGACY_PUBLIC_TERMS = [
  '保存版',
  '相談返書',
  '相談',
  'FULL化',
  'FULL',
] as const;

export const STRIPE_CHECKOUT_PUBLIC_COPY = {
  light: {
    productKey: DTR_CORE_LIGHT_V1_PRODUCT_KEY,
    publicNameJa: 'M55 プレミアムレポート ライト',
    descriptionJa:
      '4章のプレミアムレポートです。追加読み解き1件を含みます。レポート本体はフルと同じで、違いは追加読み解きが1件であることです。買い切り・自動更新なし。',
  },
  full: {
    productKey: DTR_CORE_FULL_V1_PRODUCT_KEY,
    publicNameJa: 'M55 プレミアムレポート フル',
    descriptionJa:
      '4章のプレミアムレポートです。追加読み解きは合計5件です。レポート本体はライトと同じで、違いは読み解けるテーマ数です。買い切り・自動更新なし。',
  },
  upgrade: {
    productKey: DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
    publicNameJa: 'M55 プレミアムレポート フルへの切り替え',
    descriptionJa:
      'ライトからフルへの切り替えです。プレミアムレポートは増えません。追加読み解きが合計5件になります。追加は¥600、この順の合計は¥1,600です。買い切り・自動更新なし。',
  },
  additionalReading: {
    productKey: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
    publicNameJa: '追加読み解き',
    descriptionJa:
      '購入済みのプレミアムレポートをもとに、いま気になっている1テーマを整理します。会話を続ける形式ではありません。買い切り・自動更新なし。',
  },
} as const;

export const STRIPE_CHECKOUT_PUBLIC_COPY_ITEMS = [
  STRIPE_CHECKOUT_PUBLIC_COPY.light,
  STRIPE_CHECKOUT_PUBLIC_COPY.full,
  STRIPE_CHECKOUT_PUBLIC_COPY.upgrade,
  STRIPE_CHECKOUT_PUBLIC_COPY.additionalReading,
] as const;
