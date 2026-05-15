# M55 追加相談返書 — Reply ticket dry-run / test-mode smoke 設計ゲート（v1）

**文書種別:** スモーク検証の前提・段階・STOP を固定するゲート SSOT  
**バージョン:** v1  
**前提実装:** Webhook Reply lane → `m55_reply_ticket_fulfill_checkout_event` RPC 呼び出し（コミット済み想定）

---

## 1. 現在の到達点

| 項目 | 状態 |
|------|------|
| Checkout API | **存在する**（`/api/reply-tickets/checkout`） |
| Webhook Reply lane | **RPC を呼ぶ**実装まで到達 |
| RPC | 本番 DDL 上で **processed_events / wallet / ledger** を **同一トランザクション**で更新する設計 |
| DTR 経路 | **保護されている**（追加返書チケットは DTR fulfillment に流さない） |
| 本番実決済テスト | **未実施** |

本番 DB には **RPC / partial UNIQUE / スキーマ受け皿**がある一方、**本番での実決済・実 Webhook による DB 更新検証**は本ゲートでは **範囲外**とする。

---

## 2. smoke 前提条件

- **Stripe test mode** で実施する（**live mode では実施しない**）。
- **test 用 price id** の env 名および**値は SSOT・ログ・チャットに出力しない**。
- **Webhook secret** は**出力・貼付しない**（環境にのみ存在させる）。
- **本番 live 決済**ではないことを事前に確認する（キー・Dashboard の mode 表示でもよいが、**キー文字列そのものは出力しない**）。
- **商品棚 UI** には当該 SKU を**出さない／本スモークの成否に依存させない**。
- **テスト対象ユーザー（Clerk / `client_reference_id` 解決に使う ID）· レポートインスタンス · 財布（wallet）行**を手順書内で**役割として明示**するが、**生の secret・トークン・DB 接続 URL・service role キーは出さない**。

---

## 3. dry-run 候補

| 区分 | 内容 | 備考 |
|------|------|------|
| **A. API validation のみ** | `curl` / Postman 相当で **認証・ゲート・422/403** など **支払い前**の契約を確認 | DB 更新なし |
| **B. Checkout Session 作成まで** | test mode で **Session 作成 API** まで到達し、**メタデータ・client_reference_id** が設計どおりか確認 | **決済完了はさせない**構成も可 |
| **C. Stripe CLI（test webhook）** | **テスト用ペイロード**で `checkout.session.completed` 等を送信し、**署名付き**でアプリが受けられるか確認 | **署名検証あり**を必須条件とする |
| **D. 実 Webhook → RPC** | 実際の Endpoint に流し **RPC が動き DB が変わる** | **DB 更新を伴うため別承認**が必須。本ゲート文書だけでは **実施 GO にならない** |

本番 DB に**本番環境の実 Webhook** を流すスモークは、**「本番での DB 更新許可」ゲート**が別途 OPEN するまで **NO-GO** とする。

---

## 4. DB 確認項目（fulfillment を伴うスモーク実施時）

実施前後で **同一スキーマ・同一対象行**を指すこと（**ID の羅列は必要最小限**で、**公開リポジトリ用 SSOT には生 ID を書かない運用**でもよい）。

**実行前のベースライン**

- 関連する **`reply_ticket_wallets` 行数**または**対象ユーザー 1 件の存在**
- **`reply_wallet_ledgers` の件数**（対象ユーザー・対象レポートにスコープできるならその範囲）
- **`stripe_processed_events`** の件数（対象 `stripe_event_id` があれば 0 であること）

**対象 wallet の属性**

- `purchased_count` / `available_count`

**実行後の期待（初回成功時）**

- **`stripe_processed_events`** が **+1**（該当 event に対し `processed` 相当）
- **wallet:** `purchased_count` **+1**、`available_count` **+1**
- **ledger:** **+1** 行
- **`balance_after`** が wallet の `available_count` と**整合**
- **同一 `event.id` を再送（duplicate）**した場合: **件数・カウントが変わらない**（partial UNIQUE + RPC `duplicate_noop` 前提）

---

## 5. STOP 条件（違反時は即中断）

- **live mode** での検証
- **本番ユーザーへの実課金**（意図しない課金）
- **商品棚 UI の本番公開・露出**をスモークの前提にする、またはスモーク結果で UI を無承認変更する
- **secret・Webhook secret・API キー・DB URL** の**出力・共有**
- **Webhook 署名検証なし**で外部から本番相当 URL に流す
- **`event.id` なし**／**`report_instance_id` なし**のペイロードで fulfillment を試す（**RPC 前 STOP**が正）
- **DTR fulfillment** に Reply チケットを流す改変
- **RPC を使わず** **wallet / ledger をアプリや手 SQL で直接更新**する検証

---

## 6. 段階案（推奨順）

| 段階 | 内容 |
|------|------|
| **Stage A** | **静的検証:** `tsc` / lint、**DTR checkout・fulfillment・oneTime の意図しない diff なし**、Reply / Webhook の route diff レビュー |
| **Stage B** | **Checkout API:** 認証・バリデーション・ゲートのみ（**支払いなし**） |
| **Stage C** | **test Checkout Session 作成**（メタ・`client_reference_id` 確認） |
| **Stage D** | **test webhook + 制御された fixture**（署名あり）で **fulfillment 1 回**（§4 の DB 確認を実施）— **別承認** |
| **Stage E** | **同一 event 再送**で **duplicate / 件数不変**（§4） |
| **Stage F** | **ロールバック / カスタマーサポート方針**（誤購入・二重送信・cap 超過時の運用メモ。**本ゲートでは実装を強制しない**） |
| **live 低額** | **Stage F および別ゲート**のさらに**後ろ** |

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本ゲート（設計 SSOT の作成）** | **GO** |
| **実 smoke（DB 更新を伴う test fulfillment）** | **別承認** |
| **live 決済** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL 実行・DB 更新・Stripe Dashboard / env 変更・**secret 出力**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DRY_RUN_TEST_MODE_SMOKE_GATE_v1*
