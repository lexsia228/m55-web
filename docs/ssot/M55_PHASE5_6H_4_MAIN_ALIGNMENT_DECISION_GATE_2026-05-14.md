# M55 Phase 5-6H-4 — Main alignment decision / PR or merge strategy gate (2026-05-14)

Status: **Decision / strategy SSOT only** — **意思決定と手順の記録のみ。** **`main` merge、PR 作成、deploy、env / `whsec` / 秘密変更、Stripe webhook 変更、live smoke、本番決済は実行しない。**

---

## Verdict

**READY_FOR_MAIN_ALIGNMENT_EXECUTION_GATE**

（**integration ブランチが正本候補として証跡化済み**で、**`main` へ反映する最安全経路を定義できる**。**実行は Phase 5-6H-5 の明示 GO** に委ねる。）

---

## Current GREEN stack（through 5-6H-3）

- **Phase 5-6G:** Production migration + postflight **GREEN**
- **Phase 5-6H-1:** topology diagnostic **GREEN**
- **Phase 5-6H-2:** integration / main-align **plan GREEN**
- **Phase 5-6H-3:** integration branch **merge / build / tsc GREEN**

---

## Integration branch（正本候補）

| Item | Value |
|------|--------|
| **Branch** | `integration/main-align-2026-05-14` |
| **Remote** | `origin/integration/main-align-2026-05-14` |
| **Merge commit** | **`10b4e33`** — `merge: integrate main public surface into alignment branch` |
| **Work branch evidence commit（本ゲート記録時点）** | **`19e9989`** — `docs: record integration branch merge build green` |

---

## 1. Integration branch の正当性（確認済み事項）

| Check | Status |
|-------|--------|
| **`integration/main-align-2026-05-14` は `work/home-cluster` 由来** | **5-6H-3 SSOT** に記録済み（`7a7946f` 起点で作成） |
| **`origin/main` は integration にのみ merge** | **5-6H-3 SSOT** 記載どおり（**`main` 直ではない**） |
| **merge commit `10b4e33`** | **5-6H-3 で明示** |
| **`npm run build` / `npx tsc --noEmit` PASS** | **5-6H-3 で証跡化** |

---

## 2. `main` 反映方式の候補と評価

| 候補 | 内容 |
|------|------|
| **A** | **GitHub PR:** `integration/main-align-2026-05-14` → **`main`** |
| **B** | **ローカル:** `main` checkout 後に integration を **merge**（レビュアー手元） |
| **C** | **`main` を integration の先端へ fast-forward / reset** |
| **D** | **`work/home-cluster` を直接 `main` へ merge** |
| **E** | **`origin/main` 側コミットを cherry-pick** で再構成 |

---

## 3. リスク要約（候補別）

| リスク | A（PR） | B（local merge） | C（ff/reset） | D（work 直） | E（cherry-pick） |
|--------|---------|------------------|---------------|-------------|------------------|
| **unrelated histories** | GitHub が拒否する場合あり → **UI / ドキュメントで対処** | ローカルでは解消済み tree を **`main` に持ち込む**必要 | **force push / 履歴破壊**の温床 | **integration で検証したツリーと不一致**になり得る | **66 件規模で非現実的**、取りこぼしリスク |
| **Gate R 公開面喪失** | 低（PR diff で可視化） | 中（手元ミス） | 高 | 高 | 高 |
| **Phase 2〜5-6G 資産喪失** | 低 | 中 | 高 | 高 | 高 |
| **Vercel Production の追跡ブランチ** | **`main` が正**なら **PR merge 後の `main`** に揃えやすい | 同左 | **危険** | 高 | 高 |
| **rollback** | **PR クローズ / revert** | **reset / 別 commit** | **困難** | 中〜高 | 高 |

---

## 4. 推奨方式（1 本）

**【推奨】A — GitHub PR: `integration/main-align-2026-05-14` → `main`**

**理由:**

- **`integration/...` を正本候補**として扱い、**`main` 上で直接編集しない**。  
- **差分・レビュー・CI**の道が確保される。  
- **force push / `main` reset**を **現時点では不要**にできる。  
- PR が **ポリシーで不可**な場合のみ、**別明示 GO** の **`main` ローカル merge ゲート（B の厳格版）**に切り替える。

---

## 5. 採用しない方式と理由

| 方式 | 理由 |
|------|------|
| **D** `work/home-cluster` 直 `main` | **integration で検証済みの合流結果をバイパス**し、**公開面と runtime の再衝突**リスクが戻る。 |
| **C** `main` の fast-forward / reset | **`main` 履歴書き換え・force push**に寄りやすく、**rollback が困難**。**最後の手段**としても **現時点では推奨しない**。 |
| **E** cherry-pick 再構成 | **スケールと順序依存**で **取りこぼし**が起きやすい。 |
| **B**（無計画なローカル merge） | **PR 可能なら A が優先**。**B** は **PR 不可時かつ明示 GO** のみ。 |

---

## 6. `main` 反映直前チェックリスト（再実行推奨）

**integration ブランチ HEAD で、反映直前に再度実施する:**

- `git status` — **clean**
- **branch** — `integration/main-align-2026-05-14`（**`origin` と同期**）
- **`git rev-parse HEAD`** — **`10b4e33`**（またはその **直系**のみ差分なし）
- **`npm run build`** / **`npm run build:strict`**（方針に従う）
- **`npx tsc --noEmit`** — **exit 0**
- **strict conflict-marker grep** — **PASS**
- **forbidden keyword grep**（`/` と `/dtr/lp` 中心）— **PASS**
- **ルート到達確認**（環境に応じ **200 / 期待表示**）:
  - `/`, `/dtr/lp`, `/dtr/core`, `/purchase/success`, `/support`
  - `/legal/tokushoho`, `/legal/refund`, `/legal/privacy`, `/legal/terms`

---

## 7. Production deploy / live smoke の分離

- **`main` 反映**（merge）と **Production deploy** は **別 Gate**。  
- **live smoke / 本番ライブ決済**は **さらに別 Gate**（**別承認**）。  
- **env / `whsec` / Stripe webhook** 変更も **別 Gate**。  
- **Production DB/RPC** は **5-6G GREEN** 済みだが、**本番アプリ runtime の実スモーク**は **未実施**のまま。

---

## 8. Rollback 方針

- **PR 方式:** **PR クローズ**、または merge 後なら **`git revert`（マージコミット単位）**で **`main` を戻す**。  
- **integration ブランチ**は **`main` merge 後も参照用に残せる**（削除は任意）。  
- **`work/home-cluster`** は **5-6H-3 時点の祖先を保持**しており、**最悪時の比較基準**として利用可能。

---

## 9. Remaining risks

- **GitHub が unrelated merge の PR を拒否**する、または **追加設定**が要る。  
- **CI が未設定 / 失敗**で **merge が止まる**。  
- **merge 後の `main`** でのみ現れる **本番環境差**（env 名は揃っていても値は別）。  

---

## 10. Next phase

- **Phase 5-6H-5** — **`main` alignment execution GO gate**（**PR 作成・merge 実行の明示承認**）、または本決定が却下された場合の **ブロッカー hardening**。

---

## Hard stop（本ゲートでも維持）

- **`main` merge しない**（**PR の merge を含む** — 本 SSOTのみでは開始しない）
- **PR の merge は Phase 5-6H-5 の明示 GO まで保留**（**ドラフト PR 作成**は組織ルールに従い **5-6H-5** で扱う）
- **Production deploy しない**
- **Production env / `whsec` / secret を変更・露出しない**
- **Stripe Production webhook を変更しない**
- **live smoke / 本番ライブ決済をしない**

---

## Related

- `docs/ssot/M55_PHASE5_6H_3_INTEGRATION_BRANCH_MERGE_BUILD_GREEN_2026-05-14.md`
- `docs/ssot/M55_PHASE5_6H_2_INTEGRATION_MAIN_ALIGN_BRANCH_PLAN_2026-05-14.md`
- `docs/ssot/M55_PHASE5_6H_1_MAIN_ALIGNMENT_TOPOLOGY_DIAGNOSTIC_2026-05-14.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
