# M55_IMPLEMENTATION_AUTHORITY_PLACEMENT_20260325_v1

Status: READY-FOR-CURSOR
Purpose: 現行 authority を最短手順で配置し、3本実装SSOTを固定し、旧法の誤輸入を防いだうえで `/core` binding 再開へ戻すための配置指示書。

---

## 0. One-line rule

今やることは **新規アイデア出し** ではない。  
**authority 配置 -> 実装SSOT 3本固定 -> 旧法注記 -> `/core` binding 再開** の順で閉じる。

---

## 1. 00_PRIMARY_ACTIVE_LAW

このフォルダには **current Web 実装に直結する現行法** のみを置く。

### Placement list
- M55_CANONICAL_IO_CONTRACT_SSOT_v1.md
- M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md
- M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md
- M55_LOGIC_LAYERED_INTEGRATION_PACKAGE_SSOT_20260323_v1.md
- M55_MONETIZATION_SSOT_FULL_FREEZE_v1_0.md
- M55_LAYER3_VOCABULARY_AND_NARRATIVE_PACK_SSOT_v1.md
- M55_GOLDEN_VECTOR_AUDIT_1983_02_28_SSOT_v1.md
- M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1.md
- M55_REPORT_CONCIERGE_ROOM_SSOT_v1.md
- M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md
- M55_MAIN_PAGE_HOOK_AND_INFORMATION_ARCHITECTURE_SSOT_v1.md
- M55_FREE_RESULT_AND_SYSTEM_RULE_EXPOSURE_SSOT_v1.md
- M55_ENTRY_REPORT_VISUAL_PDF_BLUEPRINT_SSOT_v1.md

### Boundary
- old Free / Standard / Premium public surface を current Web に戻さない
- subscription-first public UI を current hero に戻さない
- current public line is only: `free -> entry report -> purchaser-only concierge room`

---

## 2. 20_PRODUCT_RULES_FUTURE

このフォルダには **将来候補だが設計は先に固定しておく法** のみを置く。

### Placement list
- M55_SUBSCRIPTION_GATE_AND_ELIGIBILITY_SSOT_v1.md
- M55_TIMELINE_DTR_REQUIREMENTS_SSOT_v1.md

### Boundary
- `Standard ¥680` は eligibility rail であり current public hero ではない
- timeline/history-dependent DTR は current purchase lane の co-hero ではない
- future rail を Home の中心導線に混ぜない

---

## 3. Fixed implementation trio

この3本は、ここで **PRIMARY ACTIVE** として固定済み。
- M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1.md
- M55_REPORT_CONCIERGE_ROOM_SSOT_v1.md
- M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md

### Why these three close the current build
- 商品構造
- purchaser-only 相談室
- 文字数 / safety / 消費条件

この3本が閉じることで、Entry Report 実装と room 実装の判断が漂わなくなる。

---

## 4. Required old-law note

旧 `M55_MONETIZATION_SSOT_FULL_FREEZE_v1_0.md` の
`Personal DTR = 全プラン購入可 / サブスク独立`
という広すぎる読みは、**timeline family には不適用** と注記する。

### Correct narrowed reading
- static Entry Report: independent purchase allowed
- static Compatibility Report: independent purchase allowed
- timeline/history-dependent DTR: subscription + stored history required

---

## 5. `/core` binding restart gate

以下が揃ったら `/core` binding を再開してよい。
- primary placement 完了
- trio fixed 完了
- old-law note 完了

そこで初めて `/core` に canonical `essence` を差し込む。
binding の順序は固定:
`/core -> /today -> /weekly -> /my -> ownership`

---

## 6. Cursor safety sentence

毎回必ず添えること:

`Compatibility is next expansion, not current hero. Standard ¥680 is eligibility rail, not current public hero. Timeline family is future-gated, not current home co-hero.`

