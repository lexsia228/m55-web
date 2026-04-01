# M55 HOTFIX CHECKLIST v2.1 (FROZEN)

対象:
- Codebase: `...WITH_AUDIT_GATE_v2` (Next.js + Audit Gate)
- Legacy runtime under `public/legacy/`

目的:
- Layer0 / Layer1 の **監査PASS状態を維持**したまま、監査リスク/実装漏れをゼロ化する
- 仕様追加は禁止（**監査クリア目的の修正のみ**）

---

## PRIME DIRECTIVE (絶対原則)
- **Layer1 = policies/*.json が唯一の根拠**（数値/フラグの推測・ハードコード・フォールバック禁止）
- **Fail-Closed**：欠損/不正/取得失敗は `systemHalt`（0やfalseに落とさない）
- **Retention**：キャッシュ採用条件は **常に `now < expires_at`**（rolling days 方式は全面廃止）
- **UI憲法**：Background NoTouch / NoLoop / NoBadge / NoNumber(NoScore) を破らない
- **BottomNav**：5タブ固定、**第3タブはPAGE_AI_CHAT固定**（NOOP禁止）

---

## 1) Logic Violation: ハードコード抹殺（binding_inventory.js）
**状況**：Chat回数などを policies を無視して定数で決めると、Layer1契約監査が成立しない。

**修正アクション（必須）**
- [x] `DAILY_CAP = {...}` のような定数を撤去
- [x] `public/legacy/policies/m55_entitlements_v1_0.json` を参照し、`ai_chat_send_per_day` を唯一根拠にする
- [x] 欠損/不正/取得失敗は `systemHalt({code:"M55_POLICY_MISSING"...})`
- [x] `-1` は unlimited として扱う（policy定義準拠）

---

## 2) Cache Violation: Rolling Days 廃止（m55_data_core.js）
**状況**：`retentionDays` を使った「古いものを計算で消す」方式は、SSOTの `expires_at` 前提と矛盾。

**修正アクション（必須）**
- [x] rolling/pruneロジックを全廃（tsベースのcutoff計算禁止）
- [x] 保存時に **`expires_at (UTC ms)`** を必ず付与
- [x] 読み取り/採用条件は常に `now < expires_at`
- [x] `expires_at` 欠損のレガシーは **fail-closedで破棄**（推測延命禁止）
- [x] retention日数は `public/legacy/policies/m55_retention_v1_0.json` を唯一根拠にする

---

## 3) Asset Violation: 参照されるCSSの実体化（m55_global.css）
**状況**：HTMLが参照しているCSSが存在しないと監査不能・UI崩壊の温床。

**修正アクション（必須）**
- [x] `public/legacy/css/m55_global.css` を作成
  - 最低限のresetのみ
  - **Background NoTouch**：`html/body` の背景は絶対に設定しない

---

## 4) SSOT Conflict: Dual-Deck 取り扱い（重要）
**状況**：「Dual-Deck（Reel + ChatSheet）」構想は魅力的だが、現在凍結されている SSOT（BottomNav/ページ遷移/NoTouch/NoLoop等）と衝突する可能性がある。

**運用ルール（凍結）**
- Dual-Deck は **構想/設計メモとして保存**はするが、
  **SSOTを上書きして採用してはならない**（採用するなら別途 SSOT凍結プロセスが必要）
- 既存の BottomNav 5タブ固定（第3タブAI Chat）は **不可侵**
- 新アーキテクチャは、BottomNavやLayer0の制約を **外側で包む** 形のみ許可

---

## 5) 監査ゲート補助チェック（tools版）
- [x] `tools/audit_gate.mjs` に、`binding_inventory.js` が
  `m55_entitlements_v1_0.json` と `ai_chat_send_per_day` を参照している痕跡チェックを追加
- [x] CI本体の `scripts/audit_gate.mjs` にも同等の痕跡チェックを追加（PASS前提の安全策）

---

## 完了条件（ALL GREEN）
- `npm run audit` が PASS
- Vercel Deploy は Git連携自動デプロイなし（CLI/GitHub Actions経由のみ）
- Native（Capacitor）→ fastlane でビルド/提出が一本道で通る
