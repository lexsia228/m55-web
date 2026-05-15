# M55_REPLY_TICKET_CHECKOUT_WEBHOOK_IMPLEMENTATION_READINESS_v1

Status: **M55 追加相談返書の Checkout／Webhook を実装に入る前の **構成調査・タッチ順・リスク gate**。** **本条はコード／SQL／RPC／migration／DB／Stripe Dashboard／env／UI の変更承認ではない。**  

Recorded: **2026-04-28**

Upstream DB 証跡:

- **`public.stripe_processed_events`** 作成済み、**`stripe_event_id` partial UNIQUE** 済み。
- **`reply_wallet_ledgers`** に `stripe_event_id`／`stripe_checkout_session_id`／`stripe_payment_intent_id`／`product_key` 済み。

設計 SSOT:

- `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md`
- `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_TRANSACTION_DESIGN_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_TRANSACTION_IMPLEMENTATION_DESIGN_v1.md`

**秘密・Webhook signing secret の値・DB URL 全文・実 price id は記載しない。**

---

## 1. 既存ファイル調査（このリポジトリ時点）

### 1.1 `app/api` — checkout / Stripe / webhook

| パス | 役割 |
|------|------|
| `app/api/purchase/checkout/route.ts` | **DTR Core 専用**の Stripe Checkout Session 作成。`productId === DTR_CORE_STATIC_V1` 分岐。`auth`/`currentUser`。`resolveEntryReportOwnership` 等。**M55 reply ticket は未収容。** |
| `app/api/stripe/webhook/route.ts` | **統合 Webhook**。`STRIPE_WEBHOOK_SECRET`、**raw body**＋署名検証。`getSupabaseAdmin()`。`stripe_events` で **`event.id` 重複を早期 200**。`checkout.session.completed` → `handleCheckoutCompleted`（subscription と one-time 分岐）、one-time は **`ALLOWED_ONE_TIME_PRODUCTS`**（現在 **`DTR_CORE_STATIC_V1` のみ**）経由で **`fulfillDtrCoreFromCheckoutSessionId`**。`invoice.paid`／`charge.refunded`。**`payment_intent.succeeded` は付与レーン無し**。 |
| `app/api/me/entitlements/route.ts` | DTR entitlement 読取。**Checkout とは別**。 |
| `app/api/reply/generate/route.ts`、`app/api/reply/history/route.ts`、`app/api/reply/session/[replySessionId]/route.ts` | Reply 機能。**Stripe 決済経路とは未接続**（consume／履歴など）。 |

**未有り:** `app/api/reply-tickets/**`、`POST /api/reply-tickets/checkout`。

**補足:** `src/app/api/__probe/route.ts` と `app/api/__probe/route.ts` の二重がありますが、**Stripe とは無関係**。

### 1.2 Stripe クライアント／ヘルパー

| パス | 内容 |
|------|------|
| `lib/stripe.ts` | `getStripe()` — `process.env.STRIPE_SECRET_KEY` 必須。 |

### 1.3 Supabase / service role

| パス | 内容 |
|------|------|
| `lib/supabaseAdmin.ts` | **`getSupabaseAdmin()`**。`NEXT_PUBLIC_SUPABASE_URL` + **`SUPABASE_SERVICE_ROLE_KEY`**。サーバー限定利用が前提（各 route で import）。 |

### 1.4 Clerk auth

API route では **`import { auth } from '@clerk/nextjs/server'`**（および `currentUser`）が共通。Stripe `/webhook` 以外の API で利用。

### 1.5 wallet／ledger／reply ticket 関連実装

| パス | 内容 |
|------|------|
| `lib/m55/reply/constants.ts` | `REPLY_WALLET_STATUSES`、`WALLET_LEDGER_EVENT_TYPES`（**`purchase_grant` あり**）、`WALLET_SOURCE_OF_GRANT_VALUES`（**`PURCHASE` あり**）。**`additional_reply_ticket` は未定義**（実装フェーズで定数追加候補）。 |
| `lib/m55/reply/walletGrants.ts` | `grantInitialIncludedReplyIfNeeded`、`grantPurchasedReplyTickets`。`reply_wallet_ledgers` INSERT は **`event_type`／`source_of_grant`／`delta`／`balance_after`** 中心。**Stripe 参照列・`report_instance_id` は現行 `appendGrantLedger` に未接続**（fulfillment 拡張が必要）。 |
| `lib/m55/reply/readReplyWalletProbe.ts` | 読取プローブ。 |
| `lib/m55/reply/types.ts`、`lib/m55/reply/recordValidators.zod.ts` | 型・Zod。 |

### 1.6 既存 DTR 購入フローとの接点

| パス | 内容 |
|------|------|
| `lib/oneTimeCheckout.ts` | `DTR_CORE_STATIC_V1`、`ALLOWED_ONE_TIME_PRODUCTS`（**DTR のみ**）。 |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | **`fulfillDtrCoreFromCheckoutSessionId`** — `one_time_fulfillments`／`entitlements`／`entitlement_rights`／DTR スナップショット。成功時に reply wallet 初回同梱 **`grantInitialIncludedReplyIfNeeded`** を呼ぶ可能性あり（該当 product のみ）。 **`session.metadata.productId`** を正とする。** |
| `lib/m55/verifyStripeCheckoutSessionForDtr.ts` | DTR 用セッション検証。 **`ALLOWED_ONE_TIME_PRODUCTS` 依存**。 |

### 1.7 テスト／E2E

| パス | 内容 |
|------|------|
| `e2e/reply-generate-smoke.spec.ts` | Reply 生成スモーク。**ledger／wallet に触れるが Stripe Checkout／Webhook は対象外**。 |
| `e2e/core-*.spec.ts`／`home-core-*.spec.ts` | Core／視覚系。**Stripe M55 と無関係**。 |

**単体テスト（`*.test.ts` / `__tests__`）は本調査では未検出**。実装フェーズで **Vitest／Jest 導入有無をリポ規約に合わせて決定**する。

---

## 2. 実装候補ファイル／責務の置き場

### 2.1 Checkout route

| 候補 | パス |
|------|------|
| API 契約どおり **`POST /api/reply-tickets/checkout`** | **`app/api/reply-tickets/checkout/route.ts`**（**新規**） |

**理由:** **`/api/purchase/checkout`** は DTR メタデータ・409 ロジックが密結合。**別レーンとして分離**し、設計書の **`report_instance_id` + `product_key`** 契約へ寄せる。

### 2.2 Webhook — 拡張 vs 分割

| 案 | メリット | 留意 |
|----|----------|------|
| **A: 既存 `app/api/stripe/webhook/route.ts` に分岐追加**（推奨） | **単一 Stripe Webhook endpoint** と整合。運用変更が少ない。**`handleCheckoutCompleted` 内または直前で `product_key`／`productId` を読み Reply レーンへ。** | **読みやすさ**のため **`handleCheckoutCompletedAdditionalReplyTicket` 級の関数へ抽出**すると安全。 |
| **B: 新 route で別 endpoint** | ファイルは分離。**Stripe Dashboard で URL を増やす**必要（**本条では Dashboard 変更 NO-GO** のため現時点では非推奨）。 |

### 2.3 Transaction／fulfillment の置き場

| レイヤー | 候補パス／方法 |
|-----------|----------------|
| **Server-only ヘルパ** | **`lib/m55/reply/`** 配下に `fulfillAdditionalReplyTicketFromStripeSession.ts` のようなモジュール（名称は実装時に確定）。**`getSupabaseAdmin` + 単一 Tx（PG raw または RPC 呼び出し）**。 |
| **DB RPC** | **別 migration で関数化**する場合、`lib` から **`.rpc('...')`**。**現時点では migration 作成 NO-GO。** |
| **Route に直接書かない** | 複雑ロジックは **route は薄く**、**ヘルパーに集約**（レビュアビリティ）。 |

### 2.4 型・定数・`product_key`

| 種別 | 候補 |
|------|------|
| **定数** | **`lib/m55/reply/constants.ts`** に `ADDITIONAL_REPLY_TICKET_PRODUCT_KEY = 'additional_reply_ticket'` を追加するか、**`lib/m55/reply/replyCheckoutConstants.ts`** で分離。**既存の `ALLOWED_ONE_TIME_PRODUCTS` とは別集合**として管理し、`oneTimeCheckout.ts` と **混線させない**。 |
| **型** | `lib/m55/reply/types.ts` または **`lib/contracts/replyTicketCheckout.ts`**（新規）— チーム規約に従う。 |

### 2.5 テスト候補

| 種別 | 候補パス |
|------|----------|
| **単体** | `lib/m55/reply/__tests__/` または `tests/unit/m55/reply/`（導入時） |
| **E2E** | `e2e/reply-ticket-checkout-smoke.spec.ts`（**test mode・Stripe CLI**前提は Phase で定義） |

---

## 3. 既存 Stripe フローとの衝突確認

| リスク | 内容 | 緩和 |
|--------|------|------|
| **DTR Checkout と混線** | 同一 `/api/purchase/checkout` に無理に載せると **DTR 専用前提が壊れる**。 | **Reply 用は別 route**（§2.1）。 |
| **Webhook で二重付与** | `checkout.session.completed` が **常に `fulfillDtrCoreFromCheckoutSessionId`** に入ると、Reply 用 Session で **DTR DB を汚染**。 | **`metadata`（`product_key` または `productId`）で最上流分岐**し、**Reply のときは DTR fulfill を呼ばない**。 |
| **`ALLOWED_ONE_TIME_PRODUCTS` の拡大の罠** | DTR 検証ライブラリが **同一 Set** を参照すると、**意図しない経路で DTR fulfill** が走る恐れ。 | **Reply 用は別定数・別分岐**。**`verifyStripeCheckoutSessionForDtr` に Reply product を混ぜない**。 |
| **`payment_intent.succeeded`** | 現状 **付与レーンなし**。 | **設計どおり直接付与しない**まま維持。 |
| **`checkout.session.completed` の扱い** | 既存: subscription／DTR one-time。 | **第三レーン: additional reply ticket** を **明示的に追加**。 |
| **グローバル `stripe_events` 重複ガード** | **同一 `event.id` は再処理されない**（既存挙動）。 | Reply も **初回成功後に `stripe_events` へ到達**する既存フローを踏襲するか、**失敗時の再試行**と矛盾しないよう **設計レビューで整合**（`stripe_processed_events` との二層の役割をコメント化）。 |

---

## 4. env／secret 確認方針（名前のみ・値は書かない）

| 目的 | 環境変数（候補・既存踏襲） |
|------|----------------------------|
| Stripe シークレットキー | **`STRIPE_SECRET_KEY`**（既存 `lib/stripe.ts`） |
| Webhook 署名 | **`STRIPE_WEBHOOK_SECRET`**（既存 webhook route） |
| Reply 追加チケット用 Price | **新規:** 例 **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`**（**命名は実装 PR で確定**。**値は Dashboard からコピーし SSOT に貼らない**） |
| Supabase | **`NEXT_PUBLIC_SUPABASE_URL`**、**`SUPABASE_SERVICE_ROLE_KEY`**（既存） |
| Clerk | 既存の Clerk env（**本条に列挙の詳細は不要**— **秘密は出さない**） |

**方針**

- **値・プレフィックス付き実キーは絶対に文書化しない。**  
- **Price ID は secret ではないが、リポジトリ直書きは避け env 参照**（既存 DTR が `STRIPE_PRICE_DTR_CORE_STATIC_V1` パターン）。  
- **test／live** で **キーと Webhook secret を取り違えない**（`.env.local` 運用ルール）。  

---

## 5. 実装フェーズ案（本条では実施しない）

| Phase | 内容 |
|-------|------|
| **I** | **定数／型のみ**（`product_key`、エラーコード型、metadata キー名） |
| **II** | **Checkout API スケルトン**（認証・validation・429/403 の枠） |
| **III** | **Webhook route 分岐スケルトン**（**DTR へ入れない**ガード付き） |
| **IV** | **fulfillment transaction ヘルパー／RPC 設計**（Tx 境界は DB transaction SSOT） |
| **V** | **テスト／スモーク設計**（単体＋可能なら E2E） |
| **VI** | **Stripe Dashboard／env 設定**（**別承認**） |
| **VII** | **test mode E2E** |
| **VIII** | **live 低額テスト** |

---

## 6. 事前 STOP 条件

| STOP |
|------|
| 既存 **DTR Webhook レーン**を壊す・**無分岐で `fulfillDtrCoreFromCheckoutSessionId` に流す**恐れがある |
| **`product_key`／`productId` 分岐が未設計**のまま実装に入る |
| **`service role` をクライアントや公開 API に露出**する設計 |
| **Transaction 境界が未確定**のまま wallet／ledger を更新する |
| **env／secret をログ・SSOT・PR 説明に貼る** |
| **Stripe Dashboard 変更**から先に飛びつく |
| **商品棚 UI** から先に飛びつく |
| **テスト計画なし**で本番近い変更に入る |

---

## 7. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **implementation readiness（本条）** | **GO** |
| **コード実装** | **NO-GO** |
| **SQL／RPC／migration** | **NO-GO** |
| **Stripe Dashboard／env 値設定／商品棚 UI** | **NO-GO** |

---

## 8. CHANGELOG — v1

- 初版: `app/api`・`lib/m55`・Stripe／Supabase／Clerk・DTR 接点・E2E 有無の棚卸し、候補パス、衝突リスク、env 名方針、フェーズ・STOP。
