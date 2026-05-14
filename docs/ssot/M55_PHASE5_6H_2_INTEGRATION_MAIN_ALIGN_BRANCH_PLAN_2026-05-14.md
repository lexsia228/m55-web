# M55 Phase 5-6H-2 — Integration / main-align branch plan (2026-05-14)

Status: **Planning only** — **計画の SSOT のみ。** **ブランチ作成、merge、rebase、cherry-pick、force push、`main` 更新、Production deploy、env / `whsec` / 秘密、live smoke、本番決済は実行しない。** `work/home-cluster` は **このドキュメントの保存だけでは変更されない。**

---

## Work anchor

- **Branch:** `work/home-cluster`
- **Current commit（計画記録時点）:** **`9cefa47`** — `docs: record main alignment topology diagnostic`

---

## Current GREEN stack

- **Phase 5-6G:** Production migration + postflight **GREEN**
- **Phase 5-6H:** app/main alignment readiness **APPROVE_WITH_FIXES**
- **Phase 5-6H-1:** topology diagnostic **GREEN**（`READY_FOR_MAIN_ALIGNMENT_PLAN`）
- **App ↔ Production RPC:** **PASS**

---

## Known topology（5-6H-1 準拠）

| Fact | Detail |
|------|--------|
| **merge-base** | **`git merge-base origin/main HEAD` 失敗** — **共通祖先なし** |
| **三点 diff** | **`git diff origin/main...HEAD` 不可**（no merge base） |
| **Shallow** | **否**（浅い clone ではない） |
| **Count** | **`origin/main` のみ 66** / **`work/home-cluster` のみ 338** |
| **性質** | **`origin/main`:** Gate R / public / legal / support / `/dtr/lp` 等。**`work/home-cluster`:** Phase 2〜5-6G の runtime / DB・RPC 呼び出し / SQL / SSOT |
| **main 整合** | **NOT READY**（別手順で解消） |

---

## Planning goals

1. **`work/home-cluster` を壊さず**、**integration 専用ブランチ**上でのみ `origin/main` を取り込む計画にする。  
2. **Gate R / public / legal / support / dtr-lp** の公開面資産を **失わない**。  
3. **Phase 2〜5-6G** の runtime / DB / RPC / SQL / SSOT 資産を **失わない**。  
4. **unrelated histories** を前提に、**試験ブランチ上だけ**で統合作業を行う。  
5. **build / typecheck / ルート到達** を **統合後の必須ゲート**にする。  
6. **Production deploy / live smoke** は **統合完了・検証後の別 Gate** に分離する。

---

## Recommended branch strategy（実行順 — まだ実行しない）

1. **起点:** 最新の **`work/home-cluster`**（ローカルで `git fetch origin` 済みを推奨）。  
2. **integration ブランチ作成**（例）: `integration/main-align-2026-05-14` — **`work/home-cluster` から分岐**。  
3. **`git fetch origin`** で **`origin/main` を最新化**。  
4. **integration ブランチ上でのみ** `git merge origin/main` を試行。  
5. Git が **unrelated histories** を理由に拒否する場合、**integration ブランチに限り** `--allow-unrelated-histories` の使用を **検討**（**`main` / `work/home-cluster` 直では使わない**）。  
6. **衝突は手動解消** — 下記「衝突解消ルール」に従う。  
7. **`origin/main` 側を優先する領域:** 公開面（legal / support / dtr-lp / pricing / footer / review surface / deploy 安定に効く middleware）。  
8. **`work/home-cluster` 側を優先する領域:** Phase 2〜5-6G の **課金・返書・RPC 呼び出し・Production SQL・SSOT**。  
9. **検証:** `npm run build` または `npm run build:strict`、可能なら `npx tsc --noEmit`、`npm run lint:ssot`。  
10. **PASS 後のみ**、**次の承認ゲート**（`main` への取り込み可否、Production deploy 可否）に進む **文書化**。

---

## Protected assets — `origin/main` 側（公開面・Gate R）

- `app/legal/*`
- `app/support/*`
- `app/dtr/lp/*`
- **pricing / footer / public review surface**（該当 `app/`・`components/` パスは merge 時に **ファイル単位で確認**）
- **middleware** — **デプロイ安定**に関わる変更は **軽視しない**（衝突時は **挙動比較**）

---

## Protected assets — `work/home-cluster` 側（Phase 2〜5-6G 本線）

- `app/api/stripe/webhook/route.ts`
- `app/api/reply-tickets/checkout/route.ts`
- `lib/m55/reply/*`
- `lib/m55/dtrCoreCheckoutFulfillment.ts`
- `lib/m55/dtrOwnershipGate.ts`
- `components/dtr/ConsultRoom.tsx`
- `scripts/sql/production/m55_phase5_*.sql`
- `docs/ssot/M55_PHASE5*.md`
- `docs/ssot/M55_PHASE5_6*.md`

---

## Conflict-resolution rule

- **`ours` / `theirs` の一括採用は禁止。**  
- **ファイル単位**で判断する。  
- **収益・返書・RPC 経路**と **法務・公開 LP** の **両立**を最優先する。  
- 迷う場合は **停止**し、**5-6H-3 前に SSOT またはチケットにエスカレーション**。

---

## Required checks（integration ブランチで衝突解消後）

| Check | Command / action |
|-------|------------------|
| Build | `npm run build` または `npm run build:strict` |
| Typecheck | `npx tsc --noEmit`（プロジェクト設定が許す場合） |
| Lint（設定時） | `npm run lint:ssot` |

**Route availability（目視または HTTP 200 確認 — 本番 URL は値として書かない）:**

- `/`
- `/dtr/lp`
- `/dtr/core`
- `/support`
- `/legal/tokushoho`
- `/legal/refund`
- `/legal/privacy`
- `/legal/terms`

---

## Rollback posture

- **integration ブランチ**が不調なら **ブランチ削除で打ち切り可能**。  
- **`work/home-cluster`** は **起点として保持**（計画どおり **直接 merge しない**）。  
- **`origin/main`** は **このゲートでは書き換えない**（**no force push**）。

---

## Hard stop（本フェーズでも維持）

- **`main` merge しない**
- **Production deploy しない**
- **Production env / `whsec` / secret を変更・露出しない**
- **Stripe Production webhook を変更しない**
- **live smoke / 本番ライブ決済をしない**

---

## Next phase

- **Phase 5-6H-3** — **integration ブランチ作成**および **dry-run merge ゲート**（別承認）、または **本計画が採用不能な場合のブロッカー hardening**。

---

## Related

- `docs/ssot/M55_PHASE5_6H_1_MAIN_ALIGNMENT_TOPOLOGY_DIAGNOSTIC_2026-05-14.md`
- `docs/ssot/M55_PHASE5_6G_PRODUCTION_MIGRATION_POSTFLIGHT_GREEN_2026-05-14.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
