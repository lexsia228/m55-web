# Phase 5-6H-5Z-I-V-AU — Read-only mapping feasibility inventory gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AU** |
| **Title** | **Read-only mapping feasibility inventory** |
| **Classification** | **Category 2 read-only inventory / docs-only / no-mutation** |
| **Verdict** | **`READONLY_MAPPING_FEASIBILITY_INVENTORY_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AU-READONLY-MAPPING-FEASIBILITY-INVENTORY-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AT commit** | **`e0f7b37`** |

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **`5Z-I-V-AT`** | Preservation planning **GREEN** — did not quantify concrete mapping feasibility |
| **`5Z-I-V-AR-R`** | **Separate** namespace — continuity **not confirmed** |
| **`5Z-I-V-AP-S-R`** | Paid artifact groups **exist**（counts recorded） |
| **AU purpose** | Inventory **how much** mapping is needed before **`5Z-I-V-AV`** resolver design |
| **AU does not** | Authorize migration, AL, mapping table, or resolver implementation |

---

## C. Inventory method

| Method | Used in AU? |
|--------|-------------|
| **Repo read-only review** | **yes** — ownership paths keyed by **`user_id`** |
| **Existing SSOT counts**（AP-S-R, AP-R, AT） | **yes** |
| **Safe-label reasoning** | **yes** — slot model only |
| **Raw user_id / email / session / Stripe ID** | **no** |
| **DB writes** | **no** |
| **New Supabase SELECT** | **no** — reuse **AP-S-R** counts-only aggregates |
| **Clerk dashboard new scrape** | **no** — reuse **5** visible users from AP-R |

---

## D. Mapping scale summary（counts only）

| Metric | Count |
|--------|-------|
| **Clerk Development visible users** | **5** total / **5** active |
| **DB distinct user scale（planning ceiling）** | **up to 10**（entitlements distinct users） |
| **entitlements distinct users** | **10** |
| **entitlement_rights distinct users** | **7** |
| **dtr_report_snapshots distinct users** | **6** |
| **reply_ticket_wallets distinct users** | **10** |
| **reply_wallet_ledgers distinct users** | **10** |
| **one_time_fulfillments distinct users** | **7** |

### Scale interpretation

| Observation | Planning implication |
|-------------|----------------------|
| **10 ≠ 5** | Mapping scale **is not** equal to current Clerk visible user count |
| **10 > 7 rights / 6 snapshots** | Some DB **`user_id`** slots may lack full artifact bundle（historic / partial / test-safe groups） |
| **17 ledger rows / 10 wallet users** | Ledger density **>** wallet row count — per-user ledger history expected |
| **AU slot budget** | Plan **`owner_slot_001` … `owner_slot_010`** minimum |

**No regression detected:** DTR owned unlock and AC-P6 paths remain **GREEN** per prior gates — AU does not re-open those tracks.

---

## E. Artifact-to-owner feasibility matrix

| Artifact group | Owner dependency | Mapping needed if Clerk `user_id` changes | Dual-namespace resolver | Row rewrite | Audit sensitivity | Recommended handling |
|----------------|------------------|-------------------------------------------|-------------------------|-------------|-------------------|------------------------|
| **entitlements** | **`user_id`** + product + status | **yes** | **yes** | **yes**（high risk） | **high** | Resolver lookup → same entitlement rows |
| **entitlement_rights** | **`user_id`** + right_key | **yes** | **yes** | **yes** | **high** | Resolver；no blind copy |
| **dtr_report_snapshots** | **`user_id`** + product_id | **yes** | **yes** | **yes** | **high** | Immutable rows；map session → legacy id |
| **reply_ticket_wallets** | **`user_id`** (+ report scope) | **yes** | **yes** | **yes** | **high** | Resolver；balance integrity check |
| **reply_wallet_ledgers** | **`user_id`** + ledger refs | **yes** | **yes** | **yes** | **high** | Append-only association via resolver |
| **one_time_fulfillments** | **`user_id`** + product + checkout ref | **yes** | **yes** | **yes** | **high** | Audit preserved；no duplicate OTF |
| **dtr_guest_drafts** | **`user_id`** nullable | **yes**（if linked） | **yes** | **yes** | **medium** | Remap on link；optional for paid path |
| **stripe_events** | **event_id**（audit） | **no**（audit trail） | **N/A** | **no** | **low** | Count **133** — reference only |
| **failed_fulfillments** | checkout refs | **no**（repair audit） | **N/A** | **no** | **medium** | Count **7** — no webhook replay |
| **profiles** | via drafts / metadata | **unclear** | **yes** | **yes** | **medium** | Follow draft remap if in scope |

### Repo confirmation（read-only）

All paid-path reads use **session `userId` string** matched to DB **`user_id`** — see **`dtrOwnershipGate`**, **`dtrShelfAccess`**, **`dtrDraftDb`**, **`dtrCoreCheckoutFulfillment`**, **`replyTicketCheckoutValidate`**, **`walletGrants`**, **`readReplyWalletProbe`**.

---

## F. Safe-label mapping feasibility model（planning only）

**No mapping rows generated. No SQL. No raw IDs.**

### Slot schema（template — not populated）

| Field | Allowed values |
|-------|----------------|
| **owner_slot** | **`owner_slot_001`** … **`owner_slot_010`** |
| **current_namespace_user_safe_label** | e.g. **`dev_visible_01`** … **`dev_visible_05`** or **`db_only_slot_06`** |
| **future_namespace_user_safe_label** | **`pending_prod_unknown`** until Production exists |
| **ownership_confidence** | **`confirmed`** / **`likely`** / **`unclear`** / **`blocked`** |
| **evidence_source** | **`current_login_observation`** / **`paid_access_observation`** / **`supabase_count_only`** / **`support_summary`** / **`human_self_confirmation`** / **`unclear`** |
| **required_verification** | paid DTR without payment / wallet balance / unpaid locked / other |

### Feasibility by slot class（reasoning only）

| Slot class | Count（planning） | ownership_confidence（default） | Notes |
|------------|-----------------|----------------------------------|-------|
| **Clerk-visible Development users** | **5** | **`likely`** until Human confirms per slot | Map to **`dev_visible_01–05`** in Human-local workbook |
| **DB-only extra distinct users** | **up to 5**（10 − 5） | **`unclear`** | Historic / deleted Clerk / test — **AU does not identify which** |
| **Production future IDs** | **unknown** | **`blocked`** until Production instance + safe mapping event |

---

## G. Feasibility conclusion

| Field | Value |
|-------|--------|
| **Primary conclusion** | **`feasible_with_dual_namespace_resolver_planning`** |
| **Secondary** | **`feasible_only_with_mapping_table`** — supports Option 4 resolver |
| **Not recommended** | **`feasible_only_with_row_rewrite`** — high risk at **10** user scale |
| **Not applicable** | **`blocked_due_to_identity_uncertainty`** — counts + repo paths sufficient for **planning** |
| **Not applicable** | **`red_due_to_no_preservation_route`** — preservation routes exist per **AT** |

### Rationale

| Point | Assessment |
|-------|------------|
| **Affected groups identified** | **yes** — all paid groups in §E |
| **Scale bounded** | **yes** — **≤10** distinct DB users |
| **Resolver path** | **yes** — can resolve session → legacy **`user_id`** without rewriting rows first |
| **Identity gaps** | **≤5** slots **`unclear`** — address in **AV** + Human-local mapping workbook，not blockers for **GREEN** inventory |
| **DTR / unpaid regression** | **none observed** in AU scope |

**AV prerequisite satisfied:** feasibility inventory supports proceeding to **`5Z-I-V-AV`** design — **not** execution.

---

## H. Recommended strategy refinement（from AT）

| Option | AU assessment |
|--------|---------------|
| **Option 4 — dual-namespace resolver** | **Remains preferred** if compliance correction proceeds |
| **Option 2 — mapping table** | **Likely required** to back resolver — design in **AV** |
| **Option 3 — row rewrite** | **Not preferred** — only if resolver impossible |
| **Option 1 + AS** | **Valid** if Human defers correction |
| **AL** | **Unauthorized** |

---

## I. Future AV design requirements（`5Z-I-V-AV`）

**AV must decide（planning only in AV）：**

| Topic | Question for AV |
|-------|-----------------|
| **Mapping table** | Required? Schema? Immutable audit columns? |
| **Resolver** | Map Production session ID → legacy Development **`user_id`** for DB reads? |
| **Ownership gate** | Single resolver entry point before **`dtrOwnershipGate`** queries? |
| **Snapshots / wallets** | Same resolver for **`getDtrReportSnapshot`** and wallet probes? |
| **Row immutability** | Keep existing rows unchanged? |
| **Rollback** | Disable resolver + restore Development keys only? |
| **Code changes** | Which files（list from AU repo review）— **no implementation in AV** unless separate GO |

---

## J. Stop conditions for future mapping/migration

| Stop condition |
|----------------|
| **ownership_confidence** **`unclear`** for any **paid** owner slot |
| **Raw IDs** pasted into AI/SSOT |
| Paid access cannot be verified **without payment** post-change |
| **Wallet balance** preservation unclear |
| **Entitlement duplication** risk unresolved |
| **Snapshot ownership** ambiguity for any **DTR** owner |
| **Rollback** path unclear |
| **DB backup / dry-run** not planned |
| **Production Clerk `user_id`** values unavailable when correction attempted |

---

## K. No-mutation statement

**Explicitly confirmed — none performed in AU:**

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
- No Stripe / webhook / checkout / payment
- No runner execution
- No mapping table creation
- No resolver implementation

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
| **AU authorizes AL** | **no** |

---

## M. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AV`** — Mapping schema / dual-namespace resolver **design** |
| **2（alternative）** | **`5Z-I-V-AS`** — Temporary auth compliance exception governance |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AU-READONLY-MAPPING-FEASIBILITY-INVENTORY-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AT-USER-MAPPING-ENTITLEMENT-PRESERVATION-PLAN-001`** | preservation plan |
| **`M55-EVID-20260519-5Z-I-V-AP-S-R-SUPABASE-AGGREGATE-INVENTORY-REPLAY-RESULT-001`** | counts |

---

## Prior gate reference

| Phase | Verdict |
|-------|---------|
| **AT** | **`USER_MAPPING_ENTITLEMENT_PRESERVATION_PLANNING_GREEN_NO_MUTATION`** |
| **AU** | **`READONLY_MAPPING_FEASIBILITY_INVENTORY_GREEN_NO_MUTATION`** |

---

## 未実行事項（AU）

- **AV / AW / AX / AS** not executed
- No mapping table, no resolver, no AL
- No mutation
