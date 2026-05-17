# Phase 5-6H-5Z-I — Exactly-one Stripe webhook replay execution gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I Exactly-one Stripe webhook replay execution gate**

---

## 2. 現在地（前提）

- **`5Y-A`**：**paid／complete** に関する証跡は事前 SSOT で接続済み。**フルイベント ID は本条に載せない。**
- **`5Z-D〜F`：** Stripe Production endpoint／**`STRIPE_WEBHOOK_SECRET`**／Vercel Production redeploy まで GREEN。
- **`5Z-G`**：idempotency／replay 計画 GREEN。
- **`5Z-H-A`**：Human Supabase Production **`SELECT`** で **fulfillment artifact はすべて missing（`row_count` 0）**。**Aggregate **`FULFILLMENT_ARTIFACTS_MISSING`**／**`READY_FOR_EXACTLY_ONE_WEBHOOK_REPLAY_PLANNING`**。
- **本条の意図：** Human が **既存の `checkout.session.completed`（5Y-A コンテキスト）を exactly one 回だけ** Stripe UI から replay し、**delivery の観測を redacted で SSOT に残す**こと。
- **本条コミット（Cursor）の限界：** **Stripe／Vercel を直接観測できない。** 以下 §4.2 は **「Human から delivery response／status の転記が本条作成時に Cursor にない」**状態を明示する。**Human が実行→転記済み outcomes を共有できれば、この文書および `M55_SYSTEM_SSOT.md` を追記／差し替えコミットで更新すること。**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-STRIPE-WEBHOOK-REPLAY-001`** | 本条：**exactly-one replay 証跡** |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **`5Y-A`** コンテキスト接続 |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | replay 前置き：**artifact missing** の read-only evidence |
| **`M55-EVID-20260516-5Z-D-STRIPE-WEBHOOK-ENDPOINT-CREATED-001`** | endpoint 証跡 |
| **`M55-EVID-20260516-5Z-E-VERCEL-WHSEC-ENV-001`** | WHSEC env 証跡 |
| **`M55-EVID-20260516-5Z-F-VERCEL-REDEPLOY-WHSEC-ACTIVATION-001`** | redeploy 証跡 |

**転記禁止：** **`evt_` プレフィクス**／Checkout Session／PI／customer／email／**`client_reference_id`**／ユーザー ID／**`whsec`**／その他機微。

---

## 4. Replay execution result

### 4.1 ターゲット文脈（フル Stripe ID なし）

| Field | Redacted／説明のみ |
|--------|---------------------|
| **event type（意図）** | **`checkout.session.completed`** |
| **コンテキスト** | **`5Y-A` DTR base**／**`DTR_CORE_STATIC_V1`**／**¥1,000 JPY** |
| **人間側の画面上のイベント時刻目安（JST）** | **`2026-05-16` ごろ **`22:49:59` JST 前後**（探索の目安のみ） |
| **配信 endpoint ドメイン（期待）** | **`m55-webv2.vercel.app`** の **`/api/stripe/webhook` 経路** |

### 4.2 本条適用：**Human 転記未取得（Stripe 結果が Cursor に未共有）**

| Field | 値 |
|--------|-----|
| **replay attempt count（本条で断定できる実行回数）** | **1 でも 0 でも転記しない** → **観測なし**。**SSOT は「未定」**。 |
| **delivery to endpoint（観察）** | **unclear／未転記** |
| **response code（観察）** | **未転記** |
| **delivery status（Stripe UI・redacted 要約の意図）** | **未転記** |
| **failure reason summary** | **該当なし／観察なし** |
| **2 回目 replay** | **本条コミット主体では実行されていないとも言えず観察もしない**。**規程として **exactly-one** の継続禁止は維持**。 |
| **broad replay／対象外 event** | **本条コミットでは実施しない** |

**本条 §4 で採る分類：** 下記 §5 の **`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`**（転記未完／観察未取得）。

### 4.3 転記テンプレート（Human が replay 完了後に埋める・別コミット可）

**成功時（テンプレート）：**

- **target event type：** **`checkout.session.completed`**
- **target context：** **`5Y-A` DTR base ¥1,000／`DTR_CORE_STATIC_V1`**
- **replay attempt count：** **1**
- **delivery to endpoint：** **yes**（redacted）
- **endpoint domain：** **`m55-webv2.vercel.app`**
- **response code：** **`200`** または **観測値（数値のみ・本文に ID を書かない）**
- **delivery status：** **`succeeded`**／**`failed`**／**`unclear`**
- **full IDs：** **記録しない**

**失敗時（テンプレート）：**

- **replay attempt count：** **1 または人間側で止まれば 0**
- **failure reason summary：** **カテゴリのみ**（ID なし）
- **response code：** **見えれば数値のみ**
- **2 回目 replay：** **しない**（別 Gate が GO になるまで）

**未実行時（テンプレート）：**

- **replay attempt count：** **0**
- **reason：** **人手未実施または Workbench で停止**
- **no retry：** **本条では自動再試行なし**

---

## 5. 判定（本条適用）

**`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`**

（理由：**§4.2** — **Stripe delivery の転記／観察が本条 SSOT 作成時に存在しない**。Human が実行済みなら **`STRIPE_WEBHOOK_REPLAY_DELIVERY_EXECUTED_ONCE`** または **`…_BLOCKED`** へ別コミットで更新。**）

---

## 6. 重要な制限

- **本条は replay 「実行」のサーバ側証明ではなく、証跡枠であり、本条時点では delivery 未定。**
- **entitlement／DB grant／report unlock：** **本条では証明しない。** **`5Z-J`：** **post-replay の Production **`SELECT`** read-only** を別 Gate。
- **返金／rollback：** **別 Gate。**

---

## 7. 未実行事項（規程・本条コミット）

- **2 回目 replay／broad replay／対象外 event の replay**
- **新規決済／Checkout 再試行**
- **Stripe webhook 設定変更**、`STRIPE_WEBHOOK_SECRET`／whsec／env 変更
- **Vercel redeploy**
- **Production DB 手動 write**／手動 entitlement／wallet／ticket
- **ランタイム・コード・UI 変更**
- **返金 rollback**、`**/api/stripe/*`** 直呼び
- **フル ID／secrets の記録**

---

## 8. Next（本条判定に応じて）

**本条（`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`）の Next：**

**`Phase 5-6H-5Z-J` — Replay blocked evidence checkpoint**（Human が **exactly one replay を完了**し delivery を転記できたら、同 **`5Z-J` SSOT** を **「post-replay DB read-only verification」** へ差し替えるか、**`5Z-J` 文書を二段に分ける**）。

**Human が §4.3 成功テンプレートで **`succeeded`**／**`200`** を転記できた場合の推奨 Next（参考・別コミット）：**

**`Phase 5-6H-5Z-J` Post-replay Production DB read-only fulfillment verification gate** — **`SELECT` のみ**：`stripe_events`、`one_time_fulfillments`、`failed_fulfillments`、`entitlements`、`entitlement_rights`、`reply_ticket_wallets`、`reply_wallet_ledgers`、`dtr_report_snapshots`。

**失敗時（参考・別コミット）：**

**`Phase 5-6H-5Z-J` Replay failure diagnostic planning gate** — **2 回目 replay しない**（別計画まで）。

---

## Human replay 手順（ワークベンチ側・再掲）

1. Stripe Dashboard／Workbench の **Events** を開く。
2. **`2026-05-16` 頃、`22:49:59` JST** 前後の **`checkout.session.completed`** を人間が **`DTR_CORE_STATIC_V1`／¥1,000 JPY** で突合せ。
3. **replay／resend／再送信**：**exactly one**。**2 回目はしない**。
4. **delivery HTTP／status**：**数字と redacted ラベルのみを SSOT 追記コミットに載せる。**

---

## Work anchor（直前置）

- **`3dddefa3619047b0e232cdc7f0812dda9975878a`** — **`docs: record human production db pre replay evidence`**（**`5Z-H-A`**）。

**本条 SSOT パス：** `docs/ssot/M55_PHASE5_6H_5Z_I_EXACTLY_ONE_STRIPE_WEBHOOK_REPLAY_EXECUTION_2026-05-16.md`

---

### 本条サマリー（Cursor 本条）

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-STRIPE-WEBHOOK-REPLAY-001`** |
| **Verdict（本条適用）** | **`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`** |
| **response code／delivery status** | **未転記** |
