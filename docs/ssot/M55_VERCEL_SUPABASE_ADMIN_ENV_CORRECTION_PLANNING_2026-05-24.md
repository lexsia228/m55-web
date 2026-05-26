# Phase VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-PLANNING — Production env fix packet（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-PLANNING** |
| **Title** | **Fix missing Supabase admin env on Vercel Production for webhook fulfillment** |
| **Classification** | **Category 2 / planning only / no-mutation** |
| **Verdict** | **`VERCEL_SUPABASE_ADMIN_ENV_CORRECTION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-PLANNING-001`** |
| **Date** | **2026-05-24** |
| **Prior diagnostic** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_WEBHOOK_500_DIAGNOSTIC_R_BLOCKED_FULFILLMENT_MISSING_NO_MUTATION`** @ **`M55-EVID-20260524-FRESH-WEBHOOK-500-DIAGNOSTIC-R-001`** |
| **Production app deploy** | **`2ef7ae8`** · **`m55-webv2.vercel.app`** |
| **Mutation in this gate** | **no** |

**Planning GREEN.** Vercel CLI read-only inventory confirms **`NEXT_PUBLIC_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** are **absent from Production** · present on **Preview only**. Execution packet frozen for **EXEC gate**（separate Human GO）.

---

## B. Root cause reaffirmation

| Layer | Finding |
|-------|---------|
| **Webhook 500** | **`ENV_MISSING:SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`** @ `getSupabaseAdmin()` |
| **Signature verify** | **inferred PASS**（400 not observed） |
| **Fulfillment** | **not started** · cohort SQL **all 0** |
| **Stripe payment** | **paid** · **`checkout.session.completed`** delivered |
| **Deterministic retry** | **FAIL until Production env + redeploy** |

---

## C. Planning Q&A

### Q1. Are required vars absent in Vercel Production?

**Yes — confirmed via read-only `vercel env ls`.**

| Variable | Production | Preview |
|----------|------------|---------|
| **`NEXT_PUBLIC_SUPABASE_URL`** | **absent** | **present** |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **absent** | **present** |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | **absent** | **present** |
| **`SUPABASE_URL`** | **absent** | **present**（legacy name · **not** read by `getSupabaseAdmin()`） |

**Production env inventory（names only · no values）：** includes **`STRIPE_*`**, **`CLERK_*`**, **`M55_OPS_*`**, **`OPENAI_API_KEY`**, **`M55_PROTO_TOKEN`** — **no Supabase keys**.

### Q2. If present elsewhere, are names mismatched from code?

**Production: N/A — absent.**

**Code expectation**（`lib/supabaseAdmin.ts`）:

| Required by code | Notes |
|------------------|-------|
| **`NEXT_PUBLIC_SUPABASE_URL`** | **not** `SUPABASE_URL` alone |
| **`SUPABASE_SERVICE_ROLE_KEY`** | service role · server-only |

**Preview has correct names** but **wrong target environment** for live webhook on **`m55-webv2.vercel.app`**.

### Q3. Preview-only / not Production?

**Yes.**

All Supabase-related Vercel env entries observed are scoped to **`Preview`** only · **not** **`Production`**.

This matches webhook **500** on Production URL while Preview deployments would have Supabase admin available.

### Q4. What exact Vercel project / environment must be corrected?

| Field | Target |
|-------|--------|
| **Vercel org** | **`m55-official`** |
| **Vercel project** | **`m55-webv2`** · **`prj_xV9X6WGhIkBoowsrak8qQPJVJJbX`** |
| **Environment** | **`Production`** only（this correction gate） |
| **Public URL** | **`https://m55-webv2.vercel.app`** |
| **Webhook route** | **`/api/stripe/webhook`** |
| **Supabase target（Human attestation）** | **`m55-soul-core` Production plane** · **not** shadow/preview DB |

**Do not** change Preview-only vars as substitute for Production fulfillment.

### Q5. Is redeploy required after env update?

**Yes — mandatory.**

| Rule | Source |
|------|--------|
| Vercel runtime reads env at deploy/build for serverless | ops SSOT |
| **`M55_INCIDENT_2026-05-08_WEBHOOK_ENV_MIXUP`** §5 | redeploy after env confirmation |
| Prior notify gates | empty-commit redeploy pattern documented |

**Planning:** after Production env add/update → trigger **Production redeploy** of **`main`** @ current HEAD（**`2ef7ae8`** or later）· verify deployment **Ready** before fulfillment observation.

### Q6. How to verify webhook path after redeploy **without replay**?

| # | Method | Safe output | Mutation |
|---|--------|-------------|----------|
| **V-1** | **`GET /api/diagnostics/env`** on Production | **`present.NEXT_PUBLIC_SUPABASE_URL: len=N`** · **`present.SUPABASE_SERVICE_ROLE_KEY: len=N`** · **not `MISSING`** | **no** |
| **V-2** | Vercel dashboard env list | variable **names** present under **Production** | **no** |
| **V-3** | Wait **Stripe natural retry** · read Vercel log line | **`POST /api/stripe/webhook` → 200** · **not** `ENV_MISSING` | **no replay** |
| **V-4** | Stripe delivery dashboard | **http 200** on retry attempt | **no replay** |

**Prohibited in verify gate without separate GO:** manual **Send test webhook** · Stripe CLI replay · repair runner.

**Note:** `/api/diagnostics/env` is middleware-allowed · returns **`len=`** only · no secret values.

### Q7. Natural retry vs `/dtr/processing` reload?

| Priority | Path | Gate | Policy |
|----------|------|------|--------|
| **P0** | **Stripe natural retry** after env fix + redeploy | **`FRESH-WEBHOOK-500-ENV-FIX-VERIFY-R`** | **Preferred first** · no operator replay |
| **P1** | **Signed-in `/dtr/processing?session_id=…` reload** | **`FRESH-CHECKOUT-PROCESSING-RELOAD`**（separate GO） | Idempotent **`fulfillDtrCoreFromCheckoutSessionId`** · **no second payment** |
| **P2** | **Repair runner** | **`FRESH-CHECKOUT-FULFILLMENT-REPAIR-PLANNING`** | Only if P0+P1 insufficient · explicit GO |

**Do not** click **`PurchaseButton`** again.

### Q8. Post-fix fulfillment proof SQL?

**Script:** `scripts/sql/production/m55_backend_commerce_contract_c_fresh_checkout_fulfillment_readonly_v1.sql`

| When | Sections |
|------|----------|
| **After fulfillment observed** | **§0** DB name · **§2** S-5 · **§3–§4** cohort hash band |
| **Gate** | **`FRESH-FULFILLMENT-R`** → **`FRESH-DTR-UNLOCK-R`** |

**Expected post-fix cohort band:**

| Metric | Expected |
|--------|----------|
| **`cohort_one_time_fulfillments_count`** | **1** |
| **`cohort_active_entitlements_count`** | **1** |
| **`cohort_entitlement_rights_core_origin_count`** | **1** |
| **`cohort_visible_snapshot_count`** | **1** |
| **`cohort_scoped_active_wallet_count`** | **≥ 1** |
| **`cohort_scoped_available_count_max`** | **≥ 1** |
| **`cohort_included_grant_ledger_count`** | **≥ 1** |
| **S-5** | **0 / 0** |

**Attach frozen labels:** **`launch-cohort-primary`** · **`M55-core-Development`** · **`M55-EVID-20260523-AUTH-NAMESPACE-FRESH-CHECKOUT-CANARY-FREEZE-R-001`**.

---

## D. Env correction target（EXEC gate scope）

### D.1 Required variables（Production · names only）

| # | Variable | Action |
|---|----------|--------|
| **1** | **`NEXT_PUBLIC_SUPABASE_URL`** | **add to Production** |
| **2** | **`SUPABASE_SERVICE_ROLE_KEY`** | **add to Production** |

### D.2 Value source（Human-only · not in SSOT）

| Step | Human action |
|------|--------------|
| **S-1** | Supabase dashboard · project **`m55-soul-core`** · **Production** settings |
| **S-2** | Copy **Project URL** → map to **`NEXT_PUBLIC_SUPABASE_URL`** |
| **S-3** | Copy **service_role secret** → map to **`SUPABASE_SERVICE_ROLE_KEY`** |
| **S-4** | **Do not** use Preview/shadow project credentials |
| **S-5** | **Do not** paste values into chat · SSOT · or git |

### D.3 Optional（not required for webhook admin path）

| Variable | Note |
|----------|------|
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | not used by **`getSupabaseAdmin()`** · add only if other routes need |
| **`SUPABASE_URL`** | **legacy** · code does **not** read · **do not substitute** for **`NEXT_PUBLIC_SUPABASE_URL`** |

### D.4 Safe value attestation（Human · no secrets in SSOT）

Human may record **only**:

| Field | Allowed |
|-------|---------|
| **`supabase_project_label`** | **`m55-soul-core`** |
| **`url_host_pattern_check`** | **`*.supabase.co`** · matches Production project ref（no full URL in SSOT） |
| **`service_role_key_length_band`** | e.g. **`len>100`** via diagnostics route after deploy |
| **`vercel_env_scope`** | **`Production`** |

---

## E. Redeploy plan（EXEC gate）

| Step | Action |
|------|--------|
| **R-1** | Human GO **`VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-EXEC go`** |
| **R-2** | Add **§D.1** vars to **Production** |
| **R-3** | Confirm Vercel UI shows both names under **Production** |
| **R-4** | Trigger **Production redeploy**（push or redeploy from dashboard · no code change required if **`2ef7ae8`** current） |
| **R-5** | Wait **Ready** · deployment SHA recorded（short hash only） |
| **R-6** | Run **§C Q6 V-1** diagnostics env probe |
| **R-7** | Open **`FRESH-WEBHOOK-500-ENV-FIX-VERIFY-R`** |

---

## F. Retry / processing reload plan

```text
ENV-CORRECTION-EXEC (add vars + redeploy)
  → ENV-FIX-VERIFY-R (diagnostics + natural retry 200)
  → FRESH-FULFILLMENT-R (SQL counts)
  → FRESH-DTR-UNLOCK-R (app unlock)
```

| If natural retry exhausted without 200 | Next |
|----------------------------------------|------|
| **Processing reload gate** | Same paid session · **`/dtr/processing`** · no new payment |
| **Still blocked** | Repair planning · **no blind replay** |

---

## G. Hard prohibitions（all gates until fulfillment GREEN）

| Action | Status |
|--------|--------|
| Second checkout / payment | **prohibited** |
| **`PurchaseButton`** re-click | **prohibited** |
| Webhook manual replay | **prohibited** without separate GO |
| Manual grant / fulfillment | **prohibited** |
| Repair runner | **prohibited** without separate GO |
| DB write / SQL mutation | **prohibited** |
| VERIFY-C | **HOLD** |
| Raw secrets / IDs in SSOT | **prohibited** |
| SELECT * | **prohibited** |

---

## H. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| Vercel env change | **no** |
| redeploy | **no** |
| webhook replay | **no** |
| checkout retry | **no** |
| DB / SQL mutation | **no** |
| Stripe mutation | **no**（read-only CLI/dashboard inventory only） |

---

## I. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-EXEC`** | **yes** · env + redeploy · Human GO |
| **2** | **`FRESH-WEBHOOK-500-ENV-FIX-VERIFY-R`** | **no** · observe natural retry |
| **3** | **`FRESH-FULFILLMENT-R`** | **no** · SQL counts |
| **4** | **`FRESH-DTR-UNLOCK-R`** | **no** · app attestation |
| **5** | **`FRESH-CHECKOUT-PROCESSING-RELOAD`** | **no** · only if retry insufficient |

---

## J. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260524-VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-PLANNING-001`** | **本条** |
| **`M55-EVID-20260524-FRESH-WEBHOOK-500-DIAGNOSTIC-R-001`** | Webhook 500 root cause |
| **`M55-EVID-20260523-AUTH-NAMESPACE-FRESH-CHECKOUT-CANARY-FREEZE-R-001`** | Cohort namespace |

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-24 | Planning GREEN · Production Supabase admin env absent · Preview-only |
