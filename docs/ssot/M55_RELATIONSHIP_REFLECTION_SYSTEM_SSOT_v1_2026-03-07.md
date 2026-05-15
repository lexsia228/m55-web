# M55 Relationship Reflection System SSOT
**Status:** SSOT (Law)  
**Version:** v1.0 (2026-03-07 JST)  
**Territory:** Web/App shared daily check-in, weekly light summary, Deep Trend Report (DTR), and relationship-focused self-reflection surfaces  
**Purpose:** Replace fortune-telling / tarot product framing with a genuine non-divinatory relationship reflection system that preserves daily habit strength, data accumulation, and paid deep analysis value.

---

## 0. Constitutional Position
This document defines the non-divinatory replacement for legacy tarot-style interaction.

It does **not** relabel fortune telling. It defines a different product class:
- daily self-check-in
- relationship / attachment / stress reflection
- saved pattern analysis
- paid deep comparative reports

This SSOT inherits the following from earlier M55 laws and references:
- fail-closed behavior
- privacy-first storage discipline
- tap-only / low-friction ritual interaction
- reduced-motion respect
- non-aggressive wording
- saved-log continuity as user asset

Legacy tarot files may be used only as references for interaction quality, storage rigor, and daily ritual pacing — **not** as a semantic engine to be disguised.

---

## 1. Canonical Product Definition
### 1.1 Product Class
M55 is defined as:
**AI Relationship Reflection & Personal Pattern Tracking**

### 1.2 Core User Value
The primary value is not prediction.
The primary value is:
- capturing daily self-selected signals
- preserving those signals over time
- converting saved behavior + state into personal comparative insight
- surfacing weekly/monthly pattern change worth paying for

### 1.3 Core Revenue Thesis
The product sells:
1. habit continuity
2. stored self-history
3. deeper comparative interpretation of that stored self-history

The paid object is DTR:
**Deep Trend Report = deep comparative analysis over saved personal history**

---

## 2. Target Use Case
### 2.1 Primary Audience
Primary audience is users with high-intensity relationship / attachment / ambiguity concerns.
Examples:
- uncertainty in communication
- emotional overfocus on one person
- repeated rumination after contact or silence
- stress from mixed signals, distance, breakup, reconciliation attempts, jealousy, ambiguity

### 2.2 Allowed Product Positioning
Allowed:
- self-reflection
- relationship reflection
- emotional pattern tracking
- personal trend comparison
- daily check-in
- weekly reflection
- stress / clarity / recovery / momentum tracking

Not allowed:
- prophecy
- fate claims
- supernatural guarantee
- destiny control
- certainty language about another person's mind or future outcome

---

## 3. Canonical System Surfaces
### 3.1 Daily Check-in
A low-friction, repeatable daily ritual where the user selects a small set of current-state signals.

### 3.2 Weekly Light Summary
A free or lightly unlocked weekly recap showing trend direction, repeated themes, and continuity.

### 3.3 Deep Trend Report (DTR)
The paid deep report that compares saved history across time windows and themes.

### 3.4 Daily Digest
A quiet, personal revisit message that reminds the user of current state, recent continuity, and reason to return.

---

## 4. Canonical Input System
### 4.1 Replace Tarot With Check-in Signals
The canonical input is **not** tarot.
The canonical input is a **signal selection ritual**.

User chooses 1–3 items from a bounded set representing current relationship-relevant internal state.

### 4.2 Prompt Families
Prompt families may include:
- contact / distance
- emotional load
- clarity / confusion
- recovery / depletion
- self-worth / overfocus
- restraint / impulse
- hope / avoidance
- steadiness / volatility

### 4.3 Example Signal Vocabulary
Examples of allowed signals:
- 連絡を待ちすぎている
- 距離感が気になっている
- 気持ちを整理したい
- 今日は落ち着いている
- 判断を急ぎやすい
- 少し回復してきた
- 相手より自分を見たい
- 同じことを考え続けている

These are examples only. Final prompt library may evolve, but it must remain non-divinatory.

### 4.4 Input Session Constraints
- tap-first / low-friction
- 1 session should complete in 30–90 seconds
- one major daily check-in per day is acceptable as the default rhythm
- reduced motion must remain supported
- no gambling / randomness language

---

## 5. Relationship to Legacy Tarot References
### 5.1 What May Be Reused
From legacy tarot references, M55 may reuse:
- ritual pacing
- tap-only interaction discipline
- fail-closed security posture
- one-session simplicity
- save-on-completion rigor
- no prediction / no command tone in output

### 5.2 What Must Not Be Reused As-Is
Do not reuse as canonical product semantics:
- major/minor arcana system
- upright/reversed semantics
- fortune-style naming
- divinatory vocabulary
- mystical authority framing

### 5.3 Migration Principle
If any old tarot asset is repurposed, it must be transformed into a real check-in artifact, not merely renamed.

---

## 6. Output Model
### 6.1 Daily Output
Daily output is a short reflection summary, not a reading.

Allowed forms:
- current state snapshot
- 1–2 sentence reflection
- short pattern suggestion without command language
- meter update language

### 6.2 Weekly Light Summary
Weekly light summary includes:
- recurring themes
- continuity count
- directional shift
- one short calm summary

### 6.3 Deep Trend Report (Paid)
DTR may include:
- 7/30/90-day comparison
- repeated triggers
- state transition patterns
- relationship-specific behavioral loops
- self-memo / selected-signal references
- guidance framed as reflection, not certainty

### 6.4 Prohibited Output Language
Prohibited:
- guaranteed future statements
- claims about another person's hidden thoughts as fact
- supernatural cause/effect
- coercive urgency
- fear-copy such as “今すぐ買わないと危険”

---

## 7. Data Model (Canonical)
### 7.1 Core Saved Record
Canonical daily check-in record:

```json
{
  "type": "relationship_checkin",
  "created_at": 1738720000000,
  "signals": ["distance_focus", "rumination", "recovery"],
  "theme_axis": ["contact", "self"],
  "short_note": "optional short memo",
  "derived_scores": {
    "clarity": 42,
    "recovery": 38,
    "social_load": 71,
    "momentum": 29
  },
  "meter_state": {
    "zone_short": "育ち",
    "zone_long": "深まり"
  }
}
```

### 7.2 Canonical Storage Separation
- Product DB / Supabase: source-of-truth saved user records
- AI derived profile store: transformed features and trend summaries
- Analytics: product reaction only
- Messaging outbox: digest delivery queue and send status

---

## 8. Monetization Structure
### 8.1 Free Layer
Free may include:
- daily check-in
- current state update
- short summary
- limited save window
- weekly light recap

### 8.2 Paid Layer
Paid DTR may include:
- deeper comparison windows
- richer theme analysis
- higher continuity view
- more historical context
- premium monthly DTR lane

### 8.3 Canonical Revenue Loop
1. daily check-in (free)
2. saved history accumulates
3. weekly light summary creates curiosity
4. DTR offers deeper comparative value
5. daily digest brings user back

---

## 9. UX Tone
### 9.1 Tone Rules
The system must feel:
- calm
- high-trust
- non-judgmental
- non-mystical
- non-clinical
- premium but quiet

### 9.2 Forbidden Tone
Forbidden:
- panic selling
- shaming
- pseudo-medical diagnosis
- pseudo-scientific overclaiming
- supernatural framing

---

## 10. App/Web Continuity
The same user should be able to move from web to app without feeling the product has changed categories.

Therefore:
- same signal vocabulary family
- same meter vocabulary family
- same 7/30/90 retention logic
- same DTR positioning
- same quiet UI identity
- same no-rank / no-noise brand behavior

---

## 11. Phase Rules
### 11.1 Now
- define SSOT
- preserve web/app continuity
- keep analytics minimal
- keep DTR as the paid deep layer

### 11.2 Next
- implement non-divinatory daily check-in interface
- define weekly light summary spec
- define digest email spec

### 11.3 Later
- my-page deep records view
- advanced personal comparison visuals
- cohort-based but privacy-safe marketing optimization

---

## 12. Anti-Goals
- disguising tarot as “vitals” while keeping the same hidden divinatory engine
- introducing medical or therapy claims that create health-product risk
- turning AI chat logs into analytics payloads
- using aggressive relationship anxiety pressure as conversion copy

---

## 13. Canonical Success Condition
M55 succeeds when users feel:
- “my records are accumulating into something valuable”
- “this reflects my actual patterns over time”
- “the weekly/deep report is worth paying for because it uses my saved history”

Not when users feel:
- “this is a disguised fortune-telling site”
- “this is yelling at me to buy because I feel bad”

---

