# Phase 5-6H-5Z-I-V-AT — User mapping / entitlement preservation planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AT** |
| **Title** | **User mapping / entitlement preservation planning** |
| **Classification** | **Category 2 planning-only / docs-only / no-mutation** |
| **Verdict** | **`USER_MAPPING_ENTITLEMENT_PRESERVATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AT-USER-MAPPING-ENTITLEMENT-PRESERVATION-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AR-R commit** | **`77584a6`** |

**AT is design-only.** No mapping execution, no DB migration, no AL / AL-PRE.

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **`5Z-I-V-AR-R`** | **`CLERK_PRODUCTION_INSTANCE_USER_ID_CONTINUITY_REPLAY_RED_NO_MUTATION`** |
| **Human answer** | **`separate`** — Development ↔ Production are **separate context / separate namespace** |
| **`user_id` continuity** | **Not confirmed** — continuity GREEN **no** |
| **M55 paid artifacts** | **`user_id`-bound** — orphan risk if Production IDs differ |
| **Production auth compliance** | Cannot be corrected safely **until** mapping / preservation is planned |
| **AL / AL-PRE** | **Cannot resume** — blocked until mapping path or governed exception |

---

## C. Artifact dependency map（read-only repo + AP-S-R）

| Artifact group | Dependency key | Impact if Clerk `user_id` changes | Preservation requirement | Rollback implication | Future migration |
|----------------|----------------|-----------------------------------|------------------------|----------------------|------------------|
| **entitlements** | **`user_id`** + **`product_id`** + **`status`** | **High** — paid DTR gate fails | Same human retains **`DTR_CORE_STATIC_V1`** active row | Restore prior **`user_id`** or mapping table | Remap **`user_id`** or resolver lookup |
| **entitlement_rights** | **`user_id`** + **`right_key`** | **High** — repair path in `dtrOwnershipGate` breaks | Rights follow same human | Same | Remap or resolver |
| **dtr_report_snapshots** | **`user_id`** + **`product_id`** (upsert conflict) | **High** — saved report inaccessible | Immutable snapshot per owner | Backup column / mapping | Remap **`user_id`** only |
| **reply_ticket_wallets** | **`user_id`** (+ report scope in code) | **High** — balance wrong / denied | Balance follows human | Ledger + wallet backup | Remap or dual-read |
| **reply_wallet_ledgers** | **`user_id`** + ledger refs | **High** — audit split | Append-only；associate to human | No delete without plan | Remap **`user_id`** on rows |
| **one_time_fulfillments** | **`user_id`** + **`product_id`** + checkout ref | **High** — ownership fallback fails | Audit trail preserved | Backup | Remap；no duplicate OTF |
| **stripe_events** | **`event_id`** (audit) | **Low–medium** — replay diagnostics | Count **133** — audit only | N/A | No webhook replay |
| **failed_fulfillments** | checkout / event refs | **Medium** — repair queue | Count **7** — audit only | N/A | No raw IDs in SSOT |
| **dtr_guest_drafts** | **`user_id`** nullable；link at login | **Medium** — pre-purchase draft link | Linked drafts follow human | Restore link | Remap **`user_id`** on link |
| **profiles**（if used via draft/profile paths） | Often via **`dtr_guest_drafts`** / metadata | **Medium** | Profile continuity for same human | Backup | Via draft remap |

### Code paths（read-only — no edit）

| Path | Role |
|------|------|
| **`lib/m55/dtrOwnershipGate.ts`** | Ownership: snapshots → rights → entitlements / OTF |
| **`lib/m55/dtrShelfAccess.ts`** | Shelf UX from **`userId`** |
| **`lib/m55/dtrDraftDb.ts`** | **`dtr_guest_drafts`**, **`dtr_report_snapshots`** by **`user_id`** |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts`** | Writes entitlements / rights / snapshots at purchase |
| **`lib/m55/reply/replyTicketCheckoutValidate.ts`** | Wallet + snapshot **`.eq('user_id', …)`** |
| **`lib/m55/reply/walletGrants.ts`** | Wallet / ledger writes by **`userId`** |
| **`lib/m55/reply/readReplyWalletProbe.ts`** | Legacy wallet read by **`user_id`** |

**Conclusion:** Runtime access is **fail-closed** on Clerk session **`user_id` string match** unless a **mapping resolver** is added later.

---

## D. Inventory summary（counts only）

### Clerk

| Item | Count |
|------|-------|
| **Development total users** | **5** |
| **Development active users** | **5** |
| **Production instance** | **no / separate namespace** |

### Supabase（**`5Z-I-V-AP-S-R`**）

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

### Mapping scope note

| Observation | Planning rule |
|-------------|---------------|
| **DB distinct users up to 10** vs **Clerk Development visible 5** | Mapping **cannot** rely on dashboard user list alone |
| **Historical / deleted Clerk users** | May still own DB rows — **`5Z-I-V-AU`** must inventory safe labels |

---

## E. Mapping model design（planning only）

**No raw `user_id` values. No mapping table DDL. No SQL migration in AT.**

### Per-human mapping record（Human-local + SSOT-safe fields only）

| Field | Allowed values |
|-------|------------------|
| **old_clerk_user_safe_label** | e.g. **`dev_slot_01`** … **`dev_slot_10`** |
| **new_clerk_user_safe_label** | e.g. **`prod_slot_01`** or **`pending_unknown`** |
| **mapping_confidence** | **`confirmed`** / **`probable`** / **`unclear`** |
| **mapping_evidence_source** | **`clerk_dashboard_safe_label`** / **`user_self_login_confirmation`** / **`payment_metadata_safe_label`** / **`support_safe_summary`** / **`other`** |
| **affected_artifacts_count** | counts-only per group（from inventory） |
| **migration_required** | **`yes`** / **`no`** / **`unclear`** |

### Slot budget（planning)

| Pool | Planned slots |
|------|---------------|
| **DB distinct users（entitlements）** | **10** safe labels minimum |
| **Clerk Development visible** | **5** — subset only |
| **Unmatched slots** | Reserve **`unclear`** until **AU** |

---

## F. Preservation rules

### 1. Entitlement preservation

- Existing granted **`DTR_CORE_STATIC_V1`** must remain linked to the **same human owner** after any migration.
- **No duplicate grant** unless explicitly planned and idempotent.
- **No entitlement loss.**

### 2. Entitlement rights preservation

- **`right_key` / `right_value`** ownership follows the same human.
- **No blind copy** without **`mapping_confidence: confirmed`**.

### 3. DTR report snapshot preservation

- Existing saved report must remain accessible by the same human.
- **Snapshot ownership must not be orphaned.**
- **No report regeneration** unless separately planned.

### 4. Reply wallet preservation

- Wallet balance follows the same human.
- **Balance must not be reset or duplicated.**

### 5. Reply ledger preservation

- Ledger audit trail **immutable** or safely re-associated.
- **No deletion or rewriting** unless **`5Z-I-V-AW`** authorizes.

### 6. One-time fulfillment preservation

- OTF remains **audit trail** for ownership fallback.
- **Avoid duplicate fulfillment rows.**
- Checkout / session IDs **human-local only** — not in SSOT.

### 7. Stripe / failed fulfillment audit preservation

- **Audit trail only** — **no webhook replay.**
- **No raw Stripe IDs** in SSOT.

---

## G. Migration strategy options（compare only）

| Option | Summary | Access risk | Compliance | AT recommendation |
|--------|---------|-------------|------------|-------------------|
| **1** | **No DB migration** — keep Development namespace；**AS** governance | **Lowest** | **RED** | **Valid deferral** |
| **2** | **Mapping table** + resolver（avoid rewriting rows） | **Medium** if resolver correct | Path to GREEN later | **Strong candidate** if migration proceeds |
| **3** | **Rewrite `user_id`** in artifact rows | **High** | Path to GREEN later | **Not recommended** without backup + dry-run + **AX** |
| **4** | **Dual-namespace resolver**（read old + new via mapping） | **Lower** if implemented well | Path to GREEN later | **Preferred** if Option 2/3 considered |
| **5** | **Separate Clerk app** + re-link | **Highest orphan** | Unclear | **Not recommended** |

### AT preservation strategy summary

| Strategy | Recommendation |
|----------|----------------|
| **Near-term** | **Do not migrate** — plan **Option 4** over **Option 3** if compliance correction is pursued |
| **Defer correction** | **Option 1** + **`5Z-I-V-AS`** |
| **Next inventory** | **`5Z-I-V-AU`** safe-label feasibility before **AV/AW/AX** |

---

## H. Future required gates（define only）

| Order | Phase | Purpose |
|-------|-------|---------|
| **1** | **`5Z-I-V-AU`** | Read-only mapping feasibility inventory — safe labels only；how many humans need mapping |
| **2** | **`5Z-I-V-AV`** | Mapping schema / **resolver design**（planning only） |
| **3** | **`5Z-I-V-AW`** | DB migration **planning**（if mapping table or rewrite needed） |
| **4** | **`5Z-I-V-AX`** | Migration **execution** — Category 2 / Human GO / dry-run / backup |
| **alt** | **`5Z-I-V-AS`** | Temporary auth exception governance if migration deferred |

**Chain after AX（out of AT scope）:** verify-without-payment → **AL-PRE** revalidation → **AL** — **not authorized by AT**.

---

## I. Stop conditions for future execution

Future migration or auth correction must **STOP** if:

| Stop condition |
|----------------|
| **mapping_confidence** is **`unclear`** for any paid owner |
| Any human owner **cannot be matched** |
| Paid DTR owner verification **cannot** be done **without payment** |
| **Rollback** route unclear |
| **Raw IDs** must be pasted into AI/SSOT |
| **DB backup** not prepared |
| **Dry-run** not GREEN |
| **Duplicate** entitlements / wallets risk unresolved |
| **Stripe** audit trail cannot be preserved |
| **Clerk Production `user_id`** values remain unknown |
| **AR-R `separate`** namespace not addressed in resolver design |

---

## J. Recommended near-term policy

| Policy | Value |
|--------|--------|
| **AL** | **Do not execute** |
| **AL-PRE** | **Do not resume** |
| **Clerk Production instance** | **Do not create** |
| **User migration** | **Do not execute** |
| **Actively pursuing compliance** | Next **`5Z-I-V-AU`** |
| **Deferring compliance** | Next **`5Z-I-V-AS`** |
| **Production auth compliance** | **RED** |
| **Full normal dev flow** | **NOT released** |

---

## K. No-mutation statement

**Explicitly confirmed — none performed in AT:**

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
- No user creation or user migration
- No manual entitlement / snapshot / wallet / ledger / OTF transfer
- No Stripe / webhook / checkout / payment
- No runner execution

---

## L. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AT authorizes AL** | **no** |

---

## M. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended if pursuing compliance）** | **`5Z-I-V-AU`** — Read-only mapping feasibility inventory |
| **2（alternative）** | **`5Z-I-V-AS`** — Temporary auth compliance exception governance |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AT-USER-MAPPING-ENTITLEMENT-PRESERVATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AR-R-CLERK-PRODUCTION-INSTANCE-USER-ID-CONTINUITY-REPLAY-RESULT-001`** | continuity RED |
| **`M55-EVID-20260519-5Z-I-V-AP-S-R-SUPABASE-AGGREGATE-INVENTORY-REPLAY-RESULT-001`** | counts |

---

## Prior gate reference

| Phase | Verdict |
|-------|---------|
| **AR-R** | **RED** — **`separate`** namespace |
| **AT** | **GREEN** — preservation planning complete；**execution not authorized** |

---

## 未実行事項（AT）

- **AU / AV / AW / AX / AS** not executed
- No mapping table, no DB migration, no AL
- No mutation
