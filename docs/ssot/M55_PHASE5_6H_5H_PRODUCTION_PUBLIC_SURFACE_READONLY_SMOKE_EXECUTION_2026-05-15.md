# Phase 5-6H-5H — Production public surface read-only smoke execution (2026-05-15)

## 1. Phase名

**Phase 5-6H-5H — Production public surface read-only smoke execution**

---

## 2. 実行範囲（許可された操作のみ）

| 項目 | 方針 |
|------|------|
| **HTTP メソッド** | **GET / HEAD のみ** |
| **対象** | **公開 URL のみ**（リスト参照） |
| **認証** | **ログインしない**・**認証必須ページは深掘りしない** |
| **決済** | **Checkout 開始なし**・**購入ボタン押下なし**・**`/api/stripe/*` は呼ばない** |
| **その他副作用** | **POST / PUT / PATCH / DELETE なし** |

**実施コマンド例（証跡）:** `curl -I`（HEAD）、および本文確認用の **`curl -sS -L`**（GET、レスポンスをローカルで読むのみ）。

**Primary ホスト:** `https://m55-web.vercel.app`

**追加サンプル（project 側）:** `https://m55-webv2.vercel.app` — **`/` と `/dtr/lp` のみ**

---

## 3. コンテキスト（読み取りのみ・変更なし）

| 項目 | 値 |
|------|-----|
| **ブランチ** | `work/home-cluster` |
| **直前 evidence commit** | **`636dec924cebbc896f19059e95b38d5571c08c0a`** — `docs: plan production public surface readonly smoke` |
| **`main` / merge commit（記録）** | **`483285da9b5ef492bd8495fa404558b31d994705`** |
| **Vercel** | Project **m55-webv2** / Production **Ready / Current** / Branch **`main`** |
| **`app/` 側の legal 実装（read-only 確認）** | `tokushoho` / `privacy` / `terms` / `refund` の **`page.tsx` が存在**。**`/legal/disclaimer` は検出せず（5G どおり `/legal/refund` を確認対象とした）** |

---

## 4. 確認結果（URL 別）

### 4.1 Primary — `https://m55-web.vercel.app`

| Path | HEAD `HTTP` | 初段 `Location`（リダイレクト） | 主要確認 |
|------|-------------|----------------------------------|-----------|
| **`/`** | **200** | なし | GET 本文 `<title>`：**M55** |
| **`/dtr/lp`** | **200** | なし | タイトル：**本質の読み解き \| M55**。本文に **¥1,000**・**/support**・**/legal/refund**・**/legal/tokushoho**。購入 CTA は **`/sign-in?...` への `href` のみ確認**（クリック未実施） |
| **`/legal/tokushoho`** | **200** | なし | `<title>`：**特定商取引法に基づく表記 \| M55** |
| **`/legal/privacy`** | **200** | なし | `<title>`：**プライバシーポリシー \| M55** |
| **`/legal/terms`** | **200** | なし | `<title>`：**利用規約 \| M55** |
| **`/legal/refund`** | **200** | なし | `<title>`：**返金・キャンセル \| M55** |
| **`/support`** | **200** | なし | `<title>`：**サポート \| M55** |

**補足:** 全パスで応答ヘッダ **`WWW-Authenticate` なし**（HEAD で確認）。

### 4.2 Project ドメイン — `https://m55-webv2.vercel.app`（サンプル）

| Path | HEAD `HTTP` | 初段 `Location` |
|------|-------------|-----------------|
| **`/`** | **200** | なし |
| **`/dtr/lp`** | **200** | なし |

---

## 5. DTR LP（`/dtr/lp`）の read-only 確認

- **価格表示:** 本文に **「¥1,000」** / **「買い切り」** / **「価格：¥1,000（税込）」** を確認。
- **サポート:** **`/support` へのリンク**を確認（フッターおよび販売条件ブロック）。
- **返金・法務:** **`/legal/refund`**、**特定商取引法（`/legal/tokushoho`）**、プライバシー・利用規約への導線を **HTML 内 `href` で確認**。
- **購入導線:** 主 CTA は **`/sign-in?redirect_url=%2Fdtr%2Flp`**。**押下・ログイン・決済・Checkout session 作成は未実施**。
- **Stripe:** 本文に **「Stripe」**・「Checkout」説明があるが、**`checkout.stripe.com` 直 URL や `/api/stripe` 呼び出しは今回の静的 HTML 抽出範囲では未検出**。**※ Checkout 画面への遷移は行っていない。**

---

## 6. 副作用・禁止操作に関する記録（今回フライト）

| 項目 | 状態 |
|------|------|
| **ログイン** | **未実行** |
| **フォーム送信（無料鑑定など）** | **未実行** |
| **Checkout 作成 / 決済操作** | **未実行** |
| **Stripe Dashboard / webhook / env / `whsec` / secret** | **読み書きともに未実施（本証跡は HTTP smoke のみ）** |
| **Supabase / Production DB / Vercel 設定** | **未変更** |
| **追加 redeploy** | **未実施** |
| **コード・runtime 変更** | **なし（docs のみコミット予定）** |

**Stripe / DB にイベントが増えていないことの論理的根拠（read-only の範囲内）:** 本フェーズでは **GET/HEAD のみ**であり、**Checkout API を呼ばず、認証済み購入フローを踏んでいない**。よって **Stripe 決済イベントやアプリ側 DB 書き込みが本 smoke により誘発されたとは判断しない**。

---

## 7. 判定（Verdict）

**`PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_GREEN`**

- **根拠:** 上記公開パスが **いずれも 200**、**想定外の認証ヘッダなし**、**DTR LP に価格・サポート・返金/法務導線が存在**、**legal/support が到達可能**。

---

## 8. Next

- **Phase 5-6H-5I** — Production post-deploy public smoke の **証跡 checkpoint / 次ゲート計画**（文言は運用側で詳細化）。
- **継続禁止（別 Gate でのみ）:** **本番決済**、**Checkout 作成**、**ログイン**、**webhook/env 変更**。

---

## Work anchor

- Branch `work/home-cluster`, baseline **`636dec924cebbc896f19059e95b38d5571c08c0a`**（**5H 本書・SSOT 更新直前**）。

---

**記録宣言:** 上記 **禁止操作**は本フェーズで **実施していない**。問題があれば本書を **`PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_BLOCKED`** として再記録すること。
