# M55 Checkpoint Update — 2026-03-30 (v3)

**Status:** CHECKPOINT（実装前提の参照資産アンカー）  
**Review 前提:** 本書は **事実の要約と参照リンク** を記す。数値・契約の変更は上位 SSOT の Review を要する。

---

## 1. 本更新で固定した参照資産

| 資産 | パス | 目的 |
|------|------|------|
| 公開主張・語彙 | [M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md](./M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md) | **10通りの資質** / **5つの解析軸** への統一、B.1 禁止句、自動監査との対応 |
| 視覚トークン正本 | [M55_VISUAL_TOKEN_SPEC_v1.md](./M55_VISUAL_TOKEN_SPEC_v1.md) | 色・タイポ・CTA・幅の v1 正本（NoTouch 含む） |
| 購入成功 QA | [../qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md](../qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md) | `/purchase/success` の最終確認手順と契約対照 |
| SSOT 公開面監査 | `scripts/run-sonnet-audit.js`（既定）／`--reserve-scan`（`app/api` 含む） | CI: `.github/workflows/ssot-audit.yml` |

---

## 2. エンジニアリング状態（2026-03-30）

- **公開面語彙:** `run-sonnet-audit.js` 既定スキャンで **violations 0** を確認済み（実装フェーズ完了時点）。  
- **リザーブスキャン:** `app/api` を含めると **プロンプト文言も同一ルール** に従う設計（内部 reserve）。  
- **ESLint:** `eslint.config.mjs` + `npm run lint:ssot` で公開面パスの語彙を補助（詳細はリポジトリの `package.json`）。

---

## 3. 関連ドキュメント整合性（確認結果）

| 文書 | 状態 | メモ |
|------|------|------|
| [M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md](./M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md) | **整合** | 本更新で「上位 SSOT」に Visual Token Spec へのポインタを追加（重複定義は Token Spec に集約） |
| [CHECKPOINT_ROOT_20260315_v2.md](../CHECKPOINT_ROOT_20260315_v2.md) | **歴史的記述あり** | section 17.C 等に旧語彙「10の資質」表記が残る。**正本は `M55_PUBLIC_CLAIMS_ALLOWLIST_v1`**。ROOT は巻末アーカイブ的参照として残置し、**新規作業は本 v3 と Allowlist を優先** |
| [post_purchase_alignment_ssot_2026_03_08.md](./post_purchase_alignment_ssot_2026_03_08.md) | **表の1行に実装差** | Success の「redirect」記載 vs 実装の **CTA 誘導**。QA 正本 [M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md](../qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md) で明示。`post_purchase_alignment` 自体の表修正は **別 Review** |
| [PURCHASE_STATE_AND_SUCCESS_UI_CONTRACT.md](../PURCHASE_STATE_AND_SUCCESS_UI_CONTRACT.md) | **整合** | 真理源・ポーリング・コピーガードと実装方針と矛盾なし |

---

## 4. 次フェーズ（本チェックポイントでは着手しない）

- `post_purchase_alignment` 表と実装語の **一行整合**（redirect → CTA 表現）  
- CHECKPOINT_ROOT の旧語彙の **編集方針**（履歴保持 vs 脚注のみ）のプロダクト判断  
- Token Spec に基づく **広域ビジュアルロールアウト**（[CHECKPOINT_ROOT section 17.F](../CHECKPOINT_ROOT_20260315_v2.md) の Pending に相当）

---

## 5. 一行サマリ

2026-03-30 時点で、**公開語彙・視覚トークン・購入成功 QA** の参照正本を `docs/ssot` / `docs/qa` に揃え、既存長文チェックポイントとの差分は **Allowlist / 本 v3 / QA チェックリスト** を優先して読む。
