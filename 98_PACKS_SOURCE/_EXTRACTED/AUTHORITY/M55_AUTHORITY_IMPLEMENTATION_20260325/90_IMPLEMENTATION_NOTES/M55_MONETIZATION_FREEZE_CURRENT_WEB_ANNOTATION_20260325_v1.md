# M55_MONETIZATION_FREEZE_CURRENT_WEB_ANNOTATION_20260325_v1

Status: READY-FOR-CURSOR
Purpose: 旧 monetization freeze を current Web に誤輸入しないための注記。原文は保持しつつ、current build に必要な狭義解釈だけを固定する。

---

## 0. Why this note exists

`M55_MONETIZATION_SSOT_FULL_FREEZE_v1_0.md` は Layer1 reference として依然有効である。  
ただし、そのまま読むと current Web public truth と衝突する条文がある。

最重要衝突は以下。
- `Personal DTR = 買い切り・恒久（サブスクと独立）`

この文言は static family には使えるが、timeline/history-dependent DTR にまで広げて読ませてはいけない。

---

## 1. Narrowed interpretation

### Still valid as Layer1 reference
- Standard `¥680`
- Premium `¥1,980`
- `No Ads / No Score / No Rank`
- 支払いの意味は「深さ・保存・再訪性」

### Narrowed for current build
`Personal DTR independent purchase` の読みは、以下に限定する。

Allowed:
- static Entry Report
- static Compatibility Report

Not allowed:
- timeline DTR
- history-dependent DTR
- past/future axis DTR
- any DTR using `historySignals` or `longTermWindow`

---

## 2. Superseding authority

以下が current build では優先する。
1. M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1.md
2. M55_SUBSCRIPTION_GATE_AND_ELIGIBILITY_SSOT_v1.md
3. M55_TIMELINE_DTR_REQUIREMENTS_SSOT_v1.md

If conflict exists, these supersede the broad reading of the old freeze clause.

---

## 3. Public-surface consequence

- `Standard ¥680` is eligibility rail, not current home hero
- `Premium` is deferred
- timeline/history-dependent DTR is not current home co-hero
- current public line remains:
  `Free -> ¥1,000 Entry Report -> purchaser-only concierge room`

---

## 4. Exact note to attach near the old clause

`Annotation (2026-03-25): The broad interpretation of "Personal DTR is independently purchasable" does not apply to the timeline / history-dependent family in the current Web build. Any DTR that uses stored history, historySignals, or longTermWindow requires the applicable subscription + stored history gate defined in the newer eligibility and timeline requirement SSOTs.`

