# REPLY SYSTEM FINAL OPERATIONS SUMMARY v1

## 1. 現在地
- 返書システムは release gate green 到達済み。
- 固定基点（システム）:
  - `commit: 4f04553`
  - `tag: snapshot-reply-release-gate-green-2026-04-17`
- 運用 docs 固定基点:
  - `commit: 2b641ed`
  - `tag: snapshot-reply-ops-docs-2026-04-17`

## 2. システムの流れ
- 購入: Stripe Checkout 完了。
- fulfillment: webhook で購入確定イベントを受信。
- wallet 付与: 購入分を wallet に加算。
- `/reply` 入力: ユーザーが相談内容を入力。
- generate: 返書生成 API を実行。
- consume: 生成時に利用枠を 1 消費。
- result: 生成結果を表示。
- history 再閲覧: 既存結果を履歴 API から再取得。

## 3. 日常運用でまず見る場所
- テーブル（先に確認）:
  - `reply_ticket_wallets`
  - `reply_wallet_ledgers`
  - `reply_documents`
- API/実装（次に確認）:
  - `app/api/reply/generate/route.ts`
  - `app/api/stripe/webhook/route.ts`
  - `app/api/reply/history/route.ts`
  - `app/api/reply/session/[replySessionId]/route.ts`

## 4. よくある問い合わせの確認順
- 購入したのに使えない
  - `reply_ticket_wallets` で `available_count` と `status` を確認。
  - `reply_wallet_ledgers` で purchase 由来 grant の有無を確認。
  - `app/api/stripe/webhook/route.ts` 付近の webhook 到達/遅延を確認。

- `/reply` で 403
  - まず production/non-prod を確認（bypass 前提の誤判定を除外）。
  - `app/api/reply/session/[replySessionId]/route.ts` と関連ガードの拒否条件を確認。
  - user_id と対象 session の不一致がないかを確認。

- 結果が見つからない
  - `reply_documents` で対象 `user_id`/session の存在を確認。
  - `app/api/reply/generate/route.ts` の生成完了有無を確認。
  - 生成済みなら参照先 session ID の取り違えを確認。

- history が空
  - `reply_documents` に対象ユーザーのレコードがあるか確認。
  - `app/api/reply/history/route.ts` の抽出条件を確認。
  - consume 済みで document なしなら生成フロー側を優先確認。

- replay / 二重消費疑い
  - `reply_wallet_ledgers` を時系列で見て consume 重複有無を確認。
  - `reply_documents` と session の対応を突合。
  - `app/api/reply/generate/route.ts` の再実行条件を確認。

## 5. non-prod bypass の注意
- 本番では効かない（production 無効）。
- 検証専用。運用ショートカット用途で使わない。
- 条件:
  - `NODE_ENV !== 'production'`
  - `/reply`, `/reply/result`, `/api/reply/history`, `/api/reply/session/*`
  - `x-m55-test-user-id` 必須

## 6. cleanup 方針
- `smoke_user_reply_*` は現在は証跡として保持。
- cleanup は必要時のみ実施。
- 詳細手順と SQL は cleanup guide を参照。

## 7. 参照先
- `docs/ops/REPLY_SYSTEM_RELEASE_GATE_GREEN_2026-04-17.md`
- `docs/ops/REPLY_RUNTIME_OPERATIONS_RUNBOOK_v1.md`
- `docs/ops/REPLY_NON_PROD_BYPASS_NOTE_v1.md`
- `docs/ops/REPLY_TEST_DATA_CLEANUP_GUIDE_v1.md`
