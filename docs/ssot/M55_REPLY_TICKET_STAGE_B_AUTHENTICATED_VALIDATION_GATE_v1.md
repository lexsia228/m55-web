# M55 追加相談返書 — Stage B 認証済み validation 小ゲート（v1）

**文書種別:** Case 1 の観測（Clerk が route 到達前に遮断）を踏まえ、`POST /api/reply-tickets/checkout` の **route 内部 validation** を **認証済み状態**で確認するためのゲート SSOT  
**バージョン:** v1  
**前提:** [`M55_REPLY_TICKET_STAGE_B_CASE_1_UNAUTHENTICATED_RESULT_v1.md`](./M55_REPLY_TICKET_STAGE_B_CASE_1_UNAUTHENTICATED_RESULT_v1.md)  
**親ゲート:** [`M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_GATE_v1.md`](./M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_GATE_v1.md)、[`M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_EXECUTION_PACKET_v1.md)

**本ファイル作成時:** API 未実行、cookie/token 未取得・未貼付、コード・DB・Stripe 未変更。**本文に秘密情報なし。**

---

## 1. このゲートの目的

| 項目 | 内容 |
|------|------|
| **問題意識** | **未ログイン**では **Clerk middleware** が **`route.handler` 到達前**に応答することがあり（Case 1 参照）、**Open API の 401 と body**を観測できない。そのため **route 内部の validation / gate** は **認証済みセッション**でしか実証できない。 |
| **記録規律** | **cookie / bearer / secret は SSOT・チャット・ログに貼らない**・実値を書かない。 |
| **支払い** | **発生させない**。 |
| **DB** | **更新しない**。 |
| **Stripe Checkout** | **成功 URL・Session 作成まで到達しない**を原則（validation / ゲートおよび **price 未設定**など **create より前で止まる**ケースのみ）。 |

---

## 2. 認証済みで確認する候補

実装準拠の期待（順不同で実施可）。認証済みであることが前提になるケースを列挙する。

| ケースの要点 | HTTP 期待 | `error.code` 期待 |
|--------------|-----------|-------------------|
| JSON 不正 | **422** | **invalid_request** |
| `report_instance_id` 欠損・空 | **422** | **invalid_request** |
| `product_key` 欠損・空 | **422** | **invalid_request** |
| `product_key` が `additional_reply_ticket` と不一致 | **422** | **invalid_product** |
| スナップショット所有権なし | **403** | **forbidden_not_owner** |
| wallet 行なし | **404** | **wallet_not_found** |
| wallet 非 active | **422** | **wallet_not_active** |
| cap 到達 | **422** | **cap_reached** |
| `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` 未設定等（Stripe 作成前まで到達） | **503** | **stripe_error** |

個別結果は **`M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_VALIDATION_RESULT_*.md`** のような別 SSOT で **許容フィールドのみ**記録してよい（任意命名）。

---

## 3. 実施方法の方針

- **ローカル**または**非公開環境**。**live mode でのユーザー課金**はしない。
- **ブラウザでログイン済み**のセッションを流用する場合も、**cookie の値を SSOT に書かない**。
- **curl / Postman / Thunder Client** 等を使う場合も **`Authorization` / `Cookie` ヘッダの実値は SSOT に書かない**（手元のみで管理）。
- **結果報告**は **`case_name` / `http_status` / `error_code` / `response_shape` の要約**に限定する。
- **`checkout_url`〜決済画面**に進む **成功経路にはまだ進まない**（本小ゲートの範囲外）。

---

## 4. 記録してよいもの

- **case_name**（例: `auth_json_invalid`）
- **HTTP status**
- **error code**（アプリ契約の `error.code`）
- **response shape summary**（キー構成・型の要約のみ）
- **timestamp**
- **secret を含まない短いメモ**

---

## 5. 記録禁止

- **Clerk cookie**（実値）
- **Bearer token**、**Authorization ヘッダ値**全体
- **Stripe secret / Webhook secret**
- **DB URL**、接続資格情報
- **raw user id**（`user_...` 等の実列）
- **生年月日**
- **report 本文・相談本文**
- **Checkout URL 全体**（**セッション ID・署名付きクエリ等の機微が含まれる場合は貼らない**）

---

## 6. DB 不変方針

- 本小ゲートの **認証済み validation** は **DB 更新を伴わない**ことを正とする。
- **`stripe_processed_events` / wallet / ledger** は **変化しない**。
- **INSERT / UPDATE / DELETE / DDL は禁止**。
- 任意の安心確認は **SELECT のみ**（件数程度）。

---

## 7. STOP 条件

以下に該当したら **中断**。

- **cookie / token / secret** を **出力しそう・記録しそう**になった
- **Checkout URL が実際に返る／作成**され、**決済画面**に進み得る
- **live mode** の実課金
- **DB が変化**する操作
- **実 Webhook 発火**（RPC まで進む等）
- **商品棚 UI** の露出・変更
- **`app/api/purchase/checkout`（DTR）等の無関係 route 改変**
- **Stripe Dashboard / env の変更**

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本認証済み validation ゲート文書の作成** | **GO** |
| **認証済みでの実実行** | **別承認** |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |
| **secret / cookie / token の SSOT・チャット出力** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。API 呼び出し・コード変更・SQL（更新含む）・DB 変更・Stripe API・Dashboard / env 変更・**秘密情報の取得・貼付**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_VALIDATION_GATE_v1*
