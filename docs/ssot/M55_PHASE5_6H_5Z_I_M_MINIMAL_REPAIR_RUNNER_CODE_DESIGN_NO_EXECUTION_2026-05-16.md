# Phase 5-6H-5Z-I-M — Minimal repair runner code design / no execution gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-M Minimal repair runner code design / no execution gate**

本条は **docs-only**：**最小 repair runner** の **インターフェース・手順・安全制約**を固定する。**runner ファイルの作成・dry-run 実行・DB write・repair 実行・API 実行は行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-J`** | **`SELECTED_ROUTE_R1_APPLICATION_SIDE_FULFILLMENT_FUNCTION_REUSE`** — **`fulfillDtrCoreFromCheckoutSessionId`** 再利用。 |
| **`5Z-I-K-A`** | **expected-missing 確定**（対象 fulfillment 系 artifact **row_count 0**）。**safe label（非 ID）：** **`cs_live_JSRW`**／**`user_36xz`** — **DB 値・SQL リテラルに使用禁止**。 |
| **`5Z-I-L`** | **pre-write implementation review 完了**。**Verdict：** **`READY_FOR_MINIMAL_REPAIR_RUNNER_CODE_DESIGN_GATE`**。**Production DB write／dry-run 実行／repair 実行／フル ID SSOT 転記：`5Z-I-L` §12・§13 にて未実施として記録**。 |
| **`stripe_events`（I-L 継承）** | **`READY_WITH_ACTUAL_STRIPE_EVENT_ID_HUMAN_ONLY`**。**実 `event.id` は Human ローカルのみ**。SSOT に **フル event ID を書かない**。 |
| **本条** | **runner 設計のみ**。**コード作成なし／実行なし**。 |

**Work anchor：** **`cf08a96815247c553978650ac02517a1d15db7ec`** — **`docs: review pre write repair script design`**（**`5Z-I-L`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-M-MINIMAL-REPAIR-RUNNER-DESIGN-001`** | **本条：** **minimal repair runner コード設計（no execution）**。 |
| **`M55-EVID-20260516-5Z-I-L-PRE-WRITE-REPAIR-SCRIPT-REVIEW-001`** | pre-write 実装レビュー |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | Supabase **expected missing** |
| **`M55-EVID-20260516-5Z-I-J-REPAIR-ROUTE-SELECTION-TECH-DESIGN-001`** | R1 経路選択 |

**転記禁止：** フル Session／Event／PI／ユーザ／メール／client_reference／秘密鍵／whsec。**safe label を DB に渡さない**。

---

## 4. Minimal runner design decision

### 4.1 形式の比較と選定

| Option | 内容 | 本条の評価 |
|--------|------|-------------|
| **1** | **ローカル one-off TypeScript runner** — `scripts/repair/`（または `scripts/one-off/`） | **推奨（採用）**。**攻撃面なし**。既存 **`fulfillDtrCoreFromCheckoutSessionId`** を **同一 repo から import**。 |
| **2** | **一時 admin-only HTTP route** | **却下**。**公開経路・認証・レビューコスト**が増える。 |
| **3** | **ローカル node/`tsx` コマンドで既存 fulfill を import** | **Option 1 と実質統合**。実行形は **`npx tsx <path.ts>`** と設計する。 |
| **4** | **runner なし・手書き SQL のみ** | **却下**。**Stripe／冪等／`stripe_events` 整合**がアプリ関数より弱く、ブロードミューテーションになりやすい。 |

**採定：** **Option 1 ＝ Option 3 統合**：**単一 `.ts` ファイル**を **Human ローカルでのみ実行**し、**既存 **`lib/m55/dtrCoreCheckoutFulfillment.ts`** の **`fulfillDtrCoreFromCheckoutSessionId`** を呼ぶ。

### 4.2 将来のファイルパス（本条では作成しない）

**第一候補：** `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`

**代替候補：** `scripts/one-off/repair-dtr-core-fulfillment-from-checkout-session.ts`

**`5Z-I-N`** で **明示 GO** が出た場合のみファイル作成。**ディレクトリ名はレビュア合意で `repair` と `one-off` のどちらか一方に統一**。

### 4.3 選定理由（要約）

- **Web／admin を増やさない**（Option 2 回避）。
- **full ID は環境変数または対話入力のみ**、**repo に残さない**。
- **`getStripe()`／`getSupabaseAdmin()`**（**`lib/stripe.ts`**／**`lib/supabaseAdmin.ts`**）と同じ **`STRIPE_SECRET_KEY`／`NEXT_PUBLIC_SUPABASE_URL`／`SUPABASE_SERVICE_ROLE_KEY`** を runner が **実行前に `process.env` に載せる**設計が自然（後述）。

---

## 5. Inputs and secret handling

### 5.1 将来 runner が要求する環境変数（プレースホルダ名のみ・値は SSOT 禁止）

| 変数 | 役割 |
|------|------|
| **`M55_REPAIR_CHECKOUT_SESSION_ID`** | **フル checkout session id — Human ローカルのみ** |
| **`M55_REPAIR_EXPECTED_USER_ID`** | **フル expected user（`client_reference_id` と一致させる Clerk／アプリ user id）— Human ローカルのみ** |
| **`M55_REPAIR_STRIPE_EVENT_ID`** | **フル Stripe `event.id`**（**`stripe_events` pre-insert 用）— Human ローカルのみ。**未取得時は実行経路は **`STOP`（理由 `UNRESOLVED_EVENT_ID`）**。 |
| **`M55_REPAIR_PRODUCT_ID`** | 既定：**`DTR_CORE_STATIC_V1`**（ログ・転記は **製品コード文字列のみ**可）。 |
| **`M55_REPAIR_DRY_RUN`** | **`true`／`false`**（または未設定時の規約は **`5Z-I-N`** で確定。**本条推奨 default：`true` が安全**。） |
| **`M55_REPAIR_CONFIRM`** | **実行フェーズのみ**：**完全一致フレーズ**（例：**専用の長い確認文**。具体文は **`5Z-I-N` で単一ソース化**。） |

### 5.2 既存サーバーパターンと一致させるべき secrets（名前のみ）

- **`STRIPE_SECRET_KEY`** — **`lib/stripe.ts`** の **`getStripe()`** と同じ。
- **`NEXT_PUBLIC_SUPABASE_URL`** と **`SUPABASE_SERVICE_ROLE_KEY`** — **`lib/supabaseAdmin.ts`**／既存 **`scripts/diag-dtr-user.mjs`** と同じ（**`SUPABASE_URL` は本 repo の admin が主に参照しない**。）

### 5.3 取り扱いポリシー

- **full 値は commit しない**。**`.env.example` にダミーを置くことも本条では要求しない**（**`5Z-I-N`** で別判断）。
- **標準出力に full ID／秘密を出さない**（§9）。

---

## 6. Dry-run design（将来 · **`5Z-I-O` で初めて実行可**）

Dry-run は **一切 DB write を行わない**。**Stripe retrieve は許可**（read-only で支払文脈を検証）。**Supabase は SELECT のみ**（既存 artifact の有無確認）。

### 6.1 Stripe validation（retrieve 結果）

すべて **true** でなければ **`STOP`**（理由コードのみログ）：

| # | Check |
|---|--------|
| 1 | **retrieve 成功** |
| 2 | **`livemode === true`**（**fulfill 関数外の追加検証**。） |
| 3 | **`mode === 'payment'`** |
| 4 | **`status === 'complete'`** |
| 5 | **`payment_status === 'paid'`** |
| 6 | **`amount_total === 1000` かつ `currency === 'jpy'`** |
| 7 | **`metadata.productId === 'DTR_CORE_STATIC_V1'`** |
| 8 | **`success_url`／`cancel_url`** が **`m55-webv2.vercel.app` ドメイン意図**と整合 |

### 6.2 User 整合

| # | Check |
|---|--------|
| 9 | **`client_reference_id === M55_REPAIR_EXPECTED_USER_ID`** |

### 6.3 Supabase read-only（`checkout_session_id`／`event_id`／`user_id` は **クエリには full 値を使うがログに出さない**）

対象テーブルで **`SELECT`**（**カウントまたは存在フラグのみ**を **redacted 出力**）：

| テーブル | 期待（`5Z-I-K-A` 起点） |
|----------|-------------------------|
| **`stripe_events`** | **対象 **`event.id`** が **未登録**（pre-insert 前） |
| **`one_time_fulfillments`** | **対象 **`checkout_session_id`** 行なし |
| **`entitlements`**（product **DTR_CORE_STATIC_V1**） | **期待 missing** |
| **`entitlement_rights`**（`m55_p:core_origin`） | **期待 missing** |
| **`reply_ticket_wallets`**／**`reply_wallet_ledgers`** | **期待 missing／付与パス準備のみ** |
| **`dtr_report_snapshots`** | **期待 missing** |
| **`failed_fulfillments`** | **repair を阻害しない** |

いずれか **unexpected row** があれば **`STOP`**（**二重付与／手作業競合の疑い**）。

### 6.4 Dry-run 出力

- **`evidence_id`**／**phase ラベル**／**safe label**／**検証 booleans**／**row_count または EXISTS のみの要約**／**最終：`READY` または `STOP`**。
- **フル checkout／event／user／secret は出さない**。

---

## 7. Execution design（将来 · **`5Z-I-P` で exactly-one 実行**）

事前条件：**`5Z-I-O` で **`READY`**、および **`M55_REPAIR_CONFIRM`** が **許可フレーズと完全一致**。

| 項目 | 要件 |
|------|------|
| **回数** | **exactly-once**。**自動リトライ禁止**。 |
| **失敗時** | **最初の mismatch／DB エラーで終了**。**続行ヒューリスティックなし**。 |
| **呼び出し** | **`fulfillDtrCoreFromCheckoutSessionId({ checkoutSessionId: <env>, expectedUserId: <env>, eventIdForFulfillmentRow: <Stripe event.id> })`** |
| **追加検証（§6 と同様）** | **execute に入る直前にもう一度**：**livemode／金額／通貨／URL／ユーザ整合。** fulfill がカバーしない項目は **runner 側で強制**。 |
| **禁止** | **新規決済・refund・webhook replay・Events API・ broad UPDATE/DELETE**。 |

結果は **redacted サマリー**のみ（§9）。

---

## 8. `stripe_events` handling（5Z-I-L 決定の具体化）

### 8.1 実 `event.id` が Human がローカルで保持できる場合（既定経路）

1. **`stripe_events` に `event_id` と `event_type: 'checkout.session.completed'` を INSERT**（**`fulfill` より先**）。
2. **重複：** 既に行があれば **`STOP`**（**`ALREADY_MARKED`**）。**Fulfill は呼ばない** — Human が **Webhook 済み／部分成功**と **Dashboard／SELECT** で切り分けた **`5Z-I-Q` 以降**へ。
3. **`fulfill`** — **`eventIdForFulfillmentRow`** に **同一実 `event.id`** を渡し、**OTF 行が webhook 経路と列意味で整合**。
4. **将来元イベントが webhook で再達：** **`app/api/stripe/webhook/route.ts`** は **`stripe_events` 命中で handler 未到達で 200** → **二重処理を避ける**。**加えて **`one_time_fulfillments.checkout_session_id`** 冪等**で **二段防御**。

### 8.2 実 `event.id` が利用できない場合

- **`STOP`**：**`UNRESOLVED_STRIPE_EVENT_ID`**。**合成 **`event.id` を Invent しない**（**別フェーズでの明示 SSOT と GO が無い限り**。）
- **`5Z-I-L` で許容していた「pre-insert なし・fulfill のみ」フォールバック**は **リスクを Human が承認した場合のみ `5Z-I-P` runbook で** — **本条の既定経路では採らない**。

### 8.3 合成 ID を `stripe_events` に使わない理由（復唱）

- **Webhook が届くときの **`event.id`** と一致しない**ため **dedupe に無効**。**`one_time_fulfillments.event_id` だけ合成はコード上あり得るが、`stripe_events` の目的と両立しない**。

### 8.4 ログにおける **`event.id`**

- **INSERT は行うが stdout にはマスクのみ**（**先頭／末尾少数文字または `evt_***` 固定表示**）。

---

## 9. Logging / evidence policy（将来 runner）

### 9.1 許可される出力項目

| 種別 | 例 |
|------|-----|
| 識別子（SSOT由来） | **`M55-EVID-20260516-5Z-I-M-…`** に連鎖する **実行フェーズ Evidence**（**`5Z-I-O`／`P` で別付与**） |
| phase | **`5Z-I-O`**／**`5Z-I-P`** など |
| safe label | **`cs_live_JSRW`**、**`user_36xz`** |
| booleans／enum | **`livemode_ok: true`** 等 |
| 集約 | **テーブル名＋row_count／exists** |

### 9.2 禁止

フル **`cs_live_*` session／`evt_*`／`pi_*`／user id／メール／whsec／endpoint ID／request ID／full price ID** 等の **生ログ**。

---

## 10. Runtime / package design（本条は **コード変更なし**）

### 10.1 既観察の repo 制約

- **`package.json`**：`type: module`。**依存に `tsx` は未収録**。**`typescript` は devDependency**。**`stripe`／`@supabase/supabase-js` は依存にあり**。
- **`tsconfig.json`**：`module` **esnext**／`moduleResolution` **bundler**／`**noEmit: true`** — **standalone `tsc` emit は既定では使わない**。
- **既存 one-off：** **`scripts/diag-dtr-user.mjs`** が **`.env.local` を同期的にパースして `process.env` に載せる**。**runner でも同様の **「ローカルのみ・コミットなし」読み込み**を推奨**（または shell で `export` 済みのみ）。**

### 10.2 推奨コマンド形（将来 **`5Z-I-N` でファイルが存在するとき**）

```text
# 設計のみ（本条では実行しない）
npx tsx scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts
```

- **`tsx` を **`devDependency` で固定追加するか `npx` のみか**は **`5Z-I-N`** で決定。**本条は依存追加しない**。
- **`package.json` の `scripts` エントリ追加**も **`5Z-I-N`** で **別 GO**（**本条では追加しない**）。

### 10.3 import 経路（設計）

- **`lib/m55/dtrCoreCheckoutFulfillment.ts`** への **相対 import**（例：`../../lib/m55/dtrCoreCheckoutFulfillment.ts` — **最終パスはファイル配置で調整**。）
- **任意：** **`verifyStripeCheckoutSessionForDtrUser`**（**`lib/m55/verifyStripeCheckoutSessionForDtr.ts`**）の **再利用で Dry-run と本番の二重記述を減らす**可否は **`5Z-I-N`** で決定。**livemode／金額等は関数がカバーしないため runner が上乗せ**。

### 10.4 Next.js との兼ね合い

- **`fulfill`** は **`getStripe`**／**`getSupabaseAdmin`** に依存。**Next の request コンテキスト不要**。**Node プロセス単体実行で足りる**。

---

## 11. Failure / rollback（将来）

| 局面 | 振る舞い |
|------|-----------|
| 検証 NG | **書き込み前に終了**。 |
| `fulfill` **`ok: false`** | **自動ロールバック SQL なし**。**自動 retry なし**。**redacted 失敗要約のみ**。 |
| 返金／rollback | **`5Z-I-T`** など **別 Gate のみ**。 |

---

## 12. Stop conditions（設計ゲートアウト）

次のいずれかなら **`MINIMAL_REPAIR_RUNNER_DESIGN_BLOCKED`** または継続レビュー：**full ID が repo に必要**、`event.id` 取得不能で方針不整合、ユーザー／商品マッピング不明、検証強制不可能、artifact が期待と矛盾、`fulfill` import が実行環境で危険、`stripe_events` 戦略が危険、dry-run を no-write で満たせない、広範 UPDATE が必要、**返金判断が実行前に挟まる**。

---

## 13. Determination（判定）

| Field | Value |
|--------|--------|
| **本条採用** | **`READY_FOR_MINIMAL_REPAIR_RUNNER_CODE_CREATION_NO_EXECUTION_GATE`** |
| **続きは設計のみ延長する場合** | **`READY_FOR_REPAIR_RUNNER_DESIGN_REVIEW_CONTINUATION_GATE`** |
| **阻止** | **`MINIMAL_REPAIR_RUNNER_DESIGN_BLOCKED`** |

**推奨：** **`READY_FOR_MINIMAL_REPAIR_RUNNER_CODE_CREATION_NO_EXECUTION_GATE`**

---

## 14. 未実行事項

- **runner ソースファイルの作成**
- **Production DB の write／RPC／repair 実行／dry-run 実行**
- **手動 entitlement／wallet／ticket 付与**
- **Events API／Stripe API（runner を含む）／`/api/stripe`／webhook replay／Stripe CLI／Dashboard resend**
- **新規決済／Checkout／返金 rollback**
- **Stripe 設定／env／whsec／redeploy／runtime／UI 変更**
- **フル ID／secrets の記録**

---

## 15. Future gate sequence（明示）

| Phase | Gate 名 |
|-------|---------|
| **`5Z-I-N`** | **Minimal repair runner code creation / no execution**（**ファイル作成は明示 GO のみ**。**dry-run／repair は実行しない**。） |
| **`5Z-I-O`** | **Dry-run repair runner execution / no write** |
| **`5Z-I-P`** | **Exactly-one repair execution gate** |
| **`5Z-I-Q`** | **Post-repair Production DB read-only verification** |
| **`5Z-I-R`** | **UI report unlock verification** |
| **`5Z-I-S`** | **included reply-ticket verification** |
| **`5Z-I-T`** | **Refund/rollback のみ repair 失敗等の別条件で** |

**Dry-run 実行は `5Z-I-O` 以降**。**repair 実行は `5Z-I-P`**。本条は **`5Z-I-N` に至るための設計固定のみ**。

---

## 16. Next

**`Phase 5-6H-5Z-I-N` — Minimal repair runner code creation / no execution gate**

- **`5Z-I-N` でのみ**、`§4.2` のパスへ **runner ソースを追加可**（**別途明示 GO**）。
- **`5Z-I-N` で dry-run／repair を実行してはならない**。**実行は `5Z-I-O`／`P`**。

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_M_MINIMAL_REPAIR_RUNNER_CODE_DESIGN_NO_EXECUTION_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-M-MINIMAL-REPAIR-RUNNER-DESIGN-001`** |
| **Runner 形式** | **ローカル one-off `.ts` + `fulfill` import（Option 1/3 統合）** |
| **将来パス** | **`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`**（候補） |
| **`stripe_events`** | **実 Stripe `event.id` を Human のみが保持。** pre-insert の後に fulfill。**未取得時は **`STOP`**。**Webhook 用 **`event.id` の invention（合成）は行わない** |
| **Verdict** | **`READY_FOR_MINIMAL_REPAIR_RUNNER_CODE_CREATION_NO_EXECUTION_GATE`** |
| **Next** | **`Phase 5-6H-5Z-I-N`** |
