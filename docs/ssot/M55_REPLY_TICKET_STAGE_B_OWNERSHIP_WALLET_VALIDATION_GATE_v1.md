# M55 追加相談返書 — Stage B 所有権 / wallet validation 小ゲート（v1）

**文書種別:** 認証済み **route 内部**における **スナップショット所有・wallet 存在・アクティブ・キャップ**の検証を行うゲート SSOT  
**バージョン:** v1  
**前提（完了済み）:** [`M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_LOW_RISK_VALIDATION_RESULT_v1.md`](./M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_LOW_RISK_VALIDATION_RESULT_v1.md)（低リスク 4 ケース PASS）  
**親手順:** [`M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_VALIDATION_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_STAGE_B_AUTHENTICATED_VALIDATION_EXECUTION_PACKET_v1.md) §3（フェーズ B）

**本ファイル作成時:** API / Stripe / DB 更新を実行していない。**秘密情報本文なし**。

---

## 1. このゲートの目的

| 項目 | 内容 |
|------|------|
| **位置づけ** | **認証済み**かつ **低リスクボディ validation が PASS** したうえでの **次段階**。**所有権・wallet・アクティブ・キャップ**の **アプリ側ゲート**を確認する。 |
| **支払い** | **発生させない**。 |
| **Checkout** | **`checkout_url` 作成・成功経路へは進まない**を原則。 |
| **DB** | **更新しない**（本ゲート準拠の実施において **`reply_ticket_wallets` / `reply_wallet_ledgers` / `stripe_processed_events` を変更しない**）。 |
| **Stripe API** | **成功セッション作成に至る呼び出しは行わない**（Stripe Dashboard / env も **変更しない**）。 |
| **秘密情報** | **cookie・token・Authorization・secret をチャット／SSOT／ログに出力しない**。 |

---

## 2. 確認候補

**いずれも** `POST /api/reply-tickets/checkout` で、**妥当な JSON**（`product_key === additional_reply_ticket`、`report_instance_id` 形式上は送信）および **適切なテストコンテキスト**を満たす前提で **`validateReplyTicketCheckoutGate` 到達後**に期待される応答を突き合わせる。

| case_name 例 | 期待 HTTP | `error.code` |
|---------------|-----------|----------------|
| `auth_forbidden_not_owner`（他人／無権限の snapshot id） | **403** | **forbidden_not_owner** |
| `auth_wallet_not_found`（所有者だが wallet 行がない状態） | **404** | **wallet_not_found** |
| `auth_wallet_not_active`（`wallet.status !== 'active'`） | **422** | **wallet_not_active** |
| `auth_cap_reached`（キャップ到達状態） | **422** | **cap_reached** |

---

## 3. 事前データ確認方針

- **どの `report_instance_id` をどのケースに使うか**は、`dtr_report_snapshots` 所有関係および `reply_ticket_wallets` の実状態を踏まえ **慎重に選択**する（選択理由は SSOT に **論理だけ**書き、生 ID は避ける運用でもよい）。
- **raw user_id、birth data、report 本文、相談本文**は **チャット・SSOT に載せない**。
- **必要な安心確認のみ**、`SELECT` **のみ**（件数・`status`・集計程度）。**DDL / DML 禁止**。
- **検証ケースを作るために手動 UPDATE/INSERT で DB を捏造しない**。
- **本番データを壊さない** — 実施環境・対象ユーザーが許容か **別途承認**。
- **既存のテスト用ユーザー・テストデータ・開発 DB**の既知の安全状態を優先して使う。

**注:** 「wallet なし」「非 active」「cap」のいずれかを **単一環境ですべて再現できるとは限らない**。ケース単位で **利用可能なデータがあるか**だけ先に判断する。

---

## 4. 実施方法の方針

- **環境:** ローカルまたは **非公開**。**live mode 実課金**しない。
- **呼び出し:** ログイン済みブラウザの **DevTools** から **`fetch(..., { credentials: 'same-origin' })`** を **第一候補**（低リスク実績どおり）。
- **cookie/token:** ブラウザ内に任せ **値はコピー・記録しない**。
- **結果報告（許容）:** **`case_name` / `http_status` / `error_code` / `response_shape_only` / `secret_exposed: no`** のみ。
- **`checkout_url` が返ったら即 STOP**（本ゲート外・Stage B でも原則違反に近い）。

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
- **Authorization ヘッダ値**
- **Stripe secret / Webhook secret**
- **DB URL**
- **raw user id**
- **生年月日**
- **report 本文・相談本文**
- **Checkout URL 全文**

---

## 7. DB 不変方針

- この Stage で **DB 更新しない**。
- **`stripe_processed_events` / wallet / ledger** は実施後も **カウント・状態が変化しない**ことを正とする（任意で `SELECT` のみ）。
- **`UPDATE`/`INSERT`/`DELETE` は禁止**。**RPC fulfillment は呼ばれない**（Checkout 未到達）。
- **実 Webhook は発火させない**。

---

## 8. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **`checkout_url` が返る** |
| 2 | **Stripe 決済画面**に進む |
| 3 | **live mode** の課金検証 |
| 4 | **secret / cookie / token** を**出しそう**・**出力した** |
| 5 | **データ準備が DB 更新を要する**（手動捏造が必要になる）→ **ゲート中止または別環境へ** |
| 6 | **実 Webhook 発火** |
| 7 | **商品棚 UI** に露出 |
| 8 | **DTR checkout route 改変** |
| 9 | **Stripe Dashboard / env を本番運用として変更** |
| 10 | **本番 DB をテスト用途で手動 UPDATE**しようとする |

---

## 9. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本所有権/wallet validation ゲート文書の作成** | **GO** |
| **実実行** | **別承認**（事前データ確認・環境許可を含む） |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |
| **Stripe Dashboard / env 変更** | **NO-GO** |

---

## 実施後の結果 SSOT（任意）

全ケース完了後、`M55_REPLY_TICKET_STAGE_B_OWNERSHIP_WALLET_VALIDATION_RESULT_v1.md` 等へ §5 のみ集約する。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。API・SQL（更新を伴う処理）・DB 変更・Stripe API・Dashboard/env 変更・**秘密情報の出力**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_OWNERSHIP_WALLET_VALIDATION_GATE_v1*
