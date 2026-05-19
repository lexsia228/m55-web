# Phase 5-6H-5Z-H-A — Human Supabase Production DB read-only evidence checkpoint（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-H-A Human Supabase Production DB read-only evidence checkpoint**

---

## 2. 現在地（前提）

- **`Phase 5-6H-5Z-H`** は **`DB_PREFLIGHT_INCONCLUSIVE`**（Cursor／AI は Production に接続せず転記未完だった）。
- **Human が Supabase Production で `SELECT` read-only を実施済み**。本条はその **転記のみ** を固定する。
- **Webhook replay：** **本条ではしない**。** **既に実行したわけでもない。**（**replay 未取得**）

---

## 3. Evidence Registry

| `evidence_id` | 役割 |
|---------------|------|
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | 本条：**Human **`SELECT`** 結果のチェックポイント** |
| **`M55-EVID-20260516-5Z-H-PROD-DB-PREFLIGHT-001`** | `5Z-H` skeleton／前提 |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **`5Y-A`** コンテキスト接続 |
| **`M55-EVID-20260516-5Z-G-WEBHOOK-REPLAY-IDEMPOTENCY-PLAN-001`** | replay 前 idempotency 計画ゲート |

**フル：** Checkout Session／Payment Intent／Customer／email／client_reference_id／user／イベント文字列など — **本条に書かない。**

---

## 4. Human `SELECT` 条件と結果（row_count）

### UTC ウィンドウ（人間クエリでのみ使用・SSOT は窓のみ）

**`2026-05-16 13:30:00+00`** 〜 **`2026-05-16 15:10:00+00`**

※ **WHERE に使った Stripe／session／イベントのフル識別子は SSOT に載せない。**

---

| クエリ別名／観点 | **`found` / `missing`** | **`row_count`** |
|-------------------|--------------------------|----------------|
| **`stripe_events`** | **`missing`** | **0** |
| **`one_time_fulfillments`** | **`missing`** | **0** |
| **`failed_fulfillments`** | **`missing`** | **0** |
| **`entitlements_DTR_CORE_STATIC_V1`**（集計別名／`product_id` による **DTR core** 視点） | **`missing`** | **0** |
| **`entitlement_rights_window`**（上記 UTC ウィンドウ内） | **`missing`** | **0** |
| **`reply_ticket_wallets_window`**（上記 UTC ウィンドウ内） | **`missing`** | **0** |
| **`reply_wallet_ledgers_window`**（上記 UTC ウィンドウ内） | **`missing`** | **0** |
| **`dtr_report_snapshots_DTR_CORE_STATIC_V1`**（上記コンテキスト） | **`missing`** | **0** |
| **`dtr_guest_drafts_window`**（上記 UTC ウィンドウ内） | **`missing`** | **0** |

---

## 5. Aggregate classification（集約）

**`FULFILLMENT_ARTIFACTS_MISSING`**

---

## 6. Replay recommendation（次の許容設計のみ・本条では実行しない）

**`READY_FOR_EXACTLY_ONE_WEBHOOK_REPLAY_PLANNING`**

---

## 7. Interpretation（解釈・ただし確定証明ではない）

- 対象 UTC ウィンドウ内で、転記済みクエリすべて **`row_count 0`** であるため、この窓において **M55 fulfillment に相当する artifact は Production DB に **観測されなかった** と記録する。
- Stripe 側では paid に見える一方、**当時 webhook 経路（endpoint／secret／redeploy が揃う前など）により `checkout.session.completed` が M55 に届いていなかった**という仮説と **両立する**。**本条は causal proof ではなく read-only の観測記録のみ。**
- **artifact が観測されない場合、単一イベントの replay を `5Z-I` で計画することが論理的には可能**となるが、**replay は別 Gate・明示 GO・exactly-one** とし **Production に write を発生させうる**。 broad replay／新規決済／手動 DB 変更は許容しない。
- **UI でのレポート unlocked／未 unlocked の状態は本条では証明しない。**

---

## 8. 重要な制限（本条が行わないこと）

- replay **実行しない**。
- Production DB に **書き込まない**。
- **手動 entitlement／wallet 付与をしない**。
- **report unlock を成立証明しない**。
- **返金・rollback をしない。** **再試行決済をしない**。
- **フル ID／secrets を本条に載せない。**

---

## 9. 未実行事項

- webhook **replay／delivery test**
- **Production INSERT／UPDATE／DELETE／UPSERT／write RPC**、schema／migration／手動 entitlement／ticket
- **Stripe webhook 設定変更**、`STRIPE_WEBHOOK_SECRET`／whsec／env 変更
- **Vercel redeploy**、ランタイム・コード・UI 変更
- **返金／Checkout 再試行**、`/api/stripe` 直呼び
- **フル ID／secret の SSOT 記載**

---

## 10. Next

**`Phase 5-6H-5Z-I`** — **Exactly-one Stripe webhook replay planning／execution gate**。

- **`5Y-A`** に紐づく既存 **`checkout.session.completed`** の **exactly one** replay を計画。**broad replay 禁止。**
- **新規決済／Checkout retry：** **しない。**
- **手動 DB mutation：** **しない。**
- **対象イベントのフル Event ID：** **Stripe Dashboard 上でのみ人間が保持**。**SSOT／AI には転記しない。**

---

## Work anchor（直前行）

- **`8503e3e902bf0bfe3ad1bb531b3ad5efc4210915`** — **`docs: record pre replay production db readonly preflight`**（**`Phase 5-6H-5Z-H`**）。

**本条 SSOT パス：** `docs/ssot/M55_PHASE5_6H_5Z_H_A_HUMAN_SUPABASE_PRODUCTION_DB_READ_ONLY_EVIDENCE_2026-05-16.md`

**Prior SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_H_PRE_REPLAY_PRODUCTION_DB_READ_ONLY_PREFLIGHT_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** |
| **Aggregate** | **`FULFILLMENT_ARTIFACTS_MISSING`** |
| **Replay recommendation** | **`READY_FOR_EXACTLY_ONE_WEBHOOK_REPLAY_PLANNING`** |
