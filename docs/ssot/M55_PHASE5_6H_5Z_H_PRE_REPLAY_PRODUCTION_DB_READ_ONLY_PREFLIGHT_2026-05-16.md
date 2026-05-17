# Phase 5-6H-5Z-H — Pre-replay Production DB read-only preflight gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-H Pre-replay Production DB read-only preflight gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| Product | M55 **デジタル鑑定レポート（Standard）** |
| Amount | **¥1,000 JPY** |
| **`5Y-A`** | paid／complete 証跡 **記録済み** |
| **`5Z-D`** | Stripe Production webhook endpoint **作成済み** |
| **`5Z-E`** | **`STRIPE_WEBHOOK_SECRET`** が Vercel **設定済み**（**`whsec` 全文は未記録**） |
| **`5Z-F`** | Production redeploy **GREEN** |
| **`5Z-G`** | replay／idempotency **planning GREEN** |
| Replay | **未実行** |
| entitlement／report unlock | **未証明** |
| 本条での DB | Production で **`SELECT` read-only のみ**を想定。**`INSERT`／`UPDATE`／`DELETE`／`UPSERT`／書込 RPC／schema／migration：** **本条ではしない。** |

---

## 3. Evidence Registry（H）

### コンテキスト接続（フル Stripe／Checkout／user は書かない）

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-H-PROD-DB-PREFLIGHT-001`** | **本条（Production DB read-only preflight の SSOT 記録）** |
| **`M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001`** | 5Y-A 決済コンテキスト |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | 5Y-A イベント文脈（**イベントのフル文字列は転記しない**） |
| **`M55-EVID-20260516-5Y-A-M55-UI-001`** | 5Y-A の UI メッセージ文脈 |
| **`M55-EVID-20260516-5Z-G-WEBHOOK-REPLAY-IDEMPOTENCY-PLAN-001`** | replay 直前までの計画ゲート |

**フル：** Checkout Session ID／Payment Intent／Customer／email／client_reference_id／internal user／イベント ID／その他シークレット／**サービス側のロール権限文字列** — **証跡に記録しない**。Dashboard の検索に使っても AI／Cursor／SSOT へは貼らない。

---

## 4. Read-only 結果（テーブル別）

**転記規則：** **`found`**／**`missing`**／**`unclear`** のいずれか。**行数**は許容。**フル UUID／Stripe ID／email／ユーザー識別子は禁止**。

### 実行メタ（透明性）

- **本条コミットの Cursor 実行：** Production Supabase に **接続しない**。**以下の結果欄は、人手が Supabase（Dashboard／SQL Editor 等）で `SELECT` のみ実行した観察を後から転記することを前提**とする。**転記前は **`unclear`** のまま**とする運用でもよい（本条は転記されていない状態を明示）。
- **`5Y-A` のイベント／セッションで WHERE を固定するような SQL：** **SSOT 本文には載せない**。**必要なときは **`WHERE`** 値を **placeholder** とし、`product_id` やイベント種、`created_at` の **抽象的なウィンドウ**のみ。

---

| # | Artifact | 観点（要約） | `found` / `missing` / `unclear` | row count／メモ（redacted／optional） |
|---|----------|--------------|-----------------------------------|----------------------------------------|
| A | **`stripe_events`** | **`checkout.session.completed`** 相当の処理痕跡（**`event.id` は転記しない**） | **`unclear`** | — |
| B | **`one_time_fulfillments`** | DTR／該当 product の **`one_time`** 相当行 | **`unclear`** | — |
| C | **`failed_fulfillments`** | **`missing_client_reference_id`** 等の失敗カテゴリのみ | **`unclear`** | — |
| D | **`entitlements`** | **`DTR_CORE_STATIC_V1`** の **現行 entitlement** が存在するか | **`unclear`** | — |
| E | **`entitlement_rights`** | DTR core の **`right_key`**（コードと整合する名前程度まで可。**`user_id` 禁止**） | **`unclear`** | — |
| F | **`reply_ticket_wallets`** | included reply が **ウォレットに反映**されているか（残高など **集計のみ**） | **`unclear`** | — |
| G | **`reply_wallet_ledgers`** | ledger と wallet の整合（kind／件数など **度合いのみ**） | **`unclear`** | — |
| H | **`dtr_report_snapshots`** | snapshot **有無／kind／status の段階**（本文は redact） | **`unclear`** | — |
| I | **`dtr_guest_drafts`**（任意） | **必要時のみ**。draft／user linkage が **論理的に辿れるか**（具体 ID は出さない） | **`unchecked`（本条では未評価）** | 「必要なときに **`unclear`** へ昇格させる」とする |

---

## 5. 集約分類（Aggregate classification）

本条の証跡上、上表すべてが **`unclear`**（転記未完または未接続）であるため：

**`DB_PREFLIGHT_INCONCLUSIVE`**

（人手が転記するときは、複数 **`found`**／**`missing`** が揃って初めて下記へ **再上書き**する。）

---

## 6. Replay recommendation（replay は本条ではしない）

| 状態 | Recommendation |
|------|----------------|
| 本条の時点（**`DB_PREFLIGHT_INCONCLUSIVE`**） | **`DEEPER_READ_ONLY_DIAGNOSTIC_REQUIRED`** |
| （人手転記後）fulfillment が **すべて missing** | **`READY_FOR_EXACTLY_ONE_WEBHOOK_REPLAY_PLANNING`** |
| （人手転記後）entitlement **あり**、UI は locked | **`DO_NOT_REPLAY_DIAGNOSE_UNLOCK_READ_PATH`** |
| （人手転記後）**部分的** artifact のみ | **`DO_NOT_REPLAY_REPAIR_PLANNING_REQUIRED`** |
| （人手転記後）**`failed_fulfillments` に関連行** | **`DO_NOT_REPLAY_FAILURE_CAUSE_PLANNING_REQUIRED`** |
| linkage が **論理矛盾を示唆** | **`LINKAGE_MISMATCH_SUSPECTED`**（repair planning へ） |

---

## 7. 重要な制限（本条が証明しないこと）

- **replay を実行しない。**
- **DB を修理しない／書き換えしない。**
- **UI での report unlock を完了証明しない。**
- **返金・rollback を行わない。**
- **再試行決済／Checkout を行わない。**
- **Stripe／Vercel の設定・秘密を変更しない。**

---

## 8. 未実行事項

- Webhook **replay／delivery test**
- **Production の write**／手動 entitlement／wallet／ticket／その他 DDL・RPC 書込
- Stripe webhook 設定変更、`STRIPE_WEBHOOK_SECRET`／whsec／env 変更
- Vercel **redeploy**、ランタイム・コード・UI 変更
- 返金 rollback、**/api/stripe** 直呼び、再決済
- **フル ID／個人識別子／secret の証跡記録**

---

## 9. Next（本条の **`DB_PREFLIGHT_INCONCLUSIVE` に準拠）

**`Phase 5-6H-5Z-I` — Deeper read-only diagnostic gate** — または、人手転記済み結果で §5 が更新された時点での **規程どおりの `5Z-I` のいずれか**（replay 計画／unlock read-path／repair／failure cause）への **再ラベルのみ**。**replay および write は、その別 Gate と明示 GO が付いた後のみ。**

---

## 参考：redacted **`SELECT`** パターン（SSOT 用・値は placeholders）

```sql
-- 例：`stripe_events` の型別件数（時間窓のみ・識別子は使わない）
-- SELECT COUNT(*) FROM stripe_events
-- WHERE type = 'checkout.session.completed'
--   AND created_at BETWEEN '<redacted_start>' AND '<redacted_end>';
```

フル **`WHERE checkout_session_id = '…'`** や **`WHERE id = evt_…`** は **証跡に書かない**。

---

## Work anchor（直前 GREEN）

- **`fa3ce3b8c8f5ddb9b392863b6290bf70a39f1854`** — **`docs: plan webhook replay idempotency preflight`**（**`5Z-G`**）。
- **`e50218c58486d87b4a68db9d9026ddb663ea53f5`** — **`5Z-F`**（redeploy GREEN 記録／Work anchor）。

**Prior SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_G_WEBHOOK_IDEMPOTENCY_DELIVERY_REPLAY_PLANNING_2026-05-16.md`

---

### 本条での判定サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-H-PROD-DB-PREFLIGHT-001`** |
| **Aggregate** | **`DB_PREFLIGHT_INCONCLUSIVE`** |
| **Replay recommendation** | **`DEEPER_READ_ONLY_DIAGNOSTIC_REQUIRED`** |
| **`5Z-I` subtype（本条）** | **Deeper read-only diagnostic gate** |
