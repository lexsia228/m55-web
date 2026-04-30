# M55 追加相談返書 — Stage B Checkout API validation 実施パケット（v1）

**文書種別:** `POST /api/reply-tickets/checkout` の **validation のみ**を実施する際の **手順・記録ルール・STOP** を束ねた execution packet  
**バージョン:** v1  
**ゲート準拠:** [`M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_GATE_v1.md`](./M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_GATE_v1.md)

**本ファイルの範囲:** 計画・実施時のチェックリストと記録許容範囲の固定。**この文書作成時点では API / Stripe / DB を実行していない。**

---

## 1. 実施対象

| 項目 | 内容 |
|------|------|
| **HTTP** | **`POST /api/reply-tickets/checkout`** |
| **範囲** | **validation およびゲート**に限る応答確認 |
| **支払い** | **なし**（決済確定・ユーザー課金を発生させない） |
| **Stripe Checkout** | **成功した Session / Checkout URL は原則作らない**（失敗系・未到達のみを狙う） |
| **秘密情報** | 実施メモや証跡に **secret・cookie・token の値を書かない**（§4） |

**実施環境:** ローカルまたは安全な非公開ホスト。**live 実課金**は対象外（§6）。

---

## 2. 実施ケース（期待の目安）

各ケースで **実行者が HTTP status とボディの `error.code`** を突き合わせる。**リクエスト例に認証ヘッダの実値を書き残さない。**

| # | ケース | 条件の要点 | 期待 HTTP | 期待 `error.code`（実装準拠） |
|---|--------|------------|-----------|-------------------------------|
| 1 | 未ログイン | 認証ヘッダなし | **401** | **unauthenticated** |
| 2 | JSON 不正 | ボディが JSON でない／壊れた JSON | **422** | **invalid_request** |
| 3 | `report_instance_id` 欠損 | フィールド省略または空（認証済み想定だが未到達構成も可 — 順序は実環境で調整） | **422** | **invalid_request** |
| 4 | `product_key` 欠損/空 | 省略または空文字 | **422** | **invalid_request** |
| 5 | `product_key` 不一致 | `additional_reply_ticket` 以外の文字列 | **422** | **invalid_product** |
| 6 | 所有権なし | 他ユーザーの `report_instance_id` を送る | **403** | **forbidden_not_owner** |
| 7 | wallet なし | 合法 owner だが wallet 行がないユーザー等（**テスト用アカウントの役割だけ**を手順メモに残し、**生 user id は書かない**） | **404** | **wallet_not_found** |
| 8 | wallet 非 active | `status !== 'active'` の wallet | **422** | **wallet_not_active** |
| 9 | cap 到達 | 当該レポートで購入上限に達した状態 | **422** | **cap_reached** |
| 10 | price env 未設定 | `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` が未設定または空（**env を本文に書かない**）。ゲートすべて通過させたうえで到達させる構成は実行者が設計 | **503** | **stripe_error** |

**注:** ケース 6–10 は **認証済み**が前提になることが多い。認証の付け方は **ローカルのみ**で検討し、**cookie/token の転記禁止**（§4）。

---

## 3. 記録してよいもの（証跡・メモに含めてよい）

- **HTTP status**（数値）
- **エラー code**（`error.code` 等、アプリ契約どおり）
- **レスポンス shape** の要約（例: `{ error: { code: string } }` のような**型・キー構成**のみ）
- **timestamp**（実施日時）
- **対象ケース名・ケース番号**（§2 の表と対応）
- **secret を含まない短文メモ**（例: 「401 となった」「422 invalid_product 一致」）

---

## 4. 記録禁止（証跡・チャット・スクリーンショットに載せない）

- **Clerk cookie**（名前・値のいずれも不要なら載せない）
- **Bearer / セッション token** の実値
- **Stripe secret key / Webhook signing secret**
- **DB 接続 URL・パスワード**
- **raw user id**（Clerk `user_...` 等の実列）
- **生年月日等の birth data**
- **report 本文・相談本文**
- その他 **個人を特定し得る生データ**

必要なら「ケース7用の内部ラベル **A**」のように **ロールだけ**を使う。

---

## 5. DB 不変確認

- Stage B では **原則 DB 確認不要**（すべてのケースが `checkout.sessions.create` より前で止まれば **DB は触られない**）。
- どうしても安心確認する場合のみ:
  - **SELECT のみ**（件数カウント程度）
  - **`stripe_processed_events` / wallet / ledger** が実行前後で **変化しない**ことを見る
- **UPDATE / INSERT / DELETE / DDL は禁止**

---

## 6. STOP 条件（該当したら中断）

| STOP | 内容 |
|------|------|
| A | **Checkout URL が実際に作成**され、ユーザーが決済ページに進み得る |
| B | **Stripe 決済画面**に進む運用になる |
| C | **live mode** での検証または実課金 |
| D | **secret・cookie・token** を画面共有・ログ・証跡に**出しかけた／出した** |
| E | **DB が変化**した（意図しない INSERT/UPDATE） |
| F | **商品棚 UI** での露出・変更 |
| G | **実 Webhook を発火**して RPC 側まで進む |

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **execution packet の作成** | **GO** |
| **Stage B の実実行** | **別承認**後に、このパケットに従い実施 |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |

---

## 実施後の結果 SSOT（任意）

実施済みとなったら **`M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_RESULT_v1.md`** のような別文書で、§3 に沿った**安全な証跡のみ**をまとめる（本パケットは手順固定用）。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。API 呼び出し・SQL（更新含む）・DB 変更・Stripe API・Dashboard / env 変更・**secret/cookie/token の出力**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_EXECUTION_PACKET_v1*
