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

