# Phase STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-PLANNING（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-PLANNING** |
| **Title** | **Production `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` live Price correction packet** |
| **Classification** | **Category 2 / planning-only / no env · Stripe · deploy · payment** |
| **Verdict** | **`STRIPE_ADDITIONAL_REPLY_PRICE_ENV_CORRECTION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-PLANNING-001`** |
| **Date** | **2026-05-24** |
| **Prior diagnostic** | **`FRESH_ADDITIONAL_REPLY_500_PRECHECKOUT_FAIL_DIAGNOSTIC_R`** — **`stripe_session_create_failed`** · **`resource_missing`** |
| **Production app** | **`23eb8a1`** (unchanged until redeploy after EXEC) |

---

## B. Failed stage summary（confirmed）

| Field | Value |
|-------|--------|
| **Route** | **`POST /api/reply-tickets/checkout`** |
| **HTTP** | **502** |
| **stage** | **`stripe_session_create_failed`** |
| **stripePricePresent** | **true** |
| **stripeSecretPresent** | **true** |
| **reportInstanceIdPresent** | **true** |
| **Stripe** | **`StripeInvalidRequestError`** · **`resource_missing`** |
| **Meaning** | **Live `STRIPE_SECRET_KEY` + test-mode `Price` id** → “No such price / similar object exists in test mode” |
| **Checkout session** | **not created** |
| **Payment** | **not executed** |

**Not** `price_env_missing` (env key is set). **Not** wallet gate failure (would use distinct JP copy).

---

## C. Planning Q&A

### Q1. Current Vercel Production value class for `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`?

| Item | Record |
|------|--------|
| **Key presence** | **yes** (Vercel Production inventory · encrypted) |
| **Value class** | **test-mode Stripe Price id** (inferred from **`resource_missing`** with **live secret present**) |
| **Safe prefix/suffix in SSOT** | **none** — Stripe `price_*` ids are not mode-distinguishable by string; **do not paste partial id** |
| **Agent full value read** | **not performed** (forbidden) |

### Q2. Does Stripe Dashboard have a Live mode ¥500 Price for 追加相談返書?

**Human verification required** in **Stripe Dashboard → Live mode → M55WEB** (or org live account used by Production).

**Look for:**

- **Currency:** **JPY**
- **Amount:** **¥500** · **one-time**
- **Product semantics:** additional reply / 追加相談返書 (operational label)
- **Active** price object

**Agent cannot confirm Dashboard state in this gate.**

### Q3. Is the current env value a test mode Price?

**Yes — operationally confirmed** via Vercel runtime log + Stripe **`resource_missing`** semantics against **live secret** (Fresh ¥1,000 DTR checkout success implies **live secret** on Production).

### Q4. Create new Live Price or select existing Live Price?

| Step | Action |
|------|--------|
| 1 | **Prefer select existing** Live ¥500 one-time Price if Dashboard already has correct SKU |
| 2 | **Else create new** Live Product + Price (**¥500 JPY** · one-time) in **EXEC** gate only |
| 3 | **Do not** reuse test-mode Price id on Production |
| 4 | **Do not** copy Preview/test env value into Production without Live mode verification |

**Parallel:** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** was corrected for Production live path (Contract-C / 5U family).

### Q5. Exact Vercel correction target?

| Target | Value |
|--------|--------|
| **Team / project** | **`m55-official` / `m55-webv2`** |
| **Environment** | **Production** |
| **Env key (code contract)** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** |
| **Not** | `STRIPE_PRICE_REPLY_TICKET` (nonexistent in code) |
| **Preview / Development** | **Out of scope** unless separately broken; **this packet fixes Production live mismatch only** |

### Q6. Redeploy required after env update?

**Yes.** Vercel Production env changes require **redeploy** (or new deployment) before runtime reads updated Price id. Same rule as Supabase admin env correction / DTR price activation gates.

### Q7. How to verify after redeploy **without payment**?

| Method | Allowed in post-EXEC verify | Notes |
|--------|----------------------------|-------|
| **`/api/diagnostics/env`** | **partial** | **Does not** list Stripe price keys today — **presence/length only** for Supabase/Clerk |
| **Vercel env inventory** | **yes** | **Key name** still **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** — **no value paste** |
| **Human Dashboard** | **yes** | Confirm selected Price is **Live** · **¥500 JPY** |
| **Signed-in DevTools `POST /api/reply-tickets/checkout`** | **yes · STOP before pay** | Expect **200** + JSON with **`checkout_url` present** · Vercel log **`reply_ticket_checkout_session_created`** · **do not** `window.location` to Stripe · **do not** complete payment |
| **Webhook / fulfillment SQL** | **no** | Not needed for precheckout verify |
| **¥500 CTA click in UI** | **no** until **`FRESH-ADDITIONAL-REPLY-500-PRECHECKOUT-R`** fresh GO |

### Q8. When can ¥500 CTA be clicked again?

**Only after ALL:**

1. **`STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-EXEC`** (env update + redeploy)
2. **Post-redeploy verify** (checkout API **200** + session create log · **no payment**)
3. **`FRESH-INCLUDED-REPLY-CONSUME-SQL-R` GREEN** (unless already closed separately)
4. **Explicit fresh GO** for **`FRESH-ADDITIONAL-REPLY-500-PRECHECKOUT-R`** or payment smoke

### Q9. Prevent duplicate / accidental payment?

| Rule | |
|------|--|
| **Planning / EXEC correction gates** | **zero** checkout clicks |
| **Precheckout R gate** | **at most one** CTA click · **STOP at Stripe hosted page** if opened for URL verify |
| **No second payment** | **ever** without new planning + GO |
| **No webhook replay** | |
| **Idempotency** | fulfillment RPC + `stripe_events` dedupe unchanged |

---

## D. Current env diagnosis

| Layer | Status |
|-------|--------|
| **Code env name** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** ✓ |
| **Production key exists** | **yes** |
| **Production value mode** | **wrong class (test Price on live stack)** |
| **`STRIPE_SECRET_KEY`** | **live-capable** (¥1,000 DTR succeeded) |
| **Wallet / ownership / report_instance_id** | **not root cause** (log flags present; gate errors would differ) |

---

## E. Live Price correction target（EXEC packet — not performed here）

| Field | Target |
|-------|--------|
| **Stripe mode** | **Live** |
| **Amount** | **¥500 JPY** |
| **Billing** | **one-time** (`mode=payment` in code) |
| **Metadata at checkout** | `product_key=additional_reply_ticket` · `report_instance_id` (unchanged) |
| **Vercel binding** | Set **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** to **Live Price id** (value only in Vercel UI · **never SSOT/chat**) |
| **Rollback** | Record prior value location in Human runbook only — **do not store id in SSOT** |

---

## F. Safe verification method（post-EXEC)

```text
1. Vercel Production redeploy → Ready / Current
2. Human Dashboard: Live Price ¥500 exists and matches env (boolean)
3. DevTools POST /api/reply-tickets/checkout (signed-in, owned report)
   → HTTP 200
   → body.checkout_url truthy
   → STOP (do not navigate)
4. Vercel log: event reply_ticket_checkout_session_created
   → no new stripe_session_create_failed resource_missing
```

**FAIL if:** 502/503 · `stripe_error` UI · missing `checkout_url` · log stage `price_env_missing` or `stripe_session_create_failed`.

---

## G. Redeploy plan

| Step | Owner | Action |
|------|-------|--------|
| 1 | Human | Update **Production** env **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** to **Live Price id** |
| 2 | Human | Trigger **Production redeploy** (`m55-webv2` **Production** → **Current**) |
| 3 | Agent/Human | Confirm deploy SHA moves; **no code change required** if env-only |
| 4 | Human | Run **§F verify** (no payment) |

---

## H. Retry / payment boundary

| Action | Planning | EXEC | Precheckout R | Payment smoke |
|--------|----------|------|---------------|---------------|
| Env edit | **no** | **yes** | — | — |
| Redeploy | **no** | **yes** | observe | observe |
| CTA click | **no** | **no** | **≤1** with STOP | **≤1** with GO |
| Second payment | **no** | **no** | **no** | **no** |

---

## I. Included reply consume SQL dependency

| Gate | Status |
|------|--------|
| **`FRESH-INCLUDED-REPLY-CONSUME-SQL-R`** | **HOLD** until **GREEN** (unless Human already closed) |
| **Price correction** | **independent** — can EXEC in parallel with consume SQL close |
| **¥500 paid smoke** | **after** consume SQL GREEN **and** precheckout verify GREEN **and** fresh GO |

---

## J. Hard prohibitions confirmation

env change · Stripe Dashboard mutation · redeploy · checkout retry · CTA click · payment · webhook replay · manual grant · DB write · VERIFY-C · Production DELETE — **all no in this planning gate**.

---

## K. Recommended next gate

| Order | Gate |
|-------|------|
| 1 | **`STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-EXEC`** — Human GO |
| 2 | **`STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-VERIFY-R`** — post-redeploy API verify (no payment) |
| 3 | **`FRESH-INCLUDED-REPLY-CONSUME-SQL-R` close** (parallel) |
| 4 | **`FRESH-ADDITIONAL-REPLY-500-PRECHECKOUT-R`** — after verify GREEN + fresh GO |
