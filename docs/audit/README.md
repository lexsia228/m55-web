# docs/audit

This folder contains frozen, auditable runbooks and postmortems used as "emergency recovery manuals" for M55 Web operations.

Rules:
- Keep documents in Markdown (text) whenever possible.
- Do not store secrets (tokens/keys) in this folder.
- Treat these docs as operational SSOT references during incident response and review-freeze periods.

## Key documents (2026-03-05 ingest 版)

### Prototype Gate（最上位 SSOT）
- M55 Prototype Gate Master Usage (2026-03-05): `M55_Prototype_Gate_Master_Usage_2026-03-05.md`
- M55 Prototype Gate Postmortem & Reuse Playbook (v1.0): `M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md`

### Phase2 / Gate R 監査
- M55 Audit Checklist Final (2026-03-03): `M55_AUDIT_CHECKLIST_FINAL.md` — Gate R 35 項目チェック
- M55 Implementation Commands for Cursor (2026-03-03): `M55_IMPLEMENTATION_COMMANDS_FOR_CURSOR.md` — 分岐操作・機械チェック・PowerShell

### Ingest 索引（ローカル資産統合 2026-03-05）
- MANIFEST・INDEX・NOTES: `sources/ingest_2026-03-05/`
- SSOT 新規追加: `../ssot/M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md`, `../ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md`
