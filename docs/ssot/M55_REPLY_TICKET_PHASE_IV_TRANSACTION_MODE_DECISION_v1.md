# M55_REPLY_TICKET_PHASE_IV_TRANSACTION_MODE_DECISION_v1

Status: **Phase IV — additional reply-ticket **fulfillment の transaction 方式**を、**既存 repo 構成に基づき決定する SSOT**。** **本条は RPC／migration／アプリコード・DB 適用の承認ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Phase IV gate:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_FULFILLMENT_TRANSACTION_HELPER_GATE_v1.md`
- **Transaction 設計:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_TRANSACTION_IMPLEMENTATION_DESIGN_v1.md`

**秘密・接続文字列・鍵の値は記載しない。**

---

## 1. 既存 DB アクセス方式（調査結果）

### 1.1 `lib/supabaseAdmin.ts`

| 項目 | 内容 |
|------|------|
| クライアント | **`@supabase/supabase-js`** の **`createClient`** |
| 認証 | **`NEXT_PUBLIC_SUPABASE_URL`** と **`SUPABASE_SERVICE_ROLE_KEY`** |
| 用途 | **サーバー専用**。**セッション永続化オフ** |

### 1.2 API route／lib での利用

| 種別 | 代表例 |
|------|--------|
| **`getSupabaseAdmin()`** | `app/api/stripe/webhook/route.ts`、`purchase/checkout`、`reply/generate`、`reply`-系 API、`dtr`、`room`、`me/entitlements`、`lib/m55/dtrCoreCheckoutFulfillment.ts`、`lib/m55/reply/replyTicketCheckoutValidate.ts` ほか |
| **パターン** | ほぼ **`.from(...).select|insert|update`** の **単一／複数呼び出し**。Webhook／DTR fulfill は **複数 await** だが **単一トランザクションとはみなさない**構成が混在しうる。 |

### 1.3 Service role

| 項目 | 内容 |
|------|------|
| 利用 | **`SUPABASE_SERVICE_ROLE_KEY`** 経由の **admin クライアントのみ**（調査範囲）。**ブラウザへの露出なし**が前提。 |

### 1.4 既存 RPC 利用

| 項目 | 内容 |
|------|------|
| アプリ呼び出し | **`app/api/reply/generate/route.ts`** が **`db.rpc('m55_reply_generate_commit', { ... })`** を使用。 |
| 意味 | **複数テーブル（wallet／ledger／session／document）を 1 関数呼び出しで原子化**する **既存パターン**が **すでに prod 向け migration に存在**。 |

### 1.5 Postgres 関数／migration（repo 内）

| 項目 | 内容 |
|------|------|
| 配置 | **`supabase/migrations/*.sql`** |
| カスタム関数（grep ベース） | **`m55_reply_generate_commit`**（**`20260417000000_m55_reply_generate_commit_rpc.sql`**）— **`LANGUAGE plpgsql`**、**`SECURITY DEFINER`**、**`SET search_path = public`**。関数本体が **1 つの DB トランザクション**として実行される PostgreSQL の既定挙動に乗る。 |
| その他 migration | entitlements、one-time checkout、DTR drafts／snapshots、consult room、reply data layer 等。**reply fulfill 専用の「追加チケット購入」RPC は未存在**。 |

### 1.6 `pg`／明示 `BEGIN`／`COMMIT`（Node）

| 項目 | 内容 |
|------|------|
| **`package.json` dependencies** | **`pg`／`postgres` 等の PG ドライバはなし**。 |
| **コード検索** | **`BEGIN`／`COMMIT`** を **SQL／Tx として使う Node コードは検出されず**（`VERCEL_GIT_COMMIT_SHA` 等のみ）。 |

**結論（§1）:** アプリは **`@supabase/supabase-js` + service role** が主。**原子性が必要な Reply 系はすでに RPC で解決している前例**がある。**Node 側での明示 Tx 基盤は無い。**

---

## 2. Transaction 方式候補の評価

### 2.1 B — Postgres RPC／DB 関数

| 軸 | 評価 |
|------|------|
| **repo 相性** | **高** — **`m55_reply_generate_commit` と同一パターン**。migration／Supabase 運用と整合。 |
| **実装コスト** | **中** — **新 migration**（`CREATE OR REPLACE FUNCTION …` + `GRANT EXECUTE` 等）と **TypeScript からの `.rpc()`**。**ただし設計・レビュー手順は既知**。 |
| **rollback 安全性** | **高** — **関数内例外で全体 rollback**（PostgreSQL の関数トランザクション）。 |
| **テスト容易性** | **中** — **SQL／staging での結合テスト**が主。**アプリ層は RPC の戻り値をパースするだけ**に寄せやすい。 |

### 2.2 C — server-side explicit transaction（`pg` 等）

| 軸 | 評価 |
|------|------|
| **repo 相性** | **低〜中** — **`pg` 未導入**。**新依存＋接続管理**（プール、timeout、Vercel／Edge 可否）が必要。 |
| **実装コスト** | **高** — インフラ・秘密管理・接続 URL の扱いが増える。 |
| **rollback 安全性** | **高**（適切に書けば）— ただし **二系統クライアント**（Supabase JS と PG）の **並行利用は運用負荷** |
| **テスト容易性** | **中** — モックは可能だが **二重スタック**。 |

### 2.3 非推奨 — Supabase 複数 `.from()` await のみ（疑似 Tx）

| 軸 | 評価 |
|------|------|
| **repo 相性** | **短期的には書きやすい** が、**Fulfillment／gate SSOT が禁じている主経路**。 |
| **rollback 安全性** | **低** — **部分的に成功／失敗**しうる。**wallet のみ ledger なし等の禁止条件**を満たしにくい。 |

---

## 3. 推奨方式（本条の決定）

### 3.1 採用: **B — Postgres RPC（`SECURITY DEFINER` の PL/pgSQL 関数）**

**理由（要約）**

1. **`m55_reply_generate_commit` と同じ「複数テーブル更新を 1 回の RPC で完結させる」前例**があり、レビュアーと CI／migration の流れが揃う。  
2. **`stripe_processed_events` の INSERT／競合処理**と **`reply_ticket_wallets` 更新**と **`reply_wallet_ledgers` INSERT** を **単一データベーストランザクション**に載せられる。  
3. **`partial UNIQUE ON stripe_event_id`** との競合も **関数内で `EXCEPTION WHEN unique_violation`** または **事前 SELECT** で **duplicate no-op** に寄せやすい。  
4. **Node に `pg` を追加しない**ですみ、既存 **`getSupabaseAdmin().rpc(...)`** だけでサーバー側を完結させられる（**service role が RPC を実行**。権限設計は migration で固定）。  

### 3.2 非推奨とするもの

| 方式 | 理由 |
|------|------|
| **複数 await のみ** | **原子性と rollback が保証できない**。Phase IV gate／Fulfillment SSOT と矛盾。 |
| **C をデフォルト** | **`pg` 未採用**。**新規インフラ**が RPC 一案より重い。**将来 PG 直が必要になったときに再評価**で足りる。 |

**補足:** RPC 関数は **単体で長大になりがち**なため、アプリ側は **`lib/m55/reply/` の薄いヘルパ**（引数組み立て・戻り値の discriminated union 化・ログ規約）に留め **SQL は migration に閉じる**のがこの repo とも一致する。

---

## 4. Phase IV で「作ってよい」もの（本条ではまだ作らない）

| 種別 | 内容 |
|------|------|
| **server-only helper** | **`db.rpc('…')` を呼ぶ**ラッパー（**パラメータ型・エラーマップ**）。**本条ではファイル作成しない。** |
| **RPC 設計文書／migration 草案のメモ** | **別 PR で可**。**本条のみでは SQL をコミットしない。** |
| **禁止（本条時点）** | **migration の本番 APPLY**、**staging／検証未取得の DDL 適用**（運用ゲートは別）。 |

---

## 5. STOP 条件

| STOP |
|------|
| **transaction なし**で **wallet／ledger** を更新する |
| **wallet と ledger を別 transaction** で更新する（付与経路） |
| **partial UNIQUE／`stripe_processed_events` を使わない**一意戦略 |
| **cap 未確認** |
| **`event.id` 欠損**を **付与処理として扱う** |
| **`report_instance_id` 欠損**を **付与処理として扱う** |
| **`fulfillDtrCoreFromCheckoutSessionId` を Reply 目的で変更**／**DTR 経路汚染** |
| **`payment_intent.succeeded`** を **付与の主経路**にする |
| **本番決済テスト**へ **fulfillment／検証未完のまま**進む |

---

## 6. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **transaction 方式決定（本条）** | **GO** |
| **fulfillment helper＋ RPC 実装** | **次の別承認＋別 PR** |
| **SQL／RPC／migration ファイルの新規作成** | **本条では NO-GO** |
| **DB 更新** | **本条では NO-GO** |

**決定概要:** Phase IV は **`m55_reply_generate_commit` と同型の Postgres RPC を主軸とし、アプリからは `Supabase.rpc` を呼ぶ。**  

---

## 7. CHANGELOG — v1

- 初版: repo 調査（supabase-js、単一 RPC 前例、`pg` なし）、B／C／非推奨の比較、**B 推奨**、STOP とゲート。
