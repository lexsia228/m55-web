# Phase 5-6H-5Z-I-V-AQ — Production Clerk production-instance feasibility / user_id continuity planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AQ** |
| **Title** | **Production Clerk production-instance feasibility / user_id continuity planning** |
| **Classification** | **Category 2 planning-only / docs-only / no-mutation** |
| **Verdict** | **`PRODUCTION_CLERK_PRODUCTION_INSTANCE_FEASIBILITY_USER_ID_CONTINUITY_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AQ-PRODUCTION-CLERK-PRODUCTION-INSTANCE-FEASIBILITY-USER-ID-CONTINUITY-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AP-S-R commit** | **`3433896`** |

**AQ is design-only.** No Clerk Production instance creation, no env correction, no AL.

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **Production auth compliance** | **RED** — Production Vercel still bound to **Development** Clerk namespace（**`pk_test_`** class） |
| **Supabase aggregate inventory** | **GREEN**（**`5Z-I-V-AP-S-R`** counts-only）— paid artifacts **exist** and are quantified |
| **Clerk Production instance** | **Does not exist** under **`M55-Official`** |
| **Clerk `user_id` continuity** | **`not_confirmed`** — Clerk **cannot** confirm Development → Production ID preservation |
| **Paid artifacts** | **`user_id`-dependent** — orphan risk on namespace switch |
| **Premature action** | Production instance creation / namespace switch / env swap / **AL** before continuity design could **deny paid DTR access** without payment |

**AQ closes the planning gap left after AP-S-R:** inventory is known；**feasibility and verification path** must be defined before any execution gate.

---

## C. Current inventory summary（counts / safe labels only）

### Clerk（`M55-Official`）

| Item | Value |
|------|--------|
| **Clerk app safe label** | **`M55-Official`** |
| **Current instance** | **Development** |
| **Total users** | **5** |
| **Active users** | **5** |
| **Production instance exists** | **no** |
| **`user_id` continuity Development → Production** | **`not_confirmed`** |

### Supabase aggregates（**`5Z-I-V-AP-S-R`**）

| Metric | Count |
|--------|-------|
| **entitlements** | **10** / DTR **10** / distinct users **10** |
| **entitlement_rights** | **7** / distinct **7** |
| **dtr_report_snapshots** | **6** / DTR **6** / distinct **6** |
| **reply_ticket_wallets** | **10** / distinct **10** |
| **reply_wallet_ledgers** | **17** / distinct **10** |
| **one_time_fulfillments** | **10** / distinct **7** |
| **stripe_events** | **133** |
| **failed_fulfillments** | **7** |

### Tracks

| Track | Status |
|-------|--------|
| **DTR owned path** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **AL authorized** | **no** |
| **Full normal dev flow** | **NOT released** |

---

## D. Feasibility questions to resolve before any Production instance creation

These **must** be answered（or explicitly waived by governance with risk acceptance）**before** Category 2 execution of instance creation, env swap, or **AL**:

| # | Question |
|---|----------|
| **1** | Does creating a Clerk **Production** instance under **`M55-Official`** **preserve** existing Development **`user_id`** values? |
| **2** | If not, can Clerk provide a **safe export/import or mapping method**（without pasting raw IDs into SSOT）? |
| **3** | Can the **same human user** be linked across Development and Production **without** exposing raw email / full **`user_id`** to SSOT? |
| **4** | Can existing **paid DTR access** be verified **post-change without payment**? |
| **5** | Can **rollback** restore the current Development namespace state（Vercel keys + Clerk instance + user sessions）? |
| **6** | Would Production instance creation **itself** mutate or **isolate** current Development users? |
| **7** | Is the current **domain association**（**`m55-webv2.vercel.app`**, Clerk allowed origins）**transferable or duplicated** safely? |
| **8** | Does **`pk_live_` / `sk_live_` availability** **require** creating the Production instance first（and if so, under what continuity assumptions）? |

**AQ does not answer these — it routes them to `5Z-I-V-AR`（and downstream gates）.**

---

## E. Feasibility options（compare only — not executed）

### Option A — Continue Development namespace as time-limited controlled exception

| Dimension | Assessment |
|-----------|------------|
| **Action** | No Production instance；keep **`pk_test_`** on Production Vercel |
| **Compliance** | **RED** — documented exception only |
| **Paid access risk** | **Lowest** short-term（IDs unchanged） |
| **Exit** | Requires **expiry, owner, exit criteria** — **`5Z-I-V-AS`** |
| **Full normal dev flow** | **Does not authorize** |
| **AL** | **Does not authorize** |

### Option B — Clerk official / dashboard-safe continuity confirmation **before** creation（**preferred inquiry path**）

| Dimension | Assessment |
|-----------|------------|
| **Action** | Human + **`5Z-I-V-AR`** records **yes / no / unclear** from Clerk docs or dashboard-safe inspection |
| **Creation** | **Still none** in AR unless explicit separate GO |
| **If continuity = no** | Route to **Option D** planning（**`5Z-I-V-AT`**） |
| **If continuity = yes** | Still requires **rollback plan**, **post-switch verify without payment**, and **AL-PRE** chain — **not automatic AL** |

### Option C — Isolated sandbox Production instance check（later execution gate only）

| Dimension | Assessment |
|-----------|------------|
| **Action** | Create Production instance only under **dedicated Category 2 execution gate** |
| **Preconditions** | AR result；rollback defined；**no** user migration until verified |
| **Risk** | May still **isolate** Development users if Clerk behavior splits namespaces |
| **AQ** | **Plans only** — **does not execute** |

### Option D — User mapping / migration if Production `user_id` changes

| Dimension | Assessment |
|-----------|------------|
| **Action** | DB migration planning — **§F** |
| **Risk** | **High** — entitlements **10**, snapshots **6**, wallets **10**, OTF **10**, ledgers **17** |
| **Gate** | **`5Z-I-V-AT`** planning only；separate execution gate for any UPDATE |
| **AQ** | **Not executable** |

### Option E — Separate production Clerk app

| Dimension | Assessment |
|-----------|------------|
| **Action** | New Clerk application for Production |
| **Risk** | **Highest orphaning** — all **`user_id`** keys diverge by default |
| **Recommendation** | **Not recommended** unless **`M55-Official` Production path impossible** |

### AQ feasibility conclusion（planning）

| Conclusion | Detail |
|------------|--------|
| **Production instance creation** | **Not feasible to execute safely now** — continuity **`not_confirmed`** |
| **Preferred near-term path** | **Option B → `5Z-I-V-AR`**；parallel **Option A governance → `5Z-I-V-AS`** if compliance deferral is explicit business decision |
| **Env correction / AL** | **Remain blocked** until continuity + rollback + verify-without-payment paths are defined |

---

## F. User mapping design if IDs change（planning only）

**No mapping table, no DB mutation, no raw IDs in SSOT.**

### Safe label scheme（Human-local only）

| Field | SSOT-safe form |
|-------|----------------|
| **old_clerk_user_safe_label** | e.g. **`dev_user_slot_01`** … **`dev_user_slot_05`**（ordinal / role — **not** full `user_…`) |
| **new_clerk_user_safe_label** | e.g. **`prod_user_slot_01`** or **`same_as_dev_slot_01`** if continuity confirmed |
| **mapping_evidence_source** | **`clerk_dashboard_export_local`**, **`clerk_support_ticket_ref`**, **`human_attestation`** — **no** raw export pasted |

### Affected artifact groups（all keyed by **`user_id` text** in repo）

| Group | AP-S-R scale | Preservation rule（planning） |
|-------|--------------|-------------------------------|
| **entitlements** | **10** rows / **10** users | **1:1 `user_id` remap**；preserve **`product_id`**, **`status`**, timestamps |
| **entitlement_rights** | **7** / **7** users | Remap **`user_id`**；preserve **`right_key` / `right_value`** |
| **dtr_report_snapshots** | **6** / **6** users | Remap **`user_id`**；preserve **`product_id`**, snapshot payload immutability |
| **reply_ticket_wallets** | **10** / **10** users | Remap **`user_id`**；preserve balances / caps |
| **reply_wallet_ledgers** | **17** / **10** users | Remap **`user_id`**；**append-only audit** — no silent delete |
| **one_time_fulfillments** | **10** / **7** users | Remap **`user_id`**；preserve checkout linkage **human-local** |

### Cross-cutting preservation rules

| Rule | Requirement |
|------|-------------|
| **Entitlement preservation** | No paid user loses **`DTR_CORE_STATIC_V1`** active row without explicit governance |
| **Snapshot ownership** | **`(user_id, product_id)`** uniqueness maintained post-remap |
| **Wallet balance** | Ledger sum consistency check after remap（counts-only verify gate） |
| **Ledger audit** | Historical rows retained；remap = UPDATE **`user_id`** column only under execution gate |
| **OTF audit** | Fulfillment history preserved for ownership gate fallback |
| **Rollback** | Backup **`user_id`** column or mapping table **human-local** before any UPDATE |
| **Verification** | Post-migration **owned DTR + no-payment** smoke per **`5Z-I-V-AH`** pattern — **no Stripe charge** |

### Code dependency（read-only repo review — no edit）

| File | `user_id` role |
|------|----------------|
| **`lib/m55/dtrOwnershipGate.ts`** | `.eq('user_id', userId)` on snapshots, rights, entitlements, OTF |
| **`lib/m55/dtrShelfAccess.ts`** | `resolveEntryReportOwnership(userId)` + `getDtrReportSnapshot(userId, …)` |
| **`lib/m55/dtrDraftDb.ts`** | profiles + snapshots upsert on **`user_id`** |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts`** | writes entitlements/rights/snapshots with **`expectedUserId`** |
| **`lib/m55/reply/replyTicketCheckoutValidate.ts`** | snapshot + wallet **`.eq('user_id', …)`** |

**Implication:** Any Clerk namespace where **`auth()` returns a different string** → **fail-closed unpaid/locked** for previously paid users unless DB remap completes.

---

## G. Required future gates（define only）

| Order | Phase | Purpose | Execution in gate? |
|-------|-------|---------|-------------------|
| **1** | **`5Z-I-V-AR`** | Clerk official/documentation or dashboard-safe **Production-instance `user_id` continuity** confirmation | **no creation** unless separate explicit GO |
| **2** | **`5Z-I-V-AS`** | Temporary auth compliance **exception governance**（Option A）— expiry, owner, risk acceptance, exit | **no** env change in AS by default |
| **3** | **`5Z-I-V-AT`** | User mapping / entitlement **preservation planning**（Option D）— migration SQL **plan only** | **no** DB write |
| **4** | **`5Z-I-V-AL`** | Auth compliance **correction execution**（keys + redeploy chain） | **blocked** until continuity + rollback resolved；**explicit Human GO** |

**Dependency chain:** **AR** (or governance waiver) → optional **AT** if continuity **no** → **AL-PRE** replay GREEN → **AL** → **AM/AN** verify.

---

## H. Stop conditions for future execution

Any future **Production instance creation**, **Vercel env correction**, or **AL** must **STOP** if:

| Stop condition |
|----------------|
| **`user_id` continuity** remains **`not_confirmed`** |
| Production instance creation **may isolate** current Development users |
| **Paid DTR owner verification** cannot be done **without payment** after change |
| **Rollback** path unclear（keys + Clerk + session） |
| **Raw IDs** would need to be pasted into AI/SSOT |
| **Mapping/migration** required but **`5Z-I-V-AT`** not completed |
| **Supabase artifacts** cannot be preserved per §F |
| **Domain association** unclear for **`m55-webv2.vercel.app`** |
| **`pk_live_` / `sk_live_`** unavailable or **same-app** binding unclear |
| **Human GO** for Category 2 execution not recorded |

---

## I. Recommended near-term policy

| Policy | Recommendation |
|--------|----------------|
| **AL** | **Do not execute** |
| **Production instance** | **Do not create yet** |
| **Development namespace** | **Keep only** as **controlled temporary exception**（already in effect per **AO**） |
| **Production auth compliance** | **Remains RED** |
| **Full normal dev flow** | **NOT released** |
| **Next gate choice** | **`5Z-I-V-AR`** if goal is **resolve continuity feasibility**；**`5Z-I-V-AS`** if business defers compliance while continuing **Category 1** only |
| **AQ authorizes** | **Planning only** — **no** mutation, **no** AL, **no** full dev flow |

---

## J. No-mutation statement

**Explicitly confirmed — none performed in AQ:**

- No raw key / secret / suffix / fragment recorded
- No full **user_id** / email / session recorded
- No full checkout session / payment intent / Stripe event ID recorded
- No Clerk Production instance creation
- No Clerk setting change
- No key generation or replacement
- No Vercel env change
- No redeploy / deploy / promote
- No code change
- No Production DB write
- No auth mutation
- No user creation or migration
- No Stripe / webhook / checkout / payment
- No runner execution

---

## K. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AQ authorizes AL** | **no** |

---

## L. Next phase

| Priority | Gate | When |
|----------|------|------|
| **1a（recommended if resolving compliance）** | **`5Z-I-V-AR`** | Clerk continuity confirmation **before** any instance creation |
| **1b（alternative if time-boxing exception）** | **`5Z-I-V-AS`** | Formalize Development-namespace exception with expiry / exit |
| **2（conditional）** | **`5Z-I-V-AT`** | Only if **AR** answers continuity **no** |
| **Blocked** | **`5Z-I-V-AL`** | Until **AR** + rollback + verify path + **AL-PRE** chain |

**Human decision point:** Choose **AR** vs **AS** based on whether auth compliance resolution is **active now** or **explicitly deferred**.

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AQ-PRODUCTION-CLERK-PRODUCTION-INSTANCE-FEASIBILITY-USER-ID-CONTINUITY-PLAN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AP-S-R-SUPABASE-AGGREGATE-INVENTORY-REPLAY-RESULT-001`** | inventory |
| **`M55-EVID-20260519-5Z-I-V-AO-PRODUCTION-CLERK-PRODUCTION-INSTANCE-MIGRATION-NAMESPACE-CONTINUITY-PLAN-001`** | prior namespace plan |

---

## Prior gate chain

| Phase | Verdict |
|-------|---------|
| **AO** | Namespace continuity planning GREEN |
| **AP → AP-R → AP-S → AP-S-R** | Inventory complete；Clerk continuity **`not_confirmed`** |
| **AQ** | Feasibility planning GREEN — **execution still blocked** |

---

## 未実行事項（AQ）

- **AR / AS / AT / AL** not executed
- No Clerk Production instance
- No mutation
