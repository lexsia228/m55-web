# M55 Roadmap

Status: **Sequence authority (Tier E)**  
Machine order: `M55_ROADMAP_ORDER` in `lib/m55/contracts/m55CommercialFunnelContract.ts`

**Fixed order — agents must not reorder arbitrarily.**

1. Commercial Funnel SSOT ← **complete**
2. 個人無料→個人Premium ← **complete** (PR #80 operational baseline merged; Growth Share **PR #81 MERGED** `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149` 2026-08-01 — commercial + technical closure complete)
3. 二人向け無料→有料 — **ACTIVE PAIR LANE (macro)**; Pair Wave-A **USER_VISIBLE_CLOSED_GREEN**; PR #165 **MERGED**; Production **READY** @ product merge SHA; **NEXT** = `PAIR-PREMIUM-ACTIVATION-DECISION`; Pair Premium **NOT_ACTIVATED**
4. HOME最終統合
5. HOME正式SSOT
6. ファネル計測
7. 全ページvisual統一

## Active commercial priority

第一目標は **商用化・収益化・ユーザー訴求**。内部整理を目的化しない。

Global acceptance standard: `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` (REV1 frozen).
User-visible surfaces require `USER_VISIBLE_CLOSED_GREEN`; technical GREEN alone is insufficient.
Human commercial-quality approval and actual-screen evidence are mandatory before closure.

## Human Final Commercial Acceptance blocking override (2026-08-17) — CLOSED / HISTORICAL

2026-08-17 Human Final Commercial Acceptance Audit **temporarily blocked SELL** before the bounded correction closed.

| Item | Value |
|---|---|
| Bounded correction | **M55_COMMERCIAL_ACCEPTANCE_CORRECTION** — **CLOSED** |
| Prior hold state | **M55_PERSONAL_SALES_LAUNCH = HOLD** (historical fact of this gate) |
| Closure outcome | PR #135 **MERGED** @ `a6ddfd72603c6dc14b7c57df6ab44db2ec604d0c` · Preview Human commercial acceptance **GREEN** · Production public-surface acceptance **GREEN** |
| Current sell authority | **M55_PERSONAL_SALES_LAUNCH = SELL** — durably recorded by the 2026-08-18 post-SELL control-plane reconciliation |
| This was **NOT** | Personal Free redesign · new MRQ architecture · Compatibility activation · P3 reorder |
| MRQ fixed order below | **unchanged** — do not reorder P0–P7 |

## Post-SELL commercial-growth operating overlay (2026-08-18) — PLANNING / SEQUENCING ONLY

**G0–G5 is a Human-authorized cross-cutting post-SELL operating overlay.** Human Sales Launch = **SELL** is durably recorded. This overlay adds a **post-SELL monitoring/improvement loop** for monitoring, audit, and planning. It does **not** mark any frozen roadmap lane complete; it does **not** silently renumber or redefine the fixed product sequence below.

| Gate | Status | Scope |
|---|---|---|
| **G0 CONTROL-PLANE FRESHNESS** | **CLOSED** — historical control-plane docs reconciled on `main` | Tier-E authority reconciliation only; superseded by PR #137/#138/#139 post-merge current state |
| **G1 REVENUE OUTCOME OBSERVABILITY** | **CLOSED GREEN** — PR #137 **MERGED** @ `773dd67222ba1fe81824c10be6457a33e715650f` · feature `74bbbc1b92a00fc3b5425889d94cf45e02847964` | privacy-safe Light→Full upgrade + post-payment ready/stuck observability; **DO NOT REOPEN** absent actual invalidation |
| **G2 PUBLIC TERMINOLOGY LONG-TAIL** | **CLOSED GREEN** — PR #139 **MERGED** @ `183328ade4cbbaf69975bdf33883bdad3caf19ad` · feature `29594616347963c34a0edb99a8f93db56b47c582` · exact delta **4 files** | Stripe PaymentIntent canonical public names · DTR catalog subtitle dedupe; **DO NOT REOPEN** absent actual invalidation |
| **G3 REVISIT / RETENTION LOOP** | **CLOSED GREEN** — G3-01 **CLOSED GREEN / NO CODE DELTA** · G3-02 **CLOSED GREEN** (PR #141) · G3-03 **CLOSED GREEN** (WT-044) · G3-04 **CLOSED / KEEP_REJECTED** (WT-045 / `feat/m55-g3-04-copy-safety-v1` @ `03ae78dbd91d63ffc411d389dfd9e276525155f2`) · PR #144 commercial-quality consolidation **USER_VISIBLE_CLOSED_GREEN = YES** | **DO NOT REOPEN** absent actual invalidation · Today/Weekly **NOT EXPOSED** · legacy routes redirect to `/core` · no replacement engine · **G3 overall CLOSED GREEN** |
| **G4 ORGANIC DISCOVERY** | **CLOSED GREEN** — WT-046 / `feat/m55-g4-organic-discovery-v1` @ `2a16b6fd78fe45bba9ffbc325f6aa0c6dd914957`; PR #148 **MERGED** @ `0f62ff7c575eb65730862092ff80d7168469ae95` · Wave 1+2 authority/indexability + qualified landing identity · canonical entry `/home` · `/pricing` retired → `/dtr/lp` · JSON-LD deferred | **DO NOT REOPEN** absent actual invalidation |
| **G5 METRICS / FUNNEL LEAKAGE** | **Wave 1 CLOSED GREEN** — PR #149 **MERGED** @ `53b71f8c8ea0ddeecd1828a2a809b4de08583aba`; feature `144686ca83b05179f9f159e2040802845f2e65a0` | privacy-safe core funnel metrics; **Wave 2 DEFER UNTIL REAL TRAFFIC DATA**; no further G5 source work required now |

Explicit retainers:

- Pair Premium **NOT** automatically activated
- subscription **NOT** automatically introduced
- no new recurring billing before repetition value is demonstrated
- existing assets first · delta-only validation
- Closed GREEN stays closed unless invalidated
- competitor claims/copy are **not** copy sources

G1 and G2 are **CLOSED GREEN** on `main` via PR #137 and PR #139 respectively and must not be re-audited or re-implemented absent actual invalidation. **G3 REVISIT / RETENTION LOOP** is **CLOSED GREEN** — G3-01 **CLOSED GREEN / NO CODE DELTA** · G3-02 **CLOSED GREEN** (PR #141) · G3-03 **CLOSED GREEN** (WT-044) · G3-04 **CLOSED / KEEP_REJECTED** (WT-045) — **DO NOT REOPEN** absent actual invalidation. **G4 ORGANIC DISCOVERY** is **CLOSED GREEN** via WT-046 / `feat/m55-g4-organic-discovery-v1` @ `2a16b6fd78fe45bba9ffbc325f6aa0c6dd914957`, merged in PR #148 @ `0f62ff7c575eb65730862092ff80d7168469ae95`; **DO NOT REOPEN** absent actual invalidation. **G5 Wave 1** is **CLOSED GREEN** via PR #149 @ `53b71f8c8ea0ddeecd1828a2a809b4de08583aba`; **G5 Wave 2 = DEFER UNTIL REAL TRAFFIC DATA** and no further G5 source work is required now. Commercial quality consolidation remains **CLOSED GREEN** via PR #144 except for the specifically invalidated Live paid DTR readability surface.

## Pair lane entrance — Wave 0 Live paid DTR readability (MACRO STAGE)

Wave 0 is a **bounded quality gate inside the Pair lane**, not an independent roadmap lane. Steps 1–9 below are **historical** — Wave 0 mapping and Phase-B readability are **CLOSED GREEN**.

Fixed Pair entrance order:

1. G5 Wave 1 **CLOSED GREEN**
2. PAIR LANE
3. Wave 0 Live paid DTR readability — **CLOSED GREEN**
4. Fresh read-only source/computed-style mapping — **CLOSED GREEN**
5. exact defect proof — **CLOSED GREEN**
6. shared token/style owner minimal fix — **CLOSED GREEN**
7. automated contrast/readability regression — **CLOSED GREEN**
8. mobile + desktop representative check — **CLOSED GREEN**
9. Human representative visual approval — **USER_VISIBLE_CLOSED_GREEN**
10. Pair free→paid mapping-first — **COMPLETE**
11. minimal Pair implementation — **COMPLETE**
12. Pair relation-stage Wave-A source/local implementation — **CLOSED GREEN**
13. Safari actual-browser commercial-quality verification — **USER_VISIBLE_CLOSED_GREEN**
14. Human commercial-quality approval — **APPROVED**
15. PR #165 merge — **MERGED** @ `3a87ee84129086a261c4f34a074e8b63fd735b99`
16. post-merge Product Production READY observation — **CLOSED GREEN** @ `dpl_8incbWrtaJunn7T3G8wGzozTQG8E`
17. **PAIR-PREMIUM-ACTIVATION-DECISION** — **NEXT** · decision scope only · **NOT_ACTIVATED**

**Macro stage only.** Executable **CURRENT EXECUTION GATE** / **NEXT SINGLE ACTION** — sole owner: `docs/ssot/M55_EXECUTION_STATE.json`. Pair implementation is **COMPLETE**. Pair Premium is **NOT_ACTIVATED**. Pair purchase funnel is **NOT GREEN**.

## Four-surface visual identity (2026-08-14) — CLOSED GREEN

PR #117 is **MERGED** @ `be6efb4fd7b2994a18fe0f175a536e773ee827ce`. PR #120–#132 are **MERGED** on audit-baseline `main` @ `9d7eb0688dc26a459b87113c70a5c3e2ae2a33ea`; Product closure remains `de37b1a0f6781cf763621b023af6b6c7617b7e5d` because the later delta is docs/evidence/governance only. Personalization + narrative/share + Personal Free commercial individuality are **live on Production** (`https://m-55.jp`). Personal Free user-visible quality is **USER_VISIBLE_CLOSED_GREEN**. Compatibility commerce remains **OFF**. `M55_POST_RELEASE_LIFECYCLE_TRANSITION` and absolute residual-debt disposition are **COMPLETE**. PR #30 and PR #75 are **CLOSED** unmerged as superseded; PR #119 is the sole intended open product/preflight PR. **NEXT:** authorized **M55_MRQ_P3_ENTRY_PLANNING** (planning only) — **not** another Personal Free redesign; **not** `M55_LIVE_UPGRADE_RPC_V2_SAME_TRANSACTION_RECOVERY` (CLOSED_GREEN @ `1e25d17`).

## Personal Free user-visible quality (2026-08-16) — USER_VISIBLE_CLOSED_GREEN

PR #123–#128 closed the long-lived Personal Free commercial individuality / user-visible quality lane on `main` @ `de37b1a`. Human **USER_VISIBLE_CLOSED_GREEN** is recorded. This lane is **not active**. `M55_POST_RELEASE_LIFECYCLE_TRANSITION` completed via PR #131. Next authorized work: **M55_MRQ_P3_ENTRY_PLANNING** (planning only; implementation not authorized). Independent PR #119 Compatibility commerce remains open — **not** another Free redesign wave.

## Current Pair surface identity wave (2026-08-14) — HISTORICAL

PR #116 @ `511b54d` and PR #117 @ `be6efb4` closed the four-surface visual identity wave. This does **not** activate P5 paid Compatibility commerce, checkout, or Production purchase.

## Current MRQ governance transition (2026-08-06) — AUTHORITATIVE FOR MRQ SEQUENCE, SUPERSEDED FOR ACTIVE IMPLEMENTATION LANE 2026-08-14

PR #90 is **MERGED** @ `ac71d054556ebec06d6fa107fbe359a88052aca6` (feature head `af33c722e6e585f51f8e51297055d090606fd32e`; mergedAt `2026-08-05T13:13:10Z`); P0 Premium public terminology is **CLOSED GREEN**. MRQ mapping Revision 1 is **CLOSED GREEN** on WT-019 (read-only; no implementation authority). The ACTIVE lane is **M55 MINIMUM-REVENUE-QUALITY — P3 entry/planning**. PR #68, PR #30, and PR #75 are **CLOSED** as superseded/unmerged historical lanes; none is an implementation source. PR #119 remains the sole intended open product/preflight PR.

**Fixed MRQ execution order — agents must not reorder arbitrarily:**

1. P0 Premium public terminology ← **CLOSED GREEN** (PR #90 **MERGED**)
2. P1 personal free output quality ← **P1A CLOSED GREEN** (PR #95) · **P1B CLOSED GREEN** (PR #96) · **P1C CLOSED GREEN** (PR #97 @ `faef130a335ce6e33cfd784d5318f874beeb70ad`)
3. P2 Premium bridge and paid output value ← **CLOSED GREEN** (PR #99 **MERGED** @ `2d14404d62ab7b265e07729448d6db602a055cce`)
4. P3 checkout/refund/support/recovery safety — **next authorized planning scope; not yet authorized**; P3 environment proof uses **Preview-only first** strategy
5. P4 free compatibility
6. P5 paid compatibility
7. P6 analytics
8. P7 polish/performance/animation

No P3 implementation wave is authorized yet. **P3 entry/planning** is the sole authorized MRQ planning scope — checkout/refund/support/recovery safety per this roadmap. P3 implementation worktree **not created**. P3 environment proof uses **Preview-only first** strategy. Sales launch is **not authorized**. P2 Revenue-Ready **CLOSED GREEN** (PR #99 @ `2d14404d62ab7b265e07729448d6db602a055cce`) does **not** by itself authorize real checkout, 4242, or sales launch.

## Current commercial-surface governance transition (2026-08-04) — HISTORICAL, SUPERSEDED 2026-08-06

PR #86 is **MERGED** @ `10e601465b66b8132a7ceb845300af1924ba468b` (feature head `326ccd6f1c97911ba82281dbc0a9d4dd835ed782`; merge method **MERGE COMMIT**); IND-FREE is **CLOSED GREEN**. PR #88 is **MERGED** @ `060fee287355eb00573d968445fcc374510d185d`. **WT-018** Premium public terminology was locally implemented and later merged via PR #90 — see MRQ governance transition above for current authority. This section is historical for IND-FREE/IND-PAID transition facts only.

Ordered commercial execution sequence:

1. existing-asset reuse and internal alias freeze ← **CLOSED GREEN**
2. IND-FREE commercial surface ← **CLOSED GREEN** (PR #86 **MERGED** @ `10e601465b66b8132a7ceb845300af1924ba468b`)
3. IND-PAID result/save/revisit/add-on loop ← **ACTIVE — implementation not yet authorized**
4. COMP-FREE runtime and UI
5. COMP-PAID product/result/checkout activation
6. cross-product measurement and retention

Already-GREEN control-plane work and completed IND-FREE proof/UI/visual review must not be reopened except for an actual blocking delta. This transition does not authorize IND-PAID implementation, Cursor write work, commerce activation, or Production operations; those require a later explicit lane-change gate.

## Historical: commercial-surface governance transition (2026-08-03) — SUPERSEDED 2026-08-04

PR #83 is **MERGED** @ `dd08f5dfde1e3a9425db6baa9d4310d074376c03`; PA-2A and the prior docs-only transition are closed. At that time the ACTIVE lane was **M55全域の商用surface統治** with IND-FREE implementation in WT-014.

## Historical: implementation lane while PR #81 was open (dated 2026-07-27; superseded 2026-08-01)

**Do not treat any field in this section as current.** PR #81 has since merged; see "Current commercial-surface governance transition (2026-08-03)" above for the authoritative current state. The blockquoted table below is retained only as a historical record of the lane while PR #81 was open (valid only through 2026-07-31).

> | Item (as of 2026-07-27 only) | Value (as of 2026-07-27 only) |
> |---|---|
> | ACTIVE lane | Self funnel Growth / share (WT-011) |
> | Worktree / branch | `/Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1` · `feat/m55-self-funnel-growth-share-v1` |
> | implementationReviewedTip | `d7af28a59755076b6269e93edfba03297eb98084` — reviewed Growth Share baseline; live HEAD validated as Git descendant |
> | PR | #81 unmerged / branch-local |
> | Production baseline | PR #80 merged @ `696559009367a6ac445dc7a07876590b16cd8488` — OPERATIONAL_BASELINE |
> | Current next phase (at that time) | sitewide commercial UX audit → unified Growth Share commercial UX implementation → Human review |
> | Merge / deploy | Not authorized until Human commercial approval |
> | Pair | out of lane — roadmap step 3 later |
> | Build Week / WT-009 | freeze maintained (PAUSED + FROZEN_BY_HUMAN_DECISION) |
> | Stripe / DB / Clerk / env | not authorized in this lane |

## Historical transition (2026-08-01) — PR #81 post-merge SSOT and thread handoff — SUPERSEDED 2026-08-03

| Item | Status |
|---|---|
| **Completed product lane** | Self funnel Growth / share (WT-011) — PR #81 **MERGED** @ `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149` (`2026-08-01T08:38:25Z`); feature head `6770c40ac52ce5e222e4f485b8c9c83aa3814d48`; pre-merge main `110fa79fe45ef24481a7fd1fd8e19cebbcb98d39`; Production observed GREEN |
| **Activity at that time** | docs-only post-merge SSOT reconciliation and ChatGPT thread handoff (WT-012 · `chore/m55-pr81-post-merge-transition-v1`) — completed and superseded by WT-013 |
| **Next planned product lane** | 二人向け無料→有料 — **implementation not yet authorized; no work started in this gate** |
| Merge / deploy | none performed in this gate — docs-only |
| Pair | out of current lane — roadmap step 3, next planned |
| Build Week / WT-009 | **freeze maintained**, unchanged |
| Stripe / DB / Clerk / env | **not authorized** in this or the next lane's start |
| Handoff document | `docs/ssot/M55_PR81_POST_MERGE_HANDOFF_2026-08-01.md` |
| New-thread bootstrap | `docs/ssot/M55_PR81_NEW_THREAD_BOOTSTRAP_2026-08-01.md` |

## Repository authority closure (operational — does not reorder the sequence above)

**SUPERSEDED (2026-07-26):** The block below records pre–Authority Pack transition snapshots. Do not treat Self funnel or Authority Pack as the current implementation lane.

| Item | Status |
|---|---|
| Bootstrap / worktree registry authority | **complete** — PR #76 merged @ `38447ab1b39562606938936ce0da3d5a76d82c1b` (historical) |
| Post-merge authority transition docs | **complete** — PR #77 squash @ `d4e7b7c3426d901d1ba8460e136040bf209a64de` |
| Authority closure / readiness | **GREEN_IMPLEMENTATION_AUTHORIZED** — additional docs-only gate **not required** |
| Production / origin/main (as of 2026-07-26 only — **not current**; current as of 2026-08-01 is `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149`, PR #81) | `696559009367a6ac445dc7a07876590b16cd8488` — PR #80 Self funnel operational baseline |
| Active lane (historical snapshot) | 個人無料→個人Premiumファネル一括実装 |
| Active worktree / branch (historical snapshot) | WT-001 · `feat/m55-self-free-to-premium-funnel-v1` @ `fda934d…` |
| Self funnel runtime implementation | **merged operational baseline** — (as of 2026-07-26 only: Growth was continuing on WT-011; **CURRENT 2026-08-01: Growth (WT-011) is COMPLETED, PR #81 MERGED, no longer continuing**) |
| Current next gate (historical snapshot) | `CATEGORY-2-M55-SELF-FREE-TO-PREMIUM-FUNNEL-ACTUAL-DIFF-REVIEW-REV1` |
| After actual diff review | local profile visual QA → commit review → commit / push / PR / Production QA |
| Pair | **out of current lane** — roadmap step 3 later |
| Build Week / WT-009 | **freeze maintained** (PAUSED + FROZEN_BY_HUMAN_DECISION) |
| Stripe / DB / Clerk / env | **not authorized** in this lane |

Fixed 7-step sequence above remains unchanged. Step 2 operational baseline is **complete**. **CURRENT (2026-08-01): Growth Share (WT-011) is COMPLETED (PR #81 MERGED); it is no longer an implementation lane in progress.** (Historical, valid through 2026-07-31 only: Growth Share (WT-011) was the current implementation lane within step 2 commercial sequence continuation.)

## P0 commercial defect override (superseded — historical)

**SUPERSEDED (2026-07-27); further superseded 2026-08-01 by PR #81 merge.** Historical snapshot only, valid through 2026-07-31 — do not treat as current: at that time, Authority Pack authority-data correction and Self funnel PARKED state were complete, and Growth Share (WT-011) was the then-current lane. **CURRENT (2026-08-01): Growth Share (WT-011) is COMPLETED, not current — see "Current transition (2026-08-01)" section above.**

Human-approved **P0 override (2026-07-25):** Product Authority Pack bootstrap preceded Self funnel Human lock resumption.

| Item | Status |
|---|---|
| Product Authority Pack | **COMPLETED** — authority-data correction merged via PR #79 |
| Self funnel lane | **COMPLETED** — PR #80 operational baseline merged to Production |
| Build Week lane | **FROZEN** — do not modify |
| Authority Pack operational step | authority-data transition correction + final Human authority review — **complete** |
| Self funnel resume (as of 2026-07-25/27 only) | **Complete** — Growth Share was continuing on WT-011 at that time; **CURRENT (2026-08-01): Growth Share (WT-011) is COMPLETED, PR #81 MERGED — no longer continuing/in-progress** |

If a new P0 commercial defect is discovered:

1. Add reason to `M55_DECISION_LOG.md`
2. Explicitly change ACTIVE LANE in `M55_CURRENT_STATE.md`

Do not silently skip or reorder steps.

## Superseded

`docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — detailed task registry remains reference-only; **phase order** defers to this file for commercial funnel work.
