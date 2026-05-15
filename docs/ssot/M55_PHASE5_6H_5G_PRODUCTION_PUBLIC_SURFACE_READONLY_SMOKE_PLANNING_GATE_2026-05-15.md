# Phase 5-6H-5G — Production public surface read-only smoke planning gate (2026-05-15)

## 1. Phase名

**Phase 5-6H-5G — Production public surface read-only smoke planning gate**

---

## 2. 現在地

| 項目 | 状態 |
|------|------|
| **直前フェーズ** | **5-6H-5F** **`PRODUCTION_DEPLOYMENT_READONLY_VERIFICATION_GREEN`** |
| **PR #1** | **merged**（`main` 整合済み） |
| **`main` HEAD / merge commit** | **`483285da9b5ef492bd8495fa404558b31d994705`** |
| **Vercel** | Project **m55-webv2** / Production **Ready** / **Current** / Branch **`main`** / Auto-assign Custom Production Domains **Enabled** |
| **Production の性質** | **既に Current・公開経路あり** |
| **Live smoke** | **未実行** |
| **本番決済** | **未実行** |

---

## 3. この Gate の目的

- **次フェーズ（5H）で実施する** Production **public surface** の **read-only smoke** の **許容範囲・禁止・成功/失敗条件**を ** docs-only で固定**する。
- **本 5G では実行しない** — **本番 URL へのアクセス（ブラウザ・`curl` 等）は一切しない。**

---

## 4. 次フェーズ（5H）で許可予定の確認範囲案（GET / HEAD のみ）

**原則:** **ログイン不要・購入不要・フォーム送信不要・DB 書き込み不要**の **公開ページ**に限定。**副作用 API を叩かない。**

### 4.1 候補 URL（ユーザー向け経路、`app/` の実在に合わせて正規化）

| Path | `app/` 根拠（read-only 確認済み） |
|------|----------------------------------|
| **`/`** | `app/page.tsx` |
| **`/dtr/lp`** | `app/dtr/lp/page.tsx` |
| **`/legal/tokushoho`** | `app/legal/tokushoho/page.tsx` |
| **`/legal/privacy`** | `app/legal/privacy/page.tsx` |
| **`/legal/terms`** | `app/legal/terms/page.tsx` |
| **`/support`** | `app/support/page.tsx` |
| **`/legal/refund`** | `app/legal/refund/page.tsx`（**返金ポリシー導線** — ユーザー候補に `/legal/disclaimer` があったが、**同名の `app/legal/disclaimer/` は未検出**。必要な条文は **`/legal/terms`** 等へのリンク確認に含める） |

### 4.2 本 5G で repo を read-only で参照した追加メモ（実装確認のみ・変更なし）

- **`/home`**（`app/home/page.tsx`）等の **ログイン・アプリ内導線**は **5H の既定候補外**（**authenticated / 購買レーン混入リスク**）。
- **Checkout / Stripe Session** に触れる実装は `lib/`・`app/api/` 等に存在するが、**5H では `/api/stripe/*` 等の **直接呼び出し禁止**（計画のみ本条で言及、**コード変更なし**）。

---

## 5. 次フェーズ（5H）でも禁止する操作

- **ログイン**（Clerk 含む）
- **無料鑑定フォーム送信**
- **DTR 生成・保存・購入後導線の操作**
- **購入ボタン押下**
- **Checkout 作成**
- **Stripe 決済（test/live）**
- **webhook replay**
- **管理画面・設定変更**
- **env / `whsec` / secret 変更**
- **DB 変更**
- **追加 deploy / redeploy**
- **認証必須 route の深掘り**
- **`/api/stripe/*` 等、副作用のある API の直接実行**

---

## 6. 成功条件案（5H で検証するとき）

- 対象 public URL が **HTTP 200**、または **期待されるリダイレクトのみ**（**302/307 の意図を事前にメモしたうえでのみ許容**）。
- **Production ドメイン**（例: **`m55-web.vercel.app` / `m55-webv2.vercel.app`**）で **到達可能**。
- **主要法務リンク**（特定商取引法・プライバシー・利用規約・返金/`/support`）が **画面上で辿れる**。
- **DTR LP** に **価格・返金/サポート導線**が **表示されている**（**決済開始はしない**）。
- **Gate R 系の公開表現**について **重大な回帰がない**（文言は別 SSOT / チェックリストに従う）。
- **checkout / session が意図せず作成されていない**（開発者ツール・ネットワークで **Checkout 開始の兆候がない**程度の確認に留める運用でも可）。
- **DB 書き込みが発生していない**（**5H で DB コンソールを操作しない**前提）。
- **Stripe 決済イベントが新規発生していない**（Dashboard を見る場合も **読み取りのみ**かつ **決済トリガーを作らない**）。

---

## 7. 失敗時の停止条件案（5H）

- **5xx** / **404**（対象 public path）
- **予期しない認証要求**（ログイン_wall）
- **購入／Checkout にしか進めない構成**で read-only のまま確認できない
- **法務・サポート導線の欠落**
- **公開表現の重大回帰**
- **Stripe / DB / 副作用 API が意図せず動いた疑い**

→ **即停止**し、**別インシデント／別 Gate**へ。

---

## 8. 判定（Verdict）

**READY_FOR_PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_EXECUTION_GATE**

**条件付き:** **実際の本番 URL への GET/HEAD 確認**は **本 commit 後の別明示 GO** において **のみ**実施する。

---

## 9. 明確な未実行事項（本 5G / 本 docs セッション）

- **No production URL access**
- **No `curl` / browser smoke**
- **No login**
- **No Checkout creation**
- **No live payment**
- **No Stripe webhook changes**
- **No webhook replay**
- **No env / `whsec` / secret changes**
- **No Supabase changes**
- **No Vercel setting changes**
- **No additional redeploy**
- **No Production DB changes**

---

## 10. Next

- **Phase 5-6H-5H — Production public surface read-only smoke execution**
- **5H でも** **本番決済・Checkout・ログイン・DB 書き込みは禁止**。**許可されるのは別明示 GO のもとでの **public URL の GET/HEAD のみ**。**

---

## Work anchor

- Branch `work/home-cluster`, baseline **`1167f77`** — `docs: record production deployment readonly verification`（**5G 本文書追加直前**）。

---

**記録宣言:** Forbidden に列挙した **本番触り・決済・webhook/env 変更は、本計画フェーズでは実施していない。**
