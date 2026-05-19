# Phase 5‑6H‑5X — Live payment execution gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5X — Live payment execution gate**

---

## 2. 実行範囲

- **Human live payment attempt：** **exactly once**（**再試行禁止**）
- **Product：** **M55 デジタル鑑定レポート (Standard)**
- **Amount：** **¥1,000 JPY**
- **Webhook：** **本条で変更しない**
- **DB：** **本条で検証・変更しない**
- **Refund／rollback：** **本条で実行しない**

### 許可される人手操作（概要）

- Production で商品ページまたは Checkout に到達（必要ならログイン）
- **購入ボタンを 1 回だけ**押す
- **`checkout.stripe.com`** で金額・商品を確認
- **有効な live 決済手段で 1 回だけ**支払う
- **成功／失敗を redacted のみ SSOT に記録**
- **支払後、その場で DB 修正・webhook replay・返金をしない**

---

## 3. 実行結果

### 本条 SSOT 改訂時点（repo commit 時点）

- **Human による live payment（決済完了まで）は未実施。**
- **Checkout reached（以前の観測／5U‑L‑A）：** **yes**（**checkout.stripe.com**）
- **Product displayed：** **M55 デジタル鑑定レポート (Standard)**（**過去観測の再掲**）
- **Amount displayed：** **¥1,000**（**過去観測の再掲**）
- **Payment attempt count（完了試行）：** **0**（**本条作成時点**）
- **Payment completed：** **no**
- **Stripe visible status（redacted）：** **N/A（未完了のため表示対象なし）**
- **Return URL result：** **N/A**
- **Full identifiers：** **記録していない**

→ **判定：** **`LIVE_PAYMENT_EXECUTION_BLOCKED`**（**未実施**）

### 成功した場合（Human が完了後に別コミットで追記する場合の型）

- **Checkout reached：** **yes**
- **Product displayed：** **M55 デジタル鑑定レポート (Standard)**
- **Amount displayed：** **¥1,000**
- **Payment attempt count：** **1**
- **Payment completed：** **yes**
- **Stripe visible status：** **paid／succeeded／completed 相当（redacted のみ）**
- **Return URL result：** **observed／not observed／redacted（公開可能範囲のみ）**
- **Full identifiers：** **記録しない**

→ **判定：** **`LIVE_PAYMENT_EXECUTION_GREEN`**

### 失敗した場合（1 回試行で完了しなかった／拒否された）

- **Checkout reached：** **yes／no**
- **Payment attempted：** **yes／no**
- **Payment completed：** **no**
- **Visible error：** **redacted**
- **再試行：** **なし**（**即停止**）

→ **判定：** **`LIVE_PAYMENT_EXECUTION_BLOCKED`**（**失敗**）

---

## 4. 証跡ルール

### 記録してよい項目

- **product**
- **amount**
- **payment success／failure**
- **おおよその timestamp**
- **redacted Stripe status**
- **return ページ結果（公開可能な要約のみ）**

### 記録禁止

- **フル Checkout Session ID**
- **フル Payment Intent ID**
- **フル customer ID**
- **email address**
- **client_reference_id**
- **フル Price ID**
- **secret／`whsec`／key の全文**

---

## 5. 判定

| 状態 | Verdict |
|------|---------|
| 成功（1 回の live payment が完了し、上記ルールで記録） | **`LIVE_PAYMENT_EXECUTION_GREEN`** |
| 失敗、または未実施 | **`LIVE_PAYMENT_EXECUTION_BLOCKED`** |

**本条の改訂時点：** **`LIVE_PAYMENT_EXECUTION_BLOCKED`**（**未実施**）。

---

## 6. 重要な制限

- **決済が成功した場合に限り「支払実行」自体を意味する；本条が成功を示すとは限らない（本条は現時点 BLOCKED）。**
- **webhook fulfillment を証明しない。**
- **entitlement／DB 付与を証明しない。**
- **レポート unlock を証明しない。**
- **Webhook 配送検証は次の別 Gate。**
- **Entitlement／DB 検証はさらに後続の別 Gate。**
- **Refund／rollback はさらに後続の別 Gate。**

---

## 7. 未実行事項（本条スコープ外）

- Stripe webhook の変更
- webhook replay
- **`STRIPE_WEBHOOK_SECRET`** の変更
- env／`whsec`／secret の追加変更
- Supabase 変更
- Vercel 設定変更
- 追加 redeploy
- runtime／code／UI 変更
- Production DB の読み書き
- 手動 DB mutation
- **`POST`／`PUT`／`PATCH`／`DELETE`** の手動実行
- **`/api/stripe/*`** の直接実行
- refund／rollback の即時実行
- **フル ID の記録**

---

## 8. Next

### 本条の判定が **`LIVE_PAYMENT_EXECUTION_GREEN`** の場合

- **`Phase 5‑6H‑5Y` — Stripe payment evidence checkpoint／webhook delivery planning gate**
- **`5Y`：** **まず docs-only または redacted 証跡のみ。** **Webhook 検証、DB entitlement、レポート unlock、返金／rollback は引き続き分離。**

### 本条の判定が **`LIVE_PAYMENT_EXECUTION_BLOCKED`** の場合（**本条＝未実施 or 失敗**）

- **`Phase 5‑6H‑5X‑A` — Live payment blocked evidence checkpoint**
- **新たな planning Gate があるまで payment を再試行しない。**

---

## Work anchor / lineage

- **`5621c30ddc70bf20d83aac4727fd580aca4ba609`** — `docs: plan live payment execution gate`（**`5W`**）

Prior SSOT:

- `docs/ssot/M55_PHASE5_6H_5W_LIVE_PAYMENT_EXECUTION_PLANNING_GATE_2026-05-15.md` — **`READY_FOR_PHASE_5_6H_5X_LIVE_PAYMENT_EXECUTION_GATE`**
