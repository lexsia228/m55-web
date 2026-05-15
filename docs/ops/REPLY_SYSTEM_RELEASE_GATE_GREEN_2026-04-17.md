# REPLY SYSTEM Release Gate Green Record (2026-04-17)

## 目的
- 返書導線 A〜G が release gate green に到達した時点の固定基点を明文化し、以後の運用・障害対応・検証判断の共通参照点を提供する。

## Green 到達日
- 2026-04-17

## 固定基点
- branch: `work/home-cluster`
- commit: `4f04553`
- tag: `snapshot-reply-release-gate-green-2026-04-17`

## 通過フロー（A〜G）
- A: webhook 受信
- B: wallet 付与
- C: consume
- D: result 生成・表示
- E: history 参照
- F: replay 実行
- G: wallet 0件ガード

## Runtime で確認できたこと
- `webhook -> wallet付与 -> consume -> result -> history -> replay -> wallet 0件ガード` を実行系で確認済み。
- non-prod 限定 bypass が存在し、検証系の再現性を担保できる。
- `smoke_user_reply_*` 系データは cleanup 未実施で保持中（監査証跡として維持）。

## 未解決事項
- 未解決事項なし（release gate green 判定時点）。

## 運用上の固定方針
- この基点（commit/tag）を壊す変更を行わない。
- 変更が必要な場合は、本基点との差分理由・影響範囲・ロールバック手段を事前に明記する。
- 障害時の一次切り分けは runbook を優先し、憶測での修正を禁止する。
