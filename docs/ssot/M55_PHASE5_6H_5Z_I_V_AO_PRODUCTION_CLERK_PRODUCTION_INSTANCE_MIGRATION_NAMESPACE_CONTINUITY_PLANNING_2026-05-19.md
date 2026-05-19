# Phase 5-6H-5Z-I-V-AO — Production Clerk production-instance migration / namespace continuity planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AO** |
| **Title** | **Production Clerk production-instance migration / namespace continuity planning** |
| **Classification** | **Category 2 planning-only / docs-only / no-mutation** |
| **Verdict** | **`PRODUCTION_CLERK_PRODUCTION_INSTANCE_NAMESPACE_CONTINUITY_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AO-PRODUCTION-CLERK-PRODUCTION-INSTANCE-MIGRATION-NAMESPACE-CONTINUITY-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AL-PRE-R commit** | **`ffdd32c`** |

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **Production auth compliance** | **RED**（**`5Z-I-V-AJ-R`**） |
| **`5Z-I-V-AL-PRE-R`** | **BLOCKED** — no compliant target keys；real users in Development |
| **Direct AL / env switch** | Could **orphan** paid artifacts keyed by Clerk **`user_id`** |
| **Production instance** | **Not created** — **`pk_live_` / `sk_live_` unavailable** |
| **This gate** | Plan **namespace continuity** before any Clerk Production creation or Vercel key change |

**AO does not authorize AL execution.**

---

## C. Current state summary（safe facts only）

| Item | Value |
|------|--------|
| **Clerk app safe label** | **`M55-Official`** |
| **Current instance** | **Development** |
| **Real users in Development** | **yes** |
| **Production instance** | **not_created / no** |
| **Create production instance option** | **visible** |
| **Current publishable prefix** | **`pk_test_`** |
| **Current secret prefix** | **`sk_test_`** |
| **Target live key classes** | **unavailable** |
| **Development namespace continuity** | **yes**（current users preserved while unchanged） |
| **Future Production namespace continuity** | **unclear** |
| **Production auth compliance** | **RED** |
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Full normal dev flow** | **NOT released** |
| **AL execution ready** | **no** |
| **Human GO for AL** | **no** |

---

## D. Identity dependency map（read-only repo + SSOT）

**SSOT:** M55 app tables use **Clerk `user_id` (text)** as primary ownership key. Stripe checkout fulfillment writes rows under the **authenticated Clerk user** at purchase time.

| Artifact group | Likely keying | Risk if Clerk `user_id` changes | Read-only inventory before migration | DB mutation under options |
|----------------|---------------|-----------------------------------|--------------------------------------|---------------------------|
| **entitlements** | **`user_id`** + **`product_id`** + **`status`** | **High** — paid access lost | **yes** — active row counts per product | **A: no**；**B/C: maybe** if mapping gate |
| **entitlement_rights** | **`user_id`** + **`right_key`** | **High** — gate may lock owned | **yes** | **A: no**；**B/C: maybe** |
| **dtr_report_snapshots** | **`user_id`** + **`product_id`** | **High** — saved report inaccessible | **yes** | **A: no**；**B/C: maybe** |
| **reply_ticket_wallets** | **`user_id`** | **High** — ticket balance wrong | **yes** | **A: no**；**B/C: maybe** |
| **reply_wallet_ledgers** | **`user_id`** + ledger refs | **High** — audit trail split | **yes** | **A: no**；**B/C: maybe** |
| **one_time_fulfillments** | **`user_id`** + **`product_id`** + **`checkout_session_id`** | **High** — ownership gate payment backing | **yes** | **A: no**；**B/C: maybe** |
| **stripe_events** | **`event_id`**；fulfillment links via checkout | **Medium** — audit only | **optional** count | **A: no** |
| **failed_fulfillments** | checkout / event refs | **Medium** — repair diagnostics | **optional** | **A: no** |

### Code paths（read-only — no edit）

| Path | Role |
|------|------|
| **`lib/m55/dtrOwnershipGate.ts`** | **`resolveEntryReportOwnership(userId)`** — snapshots → rights → entitlements/OTF |
| **`lib/m55/dtrShelfAccess.ts`** | Shelf UX from ownership + **`getDtrReportSnapshot(userId)`** |
| **`lib/m55/dtrDraftDb.ts`** | **`getDtrReportSnapshot(userId, productId)`** |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts`** | Fulfillment writes **`user_id`** from checkout |
| **`lib/m55/reply/replyTicketCheckoutValidate.ts`** | Snapshot ownership **`.eq('user_id', userId)`** |
| **`app/dtr/core/page.tsx`** | **`auth()` → `userId` → ownership + snapshot** |
| **`middleware.ts`** | **`clerkMiddleware`** — session identity source |

**Conclusion:** Almost all paid-artifact access is **fail-closed on Clerk `user_id` string match**. Namespace change without mapping **breaks owned DTR and wallets**.

---

## E. Migration options（compare only — not executed）

### Option A — Temporary Development namespace exception（controlled risk）

| Dimension | Value |
|-----------|--------|
| **Action** | Keep **`pk_test_` / Development** on Production Vercel；no instance creation |
| **Compliance** | **RED** — temporary exception only；**not GREEN** |
| **User ID continuity** | **Low risk**（unchanged） |
| **Paid access risk** | **Low** short-term |
| **Rollback** | **Low** — already backed up per AL-PRE-R |
| **Human actions** | Governance owner + expiry + exit criteria |
| **Read-only preflight** | **`5Z-I-V-AP`** optional baseline |
| **Execution gates** | Exception governance gate；**not AL** |
| **Recommendation** | **Near-term allowed risk state** — see §F |

### Option B — Create Production instance on **`M55-Official`**；test ID continuity

| Dimension | Value |
|-----------|--------|
| **Action** | Human creates Production instance（**not in AO**）；document whether **`user_id` stable** |
| **Compliance** | **GREEN path** if **`pk_live_`/`sk_live_`** + domain OK |
| **User ID continuity** | **unclear** until tested — **STOP if changes** |
| **Paid access risk** | **High** if IDs change without mapping |
| **Rollback** | Revert Vercel env to backed-up **`pk_test_`** pair |
| **Human actions** | Create instance；prefix-class confirm；optional test login |
| **Read-only preflight** | **`5Z-I-V-AP`** **required** |
| **Execution gates** | **AO-EXEC**（instance create）→ **AL**（env）→ **AM** → **AN** |
| **Recommendation** | **Preferred compliance path** after **AP** + continuity proof |

### Option C — Separate production Clerk app

| Dimension | Value |
|-----------|--------|
| **Action** | New app + new keys + Vercel switch |
| **Compliance** | Possible **GREEN** |
| **User ID continuity** | **Very high orphan risk** |
| **Paid access risk** | **Very high** |
| **Rollback** | **Hard** |
| **Recommendation** | **Not preferred** unless Option B impossible |

### Option D — Continue **`pk_test_` indefinitely**

| Dimension | Value |
|-----------|--------|
| **Action** | No migration |
| **Compliance** | **RED permanently** |
| **Recommendation** | **Not acceptable as GREEN**；governance exception only（same as A） |

---

## F. Recommended near-term policy

| Policy | Detail |
|--------|--------|
| **Do not execute AL** | Until **AP** inventory + continuity decision |
| **Temporary posture** | **Option A** — controlled Development namespace exception；**compliance stays RED** |
| **Do not call GREEN** | Auth compliance；full normal dev flow |
| **Do not create Production instance** | Until dedicated **Category 2 execution** gate + explicit Human GO |
| **Next compliance path** | **Option B** after **AP** proves scale + continuity test plan |

---

## G. Required read-only inventory — **`5Z-I-V-AP`**（not executed in AO）

**Gate:** **Phase 5-6H-5Z-I-V-AP — Production Clerk namespace continuity read-only inventory**

| Collect | Format |
|---------|--------|
| Clerk Development user count | **count only**（if dashboard safe） |
| M55 paid / entitlement counts | **counts** by product/status |
| **`dtr_report_snapshots`** | **count** by product |
| **reply_ticket_wallets / ledgers** | **counts** |
| Canonical paid user DTR access | **yes/no**（**`human-ui-current-user`** label only） |
| Unpaid path safe | **yes/no** |
| Cross-instance user recognition | **yes/no/unclear**（only if test instance exists later） |

**Prohibited in AP:** full **`user_id`** / email / session；DB writes；migration

---

## H. User mapping strategy if `user_id` changes（planning only）

| Field | Rule |
|-------|------|
| **Labels** | **`old_clerk_user_safe_label`** ↔ **`new_clerk_user_safe_label`**（no full IDs in SSOT） |
| **Evidence source** | Human-local mapping table；Clerk export if policy allows — **not AI** |
| **Affected groups** | All §D artifact groups |
| **Entitlements** | Preserve **active** rows per **`product_id`** |
| **Snapshots** | Preserve **`user_id` + product_id`** ownership |
| **Wallets** | Preserve balance + ledger immutability |
| **Rollback** | Restore Vercel env + revert mapping writes in separate gate |
| **AO action** | **No mapping table**；**no DB mutation** |

**If DB update required:** separate **Category 2 DB migration planning + execution** gates.

---

## I. Stop conditions for future production-instance execution

Future execution **must STOP** if:

| # | Condition |
|---|-----------|
| **1** | **`user_id` continuity unclear** |
| **2** | Paid access cannot be verified **without payment** |
| **3** | Rollback route unclear |
| **4** | Raw IDs would be pasted into AI/SSOT |
| **5** | Production instance creation changes namespace unexpectedly |
| **6** | **`pk_live_` / `sk_live_` not available** |
| **7** | Same-app / domain association unclear |
| **8** | DB mutation needed but not separately planned |
| **9** | Development users cannot be preserved |

---

## J. No-mutation statement

**Explicitly confirmed — none performed in AO:**

- No raw key / secret / fragments recorded
- No Clerk Production instance creation
- No Clerk setting change
- No key generation / replacement
- No Vercel env change
- No redeploy / deploy / promote
- No code change
- No Production DB write
- No auth mutation / user creation
- No user migration
- No Stripe / webhook / checkout / payment
- No runner execution

---

## K. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate / open** |
| **`npm run audit` Background NoTouch** | **separate / open** |
| **Full normal dev flow** | **NOT released** |
| **AL execution** | **not authorized** by AO |

---

## L. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AP`** — namespace continuity **read-only inventory** |
| **2** | Temporary exception **governance** gate（if deferring compliance work） |
| **3** | Production instance **creation execution**（Category 2 + GO — **not AP/AO**） |
| **4** | **`5Z-I-V-AL`** — only after continuity cleared + preflight GREEN + GO |

**Do not perform AP in AO.**

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AO-PRODUCTION-CLERK-PRODUCTION-INSTANCE-MIGRATION-NAMESPACE-CONTINUITY-PLAN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AL-PRE-R-PRODUCTION-CLERK-CORRECTION-PREFLIGHT-REPLAY-RESULT-001`** | preflight replay |
| **`M55-EVID-20260519-5Z-I-V-AK-PRODUCTION-CLERK-AUTH-COMPLIANCE-CORRECTION-PLAN-001`** | correction plan |

---

## 未実行事項（AO）

- **`5Z-I-V-AP`** not run
- no Clerk Production creation / env / migration / mutation
