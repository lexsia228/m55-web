# M55_REPLY_TICKET_STRIPE_EXPANSION_DESIGN_REVIEW_v1

Status: **設計レビュー SSOT（文書のみ）** — **Stripe Dashboard／env／Webhook 実装／商品棚 UI は本条で変更しない。**  

DB 到達点（前提）:

- **`docs/ssot/M55_REPLY_WALLET_DB_REACH_POINT_BEFORE_STRIPE_EXPANSION_v1.md`**（コミット済み）

Session 方針:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B3_SESSION_QUARANTINE_CONTINUATION_v1.md`**

**秘密鍵・Stripe secret key・Stripe webhook signing secret・DB URL・サービスキーは記載しない。**

Review revision **v1** · Last updated: **`2026-04-28`**

---

## 1. 商品定義（追加相談返書）

| # | 内容 |
|---|------|
| 1 | **商品名（論理）:** **追加相談返書チケット** — **当該本質レポートの **§4（4 章）深掘り専用**。** **他話題・別レポート領域は禁止。** |
| 2 | **価格:** **500 円**（税込／税別は商流・Stripe tax 設定で別途確定。**本条に金額以外の税制コードは書かない。**）** |
| 3 | **パッケージ候補:** **1 購入あたり **追加 1 件** とする **単品 500 円**／または **複数件パック**。** **現時点の推奨は **単品 1 件 = 500 円（1 SKU）**。** （運用・会計・UI の単純さを優先。パックは需要と返金処理が固まってから評価。）** |
| 4 | **上限:** **同一 `report_instance_id`（当該本質レポート）あたり **合計 5 件**まで** — **付属 **1** 件＋**追加 **4** 件****（既存ポリシー／返書 SSOT と整合）。** |
| 5 | **スコープ:** **`report_instance_id` 単位でのみ消費可能** — **他 `report_instance_id`／他商品とは **併用・混在不可**（同一 UX 上で明示）。** |
| 6 | **水増し禁止・文字量:** **標準 **1,500〜1,900** 字、最低 **1,200** 字、最大 **2,200** 字前後**（執筆 SSOT の範囲）。** |
| 7 | **保管:** **当該本質レポートはアーカイブしない**。** **過去データは **成長比較資産**として保持**（削除・秘匿運用しない方針。詳細は執笔者 SSOT）。** |

---

## 2. 所有権／スコープ（誰に売るか）

| # | 方針 |
|---|------|
| 1 | **所有権の単位:** **`report_instance_id` を単位として **「このレポートの追加返書枠」****を定義する。** |
| 2 | **Wallet／ledger は **RI（`report_instance_id`）軸で**処理** — **`user_id` だけでクレジットを付けない。** |
| 3 | **既存 `reply_sessions` の backfill は販売・付与には利用しない**（B3 SSOT と整合）。** |
| 4 | **smoke／orphan／quarantine 側の wallet／ledger には販売・クレジット増加を行わない**（運用一覧は DB 証跡に従う）。** |

---

## 3. Stripe 設計（Dashboard／API レベル）

| # | 内容 |
|---|------|
| 1 | **Stripe `product`／`price` は環境ごとに **別々に作成**。** **`test`** と **`live`** を **混同しない。** |
| 2 | **Price ID（`price_…` は機密ではないことが多いが）、本番／テストの対応関係は SSOT／社内一覧で固定** — **本条に値を貼る必要はなく**「一覧は別チャネル」でよい。** |
| 3 | **Secret API key／webhook signing secret は **絶対に文書・チケットに出力しない**。** |
| 4 | **`metadata` 案（PII を避ける）:** **`product_key`**、**`quantity`**、**`idempotency_key`**、**`report_instance_id` の **ハッシュまたは短い内部参照**（生の長い識別子を避けるルールを別途）**、**`user` の **内部 subject id**（Clerk 等）を **必要最小限のみ**。** **raw メール・アドレス本文・本名・チャットログは載せない。** |
| 5 | **Checkout Session 作成条件（論理ゲート）:** **呼び出し側が **`report_instance_id` を所有すること**、`user_id` と **RI の関連**が **wallet／ledger と整合**すること、**quarantine でないこと**、**当該 RI で **追加枠が残っていること（合計 5 以内）**。** **`session` のみを根拠にチェックアウトを許可しない。** |
| 6 | **本番環境での初回適用時は、`M55_REPLY_WALLET_DB_REACH_POINT_BEFORE_STRIPE_EXPANSION_v1.md`** §5 の順に **ロールバック／無効化の道**があること。 |

---

## 4. Webhook／Fulfillment 設計

| # | 設計要点 |
|---|----------|
| 1 | **主イベント:** **`checkout.session.completed`** を **Fulfillment の主入力**として扱う**（処理順・冪等性は実装フェーズで固定）。** |
| 2 | **`payment_intent.succeeded`** 等との **二重付与防止** — **`checkout.session.completed` 一度で完結**するか、**イベント間の重複抑止テーブル**で **`stripe_event_id`**／**`checkout_session_id`**／**`payment_intent_id`** をキーに **冪等**。** |
| 3 | **DB 更新（論理）:** **`reply_ticket_wallets.purchased_count`／`available_count`** の整合に従い、**`reply_wallet_ledgers` に **+1**（購入相当）**を **RI スコープで**反映**（既存クレジット／返書 ADR と整合）。** |
| 4 | **1 レポート合計 5 件上限** — **Checkout 作成前に API で拒否**し、**Webhook 側でも二重防御**（残枠 0 のときは付与しない）。** |
| 5 | **Webhook 再送**でも **二重付与しない**（同一 **`event.id`** または保存済みキーでスキップ）。** |

---

## 5. 返金／キャンセル／失敗

| # | 方針 |
|---|------|
| 1 | **Checkout 未完了:** **付与しない**。** |
| 2 | **`payment_failed`:** **付与しない**。** |
| 3 | **Refund（未使用チケット想定）:** **DB 側の **未使用分**のみ **減算候補**（`purchased`／`available` のモデル契約に従う）。** **詳細アルゴリズムは fulfillment SSOT で確定。** |
| 4 | **使用済み後の返金:** **製品ポリシー／サポート手順が別 SSOT**。本条は **「機械のみで自動返金しない」ことを前提**。** |
| 5 | **二重請求:** **Stripe ダッシュボード側の確認＋Webhook 側の **`event`** 単位 **`processed`** と **支払い参照の一意制約**。** |
| 6 | **管理者手動調整:** **ledger に **調整イベント**として残す（監査ログ方針。**実装詳細は別**。）。** |

---

## 6. リスク／STOP 条件

| STOP | 条件 |
|------|------|
| 1 | **`report_instance_id` が確定しない／存在しない** |
| 2 | **ユーザーが当該 RI を所有していない（wallet／ledger と不整合）** |
| 3 | **当該 RI で **5 件到達**済み** |
| 4 | **Wallet／ledger が quarantine** |
| 5 | **`session` のみを根拠に販売しようとする** |
| 6 | **Webhook 冪等性が未実装** |
| 7 | **Stripe test／live の混同** |
| 8 | **Secret の露出** |
| 9 | **Rollback／disable switch が未定義** |

---

## 7. 実装順序（推奨）

| 順 | 成果物 |
|----|--------|
| 1 | **Stripe 設計 SSOT（本条）** |
| 2 | **DB／API fulfillment 設計**（残枠・ledger 行の更新規則） |
| 3 | **Checkout API 設計**（ゲート条件） |
| 4 | **Webhook 設計**（イベント・冪等・再送） |
| 5 | **商品棚／相談入口 UI** |
| 6 | **E2E／smoke test** |
| 7 | **本番 env 投入**（秘密はシークレットマネージャのみ） |
| 8 | **本番低額テスト** |

---

## 8. 現時点の判定

| 判定 | Verdict |
|------|---------|
| **Stripe 設計レビュー（本条）** | **GO** |
| **Stripe Dashboard の変更** | **NO-GO（本条では触らない）** |
| **実装（Checkout／Webhook／env）** | **NO-GO（別承認）** |
| **商品棚 UI** | **NO-GO** |

---

## 9. Related

| Path | 用途 |
|------|------|
| `docs/ssot/M55_REPLY_WALLET_DB_REACH_POINT_BEFORE_STRIPE_EXPANSION_v1.md` | DB 到達点ゲート |
| `docs/ssot/M55_REPLY_CREDIT_LEDGER_ARCHITECTURE_ADR_v1.md` | クレジット／ledger 語彙 |
| `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` | 付与・上限の背景 |

---

## 10. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — 追加相談返書 Stripe 拡張の設計レビュー |
