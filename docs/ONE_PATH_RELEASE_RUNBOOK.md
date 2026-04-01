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

