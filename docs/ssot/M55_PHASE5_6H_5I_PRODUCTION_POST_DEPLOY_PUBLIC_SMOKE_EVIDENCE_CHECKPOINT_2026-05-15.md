# Phase 5-6H-5I — Production post-deploy public smoke evidence checkpoint / next gate planning (2026-05-15)

## 1. Phase名

**Phase 5-6H-5I — Production post-deploy public smoke evidence checkpoint / next gate planning**

---

## 2. 現在地

| 項目 | 状態 |
|------|------|
| **ブランチ** | `work/home-cluster` |
| **PR #1** | **merged**（記録どおり） |
| **`main` HEAD** | **`483285da9b5ef492bd8495fa404558b31d994705`** |
| **Vercel** | Project **m55-webv2** / Production **Ready / Current** / Branch **`main`** |
| **5F** Production deployment read-only verification | **`PRODUCTION_DEPLOYMENT_READONLY_VERIFICATION_GREEN`** |
| **5G** Production public surface read-only smoke planning | **GREEN**（**SSOT:** `READY_FOR_PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_EXECUTION_GATE`・**5H 実行へ接続済み**） |
| **5H** Production public surface read-only smoke execution | **`PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_GREEN`** |
| **公開面到達性（5H 記録の要約）** | **GET/HEAD smoke にて主要 public URL は **200**、法務・サポート・DTR LP 導線は 5H SSOT 参照** |

**直前 evidence commit（5I 文書・SYSTEM_SSOT 更新直前）:** **`9a99efaf35e70b3af225c7124636595c3ab0951e`** — `docs: record production public surface readonly smoke`

---

## 3. 5H 結果の再掲（追加 `curl` なし・SSOT 転記）

出典: `docs/ssot/M55_PHASE5_6H_5H_PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_EXECUTION_2026-05-15.md`

### 3.1 Primary domain

| URL | 観測（5H） |
|-----|------------|
| `https://m55-web.vercel.app/` | **HEAD 200** |
| `https://m55-web.vercel.app/dtr/lp` | **HEAD 200** |
| `https://m55-web.vercel.app/legal/tokushoho` | **HEAD 200** |
| `https://m55-web.vercel.app/legal/privacy` | **HEAD 200** |
| `https://m55-web.vercel.app/legal/terms` | **HEAD 200** |
| `https://m55-web.vercel.app/legal/refund` | **HEAD 200** |
| `https://m55-web.vercel.app/support` | **HEAD 200** |

### 3.2 Project domain（サンプル）

| URL | 観測（5H） |
|-----|------------|
| `https://m55-webv2.vercel.app/` | **200** |
| `https://m55-webv2.vercel.app/dtr/lp` | **200** |

### 3.3 補足（5H と整合）

- **初段リダイレクトなし**（対象 path）
- **`WWW-Authenticate` なし**（想定外の認証要求なし）
- **`/legal/disclaimer` は意図的に未確認** — **5G で legal 経路を `/legal/refund` に揃えたため**

---

## 4. 判定（Verdict）

**`PRODUCTION_POST_DEPLOY_PUBLIC_SMOKE_EVIDENCE_CHECKPOINT_GREEN`**

---

## 5. 明確な未実行事項（本 5I / 本 docs セッション）

- **No additional production URL smoke in 5I**（**再 `curl` / 再 smoke なし**）
- **No login**
- **No form submission**
- **No DTR generation**
- **No Checkout creation**
- **No Stripe test/live payment**
- **No Stripe webhook changes**
- **No webhook replay**
- **No env / `whsec` / secret changes**
- **No Supabase changes**
- **No Vercel setting changes**
- **No additional redeploy**
- **No POST / PUT / PATCH / DELETE**
- **No Production DB changes**

---

## 6. 次 Gate の整理（ログインなし公開面以外を分離）

### A. Production no-login public UX visual check planning gate

- **ブラウザ**で公開面を軽く見る場合の **計画 Gate**（**5J を docs-only で起案**）。
- **クリック**は **法務 / サポートの通常リンク程度**までを想定。
- **購入ボタン押下は禁止**。

### B. Auth / login gate

- **ログイン確認は別 Gate**。
- **Clerk / session** 周りを触るため、**public smoke 系（5H/5I）と分離**。

### C. Checkout creation gate

- **Checkout 作成は別 Gate**。
- **Stripe イベント・DB / webhook 影響**があり、**5I では禁止**。

### D. Payment / live smoke gate

- **本番決済はさらに別 Gate**。
- 実施前に **Stripe live mode**、**返金／取消**、**証跡**、**金額・ユーザー・DB 確認**、**rollback 方針**を SSOT で明確化する。

### E. Webhook / env / secret gate

- **env / `whsec` / secret** の変更は **原則不要**。
- **必要になった場合のみ別 Gate**（変更理由・ロールバック・監査ログをセットで）。

---

## 7. 推奨 Next

- **Phase 5-6H-5J — Production no-login public UX visual check planning gate**
  - **5J も最初は docs-only**（範囲・URL・禁止・成功条件のみ固定）。
  - **ログイン・Checkout・本番決済・webhook/env 変更はまだ禁止**（別 Gate）。

---

## Work anchor

- Branch `work/home-cluster`, baseline **`9a99efaf35e70b3af225c7124636595c3ab0951e`**（**5I 本文書・SYSTEM_SSOT 更新直前**）。

---

**記録宣言:** 本フェーズは **docs-only** であり、**5H で得た証跡の固定と次 Gate の分離のみ**を行った。**本番 URL の再確認は実施していない。**
