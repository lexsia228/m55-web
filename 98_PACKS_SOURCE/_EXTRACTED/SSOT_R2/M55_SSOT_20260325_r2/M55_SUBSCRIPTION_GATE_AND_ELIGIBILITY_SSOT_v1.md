# M55_SUBSCRIPTION_GATE_AND_ELIGIBILITY_SSOT_v1

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGHEST
Scope: subscription-based eligibility / stored-history gate / supersession of old independent Personal DTR clause
Intent: static report と timeline/history-dependent DTR の購入条件を分離し、保存価値を M55 の moat として固定する

---

## 0. Executive judgment

M55 の moat は、単発 report ではなく
- 保存
- 履歴
- 比較
- 時間軸
である。

したがって、すべての DTR を独立販売しない。
分離はこう固定する。

- static entry report = independent purchase allowed
- static compatibility report = independent purchase allowed
- timeline/history-dependent DTR = active eligible subscription + sufficient stored history required

---

## 1. Scope of this SSOT

This SSOT governs:
- who may purchase which DTR family
- when stored history is mandatory
- which older clause is superseded
- what subscription means commercially

This SSOT does not govern:
- public surface layout
- consult room price
- detailed timeline data thresholds

---

## 2. Current public surface vs next-layer rail

### 2.1 Current public truth
Current home hero lane remains:
- Free
- `¥1,000 Entry Report`

### 2.2 Next-layer rail
Next monetization rail may include:
- `Standard subscription ¥680 / month`

Rule:
- Standard is not the current public hero
- Standard is not current home co-hero
- Standard exists as the next eligibility rail for timeline/history-dependent DTR

### 2.3 Deferred historical tier
- `Premium` remains historical / deferred
- Premium must not be treated as current next-surface requirement
- Premium may return only via later appendix / future product law

---

## 3. Product family eligibility split

### 3.1 Entry Report
- category: static
- timeline usage: none
- stored history dependency: none
- purchase eligibility: public / non-subscriber allowed
- subscription requirement: none

### 3.2 Compatibility Report
- category: static pair/synastry
- timeline usage: none by default
- stored history dependency: none by default
- purchase eligibility: public / non-subscriber allowed
- subscription requirement: none

### 3.3 Timeline / History-dependent DTR
- category: dynamic-or-personal extension using time axis
- timeline usage: required
- stored history dependency: required
- purchase eligibility: subscribers only
- subscription requirement: active Standard minimum
- public display state: HOLD / not current home hero surface

### 3.4 Deep timeline extensions
Future extension may require stricter gate.

Candidate:
- Premium required
- longer history window required
- tarot-linked / comparative / long-range reading required

This is not current public truth.  
Do not surface this in current build without later appendix.

---

## 4. Meaning of subscription

Subscription does **not** mean:
- better truth
- stronger destiny
- more accurate result
- different calculation engine

Subscription means:
- saved history
- revisitability
- timeline eligibility
- comparative reading eligibility
- accumulated observation structure

---

## 5. Stored history as eligibility rail

### 5.1 Hard rule
If a DTR requires historySignals or longTermWindow,
purchase is not allowed unless:
- user has active eligible subscription
- minimum stored history requirement is satisfied

### 5.2 Why
Reason is not “quality upsell”.  
Reason is **product成立条件**.

Without stored history:
- no valid comparison base
- no timeline continuity
- no accumulated pattern object
- no legitimate time-axis reading

---

## 6. Explicit supersession of old clause

This SSOT explicitly supersedes the following older practical reading:

`Personal DTR（恒久）- 購入：全プラン購入可 / サブスクと独立`

New interpretation:
- this old clause applies only to static independent report products explicitly marked as such
- it applies to Entry Report
- it applies to static Compatibility Report
- it does **not** apply to timeline/history-dependent DTR
- current build must not offer timeline/history-dependent DTR to non-subscribers

### 6.1 Narrow supersession
This supersession is narrow:
- does not remove already-purchased ownership permanence
- does not change static entry report public purchase
- does not change static compatibility report public purchase
- only changes eligibility for timeline/history-dependent DTR family

---

## 7. Standard gate baseline

### 7.1 Standard baseline
Standard can serve as minimum eligibility rail because it provides:
- 30-day retention
- recurring stored observations
- enough data for short-window pattern reading

### 7.2 Public implementation note
Current Web public surface does not have to show Standard purchase CTA yet.
This gate may remain internal law until next monetization layer is surfaced.

### 7.3 Pricing note
- `¥680 / month` is the preferred current candidate
- freeze this as next-layer rail candidate, not current public hero price copy

---

## 8. Forbidden implementations

- offering history-dependent DTR to anonymous / unsubscribed users
- saying subscription changes result quality
- showing timeline DTR as public hero SKU in current release
- reviving old multi-surface subscription shell in current Web build
- inferring eligibility from vague keys instead of canonical Layer1 facts

---

## 9. Required Layer1 facts

Eligibility evaluation must use canonical facts only.

Minimum:
- `purchase_entitlement_state`
- `retention_window_days`
- `dtr_ownership_type`
- `purchase_surface`
- `purchase_product_code`

Recommended future additions via policy/config:
- `subscription_state`
- `subscription_tier`
- `history_window_days_actual`
- `history_points_count`

Until such fields are formally added, do not guess.  
Fail closed.

---

## 10. Relationship to business model

Public cash engine:
- `¥1,000 static Entry Report`

Next one-time expansion:
- `¥2,000 static Compatibility Report`

Retention / moat engine:
- `Standard subscription ¥680 / month` for save / revisit / history

Next monetization layer:
- `¥1,000 timeline/history-dependent DTR` gated by Standard + stored history

Thus M55 is not merely “selling reports”.  
M55 is selling **accumulated meaning and time-axis readability**.

---

## 11. Final command

旧「全DTR独立販売」解釈はここで狭義に止める。  
**独立販売できるのは静的な入口レポートと静的な相性レポートのみ。  
時間軸DTRは、Standard rail と stored history が成立条件である。**
