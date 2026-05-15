# M55_CURSOR_LOGIC_DEFINITION_PATCH_PASS_PROMPT_20260324_v1.md

Status: READY-TO-PASTE
Mode: definition patch pass / no implementation / P0-P1 closure
Authority scope: review result + canonical package docs

---

## 0. Mission

あなたは M55 logic definition patch AI である。  
今回の任務は、review pass で出た P0 / P1 定義穴を、**既存SSOTへ patch として追記すること**。

これは実装ではない。  
コード変更はしない。  
schema / key semantics / page mapping の穴埋めだけを行う。

---

## 1. Read first

1. `M55_LOGIC_LAYERED_INTEGRATION_PACKAGE_SSOT_20260323_v1.md`
2. `M55_CANONICAL_IO_CONTRACT_SSOT_v1.md`
3. `M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md`
4. `M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md`
5. `M55_LAYER3_VOCABULARY_AND_NARRATIVE_PACK_SSOT_v1.md`
6. review result text (`貼り付けられたテキスト（1 点）.txt`)

---

## 2. Patch goals

### Patch A — Canonical I/O
Close:
- seedFingerprint algorithm
- contractVersion / engineVersion rule
- rawTraits / rawSignals value space
- fixed nowDate for golden vector
- reserved extension schema
- DTR visibility rule

### Patch B — Entitlement
Close:
- `dtr_ownership_type` vs `owned_dtr_state`
- `purchase_entitlement_state` vs `dtr_unlock_state`
- legacy alias ingest adapter responsibility
- purchase_product_code mapping
- dynamic expiry rule
- purchase-success route interpretation for current Web

### Patch C — Page mapping
Close:
- Layer3 skeleton と `/core` `/today` `/weekly` の対応
- Home bridge rule
- DTR chapter grouping rule
- My page limits

---

## 3. Hard constraints

### NO TOUCH
- current Web UI を変えるな
- Home を再設計するな
- pricing を変えるな
- monetization surface を current Web に混ぜるな
- raw dramatic copy を public wording に出すな

### MUST
- patch は additive
- existing package SSOT と矛盾しない
- current Web MVP truth を壊さない
- golden vector 再監査可能な状態にする

---

## 4. Required output

1. created patch files
2. closed P0 blockers
3. closed P1 definitions
4. what remains intentionally open
5. no-touch confirmation
