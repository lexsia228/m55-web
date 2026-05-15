# M55_GROWTH_EVENT_SCHEMA_SSOT_v1

AUTHORITY: SECONDARY SUPPORTING LAW
Status: READY-FOR-CURSOR
Priority: HIGH
Scope: event schema / funnel measurement / current hero tracking / future rail tracking / forecast note
Intent: product law を壊さずに M55 の growth instrumentation を固定する

---

## 0. Executive judgment

M55 は free-first であり、single-hero Entry を磨くモデルである。
したがって、growth event schema も current hero に合わせて最初に閉じる。

測定は product law を置き換えない。
測定は product law の改善判断のために存在する。

---

## 1. Mandatory interpretation note

Any benchmark, forecast, conversion scenario, ARPU assumption, or retention estimate used in growth planning is:
- forecast only
- reference only
- not live KPI
- not public marketing proof
- not implementation truth unless replaced by actual M55 measured data

This note is mandatory anywhere event data is compared with external market references.

---

## 2. Current funnel events

### 2.1 Home and input
- `view_home`
- `tap_start_free`
- `start_input`
- `complete_input`

### 2.2 Free result
- `free_result_generated`
- `free_result_viewed`
- `free_rule_block_viewed`
- `entry_cta_viewed`
- `entry_cta_clicked`

### 2.3 Purchase and report
- `entry_checkout_started`
- `entry_purchase_success`
- `entry_report_opened`
- `entry_report_page_turn`
- `entry_report_completed`

### 2.4 Concierge room
- `consult_room_opened`
- `consult_send`
- `consult_response_delivered`
- `consult_cap_warning_viewed`
- `consult_cap_reached`
- `consult_addon_offer_viewed`
- `consult_addon_purchased`

---

## 3. Future-layer events

This chapter is not current public hero measurement.
It is future-layer readiness only.

### 3.1 Compatibility future events
- `compatibility_interest_viewed`
- `compatibility_cta_clicked`
- `compatibility_checkout_started`
- `compatibility_purchase_success`

### 3.2 Standard rail events
- `standard_info_viewed`
- `standard_gate_hit`
- `standard_checkout_started`
- `standard_purchase_success`

### 3.3 Timeline family future events
- `timeline_gate_viewed`
- `timeline_not_eligible_viewed`
- `timeline_eligibility_earned`
- `timeline_report_purchase_success`

---

## 4. Event property minimums

### 4.1 Core properties
Each event should carry when available:
- `public_label`
- `internal_family_key`
- `surface`
- `scope`
- `product_code`
- `price_jpy`
- `is_current_hero`
- `is_future_candidate`

### 4.2 Current hero discipline
Current hero events must clearly mark:
- `public_label = Entry Report`
- `internal_family_key = dtr`
- `is_current_hero = true`

### 4.3 Future discipline
Future candidate events must not be mistaken for current home truth.
Mark them explicitly:
- `is_current_hero = false`
- `is_future_candidate = true`

---

## 5. KPI hierarchy

### 5.1 Current primary KPIs
- free-result completion rate
- entry CTA click-through rate
- entry purchase conversion rate
- entry report open rate
- consult room open rate
- consult completion rate

### 5.2 Current secondary KPIs
- free rule block visibility
- report completion rate
- consult cap reached rate
- add-on take rate

### 5.3 Future KPIs
- compatibility attach / purchase rate
- standard rail conversion rate
- timeline gate hit rate
- timeline eligibility conversion rate

---

## 6. Public-copy firewall

Growth data must never directly generate public hype copy such as:
- “most users buy this right now”
- “90% choose...”
- “people like you always...”
without explicit approved evidence and legal review.

---

## 7. Final command

Instrument the current hero first.
Measure future rails separately.
Do not let benchmark language become fake proof.

