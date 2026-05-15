# M55 Phase 5-6C — Execution start checkpoint (2026-05-13)

Status: **Execution start checkpoint only** — **これ自体は Production 実行ではない。** 本ゲートは **Phase 5-6 Production apply execution に入る直前**の、**人間（lexsia）による最終確認**を SSOT 化したものである。**このドキュメントの保存だけでは実行は開始されない。**

---

## Work anchor

- **Branch:** `work/home-cluster`
- **Current commit:** **`0888802`** — `docs: clarify single-operator production execution exception`

---

## Current GREEN stack

- Phase 1〜4: Preview / Shadow **GREEN**
- Phase 5-1: Production readiness gate **GREEN**
- Phase 5-2: DB/RPC package prepared **GREEN**
- Phase 5-3: package **APPROVED** **GREEN**
- Phase 5-4: final GO planning **GREEN**
- Phase 5-5: explicit GO decision gate **GREEN**
- Phase 5-6A: execution readiness intake filled / **NOT executed** **GREEN**
- Phase 5-6B: final filled checklist review **READY**
- Phase 5-6B-1: single-operator exception hardening **GREEN**

---

## Explicit warning（次フェーズ以降）

**次の実行フェーズから、接続・操作の対象が Production になり得る。** **lexsia が意図的に開始しない限り進めてはならない。** 迷いがある場合は **停止**し、**Phase 5-6C ブロッカー**として扱う。

---

## Single-operator mode（再確認）

- **lexsia** が **全実行ロール**を保有する。
- **Gemini / ChatGPT** 監査は **助言のみ**であり、**説明責任を負う人間オペレータではない**。
- **lexsia** が **利用不能**、または **独立して最終確認できない**場合は **NO-GO**。

---

## Production labels（Phase 5-6A 準拠・秘密値なし）

| Item | Label / note |
|------|----------------|
| Vercel project / domain | **m55-webv2** / **m55-soul.jp** |
| Branch target | **`origin/main`** |
| Supabase | **m55-soul-core** / **Production DB** / **ref redacted** |
| Stripe mode | **live** — **明示の実行開始後のみ** |
| Stripe webhook endpoint label | **m55-production-webhook-endpoint** |
| Webhook URL label | **m55-soul.jp** `/api/stripe/webhook`（`whsec` は SSOT に記録しない） |

---

## First executable step after future execution start

**実行を開始した後、最初に行うのは read-only の Production preflight のみ**とする。

- `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql`

**preflight PASS 前に migration candidate を実行してはならない。**

---

## Approved SQL / apply order（将来の実行時）

1. **preflight** — read-only（上記パスのみ、最初）
2. **migration candidate** — **preflight PASS のときのみ**
3. **postflight** — read-only 検証
4. **app deploy / `main` 整合** — **別手順・別承認に従い DB/RPC 整合後のみ**
5. **live smoke** — **別承認**（本チェックポイントでは承認しない）

---

## Explicit NO-GO（開始前・実行中）

- Production DB **接続先が曖昧**（Shadow / Test と取り違えの疑い）
- Webhook **endpoint** と **env 上の署名秘密**の **ペアリング**が曖昧
- **秘密値**の要求・貼付・チャット流出
- **worktree** がクリーンでない
- **branch / commit** が合意と一致しない
- **rollback オーナー**（lexsia）が **利用不能**
- **support / refund 対応**（lexsia）が **利用不能**
- **preflight** が失敗する、または結果が解釈不能
- **Production と Shadow の区別**について **いかなる不確実性**も残っている

---

## Required execution-start phrase（未記録）

**以下の文を、lexsia が別途アクティブに記録した場合にのみ、read-only Production preflight に進む。**

> I intentionally start Phase 5-6 Production apply execution and will run the Production read-only preflight first.

| Field | Status |
|-------|--------|
| Phrase | **Prepared in this SSOT** |
| Active record by lexsia | **NOT RECORDED**（本チェックポイント時点） |

---

## Next phase

- **Phase 5-6D** — **Production read-only preflight 実行** — **上記 execution-start phrase が lexsia によりアクティブに記録された場合のみ**
- それ以外は **Phase 5-6C ブロッカー**のハードニング（再確認・窓の見直し・ラベル再検証など）

---

## Hard stop（本ゲートでも変わらない）

- **Production DB 適用**（read-only preflight 以外の DML をこのゲートで始めない）
- **`main` merge**
- **Production env 編集**
- **`whsec` / secret / service_role 値の出力・変更**
- **本番ライブ決済**
- **Stripe Production webhook 変更**
- **SQL の実行**（本 SSOT の作成・保存は除く — **実行は人間の別セッションで、上記 phrase 記録後**）

---

## Related

- `docs/ssot/M55_PHASE5_6A_PRODUCTION_EXECUTION_READINESS_INTAKE_2026-05-13.md`
- `docs/ssot/M55_PHASE5_5_FINAL_EXECUTION_READINESS_EXPLICIT_GO_DECISION_2026-05-13.md`
- `docs/ssot/M55_PHASE5_4_PRODUCTION_APPLY_PLANNING_FINAL_GO_GATE_2026-05-13.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
