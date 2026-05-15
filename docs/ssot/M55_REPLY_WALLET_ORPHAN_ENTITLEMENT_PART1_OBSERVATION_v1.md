# M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_PART1_OBSERVATION_v1

Status: **Evidence record** — **no DB mutations** documented here beyond observation.  

Date: 2026-04-29  

Related:

- Template: `docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_PART1_RESULT_TEMPLATE_v1.md`
- Policy: `docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_REMEDIATION_POLICY_v1.md`
- NEXT diagnostic: `scripts/sql/staging/m55_reply_wallet_orphan_fulfillment_lineage_hash_diagnostic.sql`

---

## 1. 対象および分類結果（PART1 済み）

**件数：** 同一コホート **3** ユーザー（詳細は `hashed_user_id` 単位でチケットに保存。**生 `user_id` は転記しない。**）

| hashed_user_id | likely_reason |
|----------------|----------------|
| **チケット照合：** 2 行 | **`reply_used_without_snapshot`** |
| **チケット照合：** 1 行 | **`entitlement_exists_but_no_snapshot_and_no_right`** |

---

## 2. 列挙の観測（3件すべて一致したもの）

PART1 で **すべての行において同一**だった項目（転記済み証跡の要約）。

| 論理項目 | 観測値 |
|-----------|--------|
| `wallet_status` | `active` |
| `entitlement_count`（DTR 製品行） | `1` |
| `entitlement_status_list`（DTR に限定される列挙） | `active` |
| `entitlement_grant_type_list` | `one_time` |
| `entitlement_source_list` | `stripe_checkout` |
| `core_right_count`（`right_key=m55_p:core_origin`） | **`0`** |
| `right_key_list_count` | **`0`** |
| `one_time_fulfillment_count`（DTR 製品行） | **`0`** |
| `dtr_snapshot_count`（DTR 製品） | **`0`** |
| `any_snapshot_count` | **`0`** |

**異なる項目（分類のみ）：** `reply_session_count` / `reply_document_count` / `consumed_count` 等により **2／1 が `likely_reason` で二分**済み。

---

## 3. 削除禁止の理由

請求監査・返書ログ・ユーザー体験の根拠になる。**推測に基づく DELETE は行わない**（`REMEDIATION_POLICY_v1` §3・§4 と同旨）。

---

## 4. 自動 backfill 禁止の理由

`dtr_report_snapshots` と **将来の `report_instance_id`** の **自動補填**は、データ由来が未確定のため **しない**。**Phase A〜・migration は NO-GO**。

---

## 5. 「entitlement が active / one_time / stripe_checkout なのに **rights／fulfillment／snapshot が無い**」ことについて

Fulfillment アプリコード（`fulfillDtrCoreFromCheckoutSessionId`）の **通常経路では**、`one_time_fulfillments` 挿入 → `entitlements` upsert →（DTR 成品で）`entitlement_rights` upsert → `dtr_report_snapshots` が続く。**今回は `entitlements` 行のみが残り、rights / fulfillment / snapshot のいずれもゼロ**に見える。

考えられる大分類は **処理中断・順序異常・手動運用混入・別環境からのリストア・削除後残存**などであり、**未検証**。次節 SQL で **チェックアウト相関値のハッシュ一致**のみを読む。

---

## 6. 返書利用済み 2 件

`reply_used_without_snapshot`：**消費・セッション・文書のいずれかあり**。**履歴削除は不可**。snapshot 復元可否は **ソースデータの確認後**のみ。

---

## 7. 未使用類似 1 件

`entitlement_exists_but_no_snapshot_and_no_right`：**rights 無し**。**active entitlement と wallet が並存**。**削除しない**。**manual_review／復元候補**。

---

## 8. Phase A 以降

**進めない**。GO は `PART1_RESULT_TEMPLATE_v1` §4 および **`REMEDIATION_POLICY_v1` §8** に従う。

---

## 9. 次に必要な診断：**fulfillment lineage（hash-only）**

`m55_reply_wallet_orphan_fulfillment_lineage_hash_diagnostic.sql` により、`entitlements.source=stripe_checkout` / `grant_type=one_time` の行と **`stripe_session_id` に基づくハッシュ同一性**での **`one_time_fulfillments`／`dtr_report_snapshots` の有无**を読み。**生 ID は出さない**。

※ `entitlements` に **`purchase_ref` / stripe 由来のイベント列**がある場合は **先有 `information_schema`、列がある環境のみ**コメント付きクエリ解禁（SQL ヘッダー参照）。

---

## 10. 厳守

- **本ファイルは証跡の要約のみ**。**DELETE/UPDATE は書かない。**  
- **Stripe・Webhook・商品棚・Phase A**には **進めない**。  
- **秘密鍵・Webhook secret を記載しない**。  

---

## 11. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PART1 結果に基づく観測 SSOT と次診断の位置づけ |
