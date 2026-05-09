# M55 Purchase Flow Split (SSOT)

**Purpose:** Keep **DTR base report (¥1,000)** and **additional reply ticket (¥500)** in **separate** product lanes — different env keys, different fulfillment paths, different success criteria. **Do not** treat reply-ticket success as core report purchase success.

## 1. Lane A — DTR base report ¥1,000

| Item | Value |
|------|--------|
| **Price env** | `STRIPE_PRICE_DTR_CORE_STATIC_V1` |
| **Purpose** | Paid report **entitlement** / **snapshot** / **access** to the core DTR product |
| **Fulfillment** | Stripe webhook → app fulfillment path for core product (not reply-ticket ledger) |
| **Current gate** | **Preview** webhook fulfillment verified end-to-end on **work/home-cluster** + Shadow/Test DB |

**Rules**

- Core report “unlocked” state must come from this lane’s fulfillment and snapshot pipeline.
- Webhook endpoint and DB for this lane must match **Preview** when testing Preview (see environment matrix).

## 2. Lane B — Additional reply ticket ¥500

| Item | Value |
|------|--------|
| **Price env** | `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` |
| **Purpose** | `reply_ticket_wallets` / ledger / reply creation capacity — **scoped** additional ticket SKU |
| **Fulfillment** | Separate checkout route and webhook handling for reply-ticket lane (do not conflate with core DTR fulfillment) |
| **Current state** | **Local E2E GREEN** (per program status); Preview/production verification is a **separate** gate |

**Rules**

- Do **not** use reply-ticket checkout success to infer core report ownership or snapshot readiness.
- Do **not** merge env vars or webhook “one handler for everything” without explicit contract documentation.

## 3. Explicit non-equivalence

- **Additional reply success ≠ DTR base report purchase success.**
- Debugging “report won’t open” must start in **Lane A** (core price, core webhook, core fulfillment, DB project), not in Lane B.

## 4. References

- `docs/ssot/M55_ENVIRONMENT_MATRIX.md`
- `docs/ssot/M55_STRIPE_WEBHOOK_ENDPOINT_REGISTRY.md`
- `docs/ssot/M55_INCIDENT_2026-05-08_WEBHOOK_ENV_MIXUP.md`
