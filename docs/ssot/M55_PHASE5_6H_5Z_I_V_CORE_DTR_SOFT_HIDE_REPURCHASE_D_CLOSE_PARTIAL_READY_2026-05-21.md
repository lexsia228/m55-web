# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-CLOSE-PARTIAL-READY — Line close（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-CLOSE-PARTIAL-READY** |
| **Title** | **Soft-hide repurchase line — PARTIAL_READY close** |
| **Classification** | **Category 1 / docs-only / no-mutation** |
| **Close classification** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_LINE_CLOSED_PARTIAL_READY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-CLOSE-PARTIAL-READY-001`** |
| **Date** | **2026-05-21** |

**This gate closes the soft-hide / repurchase **application deploy line** at PARTIAL_READY. No further deploy work required for core hide/repurchase routing unless optional gates below are opened.**

---

## B. Prerequisites（closed）

| Gate / artifact | Verdict / commit |
|-----------------|------------------|
| **DB schema C-D-R** | **GREEN** — `user_hidden_*` · visible-only partial unique |
| **D-READ … D-FULFILL** | implemented |
| **FIX-B / FIX-C / FIX-C-R** | preview **GREEN** |
| **D-PREVIEW-FINAL** | **GREEN** @ `cc73af1` |
| **D-PROD-DEPLOY-EXECUTION** | **GREEN** @ **`0e9597c`** |
| **D-PROD-DEPLOY-R** | **PARTIAL_READY** @ docs **`484a417`** |
| **Production domain** | `https://m55-webv2.vercel.app` |

---

## C. Production confirmed state（Human @ PROD-DEPLOY-R）

| Surface | Observation |
|---------|-------------|
| **`/my` opened** | **yes** |
| **saved report card** | **no** |
| **削除 button** | **no** |
| **purchase CTA** | **yes** |
| **fatal** | **no** |
| **`/dtr` opened** | **yes** |
| **old saved report visible** | **no** |
| **purchase flow visible** | **yes** |
| **CTA clicked** | **no** |
| **checkout / payment / webhook** | **no** |

---

## D. Interpretation（close basis）

| Point | Conclusion |
|-------|------------|
| **Account state** | **hidden-only / unpurchased equivalent** — no visible saved row |
| **Old envelope exposure** | **no** — not a regression |
| **Purchase routing** | **visible** — user can reach repurchase path |
| **Delete / dialog cancel on Production** | **not_run** — no visible row; **not a defect** for this account |
| **Logged-out smoke @ EXECUTION** | **pass**（401 hide JSON · `/dtr/core` fail-closed） |

**Line status:** **PARTIAL_READY close accepted** — deploy objective met for hidden-only / unpurchased routing; visible-row UX validation deferred.

---

## E. Remaining optional checks（not blocking close）

| # | Check | Status |
|---|-------|--------|
| **O1** | Production **visible** saved report — delete dialog **cancel-only** | **optional** — separate account |
| **O2** | Production **visible** saved report — **delete execute** | **optional** — **D-PROD-DELETE-EXECUTION** + Human GO |
| **O3** | **Live repurchase checkout** end-to-end | **optional** — **D-LIVE-REPURCHASE-CHECKOUT** + Human GO |
| **O4** | **VERIFY-C** | **HOLD** — unrelated track |

---

## F. Formal HOLD list

| Item | Status |
|------|--------|
| **本番削除実行** | **HOLD** until **`D-PROD-DELETE-EXECUTION`** + separate Human GO |
| **live repurchase checkout** | **HOLD** until **`D-LIVE-REPURCHASE-CHECKOUT-PLANNING`** + separate Human GO |
| **payment** | **HOLD** |
| **webhook replay** | **HOLD** |
| **VERIFY-C** | **HOLD** |
| **Production DB migration** | **already applied** — no further apply in HOLD items |
| **env change** | **HOLD** unless incident |

---

## G. No-mutation（this gate）

| Action | Status |
|--------|--------|
| 本番削除実行 | **no** |
| live checkout / payment / webhook | **no** |
| manual DB SQL / DB write | **no** |
| env change | **no** |
| VERIFY-C | **no** |
| raw ID / email / session / secret | **no** |
| code / deploy | **no** |

---

## H. Next optional gates（explicitly not required for close）

| Gate | When |
|------|------|
| **1. D-PROD-VISIBLE-CANCEL-ONLY** | If a Production-safe account with **visible** saved report exists |
| **2. D-LIVE-REPURCHASE-CHECKOUT-PLANNING** | When Human authorizes live Stripe repurchase test |
| **3. D-PROD-DELETE-EXECUTION** | When Human authorizes Production **削除** execute smoke |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Line closed PARTIAL_READY @ Production `0e9597c` |
