# Phase 5-6H-5E-C — Main merge + Production deploy start decision gate (2026-05-15)

## 1. Phase名

**Phase 5-6H-5E-C — Main merge + Production deploy start decision gate**

---

## 2. 現在地（証跡チェーン要約）

本 Gate 直前に、少なくとも以下が **GREEN または文書化完了**されている（詳細は各 SSOT を正とする）：

- **Phase 1〜4 Preview E2E GREEN**（歴史上の Phase 1〜4 証跡スタック — 例: `925a9c9`, `2f6fa0e`, `050d384`, `fce13d2` 等の参照は `M55_SYSTEM_SSOT.md` および各 Phase SSOT）
- **Phase 5-6G Production DB migration + postflight GREEN** — 例: `docs/ssot/M55_PHASE5_6G_PRODUCTION_MIGRATION_POSTFLIGHT_GREEN_2026-05-14.md` / SYSTEM SSOT の 5-6G checkpoint
- **Phase 5-6H** integration branch merge / build / `tsc` GREEN — `docs/ssot/M55_PHASE5_6H_3_INTEGRATION_BRANCH_MERGE_BUILD_GREEN_2026-05-14.md` 等
- **Phase 5-6H-5B** PR checks GREEN — `docs/ssot/M55_PHASE5_6H_5B_PR_CHECKS_GREEN_2026-05-15.md`
- **Phase 5-6H-5C** Ready-for-review / PR merge 判断 docs — `docs/ssot/M55_PHASE5_6H_5C_READY_FOR_REVIEW_PR_MERGE_GO_DECISION_GATE_2026-05-15.md`
- **Phase 5-6H-5D** Ready for review execution GREEN — `docs/ssot/M55_PHASE5_6H_5D_READY_FOR_REVIEW_EXECUTION_GREEN_2026-05-15.md`
- **Phase 5-6H-5E** PR merge decision gate — `docs/ssot/M55_PHASE5_6H_5E_PR_MERGE_DECISION_GATE_2026-05-15.md`
- **Phase 5-6H-5E-A** autodeploy side-effect read-only check — `docs/ssot/M55_PHASE5_6H_5E_A_PRODUCTION_AUTODEPLOY_SIDE_EFFECT_CHECK_2026-05-15.md`
- **Phase 5-6H-5E-B** Vercel blocking confirmation — `docs/ssot/M55_PHASE5_6H_5E_B_VERCEL_PRODUCTION_AUTODEPLOY_BLOCKING_CONFIRMATION_2026-05-15.md`

**PR #1（記録時点・`gh pr view 1`）**

| 項目 | 状態 |
|------|------|
| `state` | `OPEN` |
| `isDraft` | `false`（Ready for review） |
| `baseRefName` | `main` |
| `headRefName` | `integration/main-align-2026-05-14` |
| `mergeable` | `MERGEABLE` |
| `mergeStateStatus` | `CLEAN` |
| `mergedAt` | `null`（**未 merge**） |
| `statusCheckRollup` | **掲載分すべて SUCCESS**（Vercel Preview 含む） |

**実行していないこと**

- **Production deploy は開始していない**（**Vercel に新しい Production Deployment を意図して走らせていない** — 本書作成は **docs-only**）

**Work anchor**

- Branch `work/home-cluster`, baseline **`b9b7ee6`** — `docs: record vercel production autodeploy blocking`（**5E-C SSOT 追加直前**）
- PR #1: https://github.com/lexsia228/m55-web/pull/1

---

## 3. 重要な再定義

| 旧 | 新 |
|----|-----|
| **PR merge only**（本番を伴わない操作として切り離す） | **`main` merge + Production deploy start**（一体操作） |

**理由（5E-B 観測の再掲）**

- **Vercel Production Branch は `main`**（Project **m55-webv2** / Git **lexsia228/m55-web**）
- UI 文言どおり **`main` に push される各コミットが Production Deployment を作成する**
- **Auto-assign Custom Production Domains: Enabled**
- よって **PR #1 の merge は非本番操作として扱えない** — **`MERGE_WILL_TRIGGER_PRODUCTION_DEPLOY_BLOCKING`**（5E-B）を前提に本 Gate を構成する

---

## 4. この Gate の目的

- **`main` merge + Production deploy start**（**一体として**）を **実行してよいか**を判断し **SSOT に記録する**
- **この文書作成フェーズでは実行しない** — **Merge pull request を押さない** / **手動で Production deploy を起動しない**
- **env / `whsec` / secret 変更の判断ではない**
- **Stripe webhook 変更の判断ではない**
- **live smoke / 本番決済の判断ではない**（**さらに後続 Gate**）

---

## 5. 実行前合格条件（チェックリスト）

**merge + deploy start の直前に満たすべき条件：**

**リポジトリ / API で本書作成時点確認済み:**

- [x] PR #1 **Open**
- [x] **`isDraft: false`**
- [x] **base `main` / head `integration/main-align-2026-05-14`**
- [x] **`mergeable: MERGEABLE`**
- [x] **`mergeStateStatus: CLEAN`**
- [x] **最新 HEAD に対する checks rollup が SUCCESS**
- [x] **Vercel（PR 上のチェック）SUCCESS**
- [x] **base との衝突なし（CLEAN）**
- [x] **`work/home-cluster` の SSOT / evidence が push 済み**（本 5E-C を含め `origin/work/home-cluster` に乗せる）
- [x] **Production DB migration / postflight GREEN は既に SSOT 済み**（5-6G 等）
- [x] **PR 外に、この Gate で追加の runtime / code 差分を作っていない**（**変更禁止遵守**）

**明示 GO / 5E-D 直前に運用者が必須で行う確認（本 docs では実行しない）:**

- [ ] **Rollback / recovery アンカーの確定** — merge **直前の** `main` HEAD（`gh` / GitHub UI）、Vercel での **直近安定 Production deployment**、当該タイムラインの記録
- [ ] **Merge = Production deploy start と理解したうえでの承認**（5E-B と Vercel UI 文言）
- [ ] **成功デプロイ後に custom production domains が自動割当されうることの理解**

上記 **未チェックの項を埋めたうえで**、別明示 GO に基づき **5E-D** で **Merge pull request** のみを実行する。

---

## 6. Merge 方式

- **推奨:** GitHub UI の **通常の Merge pull request**（**merge commit** 相当）
- **GitHub UI で squash/rebase のみ／通常 merge が無効**なら **停止して報告**
- **本 Gate ではボタンを押さない**

---

## 7. Risk

1. **`main` merge は Vercel Production Deployment を誘発する**（5E-B 確定事項）
2. **成功した Production deployment のあと、カスタム本番ドメインの自動割当が走りうる**
3. **退行は利用者向けに見える** — Deployment Protection や **Vercel での前デプロイへの戻し**、または **`main` revert PR** など **別手順が必要**
4. **Production DB / RPC は既に postflight GREEN のため、初回の「アプリ `main` と本番 DB 前提の整合後」に近いリスク**がある（**この Gate では DB rollback を想定しない**）

---

## 8. Recovery / rollback 方針

- **このフェーズ自体:** **docs-only。** 問題があれば **5E-C 文書の commit を revert** するだけ。**`main`/runtime/実行中の Production には影響しない。**
- **実 merge 後**の rollback は **本書では実行しない** — 少なくとも以下を **想定手順として別フェーズで検討**する：
  - **GitHub:** PR merge で生成された merge commit / **`main` HEAD** の特定
  - **Vercel:** **previous Production deployment** への **rollback / promote** （UI 手順は Runbook 側）
  - **Git:** **`main` に対する revert PR** の可能性
  - **Production DB:** 既に **postflight GREEN のため、この Gate では DB rollback しない**
  - **secrets / env / webhook:** **本手順では変更しないため、それらの rollback は不要**（変更があれば別 Incident）

---

## 9. 判定（Verdict）

**READY_FOR_MAIN_MERGE_PRODUCTION_DEPLOY_START_GO_GATE**

**条件付き:** **`main` merge + Production deploy start の実操作**は **本 commit 後の別明示 GO**（**Phase 5-6H-5E-D** 等）でのみ実施する。**本 SSOT は許可の自動実行ではない。**

---

## 10. 明確な未実行事項

- **No PR merge**（ボタン未押下）
- **No `main` merge**（結果としての更新なし）
- **No Production deploy started**（意図した本番デプロイ開始操作なし）
- **No env / `whsec` / secret changes**
- **No Stripe webhook changes**
- **No live smoke**
- **No live payment**
- **No Production DB changes**
- **No Vercel / Supabase / Stripe 設定変更**

---

## 11. Next

- **Phase 5-6H-5E-D — explicit `main` merge + Production deploy start GO / execution checkpoint**
- **5E-D で実行する場合でも、操作は原則として GitHub UI の Merge pull request のみ**（**本番開始はその帰結として Vercel が行う**）
- **env / `whsec` / secret、Stripe webhook、live smoke、本番決済はさらに後続 Gate**

---

**記録宣言:** 上記 Forbidden の **実操作は本 Phase では行っていない。**
