# Phase 5-6H-5E-A — Production auto-deploy side-effect read-only check (2026-05-15)

## Phase名

**Phase 5-6H-5E-A — Production auto-deploy side-effect read-only check**

---

## 1. 現在地

- **Phase 5-6H-5E** PR merge / main alignment **decision gate** は **GREEN（SSOT 済み）** — `docs/ssot/M55_PHASE5_6H_5E_PR_MERGE_DECISION_GATE_2026-05-15.md`
- **PR merge は未実行** / **`main` merge は未実行**
- **本タスク:** **repo 読み取りと `gh pr view` のみ。** **Vercel / Supabase / Stripe の設定変更・本番デプロイ・秘密値・webhook の操作は一切行っていない。**

Work anchor:

- Branch `work/home-cluster`, baseline commit **`de4d751`** — `docs: prepare pr merge decision gate`
- PR #1: https://github.com/lexsia228/m55-web/pull/1（`integration/main-align-2026-05-14` → `main`）

---

## 2. 確認対象

**質問:** PR #1 を `main` に **merge** した場合に、**Vercel Production のデプロイが自動発火するか**（および **GitHub Actions 経由の本番デプロイ**が走るか）。  
**これが「Production deploy 禁止」と PR merge を同時に満たせるか**の材料を SSOT に残す。**推測を「安全」とみなさない**。

---

## 3. Read-only 確認結果（repo + GitHub CLI）

### 3.1 `vercel.json`

- **結果:** **リポジトリ内に `vercel.json` は見つからない**（ワークスペース全体の検索）。
- **解釈:** **Production の自動作成をリポジトリレベルで無効化する設定は、ファイルとしては確認できない。**

### 3.2 `package.json`

- **`scripts`:** `build` / `ci:build` / `audit` 等。**「本番自動デプロイを止める」旨の記述なし。** **Vercel CLI を CI で叩く処理も `package.json` からは未定義**。

### 3.3 GitHub Actions（`.github/workflows`）

**本番相当の `vercel deploy --prod` を含むワークフロー**

| ファイル | トリガー | Production への Vercel デプロイ |
|----------|-----------|--------------------------------|
| `.github/workflows/01_one_path_release.yml` | `workflow_dispatch` および **`push` の tag `m55-rc*` / `m55-prod*`** のみ | `vercel deploy --prod` あり。**`push` は tag のみ**。**`main` への通常 push / PR merge 単体ではこのジョブは起動しない**（repo 記述上）。 |

**`main` で `push` が走るワークフロー（抜粋）**

| ファイル | `push` と `main` |
|----------|-------------------|
| `encoding_guard.yml` | `branches: [ "main" ]` — ガードのみ |
| `m55_guard.yml` | `branches: [ main ]` — ガードのみ |
| `audit.yml` | `branches: [ main ]` — audit のみ |
| `ssot-audit.yml` | `branches: [main]` — audit のみ |
| `guard_clerk_await.yml` | `branches: [main]` — guard のみ |

**解釈（repo に基づく確定範囲）:**  
**GitHub Actions だけ見れば、`main` にマージコミットが入ったことのみでは `01_one_path_release.yml` の Vercel Production ジョブは発火しない。**

### 3.4 Vercel と Git の連係（CLI 設定ファイル）

- `.vercel/` 配下など **Production branch を宣言する設定ファイルはリポジトリに含まれていない**（少なくとも作業ワークスペースツリーからは未検出）。
- PR #1 に **Vercel 由来のチェックが付いていること**から、GitHub と Vercel プロジェクトの **連携は存在すると推測されるが、この文書単体では「どのブランチを Production とみなすか」「Production Auto Deploy が on/off か」を **証明できない**。

### 3.5 GitHub PR #1（`gh pr view 1`，記録時点）

| Field | Value |
|-------|--------|
| `state` | `OPEN` |
| `isDraft` | `false` |
| `baseRefName` | `main` |
| `headRefName` | `integration/main-align-2026-05-14` |
| `mergeable` | `MERGEABLE` |
| `mergeStateStatus` | `CLEAN` |

※ **merge はこのフェーズでは未実施**

---

## 4. PR merge が Vercel Production deployment を発火しうる経路の整理

| 経路 | repo だけで読み取れたこと |
|------|---------------------------|
| **A. Vercel ダッシュボードの Git 連携（一般的な既定）** | **多くのプロジェクトでは、Production とみなされるブランチ（多くは `main`）への **新規コミット**で Production **ビルド/デプロイがキューに入りうる**。**ただし本リポジトリの Vercel プロジェクトについて、ブランチ割当・自動本番作成の on/off・Deployment Protection は repo からは断定できない。** |
| **B. GitHub Actions `01_one_path_release`** | **`main` への merge のみでは起動しない**（**tag / 手動 dispatch** のみ）。 |
| **C. `package.json` / `vercel.json` による抑止** | **該当する抑止ファイル・記述なし**。 |

結論として **repo read-only の範囲では、「merge 後に Vercel Production が自動で走らない」とは言えない**一方、**「必ず走る」とも、この SSOT の証跠だけでは証明できない**。**ダッシュボード設定の確認がない限り SAFE 判定はしない。**

---

## 5. 判定（単一事実ラベル）

**UNKNOWN_BLOCKING_NEEDS_MANUAL_VERCEL_UI_CONFIRMATION**

**理由（要約）:**

1. **`vercel.json` 不在**で、ファイルベースの本番自動デプロイ抑止は確認できない。  
2. **GitHub Actions** の `main` push に紐づくジョブは **本番 `vercel deploy --prod` ではない**（`01_one_path_release` は tag/dispatch のみ）。  
3. **`main` にマージすると Vercel が Production を起動するか**は **Vercel プロジェクト設定に依存**し、**本チェックは Vercel UI / プロジェクト API を読んでいない**ため **UNKNOWN**。  
4. **「推測で安全扱いしない」**方針のため、**UI 確認までは merge GO を「Production 非発火と保証済み」とはみなさない**。

補足（運用上のリスク認識・断定ではない）: Vercel の一般的な Git 連携では `main` 更新後に Production デプロイが **起きうる**。**UI で「Production Branch」「Automatic Production Deploys」等を確認するまで、BLOCKING 扱いでよい。**

---

## 6. Hard stop（本フェーズで未実施のまま維持）

- **PR merge / `main` merge:** **未実行**
- **Production deploy（Vercel 本番 URL への配置）:** **未実行**
- **env / `whsec` / secret 変更:** **なし**
- **Stripe webhook 変更:** **なし**
- **live smoke / 本番決済:** **なし**
- **Production DB 変更:** **なし**
- **Vercel / Supabase / Stripe の設定変更:** **なし**
- **runtime / code / UI 変更:** **なし**

---

## 7. Next

- **UNKNOWN / BLOCKING 相当のため、次は人間が Vercel の UI で**少なくとも次を確認し、再 SSOT で **SAFE と言えるまで**この UNKNOWN を解除する：
  - Production とみなされている **Git branch**
  - **Automatic Production Deploy**（または相当）の **on/off**
  - **Deployment Protection** 等により「merge だけでは実ユーザー向けには出ない」等の有無  
- UI で **Production 自動デプロイが `main` merge と結びつかない／オフである**と **証跡化**できた場合の次手:** **別明示 GO** で **PR merge のみ**（運用プロトコルどおり）。
- **`MERGE_WILL_OR_MAY_TRIGGER_PRODUCTION_DEPLOY_BLOCKING`** が **明示的に UI で確認**された場合は、**先に運用側で自動本番発火を止める計画（別ゲート）**を検討し、本 SSOT の再判定へ。

---

## 8. rollback / recovery

**merge 前**の docs-only。**問題があれば本書を含む commit を revert すればよい。** **`main`/runtime/Production に影響しない。**

---

**記録宣言:** Forbidden 操作は、この read-only docs チェックでは **実行していない**。
