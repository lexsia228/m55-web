# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B — Schema migration planning（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B** |
| **Title** | **Soft-hide repurchase — `dtr_report_snapshots` schema & constraint planning** |
| **Classification** | **Category 1 / schema planning / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_B_SCHEMA_MIGRATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **A / A-R / A-COMMIT** @ **`0837e52`** GREEN |
| **Policy anchor** | `M55_PHASE5_6H_5Z_I_V_CORE_DTR_SOFT_HIDE_REPURCHASE_A_USER_VISIBLE_HIDE_REPURCHASE_SPEC_PLANNING_2026-05-21.md` |

**This gate:** planning only.** **No** migration apply, code, checkout, payment, env, deploy, Production DB write, or **CORE-DTR-VERIFY-C**.

---

## B. Planning outputs（decision record）

| # | Area | Decision |
|---|------|----------|
| **1** | **Schema columns** | Add **`user_hidden_at`**, **`user_hidden_source`**, **`user_hidden_reason`** — **defer `user_hidden_by`** |
| **2** | **Unique constraint** | **Drop** table `UNIQUE (user_id, product_id)` · **Add** partial unique index **`WHERE user_hidden_at IS NULL`** |
| **3** | **Read path** | New **`getVisibleDtrReportSnapshot`** — hidden rows excluded from all user surfaces |
| **4** | **Checkout** | Block on **visible** snapshot only；**hidden-only** → allow new session（**not** blocked by entitlement alone） |
| **5** | **Fulfillment** | Repurchase → **INSERT** new visible row；hidden rows **immutable**；wallet link → **SOFT-HIDE-E** |
| **6** | **Legal / refund** | User **削除** ≠ refund；commerce evidence retained；no user re-show |

---

## C. Schema decision（§1）

### C1. Approved columns（B1 migration）

| Column | Type | Default | Nullable | SSOT meaning |
|--------|------|---------|----------|--------------|
| **`user_hidden_at`** | `timestamptz` | — | **YES** | **NULL** = visible to user；**NOT NULL** = soft-deleted from user UI |
| **`user_hidden_source`** | `text` | — | **YES** | Initiator channel（controlled vocabulary） |
| **`user_hidden_reason`** | `text` | — | **YES** | Optional slug / short note — **no PII**, no freeform user essay in v1 |

**`user_hidden_source` allowed values（v1）：**

| Value | When |
|-------|------|
| **`my_panel`** | User tapped **削除** on `/my` |
| **`dtr_shelf`** | Future shelf-initiated hide（if added） |
| **`admin_support`** | Ops restore/hide tool（future） |

### C2. Rejected / deferred

| Proposal | Verdict | Reason |
|----------|---------|--------|
| **`visibility_status text` enum only** | **reject as sole field** | Loses **when** hide happened；A SSOT |
| **`user_hidden_by text`** | **defer（v1 omit）** | Row already has **`user_id`**（owner）；admin actor → use **`user_hidden_source = admin_support`** + ops audit log outside row |
| **Hard delete column** | **reject** | Violates D3 / P7 |

### C3. Column comments（B1 SQL must include）

```text
user_hidden_at: NULL = user-visible saved report; set at user 削除 (soft hide).
user_hidden_source: Channel that set hide (my_panel | dtr_shelf | admin_support).
user_hidden_reason: Optional non-PII slug for support correlation.
```

### C4. Backfill policy

| Existing Production rows | Action |
|------------------------|--------|
| All current snapshots | **`user_hidden_at` remains NULL**（visible）— **no** data rewrite |
| `envelope_json` / `profile_snapshot` | **no UPDATE** in migration |

---

## D. Constraint / index decision（§2）

### D1. Current state（repo migration `20260420000000`）

```sql
UNIQUE (user_id, product_id)  -- blocks second row even if first is hidden
```

**Implication today:** repurchase INSERT **impossible** without constraint change.

### D2. Target state（B1）

| Step | SQL intent |
|------|------------|
| **D2.1** | `ALTER TABLE … ADD COLUMN` ×3（nullable, no default） |
| **D2.2** | `ALTER TABLE … DROP CONSTRAINT dtr_report_snapshots_user_id_product_id_key`（name verified in staging preflight） |
| **D2.3** | `CREATE UNIQUE INDEX dtr_report_snapshots_one_visible_per_user_product_uq ON public.dtr_report_snapshots (user_id, product_id) WHERE (user_hidden_at IS NULL)` |

### D3. Index hygiene

| Index | Action |
|-------|--------|
| **`idx_dtr_report_snapshots_user`** | **Keep** — still useful for user-scoped lists |
| **New partial unique** | **Required** |
| **Optional（B1 or C）** | `(user_id, product_id, user_hidden_at)` btree for admin counts — **defer** unless preflight shows slow queries |

### D4. Invariants after migration

| Invariant | Enforcement |
|-----------|-------------|
| ≤1 **visible** row per `(user_id, product_id)` | Partial unique index |
| ≥0 **hidden** rows per `(user_id, product_id)` | Allowed |
| Hide operation | `UPDATE` **only** hide columns — **never** envelope/profile |

### D5. Preflight stop（before apply — B1 readonly）

| Check | Stop if |
|-------|---------|
| `duplicate_user_product_pairs` | count **> 0**（would break partial unique design） |
| `dtr_report_snapshots` table missing | migration chain broken |
| Constraint name mismatch | **STOP** — fix SQL name in B1 draft |

---

## E. Read-path decision（§3）

### E1. API surface（code gate **SOFT-HIDE-C** — not B）

| Function | Behavior |
|----------|----------|
| **`getVisibleDtrReportSnapshot(userId, productId)`** | `.eq('user_id').eq('product_id').is('user_hidden_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()` |
| **`getDtrReportSnapshot`（legacy name）** | **Deprecate** → delegate to visible helper or rename call sites in C |
| **`getHiddenDtrReportSnapshots`（admin only）** | **Future** — not user route；support SQL / internal tool |

### E2. Consumer matrix

| Consumer | Visible-only? | Hidden behavior |
|----------|---------------|-----------------|
| **`/dtr/core`** | **yes** | Redirect — no hidden body |
| **`/my` OwnedReportsBlock** | **yes** | Row omitted |
| **`resolveDtrShelfAccess` / `snapshotReady`** | **yes** | `snapshotReady = false` → repurchase CTA path |
| **`dtrOwnershipGate` / `reportInstanceId`** | **yes** | Must not return hidden id as active reader |
| **`/api/dtr/report-snapshot-ready`** | **yes** | `hasPurchaseSnapshot` = visible only |
| **Reply ticket checkout validate** | **yes** | `report_instance_id` must reference **visible** snapshot owned by user |
| **Support / evidence SQL** | **no filter** | Full row history including hidden |

### E3. PostgREST / `maybeSingle`

| Case | Result |
|------|--------|
| 0 visible rows | `null` |
| 1 visible row | row |
| 2+ visible rows | **DB invariant violation** — treat as `null` + ops alert（same as today multi-row） |

---

## F. Checkout decision（§4）

### F1. Block matrix（SSOT for **SOFT-HIDE-D**）

| State | `already_purchased` | `fulfillment_pending` | New Stripe session |
|-------|---------------------|----------------------|-------------------|
| **Visible snapshot** | **409** | n/a | **deny** |
| **Hidden only** + **owned** | **no** | **no**（repurchase lane） | **allow** |
| **Hidden only** + **not owned** | **no** | n/a | **allow**（fresh purchase） |
| **No rows** + **owned** + pending session | **no** | **409**（unchanged recovery） | deny until recovery |
| **No rows** + **owned** + no pending | **no** | **409** today | **B-D:** distinguish **never fulfilled** vs **hidden-only repurchase** |

### F2. Entitlement rule（Human lock）

| Rule | Status |
|------|--------|
| **Entitlement alone does not block repurchase** after user **削除** | **mandatory** |
| **Visible snapshot blocks** regardless of entitlement state | **mandatory** |
| Second charge while `entitlements.status = active` | **allowed** by policy — LP copy **「再購入」**（A-R body_p3 aligned） |

### F3. Checkout metadata（D — planning note）

| Field | Purpose |
|-------|---------|
| Optional `repurchase: true` in session metadata | Fulfillment audit trail — **not** URL injection |
| Idempotency | Existing Stripe + `one_time_fulfillments` by `event_id` unchanged |

### F4. Code touchpoint list

| File | Change class |
|------|--------------|
| `app/api/purchase/checkout/route.ts` | visible check + repurchase lane |
| `lib/m55/dtrShelfAccess.ts` | visible `snapshotReady` |
| `components/PurchaseButton.tsx` | handle new success path if needed |

---

## G. Fulfillment impact（§5）

### G1. `upsertDtrReportSnapshotAtFulfillment`（SOFT-HIDE-E）

| Today | Target |
|-------|--------|
| `existing = getDtrReportSnapshot` → skip INSERT | `existingVisible = getVisible…` — if visible → return existing id |
| Any row blocks UNIQUE | If **only hidden** rows → **INSERT** new visible row |
| Hidden row UPDATE | **forbidden** |

### G2. Idempotency / 23505

| Event | Behavior |
|-------|----------|
| Webhook retry after successful INSERT | Reread **visible** row — return same `snapshotId` |
| Race: two INSERT visible | Partial unique → one wins；other **23505** → reread visible |

### G3. Reply wallet / included tickets（defer detail to E）

| Topic | B decision | E gate |
|-------|------------|--------|
| `reply_ticket_wallets.report_instance_id` | On repurchase fulfillment, **re-link active wallet** to **new** visible `id` | Implementation + readonly verify |
| **Initial included tickets** already consumed on old instance | **Do not** auto re-grant on repurchase without product policy | Human confirm in E |
| Consult room threads keyed to old `report_instance_id` | Old sessions stay bound to **hidden** instance | Document in E — no migration of messages |

### G4. Engine flag

| Flag | Interaction |
|------|-------------|
| `M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED` | New repurchase snapshot follows **flag at fulfillment time** — hidden legacy row **unchanged** |

---

## H. Legal / refund / accounting（§6）

| Topic | Policy |
|-------|--------|
| User **削除** | **Not** a refund request；no Stripe Refund API |
| **購入記録** | `one_time_fulfillments`, Stripe Dashboard charge, `entitlements` **retained** |
| **保存記録** | Hidden `dtr_report_snapshots` row **retained** |
| **Accounting** | Second purchase = **new revenue event** — separate from hide |
| **User re-show** | **Not offered** in product UI（A-R R6） |
| **Support restore** | Ops-only future gate — clearing `user_hidden_at` **not** in B |

---

## I. Stop conditions（do not proceed to B1 apply）

| ID | Condition | Action |
|----|-----------|--------|
| **S1** | Staging migration not applied before Production | **STOP** Production apply |
| **S2** | Preflight shows **>1 row** per `(user_id, product_id)` with `user_hidden_at IS NULL` | **STOP** — remediate duplicates first |
| **S3** | B1 SQL contains `DELETE` / `TRUNCATE` / `DROP` on snapshot data | **STOP** — rewrite draft |
| **S4** | B1 updates `envelope_json` / `profile_snapshot` | **STOP** |
| **S5** | App deploy before migration on target DB | **STOP** — code would mis-read rows |
| **S6** | Conflate hide test with **CORE-DTR-VERIFY-C** | **STOP** — separate Human GO |
| **S7** | `failed_fulfillments_24h > 0` on Production（ops policy） | **STOP** apply until cleared |

---

## J. Environment order（implementation chain post-B）

```text
B (this doc) → B1 migration draft → B1-S staging apply + readonly verify
  → C read-path + hide API → D checkout → E fulfillment + wallet
  → F Production smoke（not VERIFY-C）
```

| Layer | Must deploy before |
|-------|------------------|
| **DB migration** | App code using `user_hidden_at` filter |
| **Hide API** | `/my` delete button |
| **Checkout repurchase** | Migration + visible helper |

---

## K. B1 migration draft scope（next gate）

| Deliverable | Owner gate |
|-------------|------------|
| `supabase/migrations/20260XXXX_soft_hide_dtr_report_snapshots.sql` | **SOFT-HIDE-REPURCHASE-B1** |
| `scripts/sql/staging/m55_soft_hide_dtr_report_snapshots_preflight_v1.sql` | **B1** |
| `scripts/sql/staging/m55_soft_hide_dtr_report_snapshots_apply_verify_v1.sql` | **B1-S**（apply Human GO） |

**B1 SQL skeleton（non-executable in B）：**

```sql
-- ADD columns (nullable)
-- DROP CONSTRAINT <verified_name>
-- CREATE UNIQUE INDEX ... WHERE user_hidden_at IS NULL
-- COMMENT ON COLUMN ...
-- NO DELETE / NO UPDATE of envelope_json
```

---

## L. No-mutation statement

| Action | Status |
|--------|--------|
| DB migration apply（staging / production） | **no** |
| code change | **no** |
| checkout / payment / webhook | **no** |
| env / deploy / main push | **no** |
| **CORE-DTR-VERIFY-C** | **no** |
| snapshot DELETE / content UPDATE | **no** |

---

## M. Next gates

| Priority | Gate |
|----------|------|
| **1** | **CORE-DTR-SOFT-HIDE-REPURCHASE-B1** — migration SQL draft + staging preflight script |
| **2** | **CORE-DTR-SOFT-HIDE-REPURCHASE-B1-S** — staging apply + readonly verify（Human GO） |
| **3** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C** — `getVisibleDtrReportSnapshot` + hide API + `/my` UI |

**Optional parallel:** **CORE-DTR-UI-POLISH-A**, **CORE-DTR-UI-GUARD** Production — no schema dependency until C.

---

## N. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Schema migration planning per Human B gate |
