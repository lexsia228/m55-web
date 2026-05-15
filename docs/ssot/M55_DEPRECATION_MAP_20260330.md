# M55 Deprecation Map — 20260330

**Status:** MAP（新規作業の参照可否を分類）  
**効力:** 本ファイルは **既存 docs を書き換えない**。分類と「新規でどこを読むか」だけを固定する。

---

## 1. 分類の定義

| 区分 | 意味 |
|------|------|
| **1. Authoritative now** | 新規作業で **そのまま参照してよい** 正本・準正本 |
| **2. Historical only** | **背景・経緯・証跡**として読む。製品の「いま」を単独で決めない |
| **3. Deprecated / do not use for new work** | **新規設計・新規コピー・新規ナビの根拠にしない**（読んでもよいが採用禁止） |

---

## 2. 新規作業でまず読む一覧（Authoritative コア）

以下を **2026-03-30 baseline** と組み合わせて優先する。

| 文書 | 用途 |
|------|------|
| [M55_BASELINE_FREEZE_20260330.md](./M55_BASELINE_FREEZE_20260330.md) | green 定義・ルート・語彙・ナビ意図の固定 |
| [M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md](./M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md) | 公開語彙・禁止主張 |
| [M55_CHECKPOINT_UPDATE_20260330_v3.md](./M55_CHECKPOINT_UPDATE_20260330_v3.md) | 直近チェックポイントと参照リンク |
| [M55_VISUAL_TOKEN_SPEC_v1.md](./M55_VISUAL_TOKEN_SPEC_v1.md) | 視覚トークン v1 |
| [M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md](./M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md) | ナビアイコン・画像・No-Rank 等の契約 |
| [M55_SYSTEM_SSOT.md](./M55_SYSTEM_SSOT.md) | システム全体方針 |
| [POST_REVIEW_UI_SWITCH_SSOT_v1.md](./POST_REVIEW_UI_SWITCH_SSOT_v1.md) | 審査後 UI 移行の制約 |
| [M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md](../audit/M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md) | `/prototype` 隔離の正史 |
| [PURCHASE_STATE_AND_SUCCESS_UI_CONTRACT.md](../PURCHASE_STATE_AND_SUCCESS_UI_CONTRACT.md) | 購入成功の状態モデル |
| [post_purchase_alignment_ssot_2026_03_08.md](./post_purchase_alignment_ssot_2026_03_08.md) | 購入後整合（表と実装差は QA 正本参照） |
| [../qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md](../qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md) | `/purchase/success` QA |

課金・Stripe・法務の層は既存の `WEB_*` / `STRIPE_*` / `M55_MONETIZATION_*` を引き続き authoritative として扱う（一覧は [SSOT_INDEX.md](./SSOT_INDEX.md) または社内台帳）。

---

## 3. 整理対象：旧 checkpoint 群

| 文書 | 推奨区分 | メモ |
|------|----------|------|
| [../CHECKPOINT_ROOT_20260315_v2.md](../CHECKPOINT_ROOT_20260315_v2.md) | **2. Historical** | 長期アーカイブ。旧語彙・旧タブ記述が混在。**単独で「いま」を決めない** |
| [CHECKPOINT_2026-03-02.md](./CHECKPOINT_2026-03-02.md) | **2. Historical** | 早期チェックポイント |
| [../audit/M55_TEAM_CHECKPOINT_2026-03-07_CURRENT_POSITION.md](../audit/M55_TEAM_CHECKPOINT_2026-03-07_CURRENT_POSITION.md) | **2. Historical** | 当時位置づけ |
| [../audit/M55_CURSOR_TEAM_CHECKPOINT_TEMPLATE_2026-03-06.md](../audit/M55_CURSOR_TEAM_CHECKPOINT_TEMPLATE_2026-03-06.md) | **2. Historical** | テンプレート |
| [M55_CHECKPOINT_UPDATE_20260330_v3.md](./M55_CHECKPOINT_UPDATE_20260330_v3.md) | **1. Authoritative** | **直近アンカー**（ROOT の代替ではない） |

---

## 4. 整理対象：旧 Web「全ページ／UI アーキ」SSOT（5 タブ・汎用 AI チャット記述）

以下は **ingest 由来の 2026-03-07 版** で、**現在のシェルナビ（A-plan）や「公開汎用 AI チャットなし」とは一致しない部分がある**。

| 文書 | 推奨区分 | メモ |
|------|----------|------|
| [M55_WEB_UI_ARCHITECTURE_SSOT_v1_2026-03-07.md](./M55_WEB_UI_ARCHITECTURE_SSOT_v1_2026-03-07.md) | **3. Deprecated（新規ナビ・新規ルート設計の根拠禁止）** | **5 タブ（Tarot / Chat / Prime 等）**、**/ai-chat** 明示。新規作業のナビ正本に **しない** |
| [M55_WEB_PAGE_MAPPING_AND_REUSE_MATRIX_v1_2026-03-07.md](./M55_WEB_PAGE_MAPPING_AND_REUSE_MATRIX_v1_2026-03-07.md) | **3. Deprecated（同上）** | ルート表が **旧 Bottom Nav** と一体。**新規マッピングの正本にしない** |
| [M55_WEB_BEHAVIORAL_AND_DATA_BINDING_CONTRACT_SSOT_v1_2026-03-07.md](./M55_WEB_BEHAVIORAL_AND_DATA_BINDING_CONTRACT_SSOT_v1_2026-03-07.md) | **2. Historical** 〜 **3.** の間 | データ結合の意図は参照価値あり。**ルート名・タブ数は実装＋ baseline で検証** |

**代替:** ナビ・ルーティングの「いま」は **実装**、[M55_BASELINE_FREEZE_20260330.md](./M55_BASELINE_FREEZE_20260330.md)、[M55_CHECKPOINT_UPDATE_20260330_v3.md](./M55_CHECKPOINT_UPDATE_20260330_v3.md)、および [M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md](./M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md)（アイコン契約のみ）を組み合わせる。

---

## 5. 整理対象：旧「ホーム」単体 SSOT

ingest HTML 由来の Home 政策は **Visual Contract** 経由で参照するのが安全。

| 文書 / 場所 | 推奨区分 | メモ |
|-------------|----------|------|
| `docs/audit/sources/ingest_2026-03-07/*Home*Policy*` | **2. Historical** | 原文アーカイブ |
| [M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md](./M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md) section 2 | **1. Authoritative** | Home 画像ポリシーの **契約入口** |

---

## 6. `CHECKPOINT_ROOT` 内の旧語彙・旧タブ記述

| 扱い | 説明 |
|------|------|
| **2. Historical** | section 17 等の「10の資質」表記やタブ列挙は **当時スナップショット** |
| **正本** | 語彙は [M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md](./M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md)、ナビ意図は [M55_BASELINE_FREEZE_20260330.md](./M55_BASELINE_FREEZE_20260330.md) |

---

## 7. 一行サマリ

**新規は baseline + allowlist + checkpoint v3 + visual token + 購入契約。** **5 タブ／/ai-chat を前提にした 2026-03-07 Web UI / Page Mapping は新規設計の根拠に使わない。** 長文 CHECKPOINT_ROOT は歴史のみ。**復元時のナビ錨は `M55_BASELINE_FREEZE_20260330.md` section 5 のみ — 旧 A-plan・5 タブ・汎用 AI チャット前提のナビ文書は recovery anchor として使わない。**
