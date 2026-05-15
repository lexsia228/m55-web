/**
 * DTR 商品棚のカタログ（単一ソース）。
 * 購入・決済ロジックは持たず、表示・所有判定のキーだけを定義する。
 * 新商品: `DTR_PRODUCT_CATALOG` に 1 行追加し、`entitlementRightKey` と `kind` を設定。
 */
import { LABEL_ENTRY_REPORT } from './myEntitlementLabels';

export const DTR_ENTRY_REPORT_RIGHT_KEY = 'm55_p:core_origin' as const;

export type DtrCatalogSlotId = 'entry_report' | 'compatibility_report' | 'additional_consult';

export type DtrCatalogSlotKind = 'live' | 'coming_soon';

export type DtrCatalogSlot = {
  id: DtrCatalogSlotId;
  kind: DtrCatalogSlotKind;
  /** live のときのみ。所有判定に使う entitlement right（coming_soon は null） */
  entitlementRightKey: string | null;
  title: string;
  subtitle: string;
  /** 詳細・問い合わせの着地（coming_soon や補助導線） */
  learnMoreHref: string;
};

export const DTR_PRODUCT_CATALOG: DtrCatalogSlot[] = [
  {
    id: 'entry_report',
    kind: 'live',
    entitlementRightKey: DTR_ENTRY_REPORT_RIGHT_KEY,
    title: LABEL_ENTRY_REPORT,
    subtitle: '本質の読み解き（保存版）',
    learnMoreHref: '/dtr/lp',
  },
  {
    id: 'compatibility_report',
    kind: 'coming_soon',
    entitlementRightKey: null,
    title: '相性レポート',
    subtitle: '二人の関係を読み解く',
    learnMoreHref: '/support',
  },
  {
    id: 'additional_consult',
    kind: 'coming_soon',
    entitlementRightKey: null,
    title: '追加相談枠',
    subtitle: 'レポートに沿った深掘り相談',
    learnMoreHref: '/support',
  },
];

export type SnapshotReadyLike = {
  ready: boolean;
  hasOwnership: boolean;
  hasPurchaseSnapshot: boolean;
};

/**
 * カタログ上「このスロットを所有」とみなすか（live のみ）。
 * Entry Report は entitlement または snapshot-ready の hasOwnership で補足。
 */
export function isCatalogSlotOwned(
  slot: DtrCatalogSlot,
  ent: { dtr_rights?: string[] } | null,
  snap: SnapshotReadyLike | null
): boolean {
  if (slot.kind !== 'live' || !slot.entitlementRightKey) return false;
  const rights = ent?.dtr_rights ?? [];
  if (rights.includes(slot.entitlementRightKey)) return true;
  if (slot.entitlementRightKey === DTR_ENTRY_REPORT_RIGHT_KEY && snap?.hasOwnership) return true;
  return false;
}
