# M55_REPLY_TICKET_PHASE_IV_FULFILLMENT_TRANSACTION_HELPER_GATE_v1

Status: **Phase IV — fulfillment transaction helper を「実装してよいか」判断するゲート SSOT。** **本条はコード・SQL／RPC／migration／DB 更新・Dashboard／env／UI・本番決済テストを承認しない。**

Recorded: **2026-04-28**

Upstream:

- **Phase II（Checkout）:** `docs/ssot/M55_REPLY_TICKET_PHASE_II_CHECKOUT_API_SKELETON_RESULT_v1.md`
- **Phase III（Webhook skeleton）:** `docs/ssot/M55_REPLY_TICKET_PHASE_III_WEBHOOK_REPLY_LANE_SKELETON_RESULT_v1.md`
- **DB transaction 実装方針:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_TRANSACTION_IMPLEMENTATION_DESIGN_v1.md`
- **API 契約:** `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md`
- **本番 partial UNIQUE 証跡:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1.md`

**秘密・Webhook signing secret・環境変数の値を記載しない。**

---

## 1. 現在のリスク

| 論点 | 内容 |
|------|------|
| **Checkout API** | Stripe Checkout Session **作成まで到達可能**（price env 設定時）。**金流は発生しうる。** |
| **Webhook Reply lane** | **DTR `fulfillDtrCoreFromCheckoutSessionId` へは流れない**が、**追加チケットの wallet／ledger／`stripe_processed_events` 付与は未実装**。 |
| **skeleton の限界** | **`event.id`／`report_instance_id` 欠損でも 200 で ack のみ**（付与しない）。運用上の **異常イベントの検知・再処理**は fulfillment 側で規定すべき。 |
| **ユーザー導線** | **本番導線・商品棚 UI・手動での本番決済テストは NO-GO**。**fulfillment 完成・検証ゲートまで、エンドユーザー向け露出を避ける**（または feature flag で遮断）。 |

**結論（リスク要約）:** 「**課金は起きうるが、プロダクト上の権利同期が未完**」。**決済検証／UI 露出／本番だけでの手動検証へ飛ばないこと。**

---

## 2. Phase IV で「実装してよい」とみなせる範囲（次承認で着手）

※ **本条のみでは実装 GO にならない。** **別承認後**に、概ね以下を **サーバー単体／`lib/m55/reply/`** で満たす helper を用意する。

| 範囲 | 内容 |
|------|------|
| **配置** | **`lib/m55/reply/` 配下、server-only** の **fulfillment transaction helper**（ファイル名は実装時に確定）。 |
| **呼び出し候補** | **`checkout.session.completed` の Reply lane**（`handleReplyTicketCheckoutCompletedSkeleton` の置換／委譲先）。 |
| **冪等** | **`stripe_processed_events`** を **`stripe_event_id`（= `event.id`）軸で使用**。**partial UNIQUE 衝突は duplicate／冪等 no-op**。 |
| **wallet** | **`purchased_count` +1、`available_count` +1**（規則は cap SSOT と一致）。 |
| **ledger** | **`delta` +1 の INSERT**。`event_type` = `purchase_grant`、`source_of_grant` = `PURCHASE`、`reply_session_id` = `NULL`。Stripe 参照列（`stripe_event_id`／`stripe_checkout_session_id`／`stripe_payment_intent_id`／`product_key`）を記録。 |
| **OUT OF SCOPE（本条で追加承認しない限り禁止に近いもの）** | **商品棚 UI**、**本番のみ決済試験**、**Stripe Dashboard／env をチーム運用以外で変更**すること。 |

---

## 3. 必須 transaction 条件（満たさなければ実装をマージしない）

| # | 条件 |
|---|------|
| 1 | **`event.id` 必須**。**欠損は STOP**（現状 skeleton のような **単なる ack で済ませない** — **付与しない＋適切 HTTP／監査**。具体は実装 PR で契約化）。 |
| 2 | **`report_instance_id` 必須**。**欠損は STOP**（同上）。 |
| 3 | **`product_key` = `additional_reply_ticket`** を **session metadata で検証**。 |
| 4 | **所有者確認**（例: **`dtr_report_snapshots`** を **id × user（`client_reference_id` と整合）**で照合 — Phase II 検証と整合）。 |
| 5 | **wallet active**。**quarantine 相当は付与しない**（`wallet_not_active`）。 |
| 6 | **cap 再確認**（Checkout と **TOCTOU** で **Webhook 内でも**）。 |
| 7 | **`stripe_processed_events` に未処理〜完了への遷移**（設計書の **`status`** 方針に従う）。 |
| 8 | **partial UNIQUE 衝突** → **duplicate no-op**（wallet／ledger を **増やさない**）。 |
| 9 | **wallet 更新と ledger insert を同一原子境界に**。**wallet のみ**・**ledger なし**を **禁止**。 |
| 10 | **`processed` のみ確定して wallet 未更新** を **禁止**。 |

---

## 4. 実装方式の決定（事前にリポ／インフラで確認）

| 候補 | 内容 |
|------|------|
| **B: Postgres RPC／DB 関数** | **`BEGIN…COMMIT` 単一**。Supabase は **`.rpc('…')`**。**migration と権限**が必要。 |
| **C: Server（Node）からの明示 Tx** | **PG ドライバ**や **`postgres.js`/`pg`** などで **`BEGIN`**。既存構成の有無を確認する。 |

**運用ルール:**

- **`M55_REPLY_TICKET_FULFILLMENT_DB_TRANSACTION_IMPLEMENTATION_DESIGN_v1.md` の結論どおり**: **複数 Supabase `.from().*` の await チェーンのみ** を **fulfillment の主経路にしない**。  
- **実装着手前チェック:** 当該リポで **Supabase が server から `rpc`＋トランザクション SQL を実行できるか**、または **既存の PG 直接接続**があるかを **README／インフラ担当と突合**する。

---

## 5. `stripe_processed_events.status` 方針（決め切りの入力）

| status | DB に残すか | メモ |
|--------|--------------|------|
| `processed` | **はい** | 正常完了。**wallet／ledger と同一 commit**。 |
| `duplicate_noop` | **原則いいえ** | **競合のみ catch／事前 SELECT** で **新規行なし**。残す場合は設計レビューで明示。 |
| `skipped_cap` | **はい（推奨）** | cap で **wallet 更新なし**。**再送時の挙動**を固定する。 |
| `rejected_invalid_product` | **はい（推奨）** | metadata 不一致。 |
| `rejected_not_owner` | **はい（推奨）** | |
| `rejected_wallet_inactive` | **はい（推奨）** | |
| `failed_technical` | **原則 rollback なら行なし** | **ログ＋メトリクス**。部分コミット戦略が出た場合のみ再評価。 |

**どれを「ログのみ」にするか**は **運用監査要件**と **PII／保存禁止**ポリシーで最終調整する。

---

## 6. 事前 STOP 条件

| STOP |
|------|
| **transaction 境界**がレビュー前に確定していない |
| **`event.id` 欠損**を **_ack のみで通す fulfillment** とする |
| **`report_instance_id` 欠損**も **同上** |
| **partial UNIQUE／`stripe_processed_events` を使わない**一意戦略での付与 |
| **cap 未確認**（Checkout のみなど） |
| **CHECK 許容外の `event_type`／`source_of_grant` を ledger に載せる** |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts` を Reply 目的で改変する**／**DTR 経路への混入** |
| **`payment_intent.succeeded`** を **付与の主経路**にする |
| **UI に露出**／**本番決済のみでの着手テスト**に飛ぶ |

---

## 7. 検証方針（実装 PR で満たす）

| # | 内容 |
|---|------|
| 1 | `npx tsc --noEmit` |
| 2 | `read_lints`（変更ファイル） |
| 3 | 可能なら **helper の単体テスト／モック**（DB を触らない層でも可） |
| 4 | **既存 Webhook／DTR 経路の diff は最小**。**`checkout.session.completed` の DTR ブロックは論理変更しない**ことを PR で確認する |
| 5 | **本番 DB を更新するインテグレーション試験**は **別承認** |

---

## 8. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **Phase IV gate（本条）作成** | **GO** |
| **fulfillment transaction helper の実装** | **本条単体では GO にしない。** **次の別承認＋実装 PR** |
| **本番決済テスト／商品棚 UI** | **NO-GO** |

---

## 9. CHANGELOG — v1

- 初版: Phase IV 実装前ゲート — リスク、許容範囲、atom 要件、実装方式、status、STOP、検証、`payment_intent` 非経路を固定。
