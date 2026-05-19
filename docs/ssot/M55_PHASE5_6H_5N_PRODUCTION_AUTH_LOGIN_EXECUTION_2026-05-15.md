# Phase 5-6H-5N — Production auth/login execution (2026-05-15 SSOT / 自動観測時刻は本文)

## 1. Phase名

**Phase 5-6H-5N — Production auth/login execution**

---

## 2. 実行範囲

- Production auth/login に関して、**資格情報を伴わない **`GET`** 相当の自動観測**で証跡化できるものを記録。**承認済アカウントログイン〜セッション〜post-login は本証跡取得環境では未実施。**
- **Checkout 作成なし。**
- **購入ボタン押下・決済・DTR 生成なし。**
- **`Stripe` webhook 変更および replay なし。**
- **`env` / `whsec` / `secret` 変更なし。**
- **`Supabase` / `Vercel` 設定変更・追加 redeploy なし。**
- **`/api/stripe/*` の直接実行なし。**
- 業務・アプリ側での **`POST` / `PUT` / `PATCH` / `DELETE`** の手動・意図的実行なし（Clerk が認証確立のために送信する HTTP は本条の業務側禁止の対象外）。

---

## 3. 確認結果（証跡）

### 3‑A. アンカー

- **Branch:** `work/home-cluster`
- **直前証跡 commit:** `1658d71bfc2197eb88643019f0837b57d71fd090` — `docs: plan production auth login gate`
- **`main` HEAD / merge commit:** `483285da9b5ef492bd8495fa404558b31d994705`
- **Vercel Project:** **`m55-webv2`** — Production Ready / Current（アンカー）
- **前置 Gate:** **`5M`** **`READY_FOR_PRODUCTION_AUTH_LOGIN_EXECUTION_GATE`**（`docs/ssot/M55_PHASE5_6H_5M_PRODUCTION_AUTH_LOGIN_GATE_PLANNING_2026-05-15.md`）

### 3‑B. 自動観測（資格情報なし）

- **証跡タイムスタンプ:** 約 **2026-05-16T01:19Z UTC**（`curl` と Playwright を連続実施）。
- **対象 URL:** **`https://m55-web.vercel.app/sign-in`**（フェーズ **`5`**H と同様の primary）、**`https://m55-webv2.vercel.app/sign-in`。**
- **`curl`:** 両ホストとも **`HTTP/2 200`**。最大 **15** 回まで **`Location`** に追従する設定では **サーバ側リダイレクト連鎖は観察されず**。**`WWW-Authenticate`** による BASIC 強制なし。**`x-matched-path: /sign-in/[[...sign-in]]`**、**`x-clerk-auth-status: signed-out`**、**`x-clerk-auth-reason: dev-browser-missing`**。
  - **`login page reachable`:** **YES**。
- **Playwright Chromium headless:** Production に対し **入力・送信を行わない**描画確認のみ。**`status=200`、ページの **`URL`** は `/sign-in`。** メール用・パスワード用入力が **それぞれ 1**。可視文言に **`M55-coreにサインイン`**、**`Googleで続ける`**。
  - **`auth UI`** としての表示：**YES**。未ログインパスでは **fatal なブランク画面は観察されなかった**。
  - **`GET`/描画のみの範囲で、`Clerk` の redirect loop 疑い：**なし**。
  - **`checkout`／Stripe 決済ページ：**ログインフローを開始しないため **観察未評価**。
- **観察（本条では是正しない）：**ページ本文後半に **`Secured by Development mode`**。**表示が開発モードを示唆する点は運用確認のみとし、Phase **`5`**O** で整理する（本条では是正しない）。**

### 3‑C. 承認済アカウントログイン〜セッション〜post-login〜logout

エージェントは資格情報を保持しない。**以下は証跡化していない（NOT EXECUTED / NOT VERIFIED / NOT PERFORMED）。**

| 項目 | 結果 |
|------|------|
| `login success` | **NOT EXECUTED** |
| `session established` | **NOT VERIFIED** |
| `post-login redirect`（例: `afterSignInUrl` と整合する `/dtr/lp` 等の表示） | **NOT VERIFIED** |
| logout | **NOT PERFORMED** |

---

## 4. 未実行事項（禁止および本条で実行しなかったこと）

- **No free consultation form submission**
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
- **No intentional Production DB changes**
- **No `/api/stripe/*` の手動トリガ**
- **No runtime／コード／UI（本変更は docs と本条の観測コマンドのみ）**
- **No approved-account の実ログイン（エージェント経路）**

---

## 5. 判定

**`PRODUCTION_AUTH_LOGIN_EXECUTION_BLOCKED`**

- 自動観測のみでは、`login success`・`session`・`post-login`・`logout` の **完了証跡**を満たせない。**即時のコード・設定修正はしない。**

---

## 6. Next

- **Phase **`5`**-`**6`**H`-`**5`**O** — **Production **`auth`**/`**`**login`** evidence checkpoint と next **`gate`** の **`planning`。**
  - **`PRODUCTION_AUTH_LOGIN_EXECUTION_GREEN`** に相当する資格証跡が運用上必要な場合、本条チェックリストに沿った証跡追記 commit を先行する。** **`5`**O** で Checkout／購入／DTR／決済／webhook-env／DB とログイン証跡を分離して整理する。
  - **Checkout の作成および本番決済は Phase **`5`**O** でも **`Gate`** で分割のまま。** instant **`fix`** は禁止のまま。**
