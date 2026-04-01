# M55 Golden Vector Audit Manifest

- **contractVersion**: io-v1.0
- **engineVersion**: logic-v1.0.0
- **m55RepoRoot**: C:\M55_PHASE2_5HOLY_ARTIFACTS_FROZEN_2026-02-15_v1_0_1\M55_FULLMERGE_WITH_AUDIT_GATE_v2_1_1_FROZEN_2026-02-15\m55_web_projectB
- **golden input**: birthDate=1983-02-28, nickname=T, locale=ja-JP, nowDate=2026-03-23
- **generator**: generate-golden-evidence.mjs → canonical Layer2 + display mapper

## essence
- safety forbidden leak: none
- raw determinism: PASS
- display determinism: PASS
## today
- safety forbidden leak: none
- raw determinism: PASS
- display determinism: PASS
## weekly
- safety forbidden leak: none
- raw determinism: PASS
- display determinism: PASS
## dtr
- safety forbidden leak: none
- raw determinism: PASS
- display determinism: PASS

## Layer1 truth (sample static ownership)
```json
{
  "purchase_product_code": "dtr_core_static_v1",
  "ingest": {
    "DTR_CORE_STATIC_V1": "dtr_core_static_v1",
    "dtr_single_v1": "dtr_core_static_v1"
  },
  "dtr_ownership_type": "static",
  "owned_dtr_state": "static",
  "purchase_entitlement_state": "owned",
  "dtr_unlock_state": "owned",
  "retention_window_days": null,
  "dtr_expires_at": null,
  "dynamic_example": {
    "note": "If dynamic: derived_expires_at_ms = t0_ms + N*86400000; stored must equal ISO instant",
    "last_purchase_at_example": "2026-03-23T10:00:00.000Z",
    "retention_window_days": 30,
    "derived_expires_at_ms": 1776852000000
  }
}
```