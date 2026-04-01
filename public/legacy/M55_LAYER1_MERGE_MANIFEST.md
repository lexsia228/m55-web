# M55 Command Center HQ + Layer1 Contracts (Merged)

**FREEZE:** 2026-01-31 (JST)  
**Base Phrase:** 絶対に大丈夫！

This archive is a **merge** of:
- Command Center HQ (audited patch fix1)
- Layer1 Contracts bundle (policies + docs)

## What was merged

### 1) Layer1 Policies (Contract Sources of Truth)
Location: `./policies/`
- `m55_entitlements_v1_0.json`
- `m55_retention_v1_0.json`
- `m55_dtr_cooldowns_v1_0.json`

**Rule:** Counts / retention / grants / cooldowns must be justified ONLY by these policies.  
Any other source is a violation.

### 2) Layer1 Documentation
Location: `./docs/layer1_contracts_bundle_v1_0/`

### 3) Audit Gate
Location: `./ci/prebuild_guard.sh`  
Extended to ensure:
- policies exist and contain required keys
- forbidden legacy artifacts are absent (e.g., `m55_name_analysis.js`)
- expected SHA-256 for the allowed logic JSON is consistent
- background NoTouch / NoLoop / NoBadge violation patterns are mechanically blocked

## How to run the audit gate
```bash
bash ./ci/prebuild_guard.sh
```
If it exits non-zero, the bundle must be treated as **FAIL / non-deployable**.
