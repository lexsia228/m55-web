# ⚡ M55 Vercel Setup: The "One-Path" Checklist (Audit Gate First)
FREEZE: 2026-02-11 (JST)  
Base Phrase: 絶対に大丈夫！

このチェックリストは **「Vercelが勝手にビルド/デプロイしない」** ことを最優先にします。  
**デプロイの唯一経路は GitHub Actions（監査ゲート）→ `vercel deploy --prod`** です。

---

## 0) 前提
- GitHub リポジトリは存在し、`main` に **監査ゲート付き** のコードが Push 済み
- `.github/workflows/01_one_path_release.yml` が存在（= One-Pathの正）
- **監査（Layer0/Layer1）で FAIL したら必ず停止**（SystemHalt）

---

## 1) 🛑 Auto Deploy を物理的に止める（最重要）
**推奨は「Git連携を切断」**（No Git-Vercel Link）。

### Option A（推奨）: Git連携を使わない / 解除する
1. Vercel Dashboard → Project → **Settings → Git**
2. もし接続済みなら **Disconnect**（自動デプロイ経路を消す）
3. 以後、更新は **GitHub Actions の CLI デプロイのみ**

> この方式が最も事故が少ない（意図しない上書きが物理的に起きない）。

### Option B（やむを得ず接続する場合）: 自動ビルドを無効化する
Vercel側で Git 連携が必須な運用（組織ポリシー等）の場合のみ。

1. Vercel Dashboard → Project → **Settings → Git**  
2. **Ignored Build Step** を設定  
   - Command: `exit 0`  
   - 目的: Push をトリガにした Vercel ビルドを **常にスキップ** する
3. 結果: 「GitHub Actions の `vercel deploy --prod`」だけが反映される

---

## 2) 🏗️ Project Configuration（基本）
- **Framework Preset:** Next.js
- **Root Directory:** `./`（リポジトリのルートに Next.js がある前提）
- **Build Command:** `npm run build`（※通常はCI側で `npm run audit` を先に実行）
- **Output Directory:** `.next`

---

## 3) 🔐 Environment Variables（本番に必須）
Vercel Dashboard → Project → **Settings → Environment Variables** に追加。

| Key | Example | Target | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | `production` | Production | 本番モード識別（Fail-Closedの材料） |
| `NEXT_PUBLIC_APP_URL` | `https://m55-app.vercel.app` | Production | canonical 等 |
| `NEXT_PUBLIC_M55_VERSION` | `1.0.0` | Production | 表示/ログの統一 |
| `M55_AUDIT_STRICT_MODE` | `true` | Production | (任意) 監査ログ強化 |

> **環境変数が欠落すると SystemHalt する設計が正**（推測で動かさない）。

---

## 4) 🛡️ Deployment Protection（任意・推奨）
（Vercel Pro以上など条件あり）

- **Vercel Authentication:** ON  
  Preview/開発環境の漏洩防止（M55は秘匿性が高い）

---

## 5) ✅ Final Check（成功条件）
1. GitHub Actions で `01_one_path_release.yml` を手動実行
2. **Audit Gate が PASS**
3. **Vercel Deploy が SUCCESS**
4. Vercel Dashboard の Deployment source が **CLI** だけになっている  
   - もし Git commit 起因のデプロイが混ざる → 1) が漏れている

