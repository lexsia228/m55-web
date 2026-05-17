# Phase 5-6H-5Z-I-I — Manual fulfillment repair planning gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-I Manual fulfillment repair planning gate**

本条は **docs-only planning**。**Production DB write／Events API／Stripe API／webhook replay／CLI／manual grant／refund は実行しない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Y-A`** | **¥1,000 DTR base** が **paid／complete** と観測（**フル Stripe ID は SSOT に書かない**）。 |
| **`5Z-H-A`** | Production DB で **fulfillment artifact はすべて missing**（**`FULFILLMENT_ARTIFACTS_MISSING`**／**row_count 0** と整合）。 |
| **`5Z-I-C`** | Dashboard **Resend／Replay UI not observed**。 |
| **`5Z-I-E`** | **Restricted key** により **CLI replay blocked**。 |
| **`5Z-I-H`** | Support/help 回答を **`STRIPE_SUPPORT_HELP_RESPONSE_RECORDED_MANUAL_PROCESSING_ROUTE_RECOMMENDED_IF_RESEND_UNAVAILABLE`** として記録。 |
| **M55 replay delivery** | **0**。 |
| **M55 endpoint HTTP** | **none**。 |
| **entitlement／report unlock** | **unproven**。 |

**Work anchor（直前フェーズ）：** **`11d9ac2`** — **`docs: record stripe support help response for replay route`**（**`5Z-I-H`**）。

---

## 3. この Gate の目的

Stripe **Dashboard／CLI での replay が実行できない**状況において、**既存の paid evidence**（**Human が Stripe／Supabase で保持する情報**）を根拠に、M55 側で **fulfillment artifact を安全に成立させる**ための **manual／application-side repair** を **設計のみ**で SSOT に固定する。**本条では一切実行しない**。

---

## 4. Repo read-only fulfillment path review（要約）

### 4.1 `app/api/stripe/webhook/route.ts`

| 観点 | 要約 |
|------|------|
| **グローバル冪等** | `stripe_events` に **`event_id`** が既にあれば **以降の処理をスキップ**し **200**（**重複 webhook の受け皿**）。 |
| **`checkout.session.completed`** | `client_reference_id` 必須（無ければ `failed_fulfillments`）。**subscription** と **one-time（mode=payment）** に分岐。 |
| **One-time DTR** | `metadata.productId` または既定 **`DTR_CORE_STATIC_V1`**。許可セット **`ALLOWED_ONE_TIME_PRODUCTS`**。追加返書券レーンは別 delegate。 |
| **DTR Core one-time** | **`fulfillDtrCoreFromCheckoutSessionId`** へ委譲（`checkoutSessionId`、`expectedUserId`、`eventIdForFulfillmentRow: event.id`）。 |
| **成功後の `stripe_events` 挿入** | **`checkout.session.completed`** 処理が **200** の後、**`stripe_events` に `event_id`／`event_type` を insert**（**キーイベントでの冪等チェーン**）。失敗時は一部パスで **500**／**failed_fulfillments**。**repair 計画ではこの順序と競合しないよう別 Gate で設計**が必要。 |
| **`charge.refunded`** | `one_time_fulfillments` の `payment_intent_id` から revoke 等（repair 後の一貫性確認の参照）。 |

### 4.2 `lib/m55/dtrCoreCheckoutFulfillment.ts` — `fulfillDtrCoreFromCheckoutSessionId`

| 観点 | 要約 |
|------|------|
| **Stripe** | **`checkout.sessions.retrieve`**（二回）で **mode／payment_status／product／user** を検証。 |
| **冪等** | **`one_time_fulfillments.checkout_session_id`** ユニーク前提で **既存なら insert スキップ可**。 |
| **DB 書き込み（本関数内）** | `one_time_fulfillments` **insert**、`entitlements` **upsert**（`onConflict: user_id,product_id`）、`entitlement_rights` **upsert**（**`right_key` = `DTR_CORE_RIGHT_KEY` (`m55_p:core_origin`)**）、**`grantInitialIncludedReplyIfNeeded`**、**`upsertDtrReportSnapshotAtFulfillment`**、wallet の **`report_instance_id` リンク更新**（snapshot 成立時）。 |
| **synthetic `eventId`** | コメント上 **`eventIdForFulfillmentRow`** は webhook では **Stripe event.id**、success ページ等では **合成 ID** 可 → **repair 経路設計の入力**。 |
| **失敗** | `dtr_report_snapshots` がスキップされても **ok: true** になり得る（ログに reason）。**repair では snapshot 欠損の事後検知が別確認**。 |

### 4.3 `lib/m55/verifyStripeCheckoutSessionForDtrUser`

- **`/dtr/processing`** 等で **`session.complete`／mode=payment／client_reference_id／productId／payment_status=paid** を検証（**Human 実行パスの read-only 確認に相当する論理**）。

### 4.4 Ownership / unlock（`lib/m55/dtrOwnershipGate.ts` ほか）

- **Entry Report** は **`DTR_CORE_STATIC_V1`** と **`dtr_report_snapshots`**／**`entitlement_rights`**／**`entitlements`** の組合せで判定。**整合性ズレ時の “read repair”** コメントあり → **repair planning で誤注入と切り分け**に利用。

### 4.5 不明点・repair 設計で要詰め

- **`stripe_events` 未登録のまま `fulfillDtrCoreFromCheckoutSessionId` だけを呼ぶ**と、将来 **同一 `event_id` の webhook** が来たときの **グローバル dedupe と fulfillment の整合**（**5Z-I-J 以降で決定**）。
- **`upsertDtrReportSnapshotAtFulfillment`** が **`dtr_guest_drafts`／profile 不足**で skip する条件（コードログの **missing_profile** 等）。

---

## 5. Route comparison（R1〜R4）

| Route | 利点 | リスク・証跡 | 実行は別 Gate |
|-------|------|----------------|----------------|
| **R1 Application-side fulfillment reuse** | **`fulfillDtrCoreFromCheckoutSessionId`** が **webhook と同一ロジック**。**entitlement／wallet／snapshot の一貫性**。**冪等**再利用。 | **実行には Stripe secret とセッション参照**（Human ゲート）。**呼び出し経路**（script／将来 admin）が未なら **設計要**。**成功時は必ず DB write**。 | **5Z-I-M 等** |
| **R2 Events API + app-side** | Support 案内と整合。**イベント JSON** から **内部 handler 相当へ**の接続可能性。 | **Events API ＝本条禁止**。**event.id の重複と `stripe_events` の関係**を別設計。**実 API 実行は別 Gate**。 | **5Z-I-M 等** |
| **R3 Manual SQL** | ツールが無い環境でも理論上可能。 | **最優先度は低い**。**誤 INSERT／二重付与**。**必ず** **pre-write review／mapping／exactly-once** に分割。 | **5Z-I-L〜N** |
| **R4 Refund／rollback** | 履行不能時のユーザー救済。 | **最終手段**。**repair 可否判断の後**。 | **5Z-I-Q** のみ |

---

## 6. Required artifact plan（テーブル単位）

**原則：** **カラムの実値・フル UUID／Stripe ID は SSOT に書かない**。**「存在すべきキー」「衝突確認の軸」**のみ。

| Artifact | 必要性・重複防止・確認観点 |
|----------|----------------------------|
| **`stripe_events`** | Webhook の **グローバル dedupe**。**将来同一 `event_id` 到達時に fulfillment を二重実行しない**ために、**processed 済みとして記録するか**を **5Z-I-J 以降で決定**（**event_type**／タイミング）。**実 event_id は SSOT に禁止**。 |
| **`one_time_fulfillments`** | **`checkout_session_id`** を軸に **一意**。**`product_id`= `DTR_CORE_STATIC_V1`**、**`event_id`**（Stripe または synthetic）、**`payment_intent_id`**。**既存行の有無が repair 可否の核心**。 |
| **`failed_fulfillments`** | **repair 試行失敗時**の観測用。**本条では insert しない**。 |
| **`entitlements`** | **`onConflict: user_id,product_id`**。**`grant_type`／source／`stripe_session_id`**。**duplicate active** の有無を事前 read-only で確認。 |
| **`entitlement_rights`** | **`DTR_CORE_RIGHT_KEY`**（**`m55_p:core_origin`**）**upsert**。**Unlock／ownership gate の参照**。 |
| **`reply_ticket_wallets`**／**`reply_wallet_ledgers`** | **`grantInitialIncludedReplyIfNeeded`** 経由。**既存 active wallet** との **重複付与防止**（**available／ledger**）。 |
| **`dtr_report_snapshots`** | **product_id**／**checkout_session_id**／**envelope_json** 等。**draft／profile とリンク**。**失敗時は snapshot 欠損として UI へ影響**。 |
| **`dtr_guest_drafts` linkage** | **checkout metadata／user／draft UUID** の **Human-only 整合**。**不一致なら repair 中止**（**SSOT には matched／mismatch のみ**）。 |

---

## 7. Human-only mapping plan

| 領域 | Human が Dashboard／SQL で確認する内容（例） | SSOT に書いてよいもの |
|------|-----------------------------------------------|------------------------|
| **Stripe** | **`checkout.session.completed`**、**product `DTR_CORE_STATIC_V1`**、**amount／currency（¥1000 JPY）**、**paid／complete**、**customer email／client_reference_id／session／PI** | **matched／mismatch／found／missing** のみ。**フル ID 禁止**。 |
| **Supabase** | **user_id**／**draft**／**profile**／**既存 entitlement／wallet／snapshot** | 同上 |

---

## 8. Pre-write safety plan

1. **read-only SELECT 先行**（Production／Stripe Dashboard）。
2. **dry-run／SQL 本文レビュー**（**5Z-I-L**）。
3. **exactly-one 実行**（**5Z-I-M**）。
4. **直後 SELECT 検証**（**5Z-I-N**）。
5. **UI unlock**（**5Z-I-O**）。
6. **included reply-ticket**（**5Z-I-P**）。
7. **refund は別 Gate（5Z-I-Q）のみ**。**repair 完了前の返金は禁止**（計画レベル）。

### Repair execution gate 分離（予定ラベル）

| Phase | 内容 |
|-------|------|
| **5Z-I-J** | Route **最終選択**＋**pre-write 技術設計**（**docs-only** 既定） |
| **5Z-I-K** | Human-only **ID mapping** read-only **確定** |
| **5Z-I-L** | Pre-write **SQL／script レビュー** |
| **5Z-I-M** | **Exactly-one** repair **実行** |
| **5Z-I-N** | Post-write **read-only** 検証 |
| **5Z-I-O** | **UI report unlock** 検証 |
| **5Z-I-P** | **included reply-ticket** 検証 |
| **5Z-I-Q** | **Refund／rollback** のみ（repair 失敗時・最終） |

### Stop conditions（即時ゲートアウト）

- **フル ID／secret を SSOT に書くことが前提**となる計画
- **対象 user／session／event を Human が確定できない**
- **product が `DTR_CORE_STATIC_V1` でない**／**amount／payment_status／status の不一致**
- **既存 entitlement／wallet／snapshot が不審に存在**（想定外）
- **二重付与リスクが制御不能**
- **snapshot／draft／profile の紐付けが不明**
- **コードパスが read-only 確認で説明できない**
- **広範囲 DB 変異が必要**と判明
- **repair 前に refund 又は新規決済を混在**させる提案

---

## 9. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-I-MANUAL-FULFILLMENT-REPAIR-PLAN-001`** | **本条：** **manual／application-side repair の docs-only 計画**。 |
| **`M55-EVID-20260516-5Z-I-H-STRIPE-SUPPORT-HELP-RESPONSE-001`** | Support/help **manual processing** 言及 |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | **FULFILLMENT_ARTIFACTS_MISSING** |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **5Y-A** 決済観測（**フル ID 未転記**） |

---

## 10. Determination（判定）

**本条推奨：** **`READY_FOR_MANUAL_FULFILLMENT_REPAIR_ROUTE_SELECTION_GATE`**

**補助（R1 が構造上の第一候補のときの設計焦点）：** **`READY_FOR_APPLICATION_SIDE_FULFILLMENT_REUSE_DESIGN_GATE`**（**`fulfillDtrCoreFromCheckoutSessionId` 再利用**の技術設計にフォーカル。**最終的には route 選択 Gate で R1〜R4 を明示**）。

---

## 11. 未実行事項

- **Production DB の INSERT／UPDATE／DELETE／UPSERT／write RPC／migration 適用**
- **manual entitlement／wallet／ticket**
- **Events API／Stripe API／`/api/stripe`／webhook replay／CLI／Dashboard resend**
- **新規決済／Checkout retry／返金 rollback**
- **Stripe 設定／env／whsec／Vercel redeploy／code・UI 変更**
- **フル IDs／secrets の SSOT 記録**

---

## 12. Next

**`Phase 5-6H-5Z-I-J` — Manual fulfillment repair route selection / technical design gate**

- **docs-only を既定**。**明示承認なしに実行しない**。
- **一つの経路を選択**：**application-side fulfillment 再利用**／**Events API + app**／**manual SQL**／**refund 計画のみ**。
- **正確な read-only mapping 要件**（Human-only）を定義。

---

## Work anchor & 本条パス

- **`11d9ac2`** — **`docs: record stripe support help response for replay route`**（**`5Z-I-H`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_I_MANUAL_FULFILLMENT_REPAIR_PLANNING_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-I-MANUAL-FULFILLMENT-REPAIR-PLAN-001`** |
| **Verdict** | **`READY_FOR_MANUAL_FULFILLMENT_REPAIR_ROUTE_SELECTION_GATE`** |
| **Next** | **`Phase 5-6H-5Z-I-J`** route selection / technical design（docs-only 既定） |
