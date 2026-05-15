# M55 追加相談返書 — Stage B 認証済み validation 実施パケット（v1）

**文書種別:** `POST /api/reply-tickets/checkout` を **認証済み**かつ **支払い／Checkout 成功なし**で検証する実行手順のパケット  
**バージョン:** v1  
**ゲート準拠:** [`M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_VALIDATION_GATE_v1.md`](./M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_VALIDATION_GATE_v1.md)  
**前提認識:** Case 1（未ログイン）は Clerk が route 到達前に遮断 → **route 内部 validation は認証済みで別途確認**する。

**本ファイル作成時:** API / Stripe / DB を実行していない。**cookie・token・Authorization の実値は本文に含めない。**

---

## 1. 実施対象

| 項目 | 内容 |
|------|------|
| **エンドポイント** | **`POST /api/reply-tickets/checkout`** |
| **状態** | **認証済み**（middleware を通過し `route.handler` に到達させる） |
| **範囲** | **validation / application ゲートのみ** — **Stripe Checkout `sessions.create` が成功し URL が返る経路には進まない**（原則） |
| **支払い** | **なし** |
| **DB** | **更新しない**（本パケットに従った低リスク〜次段階ケースでは原則読み取りも不要） |
| **記録** | **secret / cookie / token / Authorization の値は記録しない** |

---

## 2. 低リスク順の実施ケース（フェーズ A 推奨）

**DB 状態や所有権にほぼ依存せず**、`Content-Type: application/json` で **同一認証セッション**のまま順に試せる想定。**期待はいずれも route 内での早期 return。**

| Order | case_name 例 | 条件 | HTTP | `error.code` |
|-------|----------------|------|------|--------------|
| A1 | `auth_json_invalid` | ボディが壊れた JSON／非 JSON | **422** | **invalid_request** |
| A2 | `auth_missing_report_instance_id` | 有効 JSON だが `report_instance_id` 欠損・空 | **422** | **invalid_request** |
| A3 | `auth_missing_product_key` | `product_key` 欠損または空文字 | **422** | **invalid_request** |
| A4 | `auth_product_key_mismatch` | `product_key` が `additional_reply_ticket` と一致しない | **422** | **invalid_product** |

---

## 3. 次段階に分けるケース（フェーズ B／個別準備）

**認証済みユーザーの DB 上の状態**（スナップショット所有、wallet 行、active、cap）や **投入する `report_instance_id` の正当性**に依存するため、**フェーズ A 完了後**に **小分け（別セッション・別メモリ）**で実施する。

| case_name 例 | 条件の要点 | HTTP | `error.code` |
|---------------|------------|------|--------------|
| `auth_forbidden_not_owner` | 他人の／無関係の `report_instance_id` | **403** | **forbidden_not_owner** |
| `auth_wallet_not_found` | owner だが wallet 行がないユーザー等（**準備要件あり**／生 ID は記録しない） | **404** | **wallet_not_found** |
| `auth_wallet_not_active` | `wallet.status !== 'active'` | **422** | **wallet_not_active** |
| `auth_cap_reached` | キャップ満タン状態 | **422** | **cap_reached** |
| `auth_price_env_missing` | `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` 未設定等で Stripe 作成前に失敗（**環境のみ変更する場合でも SSOT に env 値を書かない**） | **503** | **stripe_error** |

**注意:** 「price env 未設定」検証は **.env を触る運用になり得る**ため、ゲート側の別承認と **非共有環境のみ** に限定すること。

---

## 4. 実施方法

- **環境:** ローカルまたは **非公開**ホスト。**live** 実課金はしない。
- **認証:** ブラウザでログイン後、**開発ツールはローカルのみ**。または Thunder Client / Postman 等で **`Cookie`/`Authorization` をローカルにだけ保持**する。
- **転記禁止:** **チャット・SSOT・スクリーンショット共用**に **cookie / bearer / Authorization 値を貼らない**。
- **結果報告**（許容フィールド）:
  - `case_name`
  - `http_status`
  - `error_code`
  - `response_shape_only`（キー構成の要約）
  - `secret_exposed: no`（実施宣言として明示）
- **`checkout_url` が返る応答になった場合**は §7 STOP に該当しうるため、実施を切り上げる。

---

## 5. 記録してよいもの

- **case_name**
- **HTTP status**
- **error code**
- **response shape summary**
- **timestamp**
- **secret を含まない短いメモ**

---

## 6. 記録禁止

- **Clerk cookie**（実値）
- **Bearer token**
- **Authorization ヘッダ値**（全体）
- **Stripe secret / Webhook secret**
- **DB URL**
- **raw user id**
- **生年月日**
- **report 本文・相談本文**
- **Checkout URL 全文**（セッション識別子等が含まれるため）

---

## 7. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **Checkout URL**（`checkout_url`）が**返る** |
| 2 | **Stripe 決済画面**にまで進む |
| 3 | **live mode** の課金検証 |
| 4 | **secret / cookie / token** を**出しそう**・**記録した** |
| 5 | **DB が変化**する（意図しない INSERT/UPDATE） |
| 6 | **実 Webhook 発火** |
| 7 | **商品棚 UI** に露出・変更 |
| 8 | **`app/api/purchase/checkout`（DTR）を改変** |
| 9 | **Stripe Dashboard / env を本番方針で変更**（許可なく） |

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **execution packet の作成** | **GO** |
| **認証済み validation の実実行** | **別承認** |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 実施後の結果 SSOT（任意）

ケースごとに **`M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_CASE_*_RESULT_v1.md`** 等で §5 のみ集約する（命名はプロジェクトで統一）。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。API・SQL（更新含む）・DB 変更・Stripe API・Dashboard/env 変更・**秘密情報の出力**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_VALIDATION_EXECUTION_PACKET_v1*
