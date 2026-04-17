# REPLY Non-Prod Bypass Note v1

## 目的
- non-prod 検証で利用する bypass 条件を固定し、production への誤適用事故を防止する。
- 固定基点: commit `4f04553`, tag `snapshot-reply-release-gate-green-2026-04-17`

## 事実（固定）
- middleware に non-prod 限定 bypass が存在する。
- production では有効化されない。

## 適用条件（全て満たす場合のみ）
- `NODE_ENV !== 'production'`
- 対象パスが以下のいずれか:
  - `/reply`
  - `/reply/result`
  - `/api/reply/history`
  - `/api/reply/session/*`
- リクエストヘッダ `x-m55-test-user-id` が必須

## production で効かないこと
- `NODE_ENV === 'production'` では bypass は無効。
- production での 403/404 切り分けに bypass 前提を持ち込まない。

## 用途制限
- 検証専用機構であり、運用ショートカット用途で使わない。
- 障害時の暫定回避として production 挙動に影響させない。

## 触る時の注意（本番事故防止）
- 条件変更時は必ず peer review を通し、変更理由と撤回手順を記録する。
- 影響対象パスを増やす場合は、運用責任者合意と検証計画を必須化する。
- 本番相当検証では bypass 依存ケースと非依存ケースを分離して実施する。

## 将来削除タイミング
- E2E 検証基盤またはテスト用認可導線が整備され、bypass なしで同等の検証再現性が確保できた時点。
- 削除時は runbook と検証手順書を同時更新し、旧手順を廃止する。
