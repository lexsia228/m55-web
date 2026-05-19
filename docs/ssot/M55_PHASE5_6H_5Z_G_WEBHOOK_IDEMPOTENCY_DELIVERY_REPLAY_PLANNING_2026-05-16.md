# Phase 5-6H-5Z-G — Webhook idempotency／delivery／replay planning gate（2026-05-16 SSOT）

## 1. Phase名

**Phase 5-6H-5Z-G Webhook idempotency / delivery / replay planning gate**

---

## 2. 現在地

- **`5Y-A`：** ¥1,000 base の paid／complete 証跡は SSOT 済。**M55 UI：** **`接続を確認できませんでした`。**
- **`5Z-B`：** Production webhook endpoint **未観測**の finding が記録済み。
- **`5Z-D`：** Stripe 側 **`https://m55-webv2.vercel.app/api/stripe/webhook`**（**`checkout.session.completed`**）を **作成済み**。
- **`5Z-E`：** **`VERCEL_STRIPE_WEBHOOK_SECRET_HUMAN_ENV_CONFIGURATION_RECORDED`。`STRIPE_WEBHOOK_SECRET` は Production／Preview。**`whsec` 全文は未記録。**
- **`5Z-F`：** **`VERCEL_PRODUCTION_REDEPLOY_FOR_STRIPE_WEBHOOK_SECRET_ACTIVATION_GREEN`**（deployment 表示 **`74YQgkwgR…`**）。
- **本条：** **replay／delivery test 未実施。Production DB：** **本条では read/write しない。entitlement／report unlock：** **未証明。**

---

## 3. この Gate の目的

既に paid と見える **`checkout.session.completed`**（5Y-A コンテキスト）について、**replay や配送確認に進む前**に以下を docs のみで固定する。

- replay **必要性／危険性**
- **idempotency** と duplicate／副作用リスク
- **`5Z-H`** 相当の Production DB **read-only** preflight
- replay **対象定義**と **`5Z-I`** 等の実行 Gate
- **post-replay 検証**の順序
- **中止（stop）条件**

**本条コミットでは replay・delivery test・Production DB の read/write は行わない。**

---

## 4. Replay necessity assessment（A）

### replay が妥当になりうる理由

- 5Z-B により、**当時は Production endpoint がなかった**／届いていなかった可能性がある。
- 5Z-D〜F により **経路・秘密・実行デプロイ**がそろった今、**同イベントの replay でサーバ側 fulfillment が初めて実行されうる**。

### replay が慎重である理由

- handler／fulfillment は **複数テーブルへの書込**を伴う。
- **`/dtr/processing`** 経由などで **部分 artifact が既に存在**する場合、結果は「冪等で吸収」「ログのみ」「状態不整合の示唆」のいずれもありうる。**read-only preflight が先行**するべきである。

### 方針

- **広範な replay：** **禁止。**
- **単一イベント・exactly one attempt：** **`5Z-I` と明示 GO が付いた後のみ**許容設計。
- **本条：** replay **しない**。**`5Z-H` の結果**で「replay 妥当／不要／BLOCK」を分ける。

---

## 5. Pre-replay read-only plan（B・実行しない）

### 結論：`5Z-H` を推奨

**`Phase 5-6H-5Z-H` — Pre-replay Production DB read-only preflight** を挟み、artifact を **found／missing／unclear（行数程度・full ID なし）** で確認する。**本条では SELECT は実行しない。** SQL は **`5Z-H` SSOT** で redacted 条件のみとする。

### チェックリスト（テーブル名は実装に合わせる）

| 観点 |
|------|
| **`stripe_events`** — **`event.id` で先読み**。行があれば webhook は **`handleCheckoutCompleted`** に入らず 200 となりうる → replay が **no-op** になりうる |
| **`one_time_fulfillments`** — **`checkout_session_id`** が PRIMARY KEY（`supabase/migrations/20260308000000_one_time_checkout_fulfillment.sql`）。二重 INSERT は構造上不可；既存行時はコードが insert を skip |
| **`failed_fulfillments`** — **`missing_client_reference_id`** 等の失敗キュー |
| **`entitlements`** — **`upsert` とユーザ・プロダクトの競合規約 |
| **`entitlement_rights`** — **`upsert` と `user_id` + `right_key`**（DTR core は **`m55_p:core_origin`**／`DTR_CORE_RIGHT_KEY`） |
| **`reply_ticket_wallets`／`reply_wallet_ledgers`** — **`grantInitialIncludedReplyIfNeeded` は `already_granted` で再付与を抑制 |
| **`dtr_report_snapshots`** — upsert が失敗しても **`fulfill`** が **`ok: true`** になりうる盲点 |

**書込：** **`5Z-H` でも禁止**（本条・preflight は read-only）。

---

## 6. Idempotency design review（C・repo read-only）

### `app/api/stripe/webhook/route.ts`

- **`stripe_events` を `event.id` で照合**し、**既レコードなら 200 で終了**。同一イベントの **Stripe replay は再実行になりにくい**。
- **`checkout.session.completed` の処理成功後**に **`stripe_events` に insert**。**`23505` は duplicate 許容**。失敗経路では 500 と **`failed_fulfillments`** が走りうる。

### `lib/m55/dtrCoreCheckoutFulfillment.ts`

- ファイル先頭：**`Idempotent: safe to call with the same checkout session many times`**。
- **`one_time_fulfillments`**：既存 **`checkout_session_id`** で insert skip；**`23505` は並行を吸収**。
- **`entitlements`／`entitlement_rights`：** **`upsert` と `onConflict`**。
- **`grantInitialIncludedReplyIfNeeded`**：ウォレット欠如時のみ insert。**済みならスキップ**。
- **`dtr_report_snapshots`：** **`upsertDtrReportSnapshotAtFulfillment`** — ログのみで済む経路がある。

### 要 `5Z-H` で見る状態

**`stripe_events` あり／fulfillment 欠落／UI は locked** 等のとき、**replay ではなく read-path／repair Gate** が主戦場になりうる（replay は **`handleCheckoutCompleted` に入らず**)。

---

## 7. Replay target definition（D）

- **イベント type：** **`checkout.session.completed`** のみ。
- **コンテキスト：** **5Y-A の ¥1,000／paid**。
- **Evidence で接続（フルイベント ID は記録しない）：** **`M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001`**、**`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`**、**`M55-EVID-20260516-5Y-A-M55-UI-001`**。Stripe Dashboard 上で人間のみが対象イベントを特定する（イベントのフル文字列や Session／PI／Customer／email／ユーザー識別子は SSOT／AI に貼らない・記録しない）。

---

## 8. Replay execution Gate 設計（E・将来 `5Z-I`）

**`Phase 5-6H-5Z-I`（名前は別 SSOT で確定）** に限定して：

- **exactly one replay attempt**。**失敗時の自動再試行：** **しない**。**`BLOCKED`** で終了。
- **broad／大量 replay：** **禁止。**
- **新規決済／Checkout retry：** **禁止。**
- **手動 DB mutation：** **禁止。**
- **結果：** Stripe delivery／HTTP と Vercel ログ／（redacted）要約のみを後続証跡に。

---

## 9. Post-replay verification と stop conditions（F + G）

### 確認順序（replay 許可後の論理順）

1. Stripe：delivery と response code／（履歴側は redacted）
2. Vercel：`POST /api/stripe/webhook` 近傍のログ
3. fulfillment ログ要約（session／user は redact）
4. Production DB：**read-only**（**`M55-EVID-20260516-5Z-K-…`** などで）— 上記テーブルを **found／missing／unclear（行数）**
5. M55：**report unlock と UI**
6. **included reply-ticket**：wallet／ledger／snapshot と整合

**返金／rollback と DB 手書き：** **別 Gateのみ。**

### Stop／中止条件

replay GO または preflight を止めるとき：

- 対象 event／Checkout が Dashboard で **一意に決まらない**
- **full `whsec`／PI／Session** 等を **AI／SSOT に貼らざるを得ない状況**になった
- webhook URL／環境に **確信がない**
- idempotency または **existing fulfillment が unclear**
- **duplicate entitlement／wallet** が高確度で疑われる
- replay により **手動補正**が論点になる
- **返金判断**が前に出た

→ **replay せず、`5Z-H` read-only と repair／unlock read-path に分離。**

---

## 10. Evidence Registry（H）

### コンテキスト（全文脈。フル Stripe／Checkout ID は無し）

**`M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001`**、**`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`**、**`M55-EVID-20260516-5Y-A-M55-UI-001`**、**`M55-EVID-20260516-5Z-D-STRIPE-WEBHOOK-ENDPOINT-CREATED-001`**、**`M55-EVID-20260516-5Z-E-VERCEL-WHSEC-ENV-001`**、**`M55-EVID-20260516-5Z-F-VERCEL-REDEPLOY-WHSEC-ACTIVATION-001`**。

### 本条の planning evidence

| 項目 | 値 |
|------|-----|
| **`evidence_id`** | **`M55-EVID-20260516-5Z-G-WEBHOOK-REPLAY-IDEMPOTENCY-PLAN-001`** |
| **kind** | `webhook_replay_idempotency_plan` |
| **State** | **`PLANNED` / `REDACTED_RECORDED`** |

### 後続で発行予定（本条ではイベント値を書かない）

- **`M55-EVID-20260516-5Z-H-PROD-DB-PREFLIGHT-001`**
- **`M55-EVID-20260516-5Z-I-STRIPE-WEBHOOK-REPLAY-001`**
- **`M55-EVID-20260516-5Z-J-WEBHOOK-DELIVERY-RESULT-001`**
- **`M55-EVID-20260516-5Z-K-ENTITLEMENT-READONLY-VERIFY-001`**

※ **`5Z-C` で名前だけ予約した delivery 証跡**と **`5Z-J`** が重なる場合は **`5Z-J`** に統合してよい（本条は番号のみ固定）。

---

## 11. 判定

**`READY_FOR_PRE_REPLAY_PRODUCTION_DB_READ_ONLY_PREFLIGHT_GATE`**

（**`READY_FOR_STRIPE_WEBHOOK_REPLAY_EXECUTION_PLANNING_GATE`** は preflight を飛ばす経路であり、**本条では推奨しない**。）

---

## 12. 未実行事項

- Webhook **replay／delivery test**
- Stripe webhook 設定の変更
- **`STRIPE_WEBHOOK_SECRET`／`whsec`／env／その他 secret の変更**
- Vercel **redeploy**
- **Production DB read/write（本条および本条コミット）**
- 手動 entitlement／wallet／ticket
- Runtime／code／UI 変更
- 再決済／Checkout 再試行／返金 rollback
- **`/api/stripe/*`** の直接実行
- full Session／PI／Event／Customer／email／price／secret／service_role **`whsec` の記録

---

## 13. Next

**推奨：`Phase 5-6H-5Z-H` — Pre-replay Production DB read-only preflight gate**

**確認対象テーブル：** `stripe_events`、`one_time_fulfillments`、`failed_fulfillments`、`entitlements`、`entitlement_rights`、`reply_ticket_wallets`、`reply_wallet_ledgers`、`dtr_report_snapshots`。**結果：** found／missing／unclear（行数）のみ SSOT に書く。**Write 禁止**。

### `5Z-H` 後の代表的な分岐

| read-only で見えた状態 | Next |
|------------------------|------|
| fulfillment **missing** が主で replay が合理的 | **`5Z-I`**：単一イベント **exactly one replay** を **別 GO で**
| entitlement／**one_time が既にある** | **replay しない**。unlock／read-path を **`5Z-K`** で read-only
| **矛盾／不整合** | **replay 停止**。repair／support の **別 docs Gate**
| **unclear** が続く | **より狭い diagnostic** のみ

---

## Work anchor

- **`e50218c58486d87b4a68db9d9026ddb663ea53f5`** — `docs: record vercel stripe webhook secret redeploy`（**`5Z-F`**）。

**Prior：** `docs/ssot/M55_PHASE5_6H_5Z_F_VERCEL_PRODUCTION_REDEPLOY_FOR_STRIPE_WEBHOOK_SECRET_ACTIVATION_2026-05-16.md`
