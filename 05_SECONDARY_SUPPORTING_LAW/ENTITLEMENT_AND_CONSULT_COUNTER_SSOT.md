# M55 Web Entitlement and Consult Counter SSOT

Status: DRAFT FOR FREEZE
Mode: state law
Scope: release-night MVP, Wave A ownership continuity, later refill commerce

## 1. Objective

M55 must never show ambiguous ownership or ambiguous consult availability.

This SSOT defines the state machine for:
- DTR ownership
- report visibility
- AI consult remaining count
- refill visibility
- support escalation

This SSOT does not change route meaning or current price freeze.
It only defines how entitlement state must be represented.

## 2. Core rule

Consult count is tied to the owned DTR artifact or owned DTR family.

The UI must not show a generic “AI chat remains: N” without clarifying what it belongs to.

Every owned DTR card must show:
- entitlement state
- report availability state
- consult remaining count for that DTR
- next action

## 3. State model

### A. unowned
Meaning:
- user has not purchased the DTR

UI:
- no ownership card
- optional calm upsell only on appropriate pages
- no fake consult counter

### B. payment_pending
Meaning:
- checkout completed or initiated, but ownership not yet reflected

UI:
- report not yet open
- consult counter not yet active
- message: reflection is being confirmed
- primary action: go to My Page / support if delayed

### C. owned_report_available_consult_1
Meaning:
- DTR owned
- report visible
- one consult use available

UI:
- report open CTA
- “このDTRの相談残り 1 回”
- explanation that consult applies to this DTR
- support path visible

### D. owned_report_available_consult_0
Meaning:
- DTR owned
- report visible
- included consult already used

UI:
- report remains readable
- “このDTRの相談残り 0 回”
- refill zone may appear if refill product is enabled
- support path visible

### E. refill_available
Meaning:
- consult is 0
- refill product/page is enabled for this owned DTR

UI:
- show refill CTA
- clearly mark as additional consult top-up
- do not imply report is repurchased

### F. support_exception
Meaning:
- user expected entitlement but state is inconsistent

UI:
- support-first recovery card
- statement recognition / duplicate charge / delayed reflection guidance
- no blame tone

## 4. DTR-scoped counter law

Consult count must be displayed per DTR item, not only globally.

Required structure on My Page ownership card:
- DTR title
- ownership state
- report CTA
- consult remaining count
- refill CTA or refill guidance
- support / refund / contract links where relevant

## 5. Current release freeze

Current release purchase meaning:
- DTR report × 1
- AI consult × 1 use

This meaning must appear consistently on:
- /dtr/lp
- /purchase/success
- /my

## 6. Refill law

Refill is a secondary commerce lane.
It must never overpower the primary first-release lane.

Refill is:
- additional consult top-up
- attached to an owned DTR or owned DTR family
- calm, secondary, and explicit

Refill is not:
- a second hidden subscription
- a repurchase of the report
- a generic AI chat unlock across all surfaces unless separately frozen

## 7. Visibility law

On /dtr/lp:
- if user is unowned, show included consult meaning
- do not show fake remaining count

On /purchase/success:
- show that report ownership will appear in My Page
- show that included consult count belongs to the purchased DTR
- primary action: go to My Page

On /my:
- show DTR-scoped ownership summary
- show DTR-scoped consult remaining count
- show refill state if relevant

## 8. Data contract

Future implementation must support a structure equivalent to:
- dtr_id
- title
- owned_state
- report_state
- consult_remaining
- refill_available
- last_updated_at

The UI must be designed around this shape now.

## 9. Copy law

Allowed:
- “このDTRの相談残り 1 回”
- “このDTRの相談残り 0 回”
- “追加相談の導線がここに表示されます”
- “反映を確認中です”

Not allowed:
- generic “無限相談”
- misleading scarcity
- pressure-based refill prompts
- ambiguous “チャット可能” without remaining count

## 10. Freeze summary

M55 entitlement must be represented as:
- owned DTR
- readable report
- DTR-scoped consult remaining count
- refill only after consult reaches 0
- support path for mismatches
