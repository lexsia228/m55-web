# Phase 5-6H-5Z-I-J — Manual fulfillment repair route selection / technical design gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-J Manual fulfillment repair route selection / technical design gate**

本条は **docs-only**（**経路選定**＋**DB write 前の technical design／mapping 要件の固定**）。**実行・API・DB write・manual grant・refund は行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Y-A`** | **¥1,000 DTR base** が **paid／complete** と観測（**フル ID は SSOT に書かない**）。 |
| **`5Z-H-A`** | Production DB **fulfillment artifact はすべて missing**（**row_count 0** と整合）。 |
| **`5Z-I-C`** | Dashboard **Resend／Replay UI not observed**。 |
| **`5Z-I-E`** | **Restricted key** により **CLI replay blocked**。 |
| **`5Z-I-H`** | Support/help で **manual／application-side** 経路を記録済み。 |
| **`5Z-I-I`** | **repair planning GREEN**（**R1 が第一候補**と **5Z-I-I** で記録）。 |
| **M55 replay delivery** | **0**。 |
| **M55 endpoint HTTP** | **none**。 |
| **entitlement／report unlock** | **unproven**。 |

**Work anchor（直前コミット — full hash）：** **`16bb308366b29de14c2580b4e3dccb5bfb542160`** — **`docs: plan manual fulfillment repair route`**（**`5Z-I-I`**）。

---

## 3. この Gate の目的

**manual fulfillment repair** の**実行経路を 1 本選定**し、**DB write より前**に必要な **technical design** と **Human-only mapping 要件**を **docs-only** で固定する。**本条では一切実行しない**。

---

## 4. Repo read-only design review（要約）

| 領域 | 要約 |
|------|------|
| **`app/api/stripe/webhook/route.ts`** | 先頭で **`stripe_events.event_id`** を **lookup**。**存在すれば即 200**（**グローバル dedupe**）。**`checkout.session.completed`** one-time DTR は **`fulfillDtrCoreFromCheckoutSessionId`**。**処理成功後**に **`stripe_events` insert**（失敗時は 500／**`failed_fulfillments`** の経路あり）。**repair 時の `stripe_events` と fulfillment の順序整合は §6 で設計課題**。 |
| **`fulfillDtrCoreFromCheckoutSessionId`** | **`checkout.sessions.retrieve`** で **mode／payment_status／productId／client_reference_id** を検証。**`one_time_fulfillments`／`entitlements`／`entitlement_rights`／wallet grant／`dtr_report_snapshots`** を生成・更新。**`checkout_session_id` で冪等**。**`eventIdForFulfillmentRow`** は webhook では **Stripe `event.id`**、別経路では **合成 ID 可**（コードコメント）。 |
| **`verifyStripeCheckoutSessionForDtrUser`** | **session complete／mode=payment／user 一致／product／paid** の検証。**Human read-only の「論理的同値」確認**の参照。 |
| **`resolveEntryReportOwnership`（`dtrOwnershipGate`）** | **SSOT は `dtr_report_snapshots` または 決済裏打ちの `entitlements`／`one_time_fulfillments`**。**`entitlement_rights` 孤児は owned にしない**。**repair 後の検証は snapshot／rights／OTF の三位一体を意識**。 |
| **Wallet／snapshot** | **`grantInitialIncludedReplyIfNeeded`**、**`upsertDtrReportSnapshotAtFulfillment`**、snapshot 成功時の **wallet `report_instance_id` リンク**。snapshot 失敗でも **fulfill は ok になり得る** → **post-verify で欠損検知**。 |
| **未解決（設計継続）** | **`stripe_events` へ実 `event.id` を insert するタイミング**（**webhook 再送との競合**）。**合成 `eventId` と将来 webhook の関係**。**repair ソースの監査ラベル**（**SSOT にはラベル名のみ**。値は書かない）。 |

---

## 5. Route selection

### 5.1 比較（R1〜R4）

| Route | 評価 |
|-------|------|
| **R1 Application-side fulfillment function reuse** | **既存 `fulfillDtrCoreFromCheckoutSessionId` で webhook と同じ DB 副作用**。**read-only 調査上、再利用が最も整合的**。 |
| **R2 Events API retrieval + app-side** | **Support 文脈と整合**。**Events API 呼び出しは別 Gate**。**R1 が成立しない場合の次点**。 |
| **R3 Manual SQL** | **低優先・高リスク**。分割ゲート必須。 |
| **R4 Refund／rollback** | **最終手段**。**`5Z-I-Q`** のみ。 |

### 5.2 選定結果

| Field | Value |
|--------|--------|
| **Selected route** | **`SELECTED_ROUTE_R1_APPLICATION_SIDE_FULFILLMENT_FUNCTION_REUSE`** |
| **Rationale** | **repo 上、DTR Core one-time の正規履行は本関数に集約**。**二重付与制御（`checkout_session_id`／upsert）**が既存。**新規 SQL 横断より安全に設計しやすい**。 |
| **Deferred** | **R2**：R1 実行経路が **セキュリティ／運用上** 組めないと判明した場合に再検討。 |
| **Rejected（本条時点）** | **R3**：いまの証跡では **不要**（**設計変更で再浮上し得る**）。**R4**：**repair 未実施のため未選択**。 |

**本条時点で R1 が repo 上 **不安全**と判明した場合の代替コード（**未採用**）：**`SELECTED_ROUTE_R2_EVENTS_API_APPLICATION_SIDE_PROCESSING`** または **`SELECTED_ROUTE_R3_MANUAL_SQL_REPAIR_PLANNING_REQUIRED`** → その場合 **Verdict は `READY_FOR_REPAIR_ROUTE_REDESIGN_GATE`** を想定（**本条は R1 で GO**）。

---

## 6. R1 technical design（`fulfillDtrCoreFromCheckoutSessionId` 再利用）

### 6.1 再利用の考え方

- **入力：** Human が **Stripe 画面のみ**で保持する **`checkout_session_id`**（**full は SSOT に書かない**）、**`expectedUserId`**（同上）、**`eventIdForFulfillmentRow`**（**実 Stripe `event.id` または合成 repair ID** — **値は Human／実行端末のみ**）。
- **処理：** 既存関数を **1 回**呼ぶ。**中で `checkout.sessions.retrieve`** により **paid／product／user** を再検証。
- **出力：** **`one_time_fulfillments`／`entitlements`／`entitlement_rights`／wallet／ledger／`dtr_report_snapshots`（条件付き）** — **webhook 成功時と同系**。

### 6.2 検証ゲート（関数内＋呼び出し前 Human）

- **productId：** **`DTR_CORE_STATIC_V1`**（metadata または既定）。
- **payment_status／mode／client_reference_id** — **`verifyStripeCheckoutSessionForDtrUser` と同値論理**。
- **amount／currency：** Human が **Dashboard で ¥1000 JPY／live** を確認（**SSOT には「一致／不一致」のみ**）。

### 6.3 **`stripe_events` との整合（設計上の分岐）**

- **Webhooks** は **先に `stripe_events` で event.id を見る**。**repair が fulfillment のみ先行**すると、**未登録 event.id で本番 webhook が再度走る**可能性がある（**fulfill は checkout 単位で冪等でも、全局 dedupe の挙味は要整理**）。
- **将来の候補パターン**（**実行は `5Z-I-M`、順序は `5Z-I-L` で確定**）：
  - **パターン A：** **`stripe_events` に実 `event.id` を事前登録**（**replay ではない**ことをコメント／運用で区別）し **webhook 側の重複突入を防ぐ**。
  - **パターン B：** **fulfill のみ先行**し、**事後**に **`stripe_events`／監査行**で **processed** とする（**webhook 初回到達時の挙動**と **5Z-I-L** で競合分析）。
- **本条では採否を確定しない**。**`5Z-I-K` の read-only 結果**を入れて **`5Z-I-L` で文言確定**。

### 6.4 **`failed_fulfillments`**

- **webhook** は **`fulfill` 失敗理由**で insert。**R1 repair runner** も **同様の分類**を **redacted log**＋**必要なら DB**（**`5Z-I-M` 以降**）で揃える設計とする。**本条では insert なし**。

### 6.5 Repair source ラベル（SSOT に書いてよいもの）

- **ラベル名のみ**：例 **「source: application_side_repair_runner」** 程度の **設計語**。**イベント全文／セッション全文は禁止**。

### 6.6 実行の分離

- **R1 の本番呼び出し**は **`5Z-I-M`** のみ。**それ以前は read-only／レビューのみ**。

---

## 7. Human-only mapping requirements

### 7.1 Stripe（read-only）

- **event type：** **`checkout.session.completed`**（概念）。**mode：live**。**amount：¥1,000**、**currency：JPY**。**metadata product：`DTR_CORE_STATIC_V1`**。**status：complete**、**payment_status：paid**。
- **email／client_reference_id／session／PI／customer／Event ID：** **Human のみが UI で確認**。**SSOT／AI／Cursor 禁止**。

### 7.2 Supabase（read-only）

- **target user が存在**、**決済所有者／Clerk identity と一致**。
- **既存 `DTR_CORE_STATIC_V1` entitlement なし**、**同一 checkout の `one_time_fulfillments` なし**。
- **repair 前：wallet／ledger／snapshot は missing であること**（**5Z-H-A と整合**）。
- **`dtr_guest_drafts`／profile／生年月日リンク：** **matched** でなければ **repair 中止**。
- **full `user_id`／email／session：** **SSOT 禁止**。

### 7.3 SSOT に出力してよいもの

**`matched`／`missing`／`unclear`／`mismatch`／`row_count`／テーブル名／ラベルのみ**。

### 7.4 SSOT に書いてはいけないもの

**フル Event／Session／PI／customer／email／`client_reference_id`／`user_id`／Request ID／Price ID／秘密鍵／whsec**。

---

## 8. Future gate sequence（設計）

| Gate | 役割 |
|------|------|
| **`5Z-I-K`** | **Human-only mapping read-only 確認**（**SELECT／Dashboard のみ**。**出力は §7.3 のみ**）。 |
| **`5Z-I-L`** | **Pre-write 実装／スクリプトレビュー**（**dry-run 先行**。**コード追加は別承認**）。 |
| **`5Z-I-M`** | **Exactly-one repair 実行**（**最初の possible write**）。 |
| **`5Z-I-N`** | **Post-repair DB read-only 検証**（**`stripe_events`／repair marker、OTF、entitlements、rights、wallets、ledgers、snapshots、`failed_fulfillments`**）。 |
| **`5Z-I-O`** | **UI report unlock** |
| **`5Z-I-P`** | **included reply-ticket** |
| **`5Z-I-Q`** | **refund／rollback**（**repair 失敗時のみ**） |

### 8.1 `5Z-I-L` スクリプト設計原則（本条で固定するルールのみ）

- **フル ID はローカル env／プロンプト**。**リポジトリにコミットしない**。**stdout は redacted**。**`fulfillDtrCoreFromCheckoutSessionId` 再利用**。**dry-run → exactly-once**。**product／user mismatch で即 stop**。**DB write は `5Z-I-M` まで禁止**（**レビュー Gate では実行しない**）。

### 8.2 `5Z-I-M` 実行ゲート

- **exactly-one**。**replay／再実行なし**。**エラー即 stop**。**broad mutation 禁止**。**返金・新規決済なし**。

### 8.3 Stop conditions（即時 redesign／中止）

- **full ID／secret を SSOT へ書く必要がある**
- **target user／session／event を Human が確定できない**
- **amount／payment_status／status／product metadata の不一致**
- **想定外に entitlement／wallet／snapshot が既に存在**
- **二重付与リスクが制御不能**
- **`dtr_guest_drafts`／profile リンク不明**
- **`fulfillDtrCoreFromCheckoutSessionId` を安全に再利用できない**（**経路・秘密・idempotency 破綻**）
- **broad DB mutation が必要**と判明
- **返金／rollback 必須**、**別決済・Checkout 再試行**、**idempotency バイパス**のいずれか

→ **`READY_FOR_REPAIR_ROUTE_REDESIGN_GATE`** へ戻す前提。

---

## 9. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-J-REPAIR-ROUTE-SELECTION-TECH-DESIGN-001`** | **本条：** **経路選定**＋**technical design**（**docs-only**）。 |
| **`M55-EVID-20260516-5Z-I-I-MANUAL-FULFILLMENT-REPAIR-PLAN-001`** | **`5Z-I-I`** 計画 |
| **`M55-EVID-20260516-5Z-I-H-STRIPE-SUPPORT-HELP-RESPONSE-001`** | Support **manual processing** |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | **FULFILLMENT_ARTIFACTS_MISSING** |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **5Y-A** 観測（**フル ID 未転記**） |

---

## 10. Determination（判定）

| Field | Value |
|--------|--------|
| **Verdict** | **`READY_FOR_HUMAN_ONLY_MAPPING_READ_ONLY_CONFIRMATION_GATE`** |
| **Selected route** | **`SELECTED_ROUTE_R1_APPLICATION_SIDE_FULFILLMENT_FUNCTION_REUSE`** |

**R1 が不採用となった場合のトークン：** **`READY_FOR_REPAIR_ROUTE_REDESIGN_GATE`**（本条では **使用しない**）。

---

## 11. 未実行事項

- **Production DB write／write RPC／migration／manual grant／Events API／Stripe API／`/api/stripe`／webhook replay／CLI／Dashboard resend**
- **新規決済／Checkout retry／返金 rollback**
- **Stripe 設定／env／whsec／redeploy／code／UI 変更**
- **フル IDs／secrets の SSOT 記録**

---

## 12. Next

**`Phase 5-6H-5Z-I-K` — Human-only mapping read-only confirmation gate**

- **read-only のみ**（**Supabase SELECT／Stripe Dashboard 読み取り**）。
- **Paid event／session／payment metadata** と **Supabase user／draft／profile／既存 artifact** を **Human のみ**で照合。
- **出力は `matched`／`missing`／`unclear`／`mismatch` のみ**。**mismatch で stop**。
- **DB write なし**。

---

## Work anchor & 本条パス

- **`16bb308366b29de14c2580b4e3dccb5bfb542160`** — **`docs: plan manual fulfillment repair route`**（**`5Z-I-I`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_J_MANUAL_FULFILLMENT_REPAIR_ROUTE_SELECTION_TECHNICAL_DESIGN_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-J-REPAIR-ROUTE-SELECTION-TECH-DESIGN-001`** |
| **Verdict** | **`READY_FOR_HUMAN_ONLY_MAPPING_READ_ONLY_CONFIRMATION_GATE`** |
| **Route** | **`SELECTED_ROUTE_R1_APPLICATION_SIDE_FULFILLMENT_FUNCTION_REUSE`** |
| **Next** | **`Phase 5-6H-5Z-I-K`** read-only human mapping |
