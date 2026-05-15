# M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1

Status: **Final classification (evidence-backed)** — **DB 変更なし**。現時点の証跡に基づく運用・migration 設計の正本。  

Date: 2026-04-29  

Related:

- **Phase A 再開ゲート:** `docs/ssot/M55_REPLY_WALLET_PHASE_A_RESTART_GATE_AFTER_ORPHAN_BLOCKER_v1.md`
- **実測正本:** `docs/ssot/M55_REPLY_WALLET_MINIMAL_BACKFILL_VERIFICATION_OBSERVATION_v1.md`
- **Missing fulfillment 方針:** `docs/ssot/M55_REPLY_WALLET_MISSING_FULFILLMENT_REMEDIATION_POLICY_v1.md`

---

## 1. 現時点の証跡

Minimal verification（`scripts/sql/staging/m55_reply_wallet_backfill_minimal_verification_hash.sql`）および先行観測に基づく **確定事項**：

| 項目 | 観測 |
|------|------|
| `wallet_user_without_snapshot_count` | **3** |
| 3 件すべて | `still_missing_snapshot`、`dtr_core_snapshot_count = 0` |
| 3 件すべて | **active entitlement + `stripe_session_id` あり**（`has_entitlement_stripe_session_id = true`、DTR 製品 `entitlement_count = 1`） |
| 3 件すべて | **`entitlement_rights` / `one_time_fulfillments` / DTR core snapshot：いずれも 0** |
| **返書利用済み相当** | **2 件**（`reply_sessions` / `reply_documents` に履歴あり、`consumed` 等は minimal 結果に準拠） |
| **未使用相当** | **1 件**（返書履歴なしパターン） |
| Gemini「1 件 Backfill 成功」 | **未採用**（現 DB 実測と整合しないため） |

---

## 2. 分類方針（最終ラベル）

**snapshot 復元材料**は、`m55_reply_wallet_snapshot_material_hash_diagnostic.sql` 等での追跡が **十分に完了し、安全再構成が監査上証明された**とは **まだ断定できない**。そのため **現時点では `repair_candidate` に確定しない**。

| ケース | 件数 | Phase A 再開ゲート上の分類 |
|--------|------|---------------------------|
| **返書利用済み** | **2** | **`legacy_protected` かつ `manual_review_quarantine`**（併記する。履歴保護を最優先しつつ自動 backfill は除外） |
| **未使用** | **1** | **`manual_review_quarantine`** |
| **`repair_candidate`** | **0**（現時点） | — |

**3 件すべて**について、**migration の自動 backfill 対象には含めない**（除外・quarantine）。  

---

## 3. 返書利用済み 2 件の扱い

- **`reply_sessions` / `reply_documents`** を **削除しない**（監査・履歴優先）。
- **`reply_ticket_wallets`、`entitlements`、`reply_wallet_ledgers`** を **削除しない**。
- **新規追加課金対象にしない**（正本請求との関係は既存ポリシー・法務確認に従う）。
- **将来的に CS／管理画面**で **個別確認**する対象として扱う。
- **`report_instance_id` 前提の migration** では、この 2 件を **`WHERE` で除外する条件（quarantine exclusion）に含める**こと（仕様）。

---

## 4. 未使用 1 件の扱い

- **`entitlements`、`reply_ticket_wallets`** を **保持**。**削除しない**。
- **新規追加課金対象にしない**（同上）。
- **CS／再入力／別フローの個別対応**候補（具体的手段は別チケット）。
- **`report_instance_id` migration では同上の除外条件**に含める。

---

## 5. migration への影響

| 項目 | 方針 |
|------|------|
| **Phase A での nullable 列追加**など、**既存行を自動で別テーブルの ID に紐づけない**変更 | **将来、staging 検証のうえ検討可** — 本ファイルは **`repair_candidate` ゼロ**でも **設計のみ**の前進余地を許容する（**実行はしない**）。 |
| **自動 backfill** で `report_instance_id` を既存ユーザーに載せる | **この 3 件には適用しない**（quarantine exclusion）。 |
| **NOT NULL / FK / restrictive UNIQUE の本適用** | **この 3 件が NULL・例外として残り得る間は NO-GO**。 |
| **migration plan 文書** | **quarantine exclusion** を **追記する必要あり**（本稿とゲート SSOT と整合させる）。 |

---

## 6. 禁止事項

- **推測による snapshot 生成禁止**
- **推測による fulfillment / rights 生成禁止**
- **`reply_ticket_wallets`、`entitlements`、`reply_wallet_ledgers`、`reply_sessions`、`reply_documents` の削除禁止**
- **Stripe 追加課金禁止**（当該是正と混同しない別ゲートとして扱う）
- **商品棚 UI の変更禁止**
- **Phase F／G に相当する一括処理禁止**
- **`report_instance_id` を根拠不十分のまま雑に埋めること禁止**

---

## 7. Phase A 再開可否（範囲の切り分け）

| 範囲 | 可否 |
|------|------|
| **`nullable column` の追加のみ**のような、**自動紐づけ backfill を含まない**設計レビュー・ドラフト準備 | **条件付きで再開候補** — **実行は環境ポリシーとゲートレビューの後のみ**。 |
| **`report_instance_id` の backfill、NOT NULL、FK、厳密 UNIQUE の完成** | **NO-GO**（本稿 §5・ゲート SSOT と同旨）。 |

**次の最小作業:** **migration plan** に **`quarantine exclusion`** を追記し、本稿の分類と **完全一致**させるレビューを通すこと。

---

## 8. 変更履歴

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | orphan 3 件の最終分類初版。返書2＝legacy+quarantine、未使用1＝quarantine、repair 確定0。 |
