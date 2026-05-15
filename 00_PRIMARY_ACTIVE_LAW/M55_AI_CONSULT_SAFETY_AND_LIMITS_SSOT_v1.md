# M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGHEST
Scope: consult input/output limits / sanitizer / safety blocks / FAQ / counter text
Intent: AI相談の文字数・安全・消費条件・UI counter を唯一の内部標準として固定する

---

## 0. Executive judgment

AI相談は長文生成競争ではない。  
**report に対する有限の clarification channel** として、文字数と安全を固定する。

---

## 1. Input rules

### 1.1 Input length
- minimum input length: `10 chars`
- soft warning threshold: `450 chars`
- hard maximum: `500 chars`

### 1.2 Input handling
- under minimum: reject with calm guidance
- over warning: show soft counter warning
- over maximum: block send until shortened

### 1.3 Input purpose
User input is for clarification of owned report only.

Forbidden purposes:
- generic public free chat replacement
- crisis monetization trigger
- spam / repeated dump
- adversarial prompt injection attempt to escape room scope

---

## 2. Output rules

### 2.1 Output length
- target output: `700〜900 chars`
- hard cap: `1000 chars`

### 2.2 Output style
- concise but sufficient
- tied to owned report context
- no dramatic prophecy wording
- no optimization / guaranteed outcome wording
- calm / safe / readable

### 2.3 Output scope
Allowed:
- clarification
- emphasis
- interpretation bridge
- next-step reflection

Forbidden:
- completely new unrelated reading
- public-lane generic coaching replacement
- unbounded long essay mode

---

## 3. Sanitizer model

### 3.1 Two-layer sanitizer
A. mild inappropriate language  
B. high-risk language

### 3.2 Mild inappropriate handling
- replace sensitive span with `※※※` where needed
- show calm note
- allow send
- consume ticket normally if message is accepted and answered

### 3.3 High-risk handling
- block send
- do not consume ticket
- show safe guidance if appropriate
- do not leak internal block list in UI

---

## 4. Safety hard rules

### 4.1 No crisis monetization
If user context is high-risk / crisis-like:
- suppress commercial CTA
- block consult consumption if needed
- provide safe neutral guidance path

### 4.2 No false claims
Forbidden:
- 100% safe
- guaranteed privacy claim beyond actual implementation
- medical / legal / financial certainty framing
- outcome guarantee wording

### 4.3 No data overclaim
Do not say:
- every message is stored forever
- system knows everything
- perfect memory or perfect security

---

## 5. Ticket consumption alignment

Ticket consumes only when all are true:
- message passes validation
- message is not high-risk blocked
- reply is successfully committed to thread

Ticket does not consume when:
- block before send
- server fail before commit
- duplicate request rejected
- ownership / room mismatch fail

---

## 6. UI / FAQ copy obligations

### 6.1 Required counters
UI must expose:
- remaining count
- total count
- input char counter
- warning at 450
- disabled state at 500+

### 6.2 FAQ topics required
FAQ / terms must explain:
- one consult is one accepted question and one AI reply
- output target length is bounded
- room is tied to purchased report
- thread has max 3 consults
- blocked high-risk input does not consume a ticket

### 6.3 Tone rule
FAQ / terms wording must be:
- explicit
- short
- non-threatening
- non-manipulative

---

## 7. Technical enforcement notes

- client counter is advisory only
- server validation is source of truth
- hard cap applies server-side
- sanitizer decisions must be auditable
- ticket consumption must be idempotent

---

## 8. Relationship to product law

- product quantity and inclusion are defined in `M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1`
- room state and thread cap are defined in `M55_REPORT_CONCIERGE_ROOM_SSOT_v1`
- timeline eligibility is defined elsewhere and must not be inferred here

---

## 9. Final command

AI相談は無限の雑談ではない。  
**owned report に対する有限の clarification channel** である。  
そのための文字数・安全・消費条件を、本書で固定する。
