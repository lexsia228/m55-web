import type { AffinityItem } from './types';
import { TYPE_CATALOG_LABELS } from './typeCatalogLabels';
import { TYPE_SCORE_SEEDS, type TypeScoreSeed, typeIndexFromStemLane } from './typeCatalogScores';

export type TypeCatalogSeed = TypeScoreSeed & {
  coreLabel: string;
};

/** 天干レーン 0–9 と 1:1。初版の正式ラベル（再訪・ロジック更新後もスナップショット優先）。 */
export const TYPE_CATALOG: readonly TypeCatalogSeed[] = TYPE_SCORE_SEEDS.map((seed, i) => ({
  ...seed,
  coreLabel: TYPE_CATALOG_LABELS[i]!,
}));

export { typeIndexFromStemLane };

export function affinityForTypeIndex(self: number): AffinityItem[] {
  const items: AffinityItem[] = [];
  for (let j = 0; j < 10; j++) {
    if (j === self) continue;
    const d = Math.abs(self - j);
    const ring = Math.min(d, 10 - d);
    const score = Math.max(12, 100 - ring * 11);
    const t = TYPE_CATALOG[j]!;
    items.push({ type: t.coreType, label: t.coreLabel, score });
  }
  return items
    .sort((a, b) => (b.score - a.score) || a.type.localeCompare(b.type))
    .slice(0, 5);
}
