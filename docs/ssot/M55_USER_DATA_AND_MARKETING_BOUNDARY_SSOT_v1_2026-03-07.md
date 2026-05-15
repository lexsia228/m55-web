# M55 User Data and Marketing Boundary SSOT
**Status:** SSOT (Law)  
**Version:** v1.0 (2026-03-07 JST)  
**Territory:** Web/App shared data storage, AI-derived profile boundaries, analytics, messaging, and marketing usage rules  
**Purpose:** Define exactly what M55 may store, derive, analyze, and message — and what must never be mixed across product DB, AI systems, analytics, and marketing systems.

---

## 0. Core Principle
M55 wins by turning saved personal history into value for the user.
That does **not** mean all saved data may be freely reused everywhere.

Canonical rule:
- product data exists to improve the user's product experience
- analytics exists to measure product behavior
- messaging exists to support habit and trust
- marketing must use the minimum data needed and respect declared purpose boundaries

---

## 1. Canonical Data Layers
### 1.1 Product DB (Supabase / primary source of truth)
Allowed:
- user profile fields required for product function
- subscription / entitlement state
- relationship check-in records
- heart_log and related summaries
- DTR purchase / access records
- retention window state
- AI meter input/output state
- self memos used inside product experience

Not allowed:
- product DB is not the same as analytics export
- do not mirror entire raw product DB into third-party analytics tools

### 1.2 AI Derived Profile Store
Allowed:
- derived scores
- aggregated tendencies
- repeated themes
- reflection classifications
- continuity / rhythm features
- DTR comparison features

Preferred examples:
- clarity_score
- recovery_score
- social_load_score
- momentum_score
- consistency_score
- weekly_shift
- monthly_pattern

Not allowed:
- storing raw conversation transcripts here when only derived features are needed
- storing unnecessary direct identifiers when stable internal linkage suffices

### 1.3 Product Analytics (PostHog)
Allowed:
- event-level product interaction data
- anonymous or carefully minimized identifiers
- surface / section / card interaction metadata

Canonical current-phase allowed events:
- `hub_view`
- `view_retention_comparison`
- `view_plan_summary`
- `dtr_card_click`

Not allowed:
- free-text
- AI chat content
- email addresses
- raw sensitive identifiers unless explicitly approved by a later SSOT
- URL/query-derived context payloads
- DTR full content
- private self-memo bodies

### 1.4 Messaging / Digest Layer
Allowed:
- daily digest delivery state
- send timestamp
- open/click aggregate if later enabled lawfully
- safe digest snippets derived from product state

Not allowed:
- raw AI chat transcript in outbound email
- intimate free-text logs copied into marketing content
- fear-based or manipulative personal triggers

---

## 2. Current-Phase Analytics Boundary
### 2.1 Anonymous First
Current phase is anonymous-first.

Do not add in current phase:
- `identify()`
- email as analytics property
- raw Clerk user id in analytics payloads

### 2.2 Custom-Events-Only
Current phase analytics must be custom-events-only.
Default noisy collection must remain off.

### 2.3 Minimal Properties
Allowed minimal analytics properties:
- `tier`
- `has_monthly_dtr`
- `section`
- `card_type`
- `is_unlocked`
- `source_surface`

---

## 3. Marketing Boundary
### 3.1 Allowed Marketing Inputs
Marketing optimization may use:
- aggregated funnel conversion
- cohort-level retention
- aggregated section performance
- DTR card click tendencies by cohort or tier
- anonymous or pseudonymous behavior patterns

### 3.2 Disallowed Marketing Inputs
Do not use directly for marketing targeting in current phase:
- raw AI chat content
- raw self-memo text
- intimate relationship detail copied verbatim
- email + emotional-content fusion in analytics systems
- message content that impersonates certainty about another person

### 3.3 User Benefit Rule
Data use must be explainable as helping either:
- the user’s product experience, or
- product-level improvement in aggregate

If a use case cannot be explained cleanly, it should not be implemented.

---

## 4. Daily Digest Boundary
### 4.1 Product-Digest, Not Spam Newsletter
Daily email must be treated as a **personal product digest**, not a generic promotional blast.

### 4.2 Allowed Daily Digest Content
Allowed:
- current state summary
- continuity count (e.g. days logged this week)
- recent theme axis in abstract form
- reminder to continue the reflection streak
- calm CTA back to hub

### 4.3 Disallowed Daily Digest Content
Disallowed:
- raw AI chat logs
- raw intimate memo excerpts without explicit reason and clear value
- future prediction claims
- scare-based urgency
- “buy now or you will lose X” style language

---

## 5. My Page Boundary
My page remains a trust and records hub.
It is not an aggressive monetization wall.

Allowed:
- current plan
- records entry point
- data-handling / trust page links
- purchase history / store-management links
- calm settings and account controls

Disallowed:
- panic upgrade prompts
- exploitative pressure copy
- dark-pattern account flows

---

## 6. DTR Boundary
### 6.1 What DTR May Use
DTR may use:
- saved check-in history
- heart_log summaries
- weekly patterns
- retention-window comparisons
- self memo references within declared product use

### 6.2 What DTR May Not Claim
DTR must not claim:
- guaranteed future outcomes
- factual certainty about another person’s inner state
- supernatural cause/effect
- medical diagnosis

---

## 7. Identification Policy (Future)
If M55 later needs cross-session or cross-device analytics tied to a user:
- define a separate identification SSOT first
- prefer pseudonymous stable IDs
- do not default to email in analytics payloads
- do not connect intimate content to marketing identity without explicit lawful basis and product justification

Until then, remain anonymous-first.

---

## 8. Governance Rules
### 8.1 Separation Rule
Product DB, AI derived profile, analytics, and messaging must remain conceptually separate.

### 8.2 Review Rule
Any new event, new derived feature, or new outbound email field must be reviewed against this document before implementation.

### 8.3 Least-Data Rule
When two designs can work, the design using less sensitive data wins.

---

## 9. Canonical Success Condition
M55 succeeds when:
- users feel their saved data becomes a meaningful asset for themselves
- product analytics improves surface design without exposing private content
- messaging supports continuity without becoming manipulative marketing

M55 fails when:
- analytics becomes a shadow copy of intimate user content
- daily digest becomes a disguised fear campaign
- product trust is broken by data mixing

---

