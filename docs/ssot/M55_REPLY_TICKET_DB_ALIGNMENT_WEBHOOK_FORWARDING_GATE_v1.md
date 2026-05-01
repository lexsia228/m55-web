# M55 追加相談返書 — DB alignment & Stripe webhook forwarding ゲート（v1）

**文書種別:** **post baseline 無効**および **Webhook / RPC / DB 未検証**を踏まえ、**ローカルアプリの Supabase 接続先**と **SQL Editor の対象 DB** の一致、および **Stripe webhook がローカルの `/api/stripe/webhook` に届く構成か**を確認するためのゲート SSOT（設計のみ）  
**バージョン:** v1  

**上位コンテキスト:** [`M55_REPLY_TICKET_TEST_PAYMENT_RETURN_WEBHOOK_NOT_VERIFIED_RESULT_v1.md`](./M55_REPLY_TICKET_TEST_PAYMENT_RETURN_WEBHOOK_NOT_VERIFIED_RESULT_v1.md)

**記録ポリシー:** **値・全文・ログ丸ごとは記録しない**（セクション 4–5）。

---

## 1. このゲートの目的

| 観点 | 内容 |
|------|------|
| **切り分け** | **post baseline が pre と整合しなかった**原因として想定される **DB 不一致**・**target 不一致**・**webhook 未到達**を **このゲートで順に潰す**。 |
| **DB alignment** | **ローカルアプリ**が参照している **Supabase project** と、オペレータが **SQL Editor** でクエリしている **project / DB** が **同一か**を確認する。 |
| **Webhook forwarding** | **Stripe → ローカル**の経路で **`POST /api/stripe/webhook`** にイベントが届く **構成になっているか**を確認する（**まだ再送・実証は別承認**）。 |
| **断定の禁止** | 本ゲート文書の作成時点では **fulfillment 成功・失敗は判定しない**。 |

---

## 2. DB alignment で確認する候補

| 確認項目 | 方針 |
|----------|------|
| **ローカル `.env.local`** | **Supabase URL** および **project ref** が **設定されていること**を確認する。**値は印字・転記しない**。 |
| **SQL Editor** | ダッシュボードで **選択している project** が **アプリと一致するか**。**人間が画面で確認**する。 |
| **混同防止** | **`m55-soul-core`** と **`m55-soul-shadow`**（および同名に近い環境）を **取り違えない**。 |
| **`current_database()`** | **DB 名のみ**では **十分な同一性証明にならない**場合があるため、**project 表示名・URL・ref の一致**を **画面ベースで二重確認**する方針とする。 |
| **target** | **baseline SQL で使う `report_instance_id`** が **Checkout / アプリで使った対象と同一か**（**UUID はチャットに貼らない** — オペレータ内での照合のみ）。 |
| **プライバシー** | **raw `user_id`・report 本文・相談本文**は **出さない**。 |

---

## 3. webhook forwarding で確認する候補

| 確認項目 | 方針 |
|----------|------|
| **ローカル dev** | **開発サーバー**が **`http://localhost:3000`**（またはチームで固定した同等 URL）で **稼働できる状態か**。 |
| **転送先** | **Stripe webhook の転送**が **`/api/stripe/webhook`** を含む **ローカルエンドポイント**を向いているか（Stripe Dashboard の test endpoint / **Stripe CLI の forward 先**など — **設定の有無・一致は boolean / summary のみ**）。 |
| **Stripe CLI** | 利用する場合でも **webhook secret をチャット・SSOT に貼らない**。 |
| **環境変数** | ローカルの **webhook secret 設定の有無**は **boolean のみ**記録する。 |
| **受信ログ** | **`POST /api/stripe/webhook` の受信**がログに **示されるか**を **summary で確認**する。 |
| **ログ運用** | **dev log 全文は貼らない**。 |

---

## 4. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`app_env_supabase_project_ref_matches_sql_editor`** | **true / false / unknown** |
| **`sql_editor_project_name_confirmed`** | **true / false** |
| **`local_dev_server_running`** | **true / false** |
| **`webhook_forwarding_configured`** | **true / false** |
| **`webhook_secret_present_boolean`** | **true / false** |
| **`webhook_received_log_observed`** | **true / false**（確認セッションにおいて） |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 5. 記録禁止

- **Supabase service role key**
- **Supabase anon key**
- **DB URL 全文**
- **Stripe webhook secret**
- **Stripe secret key**
- **Checkout URL 全文**
- **session id 全文**
- **Stripe event id 全文**
- **raw `user_id`**
- **cookie / token / Authorization**
- **report 本文**
- **相談本文**
- **dev log 全文**

---

## 6. STOP 条件

以下に該当しそうになったら **中断**する。

- **secret** を貼りそうになる
- **DB URL 全文**を貼りそうになる
- **dev log 全文**を貼りそうになる
- **追加決済**をしようとする
- **duplicate replay** へ進もうとする
- **DB 手動 UPDATE** で整合を **ねつ造**しようとする
- **商品棚 UI** へ進もうとする
- **Vercel env** を変更しようとする
- **live webhook / live 決済**を触ろうとする

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **gate（本文書の作成）** | **GO** |
| **DB alignment 確認** | **別承認**（execution packet） |
| **webhook forwarding 確認** | **別承認**（setup/check packet） |
| **webhook 再送** | **NO-GO**（本文書作成時点） |
| **Stripe CLI 起動** | **NO-GO**（本文書作成時点） |
| **post baseline 再実行** | **NO-GO**（alignment / forwarding 確認後に別承認） |
| **duplicate replay** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 8. 後続予定（順序は運用で調整可）

1. **DB alignment execution packet**  
2. **webhook forwarding setup/check packet**  
3. **webhook 受信確認**（summary のみ）  
4. **正しい DB / target で post baseline 再実行**  
5. **fulfillment result SSOT**  
6. **duplicate replay gate**  
7. **cancel / expired / refund SSOT**  
8. **observability / incident response SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**SQL 実行なし**。**DB 更新なし**。**Stripe CLI 未起動**。**webhook 再送なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1*
