# M55 One-Path Release (監査ゲート先頭固定)

この手順は **Layer0/Layer1 監査ゲートが常に最初に走る** ことを前提に、
**Vercel本番 → Capacitor → fastlane提出** を一本化した “一本道” です。

---

## 0. 前提（絶対）
- **監査ゲートが PASS しない限り、デプロイ/ビルド/提出は一切実行しない**
- 回数/保存/付与/クールタイムの根拠は **public/legacy/policies/*.json のみ**
- Background NoTouch / NoLoop / NoBadge / NoNumber / now<expires_at を維持

---

## 1. リポジトリ構成（このZIPの狙い）
- Next.js app がルート（Vercel本番）
- `public/legacy/` に Command Center HQ（監査対象の静的バンドル）を **そのまま同梱**
- 監査ゲート：
  - `scripts/audit_gate.mjs`（Layer0/Layer1/実装バグ/旧JS混入/ハッシュ/ID穴/UI誤認など）
  - `.github/workflows/00_audit_gate.yml`（PR/Pushで必ず監査）
- ストア提出：`fastlane/`（iOS/Android）
- “一本道” 実行：`.github/workflows/01_one_path_release.yml`

---

## 2. Secrets（GitHub Actions）
### 2-1. Vercel
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 2-2. iOS（TestFlight）
- `APP_STORE_CONNECT_API_KEY_JSON_BASE64`
- `APP_IDENTIFIER`（例: com.yourcompany.m55）
- `APPLE_TEAM_ID`
- `MATCH_GIT_URL`
- `MATCH_PASSWORD`
- `MATCH_GIT_BASIC_AUTHORIZATION`（Private repoなら推奨）

### 2-3. Android（Google Play）
- `PLAY_STORE_JSON_KEY_BASE64`（Service Account JSONをbase64）
- `ANDROID_PACKAGE_NAME`

※詳細は `docs/SECRETS_CHECKLIST_STORE.md` を参照。

---

## 3. ブランチ運用（最短）
1. `main` 以外で作業 → PR
2. PRで `00_audit_gate` が **必ずPASS**
3. PR merge（= main更新）

---

## 4. リリース実行（一本道）
### 方法A（推奨）：GitHub Actions 手動実行
1. GitHub → Actions → **M55 One-Path Release**
2. `Run workflow`
3. `submit_ios` / `submit_android` を必要に応じて ON/OFF

実行順は以下で固定です：
1) Audit Gate
2) Vercel Production Deploy
3) Capacitor Sync（Androidはここで platform 生成まで）
4) iOS TestFlight（fastlane）
5) Android Internal（fastlane）

### 方法B：タグで起動
- `m55-rc*` / `m55-prod*` のタグpushで起動します。

---

## 5. ローカル再現（詰まった時の最短）
```bash
# 1) 監査（最優先）
npm ci
npm run audit

# 2) web export（Capacitor用）
npm run export

# 3) Capacitor（Android）
./scripts/ci/ensure_cap_platforms.sh --android

# 4) iOSはmacで
./scripts/ci/ensure_cap_platforms.sh --ios

# 5) fastlane
bundle install
bundle exec fastlane ios testflight
bundle exec fastlane android internal
```

---

## 6. 重要：監査ゲートを“すり抜けない”ための設計
- リリースWorkflow `01_one_path_release.yml` は、すべての後続jobが `needs: audit_gate` を持ちます。
- 監査がFAILしたら **そこで強制停止**（デプロイ/提出は一切起きません）。

