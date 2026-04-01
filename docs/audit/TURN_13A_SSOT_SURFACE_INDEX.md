# TURN 13-A SSOT SURFACE INDEX (facts only)

Date: 2026-02-18 (JST)
HEAD: 0fa81b55005c190fe56e16eedea12f8f120f24ba

## 1. Candidate SSOT files (Data / Purchase / Bridge)
(None found matching strict pattern)

## 2. Clerk / Auth Plumbing Status
middleware.ts
app/sign-in/[[...sign-in]]/page.tsx
app/sign-up/[[...sign-up]]/page.tsx
app/layout.tsx

## 3. Red-flag Scans (Should be empty)
### A. Forced Auth Patterns
✅ None

### B. Server DB Dependencies (SSOT mandates Local-First)
✅ None

---

## Turn 13-C (Soul Wiring) — Surface Addendum
Date (JST): 2026-02-18
Head SHA (before commit): 3251cd1

Files:
- hooks/useSoulBridge.ts (sender: contentWindow.postMessage + strict targetOrigin)
- public/legacy/js/m55_soul_binder.js (receiver: event.origin verification)
- lib/soul/adapter.ts (display-only; PurchaseCache remains SSOT)
- src/components/legacy/LegacyFrame.tsx (wiring)

Security hardening:
- postMessage targetOrigin: window.location.origin (NO '*')
- receiver origin gate: event.origin === window.location.origin
- DOM writes: no innerHTML (innerText only)

Invariants:
- No forced auth
- No URL-based context injection
- No second purchase state (PurchaseCache remains SSOT)
