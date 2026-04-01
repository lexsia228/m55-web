# M55_TIMELINE_DTR_REQUIREMENTS_SSOT_v1

AUTHORITY: FUTURE ACTIVE / NOT CURRENT HERO
Status: ACTIVE-FOR-FUTURE-PRODUCT-RULES
Priority: HIGH
Scope: timeline/history-dependent DTR technical and commercial requirements
Intent: longTermWindow / historySignals を使う DTR の成立条件を固定し、静的 report family と混線しないようにする

---

## 0. Executive judgment

Timeline DTR は、単にテーマが違う report ではない。  
**必要入力・必要履歴・比較軸が追加された別カテゴリ商品** である。

---

## 1. Category definition

Timeline / History-dependent DTR is any DTR that uses one or more of:
- `historySignals`
- `longTermWindow`
- retained observation logs
- past-vs-present comparison
- future interval interpretation
- cross-period pattern reading

If none of the above are used, it must not be labeled timeline DTR.

---

## 2. Static vs timeline separation

### 2.1 Static entry report
Required:
- `contextScope = dtr`
- `historySignals = null`
- `longTermWindow = null`

### 2.2 Static compatibility report
Required:
- `contextScope = dtr`
- pair/synastry inputs present
- `historySignals = null`
- `longTermWindow = null`

### 2.3 Timeline DTR
Required:
- `contextScope = dtr`
- `historySignals != null`
- `longTermWindow != null`

Fail if:
- timeline label is used while both are null
- static label is used while time-axis fields are non-null without spec support

---

## 3. Minimum requirement tiers

### 3.1 Tier T1 — short window timeline
Use case examples:
- recent flow
- weekly change pattern
- short comparative reading

Minimum requirement:
- active eligible Standard subscription minimum
- stored history window: `14 days minimum`
- valid history points: `7 minimum`

### 3.2 Tier T2 — standard timeline
Use case examples:
- monthly pattern
- recent accumulated shift
- repeated behavioral tendency

Minimum requirement:
- active eligible Standard subscription minimum
- stored history window: `30 days minimum`
- valid history points: `12 minimum`

### 3.3 Tier T3 — deep timeline
Use case examples:
- long-window trend
- cross-phase comparison
- premium-level timeline narrative

Minimum requirement:
- active eligible subscription
- stored history window: `90 days minimum`
- valid history points: `24 minimum`

Rule:
These thresholds are product-law defaults.
If later changed, update policy + migration note.

---

## 4. Required input object expectations

### 4.1 `longTermWindow`
Must at minimum define:
- start date
- end date
- window type
- timezone basis

### 4.2 `historySignals`
Must at minimum define:
- number of observations
- observation dates
- signal categories used
- completeness flag

### 4.3 Failure behavior
If required object is missing / malformed:
- timeline purchase lane must remain locked
- no guessed reading
- no silent downgrade to static without explicit product switch

---

## 5. Product meaning

Timeline DTR must answer questions that static report cannot legitimately answer.

Allowed examples:
- what has remained stable over recent observation
- what has shifted across stored periods
- what current phase is asking relative to previous phase
- where repeated tendency appears across retained data

Forbidden examples:
- merely rewriting static personality report with a timeline label
- selling a history-dependent promise without real stored history
- using future language without a declared time window

---

## 6. Purchase and display rule

- public home must not display timeline DTR as current hero SKU
- eligibility can be shown only after Standard + sufficient history exist
- locked state wording must explain that timeline reading requires accumulated saved data
- do not frame lock as punishment or scarcity

---

## 7. Relationship to subscription

Timeline DTR is downstream of Standard rail.
Standard provides:
- retention window
- stored comparisons
- future revisit path

Timeline DTR then monetizes that accumulated structure.

This is why timeline DTR is a moat product.

Premium-level timeline may exist later, but is not current public truth.

---

## 8. Relationship to tarot extensions

Tarot-linked timeline extensions may exist later.
If they do:
- tarot history becomes additional signal family
- no public promise until explicit addendum exists
- Premium-only gating is allowed but not current public truth

---

## 9. Required implementation states

At minimum, system must distinguish:
- static-eligible
- compatibility-eligible
- timeline-ineligible-no-subscription
- timeline-ineligible-not-enough-history
- timeline-eligible

No vague `maybe` state.

---

## 10. Final command

時間軸DTRは、保存データがあるから成立する。  
**Entry と Compatibility は静的。  
Timeline は Standard + history が揃ったときだけ開く。**
