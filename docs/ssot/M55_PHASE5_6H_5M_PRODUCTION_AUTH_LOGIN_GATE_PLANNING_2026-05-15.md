# Phase 5-6H-5M — Production auth/login gate planning (2026-05-15)

## 1. Phase名

**Phase 5-6H-5M — Production auth/login gate planning**

---

## 2. 現在地

- **Vercel Project:** **m55-webv2** — **Production deployment: Ready / Current**
- **`main` HEAD / merge commit:** **`483285da9b5ef492bd8495fa404558b31d994705`**
- **公開面 GET/HEAD smoke（**5H**）:** **`PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_GREEN`**
- **no-login UX visual（**5K**）:** **`PRODUCTION_NO_LOGIN_PUBLIC_UX_VISUAL_CHECK_GREEN`**
- **no-login UX evidence checkpoint（**5L**）:** **`PRODUCTION_NO_LOGIN_PUBLIC_UX_EVIDENCE_CHECKPOINT_GREEN`**
- **証跡（直前チェーン）:**
  - **5L SSOT:** `docs/ssot/M55_PHASE5_6H_5L_PRODUCTION_NO_LOGIN_PUBLIC_UX_EVIDENCE_CHECKPOINT_2026-05-15.md`
  - **5L evidence commit:** **`f071ef6cca8a7113844fdbb3d1c50a24ebcb2733`** — `docs: record production no-login public ux evidence checkpoint`
  - **検証済 5K 証跡 commit（全文）:** **`a52ed848754ef3474d80f392908601317d570542`**
- **`login`** — **Production ログイン確認は尚未実施**（**実操作はしない**）。
- **`checkout` / live `payment` / `Stripe` `webhook` / `env` / arbitrary **DB** 変更** — **未実施**。

---

## 3. この Gate の目的

**次フェーズ（**5N**）**で **Production 上の auth / login 確認**を安全に実施するための **planning gate** を **docs-only** で置く。

**本 5M ではログイン実操作を行わない。** **Checkout・本番決済・webhook / env 変更・意図的な DB 操作にも進まない。**

---

## 4. 次フェーズ（**5N**）で許可予定の確認範囲案

別途 **明示 GO** を得たうえで、次を **最小限**で検証する案（**商品購入・DTR・無料フォームとは切り離す**）。

| # | 確認案 |
|---|--------|
| 1 | **Production** で **`/sign-in`**（Clerk Hosted / App Router）へ **物理到達できる**こと |
| 2 | **承認済み**のテスト用または運用人間確認用アカウントで **ログインできる**こと |
| 3 | ログイン後、**購入前の期待される安全なページ**（例: リダイレクト landing）へ問題なく戻れる／表示できること。**（アプリ側 `afterSignInUrl` が `/dtr/lp` であり、その画面で購入 CTA は触らない）** |
| 4 | 可能なら **`logout`** が **成功**すること（確認する場合のみ） |
| 5 | ログイン後に **無料鑑定送信・DTR 生成・購入・Checkout に進まない**こと |
| 6 | **DB を直接クエリしない**。**DB への手動変更をしない**。Clerk が通常行うセッション用のホスト側処理は別扱い（**「意図的な DB smoke / entitlement 確認」は禁止**）。

---

## 5. Repo 内 read-only メモ（**5N 準備**。**変更していない**）

実装読みのみ。**本 SSOT でのソース固定点**（詳細は当該ファイルを正）。

| 領域 | 確認したパス／要点 |
|------|-------------------|
| **Middleware（Clerk）** | **`middleware.ts`**: Clerk **`clerkMiddleware`** と **`createRouteMatcher`**。**`/sign-in(.*)`、`/sign-up(.*)`、`/my`** 等が public。matcher 外は **`await auth.protect()`**。**`/api/stripe/webhook`**、**`/api/purchase/checkout`** も matcher 入り。**5N で checkout API / Stripe API を叩かない。** |
| **サインイン** | **`app/sign-in/[[...sign-in]]/page.tsx`**: Clerk **`SignIn`**、**`signUpUrl="/sign-up"`**、**`afterSignInUrl="/dtr/lp"`** |
| **サインアップ** | **`app/sign-up/[[...sign-up]]/page.tsx`**: **`SignUp`**、**`afterSignUpUrl="/dtr/lp"`** |
| **マイ系** | **`app/my/page.tsx`**: **`MyPanel`**。**middleware では `/my` は public**。具体挙動は **5N** でのみ観測 |

---

## 6. **5N** でも禁止する操作（計画ロック）

以下は **ログイン確認 Gate** と併せても **実行しない。** **失敗してもコード・設定・本番環境は即修正しない**（証跡化→別フェーズ）。

- **無料鑑定フォーム送信**
- **DTR 生成**
- **購入ボタン押下**
- **`Checkout` 作成**（`/api/stripe/*` を含む**手動トリガ**）
- **Stripe 決済**（test/live 問わず）
- **`webhook` replay / 送信テスト相当**
- **`env` / `whsec` / secret の変更・注入**
- **Supabase / Vercel / Stripe 設定変更・追加 redeploy**
- **`POST` / `PUT` / `PATCH` / `DELETE`** の手動トリガー（ログイン/session 経路としてのプロバイダ都合以外）
- **Production を意図的にクエリしない**（ログインのみで済ませる。SQL / コンソールでの読み書きは禁止）。

---

## 7. 成功条件案（**5N** 用ドラフト）

- **ログイン画面到達**: Production **`/sign-in`**（または運用既定の入口）へ到達可能
- **ログイン成功**: 承認済アカウントで **セッションが成立**
- **期待パス**: サインイン後リダイレクト（`/dtr/lp` 等）で fatal error / blank がない。※ **`/dtr/lp`** で購買ボタンは押さない
- **`logout`**（確認する場合）成功
- **副作用なし**: **Checkout 作成なし・決済なし・手動 Stripe イベント触発なし・env/webhook/secret変更不要・意図的 DB write なし**
- **本番致命的エラー不可視**（許容線は execution SSOT で確定）

---

## 8. 失敗時の停止条件案（**5N**）

証跡を止め **`BLOCKED`** 扱い（**この場では修正しない**）。

- **`/sign-in` 未到達・**Clerk **`redirect`** 無限近似
- **予期しない 4xx / 5xx（**Clerk・アプリ共通**）**
- **セッション不成立・**保護ページで **panic 表示**
- **意図せず **`checkout`** 相当 URL** または **`stripe.com`** 決済ページへ進む疑い**
- **保護ルートでの致命エラー、`/my` を含む想定外皮の異常**

---

## 9. 判定（本 **5M**）

**`READY_FOR_PRODUCTION_AUTH_LOGIN_EXECUTION_GATE`**

**ログイン実操作は、本 SSOT とこの commit を超え、別明示 GO が出たときに **5N** で実施する。本 planning commit だけではログインしない。**

---

## 10. 明確な未実行事項（**5M**）

- **No login execution in 5M**
- **No form submission（無料鑑定など）**
- **No DTR generation**
- **No purchase button click**
- **No Checkout creation**
- **No Stripe test/live payment**
- **No Stripe webhook changes**
- **No webhook replay**
- **No env / `whsec` / secret changes**
- **No Supabase changes**
- **No Vercel setting changes**
- **No additional redeploy**
- **No runtime/code/UI edits（本変更は docs のみ）**
- **No POST / PUT / PATCH / DELETE（手動トリガ）**
- **No Production DB changes（意図的）**

---

## 11. Next

- **Phase 5-6H-5N — Production auth/login execution**
- **別明示 GO** のうえ **Phase 5N** のみログイン実操作を許可する。
- **5N でも禁止:** Checkout 作成、本番決済、webhook/env 変更、意図的 DB 変更。

---

## Work anchor

- Branch **`work/home-cluster`**, baseline commit **`f071ef6cca8a7113844fdbb3d1c50a24ebcb2733`** — `docs: record production no-login public ux evidence checkpoint`（**5M 本文書・SYSTEM_SSOT 更新直前**）。

---

## Evidence

- 本書: `docs/ssot/M55_PHASE5_6H_5M_PRODUCTION_AUTH_LOGIN_GATE_PLANNING_2026-05-15.md`
