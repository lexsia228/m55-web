# M55_REPLY_TICKET_FULFILLMENT_DB_API_DESIGN_REVIEW_v1

Status: **設計レビュー SSOT（文書のみ）。** **migration／コード／SQL 実行／Stripe Dashboard／Webhook 実装は本条で行わない。**  

Upstream:

- **`docs/ssot/M55_REPLY_TICKET_STRIPE_EXPANSION_DESIGN_REVIEW_v1.md`**
- **`docs/ssot/M55_REPLY_WALLET_DB_REACH_POINT_BEFORE_STRIPE_EXPANSION_v1.md`**

Architecture（正本）:

- **`docs/ssot/M55_REPLY_CREDIT_LEDGER_ARCHITECTURE_ADR_v1.md`**

Session 方針:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B3_SESSION_QUARANTINE_CONTINUATION_v1.md`**

**Stripe secret／webhook signing secret／DB URL／サービスキー／env 値は出力しない。**

Recorded: **2026-04-28**

---

## 1. Fulfillment の目的

| # | 目的 |
|---|------|
| 1 | **Stripe が **支払い完了した後**のみ、対象 **`report_instance_id`** スコープの **追加相談返書チケットを **+1**** する。** |
| 2 | **同一 **`report_instance_id`** について **累計クレジットが **合計 **5**** 件（**付属 **1****＋**追加 **4****）を **超えない**。** |
| 3 | **Webhook 再送・アプリ多重呼び出しでも **二重付与しない**。** |
| 4 | **`reply_wallet_ledgers` に **監査可能なイベント**として **付与経路が追える**。** |

---

## 2. 対象 DB（論理モデル）

| # | 内容 |
|---|------|
| 1 | **`reply_ticket_wallets`** — **残数 **`available_count`** の正本**。** **`report_instance_id` 単位でスコープ**（複数_wallet 行モデルまたは既存制約へのマッピングは実装フェーズで **DATA MODEL SSOT と整合**。）。** |
| 2 | **`reply_wallet_ledgers`** — **付与イベントの説明責任**。** |
| 3 | **Stripe 側イベント一意性／再送耐性**のため、`stripe_processed_events`** のような **`event_id`** 一意テーブルの **導入候補**（**本条では migration を作らない**。）。** |
| 4 | **軸:** **`report_instance_id`** と **`wallet`／ledger の親子整合**。** **`user_id` 単独**では権利を付与しない。** |
| 5 | **`reply_sessions` に既存 backfill で RI を載せない**前提のまま、**Fulfillment は **session に依存しない**。** |

※ **`reply_ticket_wallets` の不変制約 **`available_count = initial_included_count + purchased_count - consumed_count`** はマイグレーション定義に従う**（変更しない）。追加購入は **`purchased_count`** と **`available_count`** を **同増**し、**`consumed_count`／`initial_included_count` は増減しない**（§3）。**

---

## 3. Wallet 更新設計（論理）

| # | 更新 |
|---|------|
| 1 | **`purchased_count := purchased_count + 1`** |
| 2 | **`available_count := available_count + 1`** |
| 3 | **`consumed_count`** — **変更しない**（Fulfillment で増やさない）。** |
| 4 | **`initial_included_count`** — **変更しない**。** |
| 5 | **`status`** — **`active` のみ**更新対象**（frozen／suspended 等は別ルール）。** |
| 6 | **`report_instance_id`** — **チェックアウトの対象と **同一 **`report_instance_id`** の **`reply_ticket_wallets` 行のみ**。** |
| 7 | **`initial_included_count + purchased_count`** — **増加後も **≤ **5（合計権利キャップ）。** **`purchased` の増分は **追加枠であり最大 **4**。（付属 **1**** は **`initial`** 側の語彙 — 実際の整数はマイグレーションとポリシーで一致させる**。） |

---

## 4. Ledger 更新設計（論理）

| # | 内容 |
|---|------|
| 1 | **差分 **`delta`** — **購入 1 件あたり **+1**（クレジット単位）。** |
| 2 | **`balance_after`**（または同等）— **Fulfillment **直後**の **`reply_ticket_wallets.available_count`** と **一致**。** |
| 3 | **`event_type`** 例:** **`purchase_additional_reply_ticket`。**
| 4 | **`source_of_grant`** 例:** **`stripe_checkout`。** |
| 5 | **`reply_session_id`** — **購入時点では **`NULL`** 許容**（消費時にセットする設計でもよい**。）。** |
| 6 | **`report_instance_id`** — **親 wallet と **同一**。**
| 7 | **Stripe の **`checkout_session_id`／`payment_intent_id`** 等は **PII とみなされる可能性のない識別子として**、`ledger.payload_json` に **論理グループごと載せる**／**または **監査サブカラム**のいずれか**。** **本文への直コピーを乱雑にしない**。**

---

## 5. 冪等性設計（候補）

| # | 方針 |
|---|------|
| 1 | **一意キーの候補:** **`stripe_event_id`**（`evt_…`，Webhook の **`event.id`**）を **処理済みレコードとして保存**。** **再送された同一 **`event`** は **no-op**。** |
| 2 | **補助キー:** **`checkout_session.id`** が **同一チェックアウトを横断一意**となるケースでの **照合**。** **`payment_intent`** は **イベント種別により二重イベントと混線**するため **単独主キーにしない**。** |
| 3 | **アプリ側:** **`client_reference_id`／Metadata の **`idempotency_key`** を **Checkout Session 作成に渡し**、**サーバ側でも **Fulfillment と突合**。** |
| 4 | **二重ソース:** **`checkout.session.completed`** を **Fulfillment の主トリガにし**、`payment_intent.succeeded` は **処理しない**または **`event.id` と突き合わせて **処理済みをスキップ**。** **`ADR §4** の **`success_url` だけ付与禁止**に同旨**。** |

---

## 6. 上限チェック（二重ゲート）

| # | チェック |
|---|----------|
| 1 | **不変式（語彙）：** **`initial_included_count + purchased_count` の **意味上キャップ ****≤ **5** — 実コードは **`MAX_CREDITS`**／実装済みチェック関数と統一**。** |
| 2 | **追加購入は **最大 **4**，**単回 **+1`。** **`purchased` の増分が **その残枠**を **超えようとしない**。** |
| 3 | **Checkout Session 作成 API** — **残枠 0 で **セッションを作らない**。** |
| 4 | **Webhook Fulfillment** — **競合ウィンドウのため再度検証**。** **`INSERT ... ON CONFLICT`/トランザクション**で **`available`／`purchased` の増分を **原子的**。** |
| 5 | **上限到達後のイベント遅延** — **`event_id` が新規でも、**増分適用結果がキャップ逸脱するなら **no-op か **`error_logged`** とし **付与しない**。** |

---

## 7. 失敗／返金／キャンセル

| # | 方針 |
|---|------|
| 1 | **Checkout 未完了／`payment_failed`:** **DB 増分なし**。** |
| 2 | **Refund（未消化分）:** **`purchased`／`available` の対応した **減分候補** — **台帳に **`refund`** や **`adjustment`** で **負イベント**。** **算術は WALLET の不変式を維持**。** |
| 3 | **使用済み後の返金:** **運用規約／サポート**（自動逆算のみに依存しない）。** |
| 4 | **管理者調整:** **Ledger にのみ **監査イベント**。** |
| 5 | **Chargeback／Dispute:** **別 SSOT**。**

---

## 8. API 境界（責務）

| API 群（論理） | 責務 |
|----------------|------|
| **Checkout Session 作成 API** | **ユーザー・ **`report_instance_id`**／wallet 存在・**quarantine 否定**／**残枠**確認 → **Stripe**へ誘導するパラメータ生成。** |
| **Webhook Fulfillment Handler** | **署名検証 → 冪等 → `wallet／ledger` の原子更新のみ。** **`consult`** だけを更新しない（ADR と整合）。** |
| **Wallet 取得 API** | **`report_instance_id` スコープの `available_count` など。** |
| **残枠表示 API**（上記と統合可） | **追加で購入可能な件数。** |
| **相談送信／生成コミット API** | **成功後に `consumed` 増・`available` 減のみ。** 既存の `ledger.consume_*` パターンと整合させる。** |

各層が **consult 側だけで権利変動しない**ことを ADR と照合する。

---

## 9. STOP 条件（ Fulfillment を止める）

| # | 条件 |
|---|------|
| 1 | **`report_instance_id` が請求に載っていない／解決しない** |
| 2 | **ユーザーが当該 RI を **所有しない** **（wallet と不整合）。** |
| 3 | **対象 **`reply_ticket_wallets` が **存在しない**。** |
| 4 | **Wallet が **quarantine**（smoke／orphan 含む運用側定義）。** |
| 5 | **`status` が **`active` でない**。** |
| 6 | **合計 **5** 件キャップへ到達** |
| 7 | **冪等テーブル／キー検証が未実装** |
| 8 | **Stripe test／live の混同** |
| 9 | **Secret 露出またはログに載る危険** |
|10 | **Rollback／無効化スイッチが未定義** |

---

## 10. 現時点の判定

| 判定 | Verdict |
|------|---------|
| **DB／API Fulfillment 設計レビュー（本条）** | **GO** |
| **SQL migration 作成** | **NO-GO（本条のみ）** |
| **コード実装／Stripe Dashboard／Webhook／商品棚 UI** | **NO-GO** |

---

## 11. Related（再掲）

| Path |
|------|
| `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` |
| `docs/ssot/M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1.md` |

---

## 12. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — 追加返書チケットの DB／API fulfillment 設計レビュー |
