# Phase 5-6H-5E-D — Main merge + Production deploy execution GREEN (2026-05-15)

## 1. Phase名

**Phase 5-6H-5E-D — Main merge + Production deploy execution GREEN**

---

## 2. 実行結果（人間操作 + read-only API 照合）

### 2.1 GitHub — PR #1

| 項目 | 観測 |
|------|------|
| **PR** | https://github.com/lexsia228/m55-web/pull/1 |
| **Title** | Phase 5-6H main alignment: integrate public surface and runtime assets |
| **`state`** | **`MERGED`**（`gh pr view 1`） |
| **`mergedAt`** | **`2026-05-15T15:45:54Z`** |
| **`mergeCommit.oid`（正本）** | **`483285da9b5ef492bd8495fa404558b31d994705`** |
| **`main` tip（`repos/.../commits/main` で read-only 確認）** | **同一 SHA** — first line of commit message: **`Merge pull request #1 from lexsia228/integration/main-align-2026-05-14`** |
| **`baseRefName` / `headRefName`（PR 定義）** | `main` ← `integration/main-align-2026-05-14` |
| **コミット件数（運用者が GitHub UI で確認）** | **`345` commits** が `main` にマージされた旨の表示。**補足:** `gh pr view 1 --json commits` の単一レスポンスでは **一覧が 100 件に制限**されるため、**総数の正本は GitHub PR 画面**とする。 |

### 2.2 Vercel — Production（人間が UI で観測した最新行）

Project **m55-webv2** / Git **`lexsia228/m55-web`** / Production Branch **`main`** / Auto-assign Custom Production Domains **Enabled**（5E-B 再掲）。

| 項目 | 観測 |
|------|------|
| **Environment** | **Production** |
| **Status** | **Ready** |
| **Current** | **yes** |
| **Branch** | **main** |
| **Commit（UI 表示の短縮形）** | **`48325d`**（**`483285da9b5e…` の短縮と一致**） |
| **Message** | **Merge pull request #1 from lexsia228/integration/main-align-2026-05-14** |

**解釈:** **`main` への merge が Vercel Production Deployment を起動**し、当該デプロイが **Ready** かつ **Current** となった。

---

## 3. 重要な再確認

- 本操作は **「PR merge only」ではない**。**`main` merge + Production deploy 開始** が **一体**であった（5E-B / 5E-C の前提）。
- **Production Branch = `main`** かつ **Auto-assign Custom Production Domains = Enabled** のため、**本番公開に直結する実行**として扱う。

---

## 4. この Phase で行っていないこと（未実行事項）

- **No env / `whsec` / secret changes**
- **No Stripe webhook changes**
- **No Supabase 設定・スキーマ変更**（本フェーズのスコープ外）
- **No Vercel 設定変更**
- **No live smoke**
- **No live payment**
- **No additional redeploy**（**意図した手動による追加重デプロイは行っていない** — merge に伴う自動 Production は上記のとおり）
- **No Production DB changes**
- **No integration branch の削除**
- **No runtime / code / UI 変更**（**本タスクは docs 証跡のみ**）

---

## 5. 判定（Verdict）

**MAIN_MERGE_PRODUCTION_DEPLOY_READY_GREEN**

---

## 6. Risk note

- **Production deployment は Current**。**以降の確認は利用者向け本番に直面しうる読み方**を前提にする。
- **別途文書化・承認された production verification gate がない限り、live payment / live smoke に進まない。**
- **Stripe webhook / env / secret は本 Phase で触っていない** — 障害切り分け時も **この SSOT では変更禁止のまま**後続 Gate で扱う。

---

## 7. Recovery anchor

- **GitHub:** PR #1 **MERGED** / **`mergeCommit`** **`483285da9b5ef492bd8495fa404558b31d994705`** / **`main` tip 一致** を記録済み。
- **Vercel:** **直前の Production deployment** を rollback / promote の参照として保持（UI / Runbook）。
- **env / webhook / secret:** **変更なし** → **それらの rollback は不要**。
- **Production DB:** **5-6G 等で postflight 済み**のため **本 Phase で DB rollback は計画しない**（アプリ側 release 後の事象は別インシデント）。
- **問題時:** **`main` の revert PR** や **Vercel の前デプロイへの戻し**は **別フェーズ**で実施。

---

## 8. Next

- **Phase 5-6H-5F — Production deployment read-only verification / post-merge state recording gate**
- **5F でも** **live payment** および **Stripe webhook / env の変更は避ける**（**read-only 確認中心**）。

---

## 9. Work anchor

- **Branch（ドキュメント記録）:** `work/home-cluster`
- **直前のゲート commit（実行前 SSOT）:** **`5493c0e`** — `docs: prepare main merge production deploy start gate`
- **Evidence（本書の前提ゲート）:** `docs/ssot/M55_PHASE5_6H_5E_C_MAIN_MERGE_PRODUCTION_DEPLOY_START_DECISION_GATE_2026-05-15.md`

---

**記録宣言:** 上記 **Forbidden** に含まれる操作は、この **docs 記録セッションでは実施していない**（**merge / 本番デプロイは人間が別セッションで完了済みであり、本ファイルはその証跡 SSOT**）。
