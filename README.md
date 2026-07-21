# M55 Phase6 Next.js Integration Kit (Audit-Gated)

## M55 Control Plane — OpenAI Build Week

**Outcome:** M55 Control Plane stops unsafe AI work and keeps coding agents aligned to current,
repository-native evidence. It is submitted in the **Developer Tools** category.

AI coding agents can begin from stale, conflicting, or incomplete context. The Control Plane
solves that problem with two fail-closed layers: Guardrail checks repository identity, authority,
Git state, and worktree safety; Consistency compares encoded intent without presenting target
contracts as implemented runtime truth. Both produce deterministic, reviewable handoff evidence.

### Zero-install judge quickstart

Use the exact feature branch reviewed in [PR #75](https://github.com/lexsia228/m55-web/pull/75):

```bash
git clone --branch feat/m55-build-week-control-plane-v1 \
  --single-branch https://github.com/lexsia228/m55-web.git

cd m55-web

node --test scripts/m55-handoff/audit.test.mjs
node --test scripts/m55-handoff/consistency.test.mjs
node scripts/m55-handoff/consistency-demo.mjs
```

The Control Plane demo and tests use Node built-ins only: no `node_modules`, API key, or network
call is required at runtime. Generated reports are written to the operating system's temporary
directory, outside the repository. The expected real-M55 Consistency verdict is
`REVIEW_REQUIRED`; that is an explicit Human review gate, not a test failure.

The commands are supported on macOS and Windows and are also compatible with Linux. Native macOS
verification and a Windows fresh-clone verification both passed. Current evidence includes
Guardrail **55/55**, Consistency **80/80**, a generic Orbit adapter result, and a real M55 pilot
that correctly fails closed with complete HOLD handoff evidence.

### Build Week scope and provenance

M55 was a pre-existing product with product runtime, SSOT documents, and a focused SSOT verifier.
Build Week added the Control Plane under `scripts/m55-handoff`: the generic engine, Guardrail and
Consistency layers, M55 and Orbit adapters, deterministic reports, fresh-agent packets, samples,
tests, documentation, and example CI workflow. It did not add or change consumer transactions,
database migrations, payment behavior, authentication behavior, or production product runtime.

Codex was used as the repository-operating development agent: it read authority, implemented the
bounded changes, ran verification, produced evidence, and stopped at Human decision gates.
GPT-5.6 supplied the reasoning and coding capability used through Codex to reconcile repository
state, design fail-closed contracts, implement deterministic adapters, and review the result.
Human authority selected scope, approved every state-changing gate, and remains explicit.

### Limits and evidence boundary

- The runtime makes no model or API call.
- Source-static evidence is not visual approval or production-runtime approval.
- Raw machine-local JSON is private diagnostic evidence; public packet views redact local identity.
- A fresh unregistered checkout intentionally returns HOLD until its evidence is reviewed.
- Human review remains required for `REVIEW_REQUIRED` and all product decisions.

See [the Build Week technical overview](docs/M55_BUILD_WEEK_CONTROL_PLANE.md) and the
[MIT License](LICENSE).

---

このZIPは **M55 Command Center HQ + Layer1（policies）統合済みの Legacy RC1** を、
Next.js の最小シェルに **そのまま** 組み込んだ「Phase6 統合キット」です。

- Legacy RC1 は `public/legacy/` に完全同梱（HTML/CSS/JS/policies/data/docs）
- Next.js 側は *UI/仕様を追加しない*（表示は iframe で legacy をレンダ）
- `npm run audit` が Layer0/Layer1 の監査ゲート（Fail-Closed）
- `next.config.mjs` は `output: 'export'`（静的出力 → モバイル同梱向き）

---

## 0) 前提（絶対ルール）

- **推測実装禁止**：回数/保存/付与/クールタイム根拠は `public/legacy/policies/*.json` のみ
- **NoTouch**：html/body の背景上書き禁止（このKitは wrapper 側も背景を触りません）
- **NoLoop/NoSpinner**：`infinite` 禁止
- **NoBadge**：通知/未読/赤点/ランキング表現禁止
- **cache採用条件**：`now < expires_at`
- **ID（userHash）**：フォールバック生成は禁止（欠損は Fail-Closed）
- **名前分析JSON**：`m55_name_analysis_81_sanitized.json` の SHA-256 を唯一正に固定
  - **EXPECTED:** `94d58c47f8b67a2375084416a9816e654fff0c63cd098edfe6a6104f701b1660`

---

## 1) クイックスタート（最短）

```bash
npm ci
npm run dev
```

- ブラウザで `http://localhost:3000/` を開く
- ルートは legacy を iframe 表示します（＝実体は `public/legacy/index.html`）

---

## 2) 監査ゲート（CI/CD で必須）

```bash
npm run audit
```

- 失敗時は **PASS/FAIL: FAIL** で止まり、ビルドを拒否します。

---

## 3) 静的ビルド（モバイル同梱向け）

```bash
npm run build
```

- `out/` に静的成果物が生成されます。
- **Capacitor / TWA / 任意の静的ホスティング** にそのまま投入できます。

---

## 4) iOS / Android 配布（最短：Capacitor）

このKitは Capacitor 依存を `package.json` に同梱しています。

```bash
npm run cap:init
npm run cap:add:ios
npm run cap:add:android
npm run build
npm run cap:sync
```

- iOS: `npm run cap:open:ios`
- Android: `npm run cap:open:android`

> NOTE: 受賞狙いの体験品質は **legacy 側のSSOT** が担います。
> Phase6 は「壊さず包む」ための最小殻です。

---

## 5) フォルダ構造

- `public/legacy/` : **監査済み M55 Command Center HQ + Layer1**（唯一のUI/ロジック本体）
- `scripts/audit_gate.mjs` : 監査ゲート（クロスプラットフォーム）
- `.github/workflows/audit.yml` : PR/Push 監査

---

## 6) 変更して良い場所 / ダメな場所

- ✅ 変更して良い：`app/*`（ただし背景・演出を足さない）/ `README` / CI設定
- 🚫 変更してはいけない：`public/legacy/**`（SSOT凍結領域。変更は別手順で監査）



---

## 🚀 One-Path Release (Audit Gate First) — FROZEN

このリポジトリのリリース導線は **1本道** です：

**Audit Gate → Vercel（Prod）→ Capacitor → Fastlane**

- 正のフロー: `.github/workflows/01_one_path_release.yml`
- 監査が FAIL したら **即停止**（Fail-Closed）
- Vercel は **Git連携の自動デプロイを禁止**（CLI deploy only）

このREADMEには“そのまま貼れる形”で **Runbook / Vercel Setup / Cold Start** を同梱しました。  
（個別ファイル版は `docs/` にもあります）

---

### 1) Vercel Setup: The One-Path Checklist

> 個別ファイル: `docs/VERCEL_SETUP_ONE_PATH.md`

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

---

### 2) M55 ONE-PATH RELEASE RUNBOOK

> 個別ファイル: `docs/ONE_PATH_RELEASE_RUNBOOK.md`

# M55 ONE-PATH RELEASE RUNBOOK
Version: 1.0.0  
Architecture: **Audit Gate First → Vercel → Capacitor → Fastlane**  
Workflow: `.github/workflows/01_one_path_release.yml`  
FREEZE: 2026-02-11 (JST)

---

## 🚨 PRIME DIRECTIVE（絶対原則）
1. **GitHub Actions Only:** すべてのリリースは Actions（`01_one_path_release.yml`）経由。手動アップロードは禁止。
2. **Audit First:** `npm run audit` が FAIL の場合、以降の工程を即時停止（Fail-Closed / SystemHalt）。
3. **No Git-Vercel Link:** Vercel の自動デプロイ経路を切断（推奨：Disconnect）。

---

## 0. Definitions（用語）
- **Audit Gate:** `npm run audit`（Layer0/Layer1 Policy Check）
- **One-Path:** WebとNativeを単一のパイプラインで直列処理するフロー
- **Fail-Closed:** 必要情報が欠落したら推測せず停止

---

## 1. Vercel Setup（Kill Switch）
詳細: `docs/VERCEL_SETUP_ONE_PATH.md`

- Framework: Next.js
- Build: `npm run build`
- Output: `.next`
- **自動デプロイは無効化**（Disconnect or Ignored Build Step）

---

## 2. GitHub Secrets Configuration
GitHub → Repository → **Settings → Secrets and variables → Actions**

### A. Vercel（必須）
| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel User Settings > Tokens |
| `VERCEL_ORG_ID` | Vercel Project Settings > General |
| `VERCEL_PROJECT_ID` | Vercel Project Settings > General |

### B. Mobile Store & Signing（Fastlane）
| Secret | Description |
|---|---|
| `APP_STORE_CONNECT_API_KEY_JSON_BASE64` | App Store Connect API Key JSON（base64） |
| `MATCH_PASSWORD` | match の暗号化パスワード |
| `MATCH_GIT_BASIC_AUTHORIZATION` | match repo access token（base64推奨） |
| `ANDROID_SERVICE_ACCOUNT_JSON_BASE64` | Google Play Service Account JSON（base64） |
| `ANDROID_KEYSTORE_FILE_BASE64` | keystore（base64） |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEYSTORE_KEY_ALIAS` | key alias |
| `ANDROID_KEYSTORE_KEY_PASSWORD` | key password |

> どれか一つでも欠落したら **Fail-Closed**（止まるのが正）。

---

## 3. One-Path Execution Flow（強制順序）
### Step 1: Audit Gate（The Guardian）
- Command: `npm run audit`
- 失敗: `exit 1` で即停止

### Step 2: Vercel Production（The Web Core）
- Command: `vercel deploy --prebuilt --prod --token $VERCEL_TOKEN`
- 検証: Vercel Dashboard の source が **CLI** のみ

### Step 3: Capacitor Build（The Native Shell）
- 条件: Vercel Deploy SUCCESS 後のみ
- 例:
  - `npm run build`
  - `npx cap sync`
  - `npx cap open ios` / `npx cap open android`（ローカル確認用）

### Step 4: Fastlane Submit（The Delivery）
- 条件: Native Build SUCCESS 後のみ
- iOS:
  - `fastlane ios beta`（TestFlight）
  - `fastlane ios release`（App Store提出）
- Android:
  - `fastlane android beta`（Internal）
  - `fastlane android release`（Production）

---

## 4. Operations（運用）
### A. 通常リリース
1. GitHub → Actions
2. **M55 One-Path Release**（`01_one_path_release.yml`）
3. Run workflow（branch: `main`）
4. 全ステップが Green なら提出完了

### B. 事故対応
- Audit FAIL: ログに違反ファイル/理由が出る → 修正して再実行
- Vercel env missing: Vercelの Environment Variables を補完
- Fastlane auth: GitHub Secrets の base64 が正しいか確認

---

## 5. Final Verification Checklist
- [ ] GitHub Actions が全て ✅
- [ ] Vercel に Git commit 由来の自動デプロイが無い
- [ ] App Store Connect / Google Play に新ビルドが上がっている
- [ ] 実機起動で SystemHalt せず Home が表示される

---

### 3) "COLD START" EXECUTION PROTOCOL

> 個別ファイル: `docs/COLD_START_EXECUTION_PROTOCOL.md`

# M55 MISSION: "COLD START" EXECUTION PROTOCOL
Priority: CRITICAL / ZERO-MISTAKE  
Target: `M55_FULLMERGE_ONEPATH_RELEASE_AUDITGATED`  
FREEZE: 2026-02-11 (JST)

この文書は **「最初の一歩」** を“事故ゼロ”で終わらせるための実行手順です。  
（外部操作はあなたが行い、ここはチェックリストとして使う）

---

## Step 1: Repository Injection（注入）
### 1-1) ローカル準備（Windows PowerShell / Git Bash）
> `<YOUR_REPO_URL>` と `<YOUR_PROJECT_DIR>` を置換してください。

```bash
# 0) 作業フォルダへ移動
cd <YOUR_PROJECT_DIR>

# 1) ZIPを解凍（既に解凍済みならスキップ）
# unzip M55_FULLMERGE_ONEPATH_RELEASE_AUDITGATED_v1_0.zip

# 2) Git初期化
git init

# 3) 余計なものが入らないように（.gitignoreがある前提）
git status

# 4) リモート設定
git remote add origin <YOUR_REPO_URL>

# 5) ブランチを main に揃える
git checkout -b main

# 6) 追加 → コミット
git add -A
git commit -m "chore: initial import (audit-gated one-path)"

# 7) push
git push -u origin main
```

### 1-2) 成功条件
- GitHub に `main` が作られ、ファイルが揃っている
- `.gitignore` により `node_modules/` や `.env*` が入っていない

---

## Step 2: Fuel Manifest（Secrets / Env の配置図）
### 2-A) GitHub Secrets（Actions）
GitHub → Repository → **Settings → Secrets and variables → Actions**

| Key | Where it comes from | Notes |
|---|---|---|
| `VERCEL_TOKEN` | Vercel User Settings > Tokens | CLI deploy用 |
| `VERCEL_ORG_ID` | Vercel Project Settings > General |  |
| `VERCEL_PROJECT_ID` | Vercel Project Settings > General |  |
| `APP_STORE_CONNECT_API_KEY_JSON_BASE64` | App Store Connect API Key JSON | base64 |
| `MATCH_PASSWORD` | match repo password |  |
| `MATCH_GIT_BASIC_AUTHORIZATION` | match repo token | base64推奨 |
| `ANDROID_SERVICE_ACCOUNT_JSON_BASE64` | Google Play service account JSON | base64 |
| `ANDROID_KEYSTORE_FILE_BASE64` | keystore file | base64 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |  |
| `ANDROID_KEYSTORE_KEY_ALIAS` | alias |  |
| `ANDROID_KEYSTORE_KEY_PASSWORD` | key password |  |

> **1つでも欠落 → Fail-Closed（停止）が正しい。**

### 2-B) Vercel Environment Variables（Production）
Vercel → Project → **Settings → Environment Variables**

| Key | Example | Target | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | `production` | Production |  |
| `NEXT_PUBLIC_APP_URL` | `https://m55-app.vercel.app` | Production |  |
| `NEXT_PUBLIC_M55_VERSION` | `1.0.0` | Production |  |
| `M55_AUDIT_STRICT_MODE` | `true` | Production | 任意 |

---

## Step 3: First Ignition（最初の点火）
1. GitHub → Actions
2. `01_one_path_release.yml` を選び **Run workflow**
3. 期待挙動:
   - Audit Gate PASS
   - Vercel Deploy SUCCESS（source=CLI）
   - （設定済みなら）Capacitor/fastlane まで到達

---

## Troubleshooting（最短）
- Audit FAIL: まずログの **最初の違反** を潰す（連鎖修正しない）
- Vercel Deploy FAIL: `VERCEL_*` Secrets と Vercel env を確認
- Fastlane FAIL: base64 の値/権限/Bundle ID/Package Name を確認
