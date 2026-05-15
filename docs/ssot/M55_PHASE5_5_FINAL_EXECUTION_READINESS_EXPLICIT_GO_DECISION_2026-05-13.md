# M55 Phase 5-5 — Final execution readiness / explicit Production apply GO decision (2026-05-13)

Status: **Final GO decision gate SSOT** — **実行ではない。** **明示の最終 GO が無い限り、Production apply フェーズ（DB 実行・`main`・本番 env・`whsec`/秘密・ライブ決済）に進めない。** 本ドキュメントは **人間が判断するための 1 枚のチェックリスト**である。

## Work anchor

- **Branch:** `work/home-cluster`
- **Baseline（計画 SSOT）:** commit **`2b237cb`** — `docs: plan production apply final GO gate`

## Current GREEN stack（Phase 1〜5-4）

| Phase | 内容 |
|-------|------|
| Phase 1 | DTR 本体 ¥1,000 Preview 購入後フロー **GREEN** |
| Phase 1.5 | 証跡化 **GREEN** |
| Phase 2 | wallet `report_instance_id` 恒久修正 **GREEN** |
| Phase 3 | 付属 1 件返書 E2E **GREEN** |
| Phase 4 | 追加返書 ¥500 Preview E2E **GREEN** |
| Phase 5-1 | Production 昇格前 Gate / Runbook **GREEN** |
| Phase 5-2 | Production DB/RPC migration package **GREEN**（準備済み） |
| Phase 5-3 | package review **APPROVE** / checkpoint **GREEN** |
| Phase 5-4 | Production apply planning / final GO gate **GREEN** |

## Approved package / planning commits（参照）

| Commit | 内容 |
|--------|------|
| **`fce13d2`** | Phase 4 **GREEN** 証跡化 |
| **`ffdf078`** | Phase 5-1 readiness gate |
| **`11f77e8`** | Phase 5-2 package prepared |
| **`6e603d9`** | preflight hardening |
| **`8a382e7`** | package **APPROVED** checkpoint |
| **`2b237cb`** | final GO planning（Phase 5-4 SSOT 等） |

## Hard stop（絶対）

- **Production DB に適用しない**（最終 GO まで）  
- **`main` に merge しない**（別ポリシー・別 GO）  
- **Production env を編集しない**  
- **`whsec` / 秘密値を変更・出力しない**  
- **本番ライブ決済をしない**  
- **Stripe Production webhook 設定を変えない**（別承認）  

## Explicit GO criteria（すべて満たすこと — 人間が記録）

1. **クリーンな worktree**（意図しない未コミット差分なし）  
2. **正しい branch / commit** が合意されている  
3. **承認済み SQL パッケージのパス**がリポジトリ正本と一致（preflight / migration / postflight）  
4. **メンテナンス窓**がカレンダー共有されている  
5. **Rollback / kill switch オーナー**が名前付きで確定  
6. **Production preflight 実行者**が確定  
7. **Production migration 実行者**が確定  
8. **postflight 検証者**が確定  
9. **ライブ smoke** は **別承認**であることが明文化されている  
10. **サポート / 返金 / 法務**ルート（`/support`, `/legal/*`）が利用可能であることが確認済み  

## NO-GO criteria（いずれかで停止）

- Production DB **接続先が不確実**（Shadow と取り違え等）  
- **env / `whsec` の不一致**疑い  
- **`service_role` の RPC EXECUTE** 欠落（preflight で未解消）  
- **RPC 欠落**または **ledger 必須列欠落**  
- **`stripe_processed_events` の重複 / index リスク**が未解消  
- **法務・サポート導線**が利用不能  
- **rollback オーナー不在**  
- **メンテナンス窓なし**  

## Production apply sequence（将来の **明示最終 GO** 後のみ）

1. **`work/home-cluster` の現 checkpoint を凍結記録**（タグまたはチケット）  
2. **未処理のコード差分がない**ことを確認  
3. **Production preflight** — PASS のみ次へ  
4. **migration candidate** — **preflight PASS のみ**  
5. **postflight**  
6. **ログ / schema / reload** 確認  
7. **アプリ deploy / `main` 整合** — **別手順・別オーナー**で DB PASS 後のみ  
8. **ライブ smoke** — **別承認**  

## Rollback / recovery（意思決定）

- **ライブ決済前:** 停止し、**Checkout 表面を露出しない**判断が取れること  
- **ライブ決済後:** **Checkout 表面停止**、Stripe 側確認、**二重付与を増やさない**、**返金・サポート導線**を案内可能であること  
- **Stripe イベントの盲再送・一括 replay は禁止**（運用 SSOT）  

## Production で実行してはいけないもの

- `scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql`  
- **Shadow/Test 専用の手動 backfill**  
- **レビューされていない DML**  

## Next phase

- **Phase 5-6** — **明示最終 GO 後**の Production apply **実行のみ**  
- または **Phase 5-5B** — 上記 NO-GO に該当する **ブロッカー解消ハードニング**  

## Related

- `docs/ssot/M55_PHASE5_4_PRODUCTION_APPLY_PLANNING_FINAL_GO_GATE_2026-05-13.md`  
- `docs/ssot/M55_PHASE5_3_PRODUCTION_DB_RPC_PACKAGE_APPROVED_2026-05-12.md`  
- `docs/ssot/M55_SYSTEM_SSOT.md`  
