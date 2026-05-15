# M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1

Status: **M55 追加相談返書チケットの **Checkout API**／**Webhook API** の **契約（ルート・入力・出力・検証・Stripe パラメータ）**を SSOT 化する。** **本条はコード実装・Dashboard 変更・env／秘密の設定を承認しない。**  

Recorded: **2026-04-28**

Upstream:

- **トランザクション設計:** `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_TRANSACTION_DESIGN_REVIEW_v1.md`
- **本番 partial UNIQUE 証跡:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1.md`
- **Idempotency 方針:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_IDEMPOTENCY_UNIQUENESS_DESIGN_REVIEW_v1.md`

**商品境界:** 価格 **500 円**／**1 `report_instance_id` 合計 5 件まで**（同梱 **1** ＋ 追加 **最大 4**）／**1 決済 1 枚**／**既存 session backfill に依存しない**。  

**秘密・DB URL・Webhook signing secret・実キー値は記載しない。** レスポンス・ログにも **secret を出さない**。

---

## 1. Checkout API — route 候補

**Method / path（候補）:** `POST /api/reply-tickets/checkout`

### 1.1 Request body（JSON）

| フィールド | 型（論理） | 必須 | 内容 |
|------------|------------|------|------|
| `report_instance_id` | string（UUID 等はシステム契約に従う） | **必須** | 付与対象レポート実体 |
| `product_key` | string | **必須** | 期待値 **`additional_reply_ticket`**（他値は拒否） |

### 1.2 Response — 成功（論理）

| フィールド | 内容 |
|------------|------|
| `checkout_url` **または** `session_id` | 少なくとも **どちらか一方**は返す。**フロント方針**でどちらを正とするか確定。**URL に秘密を含めない。** |

※ 実装時は **`session_id` のみ**返しフロントで Stripe.js を使う構成もあり得る。**本条は両候補を許容**。

### 1.3 Error contract（論理コード名）

| code | 意味 |
|------|------|
| `unauthenticated` | 未ログイン／セッション無効 |
| `forbidden_not_owner` | **`report_instance_id` を当該ユーザーが所有しない** |
| `wallet_not_found` | wallet 不在 |
| `wallet_not_active` | active ではない（quarantine 等） |
| `cap_reached` | **上限 5 到達**（`initial_included_count + purchased_count >= 5`） |
| `invalid_product` | **`product_key` 不一致または未対応 SKU** |
| `stripe_error` | Stripe API 側障害／レート／一時エラー |

**HTTP へのマップ**は実装フェーズで固定（例: 401／403／404／409／422／502）。

---

## 2. Checkout API — validation

| # | ルール |
|---|--------|
| 1 | **ログイン必須** |
| 2 | **ユーザーが `report_instance_id` を所有** |
| 3 | **wallet が active** |
| 4 | **quarantine は除外**（Checkout 作成しない） |
| 5 | **`initial_included_count + purchased_count < 5`** |
| 6 | **追加購入枠:** **`purchased_count < 4`**（同梱 1 ＋ 追加最大 4 と整合） |
| 7 | **`report_instance_id` 必須・形式妥当** |
| 8 | **`product_key` が `additional_reply_ticket` と一致** |
| 9 | **Stripe `metadata` は最小化**（§3） |
| 10 | **生の個人情報・本文を metadata に入れない** |

---

## 3. Stripe Checkout Session 作成 contract

| パラメータ | 値 |
|------------|-----|
| **mode** | `payment` |
| **line_items.quantity**（または単品相当） | **1** |
| **price／price id** | **env／サーバー設定**から読む（**値そのものを SSOT に書かない**） |
| **success_url** | アプリ側の **成功リダイレクト** |
| **cancel_url** | **キャンセルリダイレクト** |

### 3.1 metadata（Stripe → Webhook で検証）

| キー | 値 |
|------|-----|
| `product_key` | `additional_reply_ticket` |
| `report_instance_id` | リクエストと一致する ID |
| `user_ref_hash` **または** `user_id_hash` | **ハッシュのみ**。**生ユーザー識別子は載せない** |
| `quantity` | `1` |

### 3.2 `client_reference_id`

**使用するかは実装レビューで決定。** 利用する場合も **秘密・長大 payload を載せない**。`report_instance_id` や内部 ID のみに留める可否を **Fulfillment／セキュリティ**と整合させる。

### 3.3 禁止

- **Webhook secret／API secret／ログ・レスポンスへの秘密出力**

---

## 4. Webhook API — route 候補

**Method / path（候補）:** `POST /api/stripe/webhook`

| 要件 | 内容 |
|------|------|
| **raw body** | **Stripe 署名検証のためバッファ検証**。JSON だけ先にパースして **検証しない**構成を推奨。 |
| **Stripe 署名検証** | **必須**。**失敗時は付与なし**。 |
| **`event.id`** | **必須**。**欠損・パース不可は STOP**（付与ロジックに入れない §5）。 |
| **付与対象イベント** | **`checkout.session.completed` のみ** |
| **`payment_intent.succeeded`** | **直接付与しない**（no-op または計測のみ）。 |

**test／live:** 環境ごとの **Webhook secret と URL** で分離。**混同 STOP**（§8）。

---

## 5. Webhook fulfillment contract

| 順序 | 処理 |
|------|------|
| 1 | 署名検証（§4） |
| 2 | **`event.type === checkout.session.completed`** 以外 → **no-op**（または軽い監査のみ） |
| 3 | **`product_key`** 検証 |
| 4 | **`report_instance_id`** 検証 |
| 5 | **ユーザー所有権**検証 |
| 6 | **wallet active** 検証（quarantine は付与しない） |
| 7 | **cap 再確認**（`initial_included_count + purchased_count < 5` かつ必要なら `purchased_count < 4` の枠） |
| 8 | **`stripe_processed_events` INSERT**（`stripe_event_id` 非NULL） |
| 9 | **partial UNIQUE 衝突** → **冪等 no-op**（wallet／ledger を増やさない、**200 応答方針**はセキュリティ SSOT と整合） |
| 10 | **wallet:** `purchased_count`／`available_count` **+1** |
| 11 | **ledger:** **+1 相当 1 行 INSERT**（Stripe 参照列を埋める） |
| 12 | **`stripe_processed_events.status` → `processed`** |
| 13 | **単一 DB transaction** で **8〜12 をまとめる**（設計 §6） |

### 5.1 `stripe_processed_events.status` 候補（エラー／分岐）

| status（候補名） | 用途 |
|------------------|------|
| `pending` | 処理開始直後（短時間のみ想定） |
| `processed` | 正常完了（wallet＋ledger 確定と同時） |
| `skipped_cap` | **支払い後だが cap で付与しない**（wallet 未更新） |
| `rejected_metadata` | metadata／商品不一致 |
| `rejected_ownership` | 所有権・wallet 不整合 |
| `failed_technical` | DB／予期せぬ例外（**ロールバック時は行が残らない**設計と整合させる） |

**必須:** **`processed` のみ先に書いて wallet 未更新**を **禁止**（トランザクション設計レビューと整合）。

---

## 6. DB transaction boundary

| 原則 | 内容 |
|------|------|
| **呼び出し主体** | **サーバーのみ**（**service role／サーバー専用**）。クライアントから **processed_events／wallet／ledger を直接更新禁止**。 |
| **スコープ** | **同一 transaction で**（可能なら）**`stripe_processed_events`・wallet・ledger** を更新。 |
| **禁止** | **wallet のみ更新**／**ledger なしで残高増**／**`processed` のみ確定して wallet 未反映** |

**備考:** INSERT で UNIQUE 競合した **完全な no-op** は **開始前 SELECT** または **ON CONFLICT 方針**で **Tx を短縮**する実装詳細へ委ねる（本条は境界のみ）。

---

## 7. Observability / audit

**記録してよい識別子（非 PII に寄せる）:**

- `event.id`（Stripe event id）
- `checkout_session_id`
- `payment_intent_id`
- `product_key`
- `report_instance_id`
- `status`／**エラー分類コード**（内部列挙）

**禁止:**

- **PII 原文**／**payload 全文**の永続化（**ログも含む**運用ポリシーで抑止）

---

## 8. STOP 条件

| STOP |
|------|
| secret を **レス／ログ／SSOT に露出**する |
| **Webhook 署名検証なし**で payload を信じる |
| **`event.id` なし**で付与 |
| **partial UNIQUE／冪等経路なし**で wallet 更新 |
| **`user_id` だけ**で付与を確定する |
| **`report_instance_id` なし**で付与 |
| **cap 未確認**（Checkout／Webhook の **いずれか一方だけ**になる） |
| **ledger なし**での付与 |
| **processed／wallet／ledger の更新を transaction で束ねない**（部分コミット） |
| **test／live 混同** |

---

## 9. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **API contract design（本条）** | **GO** |
| **コード実装** | **NO-GO** |
| **Stripe Dashboard 変更** | **NO-GO** |
| **env／secret 変更** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 10. CHANGELOG — v1

- 初版: Checkout／Webhook のルート・入出力・Stripe Session・fulfillment／status／観測・STOP を契約として固定。
