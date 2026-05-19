# Phase 5-6H-5Z-I-L — Pre-write repair script / implementation review gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-L Pre-write repair script / implementation review gate**

本条は **docs-only**：**R1 repair 実行前**の **runner／実装の設計レビュー**。**コード追加・dry-run 実行・DB write・API 実行は行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-J`** | **`SELECTED_ROUTE_R1_APPLICATION_SIDE_FULFILLMENT_FUNCTION_REUSE`**（**`fulfillDtrCoreFromCheckoutSessionId`**）。 |
| **`5Z-I-K-A`** | **`SUPABASE_MAPPING_EXPECTED_MISSING_CONFIRMED`**／**`READY_FOR_PRE_WRITE_REPAIR_SCRIPT_REVIEW_GATE`**。 |
| **Human safe label（参照のみ・非 ID）** | checkout **`cs_live_JSRW`**／user **`user_36xz`** — **SQL 値に使用禁止**。 |
| **本条** | **実装レビュー・設計固定のみ**。**実行なし**。 |

**Work anchor：** **`1bc92138aa7c792602ef7cb536f237f2b7e083ab`** — **`docs: record human supabase mapping readonly evidence`**（**`5Z-I-K-A`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-L-PRE-WRITE-REPAIR-SCRIPT-REVIEW-001`** | **本条：** **pre-write script／runner 設計レビュー**。 |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | Supabase **expected missing** |
| **`M55-EVID-20260516-5Z-I-J-REPAIR-ROUTE-SELECTION-TECH-DESIGN-001`** | R1 技術設計 |
| **`M55-EVID-20260516-5Z-I-H-STRIPE-SUPPORT-HELP-RESPONSE-001`** | Support **manual route** |

**転記禁止：** フル Session／Event／PI／user／email／client_reference／秘密鍵／whsec。**safe label を DB リテラルとして扱わない**。

---

## 4. Repo read-only implementation review

### 4.1 `fulfillDtrCoreFromCheckoutSessionId`（`lib/m55/dtrCoreCheckoutFulfillment.ts`）

| 観点 | 要約 |
|------|------|
| **シグネチャ** | `params: { checkoutSessionId: string; expectedUserId: string; eventIdForFulfillmentRow: string }` → `Promise<FulfillFromCheckoutSessionResult>` |
| **Stripe（本関数が検証する）** | **`checkout.sessions.retrieve`（二回）**。**`mode=payment`**、**`payment_status=paid`**、**`ALLOWED_ONE_TIME_PRODUCTS`**（既定 **`DTR_CORE_STATIC_V1`** メタまたはフォールバック）、**`client_reference_id === expectedUserId`**。 |
| **Stripe（本関数が検証しない — runner が §6 で補強）** | **`livemode`**、**`amount_total`/`currency`**、**`success_url`/`cancel_url`**、**`metadata.productId`** の明示比較（本関数は **許可セット＋既定 product** のみ）。 |
| **DB 書き込み** | **`one_time_fulfillments`**（`checkout_session_id` 既存なら insert スキップ）、**`entitlements` upsert**（onConflict **`user_id,product_id`**）、**`productId === DTR_CORE_STATIC_V1` のときのみ** **`entitlement_rights` upsert**（**`DTR_CORE_RIGHT_KEY`**）、**`grantInitialIncludedReplyIfNeeded`**、**`upsertDtrReportSnapshotAtFulfillment`**、snapshot 成功時のみ **`reply_ticket_wallets`** の **`report_instance_id`** リンク更新。**`reply_wallet_ledgers`** は **`grantInitialIncludedReplyIfNeeded` 側**（関数内経路）。 |
| **冪等** | **`one_time_fulfillments.checkout_session_id` 軸**。insert の **競合 `23505` は続行**。以降の upserts／grant／snapshot が **複数回归り可能**。 |
| **`eventIdForFulfillmentRow`** | JSDoc：**webhook は実 Stripe event id／success ページ等は synthetic 可**。**SSOT に値を書かない**。 |

### 4.2 Webhook（`app/api/stripe/webhook/route.ts`）

| 観点 | 要約 |
|------|------|
| **dedupe** | **`stripe_events.event_id` 存在 → 即 200**（**handler 未実行**）。 |
| **成功後** | **`stripe_events` insert**（`event_id`／`event_type`）。 |
| **repair との整合** | **§7** 参照。 |

### 4.3 検証ヘルパー

- **`verifyStripeCheckoutSessionForDtrUser`**（**`lib/m55/verifyStripeCheckoutSessionForDtr.ts`**）— **`/dtr/processing`／purchase で利用**。**runner が dry-run／execute 前提で再利用するか、§6 の追加項目（livemode／金額等）込みで手書き検証するかは `5Z-I-M` で確定**。

### 4.4 Ownership／snapshot／wallet

- **`dtrOwnershipGate`**：**snapshot または entitlements／OTF 裏打ち**。**repair 後の `5Z-I-N` で確認**。
- Snapshot 欠損：**fulfill は ok のまま**になり得る — **検証ゲートで捕捉**。

### 4.5 未解決（実行ゲートで最終確定）

- **`stripe_events.event_type`** の repair 用文字列（例 **`checkout.session.completed`**）は **repair runbook で `5Z-I-M` 固定**（本条 **§7** と整合）。
- **`failed_fulfillments`**：`manual repair` 失敗時に **webhook と同種の `insertFailedFulfillment`** を呼ぶかは **コード未作成のため `5Z-I-M` で確定**。
### 4.6 Schema／migration メモ（read-only）

- Snapshot 関連：**`upsertDtrReportSnapshotAtFulfillment` が参照する **`dtr_report_snapshots`** 等**。**ログヒントにある migration**（例 **`20260420000000`／`20260421000000`**）。**本条は DDL を変更しない**。

---

### 設計論点インデックス（A〜I）と本条の対応

| Letter | 論点 | 本条 |
|--------|------|------|
| **A** | Repair runner 形式 | **§5** one-off **local**。 |
| **B** | 必須 input | **§5.2**。 |
| **C** | write 前 validation | **§6**。 |
| **D** | **`fulfillDtrCoreFromCheckoutSessionId` 再利用** | **§4**。 |
| **E** | **`stripe_events`／イベントマーカー** | **§7**。 |
| **F** | Dry-run 設計 | **§8.1**。 |
| **G** | 実行モード（exactly-once） | **§8.2**。 |
| **H** | Post-write verification | **§9**。 |
| **I** | Stop conditions | **§10**。 |

---

## 5. Proposed repair runner design（**本条はコードを作らない**）

### 5.1 形式比較

| 形式 | 利点／欠点 |
|------|-------------|
| **One-off local runner（推奨）** | **最小表面**。**full ID はローカル env／プロンプト**。**stderr／log は redacted**。**repo に秘密・ID を残さない**。 |
| **admin-only HTTP** | **攻撃面・認証**が増える。**本条では不採用推奨**。 |
| **Vercel 一時 `/api`** | **deploy／review** が重い。**不採用推奨**。 |

**選定：** **one-off local runner**（**`5Z-I-M` で最小コードまたは手順のみ承認後に作成**）。

### 5.2 入力（全文 SSOT に書かない）

| Placeholder（設計語） | 扱い |
|------------------------|------|
| **`FULL_CHECKOUT_SESSION_ID`** | Human **ローカルのみ**。 |
| **`FULL_USER_ID`（または解決済み Supabase／Clerk id）** | Human **ローカルのみ**。 |
| **`FULL_STRIPE_EVENT_ID`**（**`stripe_events` 整合用・推奨**） | Human **ローカルのみ**。 |
| **`SYNTHETIC_REPAIR_LABEL`**（OTF **`event_id` 列のみの代替が必要な場合）** | **ローカル生成**。**SSOT 禁止**。 |
| **定数／ラベル** | **`repair_reason`**：例 **`webhook_missed_before_endpoint_ready`**。**`source`**：例 **`manual_repair`**／**`post_payment_fulfillment_repair`**（**ログ redacted にのみ**。） |
| **safe label** | **`cs_live_JSRW`**／**`user_36xz`** — **照合説明のみ**。 |

### 5.3 出力

- **`READY`／`STOP`**、**検証ブール一覧**（**masked**）、**結果 reason コードのみ**。**full ID は出さない**。

### 5.4 pseudocode（イメージ）

```text
// PSEUDO — コミット禁止・実行禁止（5Z-I-L）
load FULL_* from human local env ONLY
IF dry-run:
  optionally retrieve Stripe session → validate (§6) → print redacted booleans ONLY → STOP (no DB)
IF execute (5Z-I-M のみ):
  optionally INSERT stripe_events (§7, human-held event.id) BEFORE fulfill
  fulfillDtrCoreFromCheckoutSessionId({ checkoutSessionId, expectedUserId, eventIdForFulfillmentRow })
  IF NOT ok THEN STOP — no silent retry
  redacted log ONLY
RUN ONCE — no retry loop
```

---

## 6. Validation checklist（write 前にすべて true でなければ STOP）

### 6.1 Stripe Session（retrieve 結果）

| # | Check |
|---|--------|
| 1 | **retrieve 成功** |
| 2 | **livemode=true** |
| 3 | **mode=payment** |
| 4 | **status=complete** |
| 5 | **payment_status=paid** |
| 6 | **amount_total=1000**／**currency=jpy**（**ログは redacted**） |
| 7 | **metadata.productId＝`DTR_CORE_STATIC_V1`** |
| 8 | **success_url／cancel_url** が **`m55-webv2.vercel.app`** 意図と整合 |

### 6.2 User／既存データ

| # | Check |
|---|--------|
| 9 | **client_reference_id** が **対象ユーザー**と一致 |
|10 | **`5Z-I-K-A` 以後の read-only と矛盾しない**（**OTF／entitlements／rights／wallet／ledger／snapshot／failed：期待 missing**） |

### 6.3 共通

| # | Check |
|---|--------|
|11 | **二重付与リスク：** **pre-insert 済み／同時実行**を避け **exactly-once** のみ |
|12 | **`failed_fulfillments` が repair をブロックする残件になっていない**（**現在 row_count 0** と整合。**再 SELECT は `5Z-I-M` 直前でも可**） |

**いずれか false → STOP（mismatch）— 自動リトライなし。**

---

## 7. `stripe_events`／event marker 決定（本条の選定）

| 決定 token | **`READY_WITH_ACTUAL_STRIPE_EVENT_ID_HUMAN_ONLY`** |

**理由：**

1. **`app/api/stripe/webhook/route.ts`** は **`stripe_events` に `event_id` があれば処理本体に入らず 200**。Human が **`fulfill` の直前**に **Production へ **`stripe_events`** へ **実 Stripe の **`event.id`** の行を INSERT** すれば、**遅延再配送でも handler はスキップ**され、二重ランの表面が縮む。
2. **`one_time_fulfillments.event_id`** は **同じ実 **`event.id`** を **`eventIdForFulfillmentRow`** に渡せば** webhook 経路と **列値が一致**（合成は OTF にのみ依存させない）。
3. **`READY_WITH_SYNTHETIC_REPAIR_EVENT_MARKER`** を **`stripe_events.event_id`** に使う場合、**将来届く webhook の **`event.id`** と **一致しない**ため **dedupe に無効**。**OTF 列のみ synthetic はコード上あるが、`stripe_events` の主戦略とはしない**。

**未取得：** 実 **`event.id`** が確定しない場合は **`UNRESOLVED_STRIPE_EVENTS_HANDLING_NEEDS_DESIGN`** とし、`5Z-I-M` 前に Dashboard read-only で再収集。**代替は `stripe_events` pre-insert を捨て、**fulfill のみ（関数冪等）**に寄せる許容運用** — **重複処理リスク許容時のみ **`5Z-I-M`** で明文**。**本条では方針と順序のみ**。

**本条の選定：** **`READY_WITH_ACTUAL_STRIPE_EVENT_ID_HUMAN_ONLY`**。**推奨 insert 順序（`5Z-I-M` runbook）：** **`stripe_events` INSERT → `fulfillDtrCoreFromCheckoutSessionId`**（**webhook と逆順になるが dedupe の目的には適合**。）

---

## 8. Dry-run／実行モード（未来 `5Z-I-M` 向け設計 **`5Z-I-L` では実行しない**）

### 8.1 Dry-run（設計要件）

| 項目 | 要件 |
|------|------|
| **Stripe** | **retrieve と §6 の boolean のみ**。 |
| **DB** | **一切 write しない**（**Production SELECT も原則不要／必要時は Human 別ゲートで read-only のみ**。） |
| **出力** | **redacted／boolean のみ**。 |

### 8.2 実行モード（`5Z-I-M`）

- **exactly-once**。**失敗時の自動 retry 禁止**。**second payment／replay／webhook／refund 禁止**。**full ID を stdout に出さない**。

---

## 9. Post-write 検証（`5Z-I-N` 設計入力）

| Artifact | **期待（read-only AFTER）** |
|----------|-----------------------------|
| **one_time_fulfillments** | **found expected**（row_count≥1。**full id 転記しない**） |
| **entitlements「`DTR_CORE_STATIC_V1`」** | **found expected** |
| **entitlement_rights（DTR core）** | **found expected** |
| **wallet／ledger（included grant）** | **found expected** |
| **dtr_report_snapshots** | **found expected**（snapshot skip 時は **policy を `5Z-I-N` で判断**） |
| **failed_fulfillments** | **missing または許容できる既知のみ** |

---

## 10. Stop conditions（本条または `5Z-I-M` で design gate-out）

| 条件 |
|------|
| シグネチャ／副作用が本文より **不透明**／**広範囲 refactor 必須** |
| **秘密鍵／full ID を repo へコミットする必要がある** |
| **user／payment mapping が不明** |
| **§6 を機械的に強制できない** |
| **想定外に既存 artifact** |
| **`stripe_events`／dedupe が **本条の採用方針**で説明できない** |
| **snapshot／draft ソース不明**／**冪等性を否定** |
| **返金決定が必要** |

→ **`PRE_WRITE_REPAIR_SCRIPT_REVIEW_BLOCKED_NEEDS_DESIGN`** または **`READY_FOR_MINIMAL…` に進まず** **再レビュー**。

---

## 11. Determination（判定）

| Field | Value |
|--------|--------|
| **本条採用** | **`READY_FOR_MINIMAL_REPAIR_RUNNER_CODE_DESIGN_GATE`** |
| **補助（dry-run を先に名指しする運用での別表記）** | **`READY_FOR_DRY_RUN_REPAIR_RUNNER_DESIGN_OR_SCRIPT_CREATION_GATE`**（**意味上は **`5Z-I-M` が runner コード＋no execution を含む**）。 |
| **阻塞時** | **`PRE_WRITE_REPAIR_SCRIPT_REVIEW_BLOCKED_NEEDS_DESIGN`** |

**推奨（コード未作成のため）：** **`READY_FOR_MINIMAL_REPAIR_RUNNER_CODE_DESIGN_GATE`**

---

## 12. 未実行事項

- **Production DB write／RPC／repair script 実行／dry-run の実行**
- **Events API／Stripe API（runner 経由含む）／`/api/stripe`／replay／CLI／Dashboard resend**
- **新規決済／Checkout／返金**
- **Stripe／env／whsec／redeploy／runtime／コード／UI 変更（本条コミット）**
- **フル IDs／secrets の記録／safe label の DB 化**

---

## 13. Next

**`Phase 5-6H-5Z-I-M`:**

| 状態 | Gate 名 |
|------|---------|
| **本条 verdict（推奨）** | **`5Z-I-M` — Minimal repair runner code design／no execution gate** |
| Dry-run を独立名で先に強調する運用 | **`5Z-I-M` — Dry-run repair runner gate**（同一 **M** 内で順序だけ前後） |
| **Blocked** | **`5Z-I-M` — Repair design blocked checkpoint** |

**explicit GO まで、実行・dry-run・DB write はしない。**

---

## Work anchor & 本条パス

- **`1bc92138aa7c792602ef7cb536f237f2b7e083ab`** — **`docs: record human supabase mapping readonly evidence`**（**`5Z-I-K-A`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_L_PRE_WRITE_REPAIR_SCRIPT_IMPLEMENTATION_REVIEW_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-L-PRE-WRITE-REPAIR-SCRIPT-REVIEW-001`** |
| **stripe_events decision** | **`READY_WITH_ACTUAL_STRIPE_EVENT_ID_HUMAN_ONLY`** |
| **Verdict** | **`READY_FOR_MINIMAL_REPAIR_RUNNER_CODE_DESIGN_GATE`** |
| **Next** | **`Phase 5-6H-5Z-I-M`** （code design／no execution 既定） |
