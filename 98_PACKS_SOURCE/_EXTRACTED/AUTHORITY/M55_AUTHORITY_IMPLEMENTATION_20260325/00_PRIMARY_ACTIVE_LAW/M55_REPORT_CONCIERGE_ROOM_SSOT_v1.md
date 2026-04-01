# M55_REPORT_CONCIERGE_ROOM_SSOT_v1

AUTHORITY: PRIMARY ACTIVE
Status: ACTIVE-FOR-IMPLEMENTATION
Priority: HIGHEST
Scope: purchaser-only consult room / per-report thread / consult cap / read-only state / room-only add-on
Intent: 相談室の存在条件・上限・消費条件・表示状態を固定し、public lane 汚染と回数ドリフトを防ぐ

---

## 0. Executive judgment

相談室は public product ではない。  
相談室は **owned report にぶら下がる purchaser-only room** である。

---

## 1. Access and visibility

### 1.1 Visibility rule
- room is purchaser-only
- room is hidden from public main lane
- room tab appears only after eligible report ownership exists

### 1.2 Ownership condition
room access requires all:
- report ownership = owned
- report reader access = granted
- consult entitlement or readable thread history exists

### 1.3 Scope of room
- one room thread per owned report
- report thread is not shared across different reports
- thread belongs to one ownership object only

---

## 2. Thread rules

### 2.1 One report, one thread
- each report owns exactly one consult thread
- no multi-report merged thread
- no generic public chat fallback

### 2.2 Opening state
Default on report purchase:
- thread exists
- consult_credits_total = 1
- consult_credits_remaining = 1
- thread state = writable

### 2.3 Max ceiling
- max consult per report thread = 3
- included consult = 1
- max additional top-up count = 2

### 2.4 After ceiling reached
When remaining credits = 0 and total credits reached 3:
- thread becomes read-only
- prior messages remain visible
- new input is disabled
- CTA may point to next report purchase, not to public generic chat

### 2.5 Next-report CTA rule
When surfaced in later phases, CTA may point to:
- next eligible Entry-like report
- Compatibility Report
- eligible timeline DTR if subscription + history conditions are satisfied

CTA must not point to:
- public generic AI chat
- standalone consult shop
- fake urgency refill page

---

## 3. Add-on rule

### 3.1 Add-on nature
- add-on is room-only
- add-on is report-bound
- add-on is not transferable
- add-on is not a public standalone SKU

### 3.2 Add-on purchase lane
Allowed purchase location:
- inside owned report room only

Forbidden:
- Home
- report teaser public lane
- general pricing page
- public hero CTA area

### 3.3 Add-on count rule
- one add-on purchase increases consult credits by 1
- maximum additional purchases per report thread = 2
- no hidden extra beyond cap
- no refill after total reaches 3

### 3.4 Price handling
This SSOT does **not** freeze add-on price.

Rule:
- room behavior is fixed here
- price is deferred to commerce config / later pricing appendix
- `¥700` may exist as an internal candidate only
- no public copy may imply final price until separate price authority exists

---

## 4. Ticket consumption rule

### 4.1 Consumption trigger
Ticket is consumed when:
- user sends a valid message
- server accepts message
- AI response is successfully returned to thread

### 4.2 Non-consumption cases
Ticket is not consumed when:
- blocked high-risk input
- validation fail
- system failure before accepted response
- duplicate accidental submission rejected by server

### 4.3 Sanitizer interaction
- mild sanitizer replacement: consume normally
- high-risk block: do not consume
- fail-safe copy must be calm and explicit

---

## 5. UI state model

### 5.1 Required counters
UI must show:
- consult_credits_remaining
- consult_credits_total
- current thread writable / read-only state
- input char counter

### 5.2 Read-only state wording
When cap reached:
- explain that this report thread has reached its consult limit
- keep prior thread readable
- disable new question input
- avoid urgency / shame / failure wording

### 5.3 No manipulative UI
Forbidden:
- countdown
- flashing refill banner
- fake low-stock
- `今だけ追加`
- `最後の1枚` style pressure

---

## 6. Relationship to other law

- product definition is governed by `M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1`
- char limits / safety rules are governed by `M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1`
- subscription gate for timeline DTR is governed by `M55_SUBSCRIPTION_GATE_AND_ELIGIBILITY_SSOT_v1`

---

## 7. Canonical state mapping

Minimum required Layer1 mapping:
- `consult_credits_remaining`
- `consult_credits_total`
- `purchase_entitlement_state`
- `dtr_unlock_state`
- `purchase_surface`
- `purchase_product_code`

Do not infer from non-canonical aliases.

---

## 8. Final command

相談室は finite channel である。  
**report に付随し、3回で閉じ、次の商品へ橋を渡す。**
