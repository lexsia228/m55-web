# Phase 5-6H-5E-B — Vercel Production auto-deploy blocking confirmation (2026-05-15)

## 1. Phase名

**Phase 5-6H-5E-B — Vercel Production auto-deploy blocking confirmation**

Status: **`work/home-cluster` 上の docs-only。** **Vercel UI を人間が読み取り、観測テキストを SSOT 化した。** **本 commit では Vercel / GitHub / Production のいずれの設定も変更していない。** **PR merge / `main` merge / Production deploy は未実行。**

Work anchor:

- Branch `work/home-cluster`, baseline commit **`f33d6df`** — `docs: check production autodeploy side effect`（**5E-B SSOT 追加直前**）。
- PR #1: https://github.com/lexsia228/m55-web/pull/1

---

## 2. 現在地

- **Phase 5-6H-5E** PR merge decision gate — **GREEN（SSOT 済み）** — `docs/ssot/M55_PHASE5_6H_5E_PR_MERGE_DECISION_GATE_2026-05-15.md`
- **Phase 5-6H-5E-A** repo / GitHub read-only check — **完了** — `docs/ssot/M55_PHASE5_6H_5E_A_PRODUCTION_AUTODEPLOY_SIDE_EFFECT_CHECK_2026-05-15.md`（当時 Verdict: UNKNOWN → **本 5E-B で UI 確定**）
- **Manual Vercel UI confirmation** — **本書に記録した事実として完了**（**設定変更は行っていない**）
- **PR #1:** **Open** / **Ready for review**（`isDraft: false`）/ **`mergedAt: null`（未 merge）** — 記録時点の `gh pr view 1` 前提

---

## 3. Vercel UI で確認済みとして記録する事実（読み取りのみ）

| 項目 | 観測 |
|------|------|
| **Project** | **m55-webv2** |
| **Connected Git Repository** | **lexsia228/m55-web** |
| **Environment** | **Production** |
| **Branch Tracking** | **`main`** |
| **UI 文言（要旨）** | **Every commit pushed to the `main` branch will create a Production Deployment.** |
| **Auto-assign Custom Production Domains** | **Enabled** |
| **Production Domains** | **m55-webv2.vercel.app** / **m55-web.vercel.app** |

**解釈（SSOT 上の結論用）:** 上記は **Vercel が Production 向けに `main` を追跡し、`main` への各コミットで Production Deployment を作成する**旨を UI 上で明示している。**Custom Production Domains の自動割当が有効**である。

---

## 4. 判定（Verdict）

**MERGE_WILL_TRIGGER_PRODUCTION_DEPLOY_BLOCKING**

---

## 5. 理由

1. **Production Branch / Branch Tracking は `main`** である。  
2. UI 上 **「`main` への every commit が Production Deployment を作成する」** と明示されている。  
3. **Auto-assign Custom Production Domains が Enabled** のため、当該 Production Deployment は **公開ドメインに結び付く運用**である（上記ドメイン）。  
4. したがって **GitHub で PR #1 を `main` に merge することは、非本番操作として切り離して扱えない** — **従来想定の「PR merge のみ GO」は不成立**。

---

## 6. 明確な結論（運用）

- **PR merge 実操作は禁止を継続**（**別明示 GO があっても「本番を伴わない merge」としては扱わない**）。  
- **次フェーズは「PR merge only」ではなく**、**「`main` merge + Production deploy 開始」**を一体として扱う **意思決定ゲート**に **再設計**する（**Phase 5-6H-5E-C**）。

---

## 7. 未実行事項（本フェーズで実行していない）

- **No PR merge**
- **No `main` merge**
- **No Production deploy**（**Vercel 上で手動・自動を問わず本番反映操作は未実施**）
- **No env / `whsec` / secret 変更**
- **No Stripe webhook 変更**
- **No live smoke**
- **No live payment**
- **No Production DB 変更**
- **No Vercel / Supabase / Stripe 設定変更**（**UI は閲覧のみ**）

---

## 8. Next

- **Phase 5-6H-5E-C — Main merge + Production deploy start decision gate**  
  - **まず docs-only の判断ゲート**として用意する。  
  - **`Merge pull request` の実操作**は、その判断と **さらに別の明示 GO** に限り許容する設計とする。

---

## 9. Recovery

**docs-only。** 問題があれば **本書を含む当該 commit を revert** すればよい。**`main` / runtime / 実際の Production デプロイ履歴には影響しない。**

---

**入力証跡チェーン:** `M55_PHASE5_6H_5E_PR_MERGE_DECISION_GATE_2026-05-15.md` / `M55_PHASE5_6H_5E_A_PRODUCTION_AUTODEPLOY_SIDE_EFFECT_CHECK_2026-05-15.md`（および本書前段の SYSTEM SSOT チェックポイント）。
