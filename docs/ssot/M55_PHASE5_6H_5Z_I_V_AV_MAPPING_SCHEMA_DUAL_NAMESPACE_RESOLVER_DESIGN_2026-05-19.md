# Phase 5-6H-5Z-I-V-AV — Mapping schema / dual-namespace resolver design gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AV** |
| **Title** | **Mapping schema / dual-namespace resolver design** |
| **Classification** | **Category 2 design-only / docs-only / no-mutation** |
| **Verdict** | **`MAPPING_SCHEMA_DUAL_NAMESPACE_RESOLVER_DESIGN_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AV-MAPPING-SCHEMA-DUAL-NAMESPACE-RESOLVER-DESIGN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AU commit** | **`e529f9a`** |

**AV is design-only.** No mapping table, no resolver code, no DB migration, no AL.

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **`5Z-I-V-AU`** | **`feasible_with_dual_namespace_resolver_planning`** |
| **`5Z-I-V-AR-R`** | Development / Production **separate** — continuity **not confirmed** |
| **Paid artifacts** | **`user_id`-bound** — up to **10** DB distinct users |
| **Row rewrite** | **High risk** — not preferred |
| **Gap** | Need **schema + resolver contract** before **AW** migration planning or any code |

---

## C. Design goals

| Goal | Requirement |
|------|-------------|
| **Paid DTR access** | Existing owners retain **owned** after namespace change |
| **Saved snapshots** | **`dtr_report_snapshots`** remain reachable via resolver |
| **Reply wallets** | Balances **not reset / not duplicated** |
| **Reply ledgers** | Audit trail **preserved**（append-only association） |
| **OTF audit** | Ownership fallback trail **intact** |
| **No duplicate entitlements** | Idempotent grants only |
| **No destructive rewrite** | Artifact rows **immutable by default** |
| **SSOT safety** | **No raw IDs** in docs |
| **Rollback** | Resolver disable + Development keys restore path |
| **Verify without payment** | Post-change smoke per **AH** pattern |

---

## D. Proposed resolver concept（design only）

### Identity model（safe labels — no raw `user_id`）

| Field | Purpose |
|-------|---------|
| **current_namespace_user_safe_label** | Human-local label for active Clerk session identity |
| **future_namespace_user_safe_label** | Production-era label（**`pending_prod_unknown`** until known） |
| **owner_slot_001 … owner_slot_010** | Canonical human owner bucket（**AU** scale） |
| **canonical_owner_slot** | Single slot per human for artifact resolution |
| **mapping_status** | **`active`** / **`pending`** / **`blocked`** / **`deprecated`** |
| **mapping_confidence** | **`confirmed`** / **`likely`** / **`unclear`** / **`blocked`** |
| **namespace_type** | **`clerk_development`** / **`clerk_production`** / **`legacy`** / **`unknown`** |

### Resolver behavior（runtime contract — not implemented in AV）

```
session_user_id (Clerk)  →  resolveIdentity()  →  canonical_owner_slot
                                                      ↓
                                            legacy_db_user_key (human-local only)
                                                      ↓
                              ownership / snapshot / wallet / OTF queries use legacy key
```

| Step | Behavior |
|------|----------|
| **1** | On auth, read **current** Clerk session identity（server only） |
| **2** | Lookup **`m55_user_identity_mappings`**（future）by namespace + safe label |
| **3** | Resolve **`canonical_owner_slot`** |
| **4** | Map slot → **legacy artifact owner key**（stored human-local；never SSOT） |
| **5** | All **read paths** query artifacts with **legacy key** |
| **6** | **Write paths** after cutover: write under **canonical** mapping；no blind rewrite of old rows |

**Principle:** **Bridge** new Production ID → old Development-era DB **`user_id`** without rewriting artifact rows initially.

---

## E. Mapping table design proposal（planning only — not created in AV）

### Conceptual table: `m55_user_identity_mappings`

| Column | Type（conceptual） | SSOT records value? |
|--------|-------------------|---------------------|
| **id** | uuid | **no** raw IDs |
| **canonical_owner_slot** | text | **yes** — e.g. **`owner_slot_003`** |
| **namespace_type** | enum | **yes** |
| **user_safe_label** | text | **yes** — not full Clerk ID |
| **mapping_status** | enum | **yes** |
| **mapping_confidence** | enum | **yes** |
| **evidence_source** | text | **yes** — safe summary |
| **created_at** | timestamptz | **yes** |
| **updated_at** | timestamptz | **yes** |
| **verified_at** | timestamptz nullable | **yes** |
| **notes_safe** | text | **yes** — no PII |
| **created_by_gate** | text | **yes** — e.g. **`5Z-I-V-AX`** |

**Human-local column（not in public SSOT）：** **`legacy_artifact_user_key`** — maps slot → DB **`user_id`** used in entitlements/snapshots/wallets.

**Actual DDL:** deferred to **`5Z-I-V-AW`** — **no SQL in AV**.

### Uniqueness rules（design）

| Rule | Intent |
|------|--------|
| **One `active` mapping per (namespace_type, user_safe_label)** | Prevent duplicate session bridges |
| **One `canonical_owner_slot` per human** | Single owner bucket |
| **Multiple namespace rows per slot allowed** | Dev + Prod labels → same slot |

---

## F. Resolver read-path design

Central entry point（future）: **`resolveCanonicalOwner(sessionUserId, namespaceType) → { slot, legacyDbKey }`**

| Path | Current behavior | Future resolver behavior | Regression risk | Required tests |
|------|------------------|--------------------------|-----------------|----------------|
| **`dtrOwnershipGate.resolveEntryReportOwnership`** | Direct **`userId`** queries | Resolve → **legacyDbKey** then query | **High** if resolver fails | Owned user → **owned**；unknown → **locked** |
| **`dtrShelfAccess`** | Calls ownership + snapshot with **`userId`** | Pass resolved **legacyDbKey** | **High** | Shelf shows saved report for paid owner |
| **`dtrDraftDb.getDtrReportSnapshot`** | **`.eq('user_id', userId)`** | Use **legacyDbKey** | **High** | Snapshot readable post-migration |
| **Entitlements lookup**（in gate） | **`.eq('user_id', userId)`** | **legacyDbKey** | **High** | Active **DTR_CORE_STATIC_V1** found |
| **Entitlement rights lookup** | **`.eq('user_id', userId)`** | **legacyDbKey** | **Medium** | Repair path still works |
| **Reply wallet**（`readReplyWalletProbe`, validate） | **`.eq('user_id', userId)`** | **legacyDbKey** | **High** | Balance unchanged |
| **Reply ledger view** | **user_id** filter | **legacyDbKey** | **Medium** | Ledger history complete |
| **OTF audit lookup** | **`.eq('user_id', userId)`** | **legacyDbKey** | **Medium** | Fallback ownership intact |
| **`dtr_guest_drafts`** | Optional **`.eq('user_id', userId)`** | **legacyDbKey** on link | **Low–medium** | Draft link if in scope |

**Fail-closed default:** resolver error → treat as **locked**（match current gate philosophy）.

---

## G. Write-path design

| Path | Current | Future rule |
|------|---------|-------------|
| **`dtrCoreCheckoutFulfillment`** | Writes **`expectedUserId`** | After cutover: resolve session → slot → store under **canonical mapping**；fulfillment rows use **consistent legacy key** per slot |
| **Snapshot creation** | Upsert **`user_id, product_id`** | Same **legacy key** for slot；**no second snapshot** for duplicate namespace ID |
| **`walletGrants`** | Insert wallet/ledger with **`userId`** | Grant to **legacyDbKey** for slot；**idempotency** on grant keys |
| **Ledger insert** | Append with **`user_id`** | Append only；**no duplicate balance** |
| **`replyTicketCheckoutValidate`** | Snapshot/wallet **`.eq('user_id')`** | Validate against **legacyDbKey** |
| **Guest draft promotion** | Link **`user_id`** on login | Map new session → slot before link |

### Write rules（mandatory）

| Rule | Detail |
|------|--------|
| **New writes use canonical mapping** | Once resolver live |
| **Old rows not rewritten by default** | **Option 4** core |
| **No duplicate fulfillment** | Checkout idempotency preserved |
| **No wallet duplication** | One wallet row per slot/report scope |
| **Stripe/session IDs** | **Human-local only** |

---

## H. Strategy comparison

| Option | AV assessment |
|--------|---------------|
| **4 — Dual-namespace resolver** | **Preferred** — preserves auditability；rollback = disable resolver |
| **2 — Mapping table only** | **Insufficient alone** — needs **F/G** integration |
| **3 — Row rewrite** | **Not preferred** — only if resolver impossible + **AX** dry-run |
| **1 — Temporary exception + AS** | **Valid deferral** — compliance **RED** |

---

## I. Migration and execution gate chain（define only）

| Order | Phase | Purpose |
|-------|-------|---------|
| **1** | **`5Z-I-V-AW`** | DB migration **planning** — `m55_user_identity_mappings` DDL + indexes |
| **2** | **`5Z-I-V-AX`** | Mapping data load / migration **execution** — dry-run；backup；Human GO |
| **3** | **`5Z-I-V-AY`** | Resolver **implementation planning** — file list；feature flag；rollout |
| **4** | **`5Z-I-V-AZ`** | Resolver **implementation execution** — code change gate |
| **5** | **`5Z-I-V-BA`** | Post-resolver **DTR owned** verification（no payment） |
| **6** | **`5Z-I-V-BB`** | Post-resolver **unpaid / non-owned** verification |
| **7** | **`5Z-I-V-BC`** | Production Clerk correction **re-preflight**（before **AL** chain） |

**Note:** **AT** previously listed **AW/AX** only；**AV** extends chain through **BC** before **AL-PRE / AL**.

**AV executes none of the above.**

---

## J. Acceptance criteria for future implementation

| Criterion | Required |
|-----------|----------|
| Existing paid owner opens **saved DTR** **without payment** | **yes** |
| Unpaid / non-owned remains **locked** | **yes** |
| Wallet balance **preserved** | **yes** |
| Reply ledger **preserved** | **yes** |
| **No duplicate** entitlements | **yes** |
| **No duplicate** wallet grant | **yes** |
| **No checkout / payment** in verification | **yes** |
| **Rollback** path documented and tested | **yes** |
| **No raw IDs** in SSOT | **yes** |

---

## K. Stop conditions

| Stop condition |
|----------------|
| **mapping_confidence** **`unclear`** for any paid **owner_slot** |
| **DB backup** not prepared |
| **Dry-run** not possible |
| Paid owner verify **without payment** impossible |
| Resolver causes **duplicate ownership** |
| **Row rewrite** required without separate approval |
| **Raw IDs** must be pasted into AI/SSOT |
| **Production Clerk** identity unavailable at cutover |
| **Production auth correction** attempted **before** resolver readiness（**BC** not GREEN） |

---

## L. No-mutation statement

**Explicitly confirmed — none performed in AV:**

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
- No DB migration
- No mapping table creation
- No resolver implementation
- No auth mutation
- No user creation or user migration
- No Stripe / webhook / checkout / payment
- No runner execution
- No manual entitlement / snapshot / wallet / ledger / OTF mutation
- **AL / AL-PRE not restarted**

---

## M. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AV authorizes AL** | **no** |

---

## N. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AW`** — DB migration planning for **`m55_user_identity_mappings`** |
| **2（alternative）** | **`5Z-I-V-AS`** — Temporary auth compliance exception governance |

---

## Resolver design summary

| Item | Design choice |
|------|---------------|
| **Pattern** | **Dual-namespace resolver** + optional **`m55_user_identity_mappings`** table |
| **Canonical key** | **`owner_slot_001` … `owner_slot_010`** |
| **DB reads** | Resolve session → slot → **legacy artifact key**（human-local） |
| **DB writes** | Post-cutover: canonical mapping；**no default row rewrite** |
| **Integration hub** | **`resolveCanonicalOwner`** before **`dtrOwnershipGate`** and wallet/snapshot paths |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AV-MAPPING-SCHEMA-DUAL-NAMESPACE-RESOLVER-DESIGN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AU-READONLY-MAPPING-FEASIBILITY-INVENTORY-001`** | feasibility |
| **`M55-EVID-20260519-5Z-I-V-AT-USER-MAPPING-ENTITLEMENT-PRESERVATION-PLAN-001`** | preservation rules |

---

## 未実行事項（AV）

- **AW → BC** not executed
- No table, no code, no AL
- No mutation
