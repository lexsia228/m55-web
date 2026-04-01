# M55 Baseline Freeze — 2026-03-30

**Status:** BASELINE（復元の唯一の正本）  
**効力:** 本ファイルは **2026-03-30 時点の green state** を定義する。障害復旧・監査・リリース判断で「いつ何が通っていたか」を問うときは **本書＋本書が指すコミット** を正とする。

---

## 1. Baseline ID

| 項目 | 値 |
|------|-----|
| Baseline 日付 | 2026-03-30（JST 日付として扱う） |
| 正本ドキュメント | 本ファイル `docs/ssot/M55_BASELINE_FREEZE_20260330.md` |
| 対応コミット | **運用:** 本 baseline を宣言したリポジトリの **コミット SHA** を、タグまたは社内台帳に必ず紐づける（下記 Recovery チェックリスト参照） |

---

## 2. Green 条件（必須）

以下を **すべて満たす** 状態を、本 baseline の **green** と定義する。

### 2.1 SSOT 監査（語彙・禁止句）

| チェック | コマンド | 期待結果 |
|----------|----------|----------|
| **Public scan** | `node scripts/run-sonnet-audit.js` | 終了コード `0`、JSON の `violations` が **長さ 0** |
| **Reserve scan** | `node scripts/run-sonnet-audit.js --reserve-scan` | 同上（`app/api` を含む内部走査でも **0 件**） |

### 2.2 ローカル／ゲート（ビルド前）

| チェック | コマンド | 期待結果 |
|----------|----------|----------|
| Audit gate | `npm run audit` | 終了コード `0` |
| ESLint（公開面 SSOT パス） | `npm run lint:ssot` | 終了コード `0`（`--max-warnings 0`） |

### 2.3 CI green（リモート）

**定義:** baseline コミットにおいて、リポジトリに存在する **GitHub Actions ワークフロー** が、既定ブランチへの push / pull_request で **失敗していない** 状態。

**本リポジトリで baseline 時点に存在するワークフロー例**（ファイル名のみ。追加・改名された場合は当該コミットの `.github/workflows/` を正とする）:

- `audit.yml`（`npm run audit` 等）
- `ssot-audit.yml`（`run-sonnet-audit.js` + `lint:ssot`）
- `m55-guardrails.yml`, `m55_guard.yml`, `m55-asset-index.yml`, `encoding_guard.yml`, `mojibake-guard.yml`, `guard_clerk_await.yml`, `01_one_path_release.yml`（各リポジトリ設定に従い **すべて green**）

**証跡:** Recovery バンドル手順に従い、該当コミットの Actions 実行結果を保存する。

---

## 3. 承認済み公開ルート（2026-03-30 時点の意図）

**凍結（変更は別 SSOT／Review）**

- `/`（ルートの振る舞いは実装正）
- `/dtr/lp`
- `/support`
- `/legal/*`

**情報提供（公開だがマーケ主軸ではない）**

- `/how-m55-works`
- `/ten-views`

**購入関連（表示・ポーリングの契約に従う）**

- `/purchase/*`（成功画面は契約・QA 正本参照）

**隔離**

- `/prototype/*`（ヘッダゲート。公開ストアフローとは分離）

**シェル上の Home（実装正）**

- **`/home`** — **ロゴ（lockup）** からの遷移先としての Home

**現行公開面（baseline）に含めない**

- **generic public AI chat** — 誰でも使える公開汎用チャット画面を **current public primary surface** とみなさない。Entry Report 購入者に閉じた相談室は [M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md](./M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md)・購入関連契約の **別スコープ**（主ナビ・凍結ストア面の拡張ではない）。

上記以外のルートは **実装と既存 SSOT の複合** で解釈し、**主ナビの定義は section 5 のみ**（本 baseline の復元錨）。

---

## 4. 承認済み語彙（2026-03-30）

**正本:** [M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md](./M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md)

- 公開面向けの整理語彙: **10通りの資質**、**5つの解析軸**
- 禁止・予約表現: 同文書 section B および自動監査ルール（`scripts/ssot-public-vocabulary-rules.mjs`）

---

## 5. 承認済みナビ（2026-03-30）

**本節が、現行実装・現行公開方針における「主ナビ」の唯一の baseline 正本。** 復元・監査で主ナビを決めるときは **ここを正** とし、旧文書の A-plan／5 タブ／汎用 AI チャット記述は **根拠にしない**（[M55_DEPRECATION_MAP_20260330.md](./M55_DEPRECATION_MAP_20260330.md) の historical / deprecated）。

| 要素 | 定義（baseline） |
|------|------------------|
| **Home access** | **ロゴ（lockup）** → **`/home`** |
| **Primary tabs** | **本質** / **レポート** / **マイページ** のみが **current public primary navigation** |

**primary として baseline に書かない（復元基準にもしない）**

- **Tarot**、**DTR**、**AI Chat** を **current public primary navigation** として列挙しない（補助・静かな無効化等は **実装コード** を正とし、主タブの定義は上表に限定する）。
- **旧 A-plan**（Home / AI Chat / MyPage のみ等）、**旧 5 タブ**、**旧「/ai-chat を主ナビとする」docs** — **recovery anchor ではない**（deprecated / historical のみ）。

---

## 6. 関連正本（読み順のヒント）

| 目的 | 文書 |
|------|------|
| チェックポイント要約 | [M55_CHECKPOINT_UPDATE_20260330_v3.md](./M55_CHECKPOINT_UPDATE_20260330_v3.md) |
| 視覚トークン | [M55_VISUAL_TOKEN_SPEC_v1.md](./M55_VISUAL_TOKEN_SPEC_v1.md) |
| 購入成功 QA | [../qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md](../qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md) |
| ドキュメントの新規参照可否 | [M55_DEPRECATION_MAP_20260330.md](./M55_DEPRECATION_MAP_20260330.md) |
| 復旧手順・証跡 | [../ops/M55_RECOVERY_BUNDLE_CHECKLIST_20260330.md](../ops/M55_RECOVERY_BUNDLE_CHECKLIST_20260330.md) |

---

## 7. 変更禁止の扱い

本 baseline を更新する場合は **新しい日付の BASELINE ファイル** を追加し、本ファイルは **歴史的正本** として残す（上書きで消さない）。

---

**一行サマリ:** 2026-03-30 baseline は **public / reserve 監査 0、audit + lint:ssot、CI 全緑、上記ルート・語彙、主ナビ（ロゴ→/home、本質／レポート／マイページ、汎用公開チャットなし）** を満たすコミットを指す。
