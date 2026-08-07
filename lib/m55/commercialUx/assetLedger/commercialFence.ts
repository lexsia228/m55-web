/**
 * Single Free/Premium commercial fence — derived from approved M55 SSOT.
 * All governed surfaces must consume this authority; no route-local variants.
 */
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../terminology';

export const M55_COMMERCIAL_FENCE_VERSION = 'fence-v1' as const;

export const M55_COMMERCIAL_FENCE = {
  version: M55_COMMERCIAL_FENCE_VERSION,
  free: {
    headlineJa: '無料結果で分かること',
    itemsJa: [
      'いま表れやすい動き',
      '最も近い資質',
      '無料の答えがそれを支える理由',
      '一つの代表場面',
      '購入しなくても役立つ結論',
      '保存と、プライバシーに配慮した共有',
    ] as const,
    summaryJa:
      'いま表れやすい動き、最も近い資質、無料の答えがそれを支える理由、出やすい場面まで。',
  },
  premium: {
    headlineJa: `${T.premiumProduct}で分かること`,
    itemsJa: [
      '同じ動きが続く背景',
      '力が出やすい条件',
      '負担が重なる順番',
      '人と距離での負荷',
      '整え直し方',
      '次の行動が楽になる条件',
    ] as const,
    summaryJa:
      'その動きが続く背景、力が出やすい条件、負担が重なる順番、整え直しやすい順番まで。',
  },
  bridgeSupportingJa:
    '無料結果では、いま表れやすい動きまで。プレミアムでは、その動きが続く背景、力が出やすい条件、負担が重なる順番、整え直しやすい順番まで整理します。',
  lockedPreviewHeadingJa: '追加の6問をもとに、結果の背景と整え方を詳しく読み解きます',
  productNameJa: T.premiumProduct,
} as const;
