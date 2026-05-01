# M55 追加相談返書 — DB pre/post baseline ゲート（v1）

**文書種別:** **test checkout payment completion** / **webhook fulfillment** に進む前に、**DB の観測 baseline を固定する**ためのゲート SSOT（設計のみ）  
**バージョン:** v1  

**上位コンテキスト:** [`M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md`](./M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md) — Checkout Session creation test **PASS**（Session 作成のみ、URL 未開封・未決済）。

**重要補足（スコープ外の明示）:**

- **冪等性基盤**（partial UNIQUE、`stripe_processed_events`、RPC 等）は **すでに用意済み**とする。本ゲートは **baseline の観測設計**に限定する。
- **duplicate replay** の実証は **後続ゲート**。
- **cancel / expired / refund / dispute** は **別 SSOT**。
- **observability / alert / incident response** は **商品棚 UI 公開前**に **別 SSOT**。
- **今回は DB baseline を固定するゲート文書のみ**（実行はしない）。

**記録ポリシー:** セクション「5. 記録してよいもの」「6. 記録禁止」を厳守する。

---

## 1. このゲートの目的

| 観点 | 内容 |
|------|------|
| **baseline 固定** | **test payment / webhook fulfillment の前**に、対象レコード集合について **実行前の DB 状態（pre baseline）** を定義し、後続の **post baseline** と **差分**で検証可能にする。 |
| **観測項目の定義** | 実行前後で **何を数え・何を boolean で記録するか**を SSOT 化する。 |
| **読み取りのみ** | **SELECT のみ**（または同等の **読み取り専用**手段）。**DB 更新なし**。 |
| **決済・Webhook なし（本ゲート文書の時点）** | **決済完了なし**。**Webhook fulfillment なし**。**Checkout URL を開かない**。 |

---

## 2. baseline 対象（観測する項目）

以下を **pre / post の両方**で **同一のクエリ方針・同一のスコープ**で観測する（具体 SQL は **別 execution packet** で **別承認**のもと提示）。

| カテゴリ | 観測項目 |
|----------|----------|
| **イベント** | **`stripe_processed_events` の件数（count）** — スコープは execution packet で一致させる（全体 count またはフィルタ済み count のどちらかを固定）。 |
| **ウォレット** | **`reply_ticket_wallets` の件数（count）** — 同上、スコープ固定。 |
| **台帳** | **`reply_wallet_ledgers` の件数（count）** — 同上。 |
| **セッション** | **`reply_sessions` の件数（count）** — 同上（本プロダクトで該当テーブルを baseline に含める場合）。 |
| **対象 wallet（1 行）** | **`purchased_count`**, **`available_count`**, **`consumed_count`**, **`initial_included_count`**, **`status`** |
| **キャップ** | **対象 wallet の cap 状態**（実装に準拠した boolean / 列 / 導出フラグ — execution packet で列名・判定式を固定） |
| **所有権** | **対象 `report_instance_id` が実行ユーザーに紐づくことの確認** — **boolean のみ**または **マスク済み参照**（raw ID の不必要な転記は避ける） |
| **台帳最新** | **対象 wallet に紐づく ledger の「最新行」の件数（通常 1）および概要** — **event_type / source_of_grant / product_key / delta / balance_after** 等、**PII を含まない列のみ** |

**プライバシー・禁止出力:**

- **raw `user_id`**、**PII**、**report 本文**、**相談本文** は **返さない・記録しない**。
- 識別が必要な場合は **マスク / hash 化された識別子**に限定（セクション 5 参照）。

---

## 3. pre baseline の期待値（現時点の論理）

以下は **「Checkout Session 作成のみ」「`payment_completed=false`」「fulfillment 未発火」** の状態を前提とした **期待**である。

| 期待 | 説明 |
|------|------|
| **processed_events / wallet / ledger** | **Checkout Session 作成だけ**では、**通常は変化しない**（アプリが Session 作成時にこれらを更新しない設計であることを前提）。 |
| **fulfillment** | **`payment_completed=false`** のため **fulfillment は未発火**。 |
| **`stripe_processed_events` count** | **直近 baseline から変化なし**が **望ましい**（別経路での書き込みがないこと）。 |
| **wallet / ledger / reply_sessions count** | **変化なし**が **望ましい**（スコープは packet で固定）。 |

※ 環境により **バックグラウンド処理**がある場合は execution packet で **除外条件**を書く。

---

## 4. post baseline で見る予定（fulfillment 後の差分）

**後続の「test checkout payment completion」「test webhook fulfillment」ゲート**実行後の **post baseline** で、少なくとも次を **差分**として確認する設計とする（本ファイルは **まだ実行しない**）。

| 観測 | 期待される変化（正常系・1 回限りの grant） |
|------|----------------------------------------------|
| **`stripe_processed_events`** | **+1**（対象イベントが **1 件**記録されること） |
| **wallet `purchased_count`** | **+1** |
| **wallet `available_count`** | **+1** |
| **ledger** | **+1 行** |
| **ledger の delta** | **1** |
| **`event_type`** | **`purchase_grant`**（実装の canonical 表記に合わせる） |
| **`source_of_grant`** | **`PURCHASE`** |
| **`product_key`** | **`additional_reply_ticket`** |
| **`balance_after`** | **更新後の `available_count`** と一致 |

**duplicate replay（後続ゲート）:**

- **再送・重複適用時**は **変化なし**（件数・カウントが増えない）ことを **別ゲート**で実証する。

---

## 5. 記録してよいもの

- **件数（integer）**
- **boolean**
- **status（列挙値・実装に準拠）**
- **マスク / hash 化された識別子**（必要最小限）
- **対象 case 名**
- **timestamp**
- **`value_printed=false`**（機密・全文を印字していないことの宣言として）
- **`secret_exposed=no`**

---

## 6. 記録禁止

- **raw `user_id`**
- **cookie / token / Authorization**
- **Stripe secret**
- **webhook secret**
- **price id 実値**
- **Checkout URL 全文**
- **session id 全文**
- **DB URL**
- **生年月日**
- **report 本文**
- **相談本文**

---

## 7. STOP 条件

以下に該当しそうになったら **即中断**する。

- **SELECT 以外**を実行しようとする（DML、DDL、関数の副作用付き呼び出し等）。
- **DB 更新**が起きる操作に踏み込む。
- **Checkout URL を開く**・**支払いを完了させる**。
- **実 Webhook を発火**させる（または本番相当で課金・イベント処理を走らせる）。
- **secret / token / raw `user_id`** をログ・SSOT・チャットに **出力しそう**になる。
- **商品棚 UI** に状態を **露出させようとする**変更・検証。
- **Vercel env** を **変更**しようとする。

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **DB baseline gate（本文書の作成）** | **GO** |
| **baseline SELECT の実行** | **別承認**（**DB baseline execution packet** + 環境・読み取り口の承認） |
| **test payment completion** | **NO-GO** |
| **webhook fulfillment** | **NO-GO** |
| **duplicate replay** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 9. 後続予定（順序は運用で調整可）

1. **DB baseline execution packet**（SELECT のみ、スコープ・マスク規約を具体化）  
2. **pre baseline SELECT**（別承認）  
3. **test checkout payment completion gate**  
4. **test webhook fulfillment gate**  
5. **post baseline SELECT**  
6. **duplicate replay gate**  
7. **cancel / expired / refund SSOT**  
8. **observability / incident response SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**SQL 実行なし**。**DB 更新なし**。**Checkout URL 未開封**。**決済なし**。**Webhook 未発火**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1*
