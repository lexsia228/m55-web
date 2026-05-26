# Phase BACKEND-COMMERCE-CONTRACT-A-REFUND-POLICY-CLOSEOUT（2026-05-26）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-A-REFUND-POLICY-CLOSEOUT** |
| **Title** | **Contract-A refund / revoke — launch policy + support runbook + user copy draft** |
| **Classification** | **Category 1 / docs-only closeout / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_A_REFUND_POLICY_CLOSEOUT_GREEN_DOCS_ONLY_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260526-BACKEND-COMMERCE-CONTRACT-A-REFUND-POLICY-CLOSEOUT-001`** |
| **Planning source** | **`BACKEND_COMMERCE_CONTRACT_A_REFUND_PLANNING_GREEN_READONLY_NO_MUTATION`** |
| **Planning evidence** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** |
| **Date** | **2026-05-26** |
| **Deploy anchor** | **`bb85e06`** on origin/main |
| **BC-GAP-006** | **Not a launch blocker** — policy-only + manual support at launch |
| **Launch stance** | **Policy-only + manual support** — **no** automated refund revoke at launch |

**Docs-only.** No runtime code · Stripe refund · DB mutation · webhook replay · deploy.

---

## B. Core finding（from Contract-A refund planning）

| # | Finding |
|---|---------|
| 1 | **¥500 additional reply** refund / revoke lane is **not automated** in webhook (`charge.refunded` looks up `one_time_fulfillments` only; reply lane uses RPC + `stripe_processed_events`). |
| 2 | **¥1,000 DTR full refund** currently **revokes `entitlements` + deletes `entitlement_rights`** on full `charge.refunded` — **does not** remove visible snapshot · wallet · ledger rows. |
| 3 | **Snapshot-priority ownership** (`dtr_report_snapshots` visible row first) means **refund ≠ guaranteed access removal** without separate ops steps. |
| 4 | **Partial refund** (`amount_refunded < amount`) → **no revoke** (existing code policy). |
| 5 | **Consumed replies** must **never** be auto-undone; **no negative wallet balances**. |
| 6 | **Automated refund revoke** (¥500 RPC · ¥1k snapshot-linked revoke) is **post-release P1** — **not** launch-blocking. |
| 7 | Fresh commerce lane · R10-R · ¥500 payment smoke remain **GREEN** — this closeout **does not** change runtime behavior. |

---

## C. Launch policy（authoritative for release）

| Rule | Policy |
|------|--------|
| **Launch mode** | **Policy-only + manual support** |
| **Refund intake** | **Support channel only** — no self-service revoke UI at launch |
| **Paid report / messages** | **Do not automatically delete** snapshot · consult messages · reply documents |
| **Consumed ¥500 reply** | Refund may be **considered** individually — **consumption is not reversed** automatically |
| **Unused ¥500 credit** | May be **manually adjusted** after support review — **separate Human GO** for any DB change |
| **Partial refund** | **Access remains** unless support explicitly handles otherwise (aligns with current webhook) |
| **Stripe execution** | Support / authorized ops in **Stripe Dashboard** — not in this SSOT gate |
| **DB mutation** | **Not authorized** in this gate — escalate to future **manual ops** gates |
| **VERIFY-C** | **HOLD** — unchanged |

---

## D. ¥1,000 DTR refund policy

| Scenario | Policy |
|----------|--------|
| **Full refund** | Process via **Stripe Dashboard** or support-authorized Stripe action · record **safe-label** evidence only in tickets (no raw IDs in SSOT) |
| **Access removal needed** | **Do not delete** `dtr_report_snapshots` blindly · use **soft-hide** / wallet **`closed`** / entitlement review under **separate Human GO** (future automated bundle = post-release) |
| **Entitlement** | Webhook may set **`revoked`** on full refund — **verify** visible snapshot still grants access before closing ticket |
| **Wallet / ledger** | **No automatic** included_grant / purchase_grant reversal at launch · manual **`recovery_adjust`** only with ops GO |
| **Partial refund** | **Keep access** per current `handleChargeRefunded` behavior unless support decides otherwise |
| **Consultation history** | **Retain** messages and reply history — refund does not imply content erasure |
| **Post-release** | Snapshot-linked revoke via idempotent RPC — **`BACKEND-COMMERCE-CONTRACT-A-REFUND-WEBHOOK-IMPLEMENTATION-PLANNING`** |

---

## E. ¥500 additional reply refund policy

| Scenario | Policy |
|----------|--------|
| **Unused** (`available_count > 0` for purchased slot) | Classify as **manual wallet adjustment candidate** after Stripe refund confirmed · **no negative balances** |
| **Consumed** | Refund **may** be approved case-by-case — **ticket / message consumption not reversed** · no automatic ledger deletion |
| **Webhook today** | **No-op** for reply SKU on `charge.refunded` — ops must not assume auto-revoke |
| **Ledger** | Future: **`purchase_revoke`** or **`refund_reversal`** event type + idempotent RPC — **not** at launch |
| **Cap** | After manual adjust, re-check **5-cap** invariant — counts-only readonly SQL if unsure |

---

## F. Included reply policy（from ¥1,000 DTR）

| Rule | Policy |
|------|--------|
| **At launch** | **Included reply is not automatically revoked** on DTR refund |
| **DTR full refund** | Does **not** auto-delete consultation or reply history |
| **Unused included** | Manual wallet review only under ops GO |
| **Future** | DTR refund RPC may bundle **wallet close** + **snapshot soft-hide** — post-release |

---

## G. User-facing minimum copy（DRAFT）

> **Status:** **DRAFT** — requires **legal + support review** before placement on `/support`, `/legal/*`, or product UI. **Not** authorized for public pages in this gate.

**日本語（1段落・平易）:**

> 返金をご希望の場合は、サポート窓口よりお問い合わせください。内容を確認のうえ、個別にご案内します。すでにお届けしたレポートの閲覧、相談・返書の履歴、送信済みの返書については、返金の有無や手続の状況により、引き続きご利用いただける場合があります。追加返書チケット（有料）をまだお使いになっていない場合は、返金手続きとあわせて残数の調整を行うことがあります。送信済みの返書については、原則として利用の取り消しは行いません。最終的な対応は、個別のご状況に応じてサポートが判断します。

| Constraint | Met |
|------------|-----|
| Individual review via support | **yes** |
| Delivered content may remain | **yes** |
| Unused additional credit may be adjusted | **yes** |
| No hard legal guarantees | **yes** |
| Plain language | **yes** |

---

## H. Support runbook（safe labels only）

### H.1 Intake

| Step | Action |
|------|--------|
| 1 | Receive refund request via **support channel** |
| 2 | Classify product lane: **`lane_dtr_1000`** · **`lane_reply_500`** · **`lane_unknown`** |
| 3 | Record **date** · **amount (JPY)** · **lane** · **unused vs consumed** (for ¥500) — **no** raw user_id · email · UUID · Stripe IDs in SSOT tickets |

### H.2 Diagnosis（read-only · separate gate if SQL needed）

| Lane | Read-only checks (counts / booleans only) |
|------|-------------------------------------------|
| **¥1,000** | `entitlements` status · visible snapshot count · `one_time_fulfillments` presence · `failed_fulfillments_24h` |
| **¥500** | scoped wallet **`available_count`** · **`consumed_count`** · **`purchased_count`** · ledger event types present |
| **Either** | Confirm **no active S-5 bleed** before any future manual adjust (ops monitor scripts) |

### H.3 Stripe action

| Step | Action |
|------|--------|
| 1 | Execute refund in **Stripe Dashboard** only with **Human GO** |
| 2 | Note **safe label** only in internal ticket (e.g. `refund_executed_yes` · `full_vs_partial`) |
| 3 | **Do not** webhook replay unless separate authorized gate |

### H.4 Post-refund expectations（do not assume auto-fix)

| Lane | Expected system behavior after Stripe refund (today) |
|------|-----------------------------------------------------|
| **¥1,000 full** | Entitlement may show **revoked** · snapshot may still **visible** · wallet/ledger **unchanged** |
| **¥500** | Wallet/ledger likely **unchanged** · user may still show **残り N件** |

### H.5 Escalation

| Condition | Escalate to |
|-----------|-------------|
| Access must be removed | Future **manual ops gate** (soft-hide · wallet close · `recovery_adjust`) — **not** this closeout |
| Wallet adjust needed | **`BACKEND-COMMERCE-CONTRACT-A-REFUND-MANUAL-OPS-*`** (future) with explicit Human GO |
| Duplicate payment / webhook | Contract B/C support table · **no** blind grant |
| Consumed ¥500 + refund approved | Support classification only — **no** message deletion |

**Support must never paste in tickets:** raw user_id · email · session · Stripe customer/charge/payment_intent IDs.

---

## I. Not authorized（this gate and launch default）

| Action | Status |
|--------|--------|
| Stripe refund execution | **no** |
| DB INSERT / UPDATE / DELETE / RPC write | **no** |
| Webhook replay | **no** |
| Manual grant / revoke in Production | **no** |
| Automated code implementation | **no** |
| Production delete | **no** |
| VERIFY-C | **HOLD** |
| Public placement of §G copy | **no** — draft only |
| `update_candidate` B3 SQL | **no** |

---

## J. Incident-safe invariants（all lanes）

| # | Invariant |
|---|-----------|
| 1 | **Never** delete paid report snapshot rows blindly |
| 2 | **Never** create **negative** `available_count` |
| 3 | **Never** auto-revoke **consumed** reply slots |
| 4 | **Never** delete consultation messages or reply documents as part of refund automation |
| 5 | Refund of **consumed ¥500** → **manual classification** only |
| 6 | Idempotency required for any **future** automated refund handler |

---

## K. Future gates

| Priority | Gate |
|----------|------|
| **P0** | **`BACKEND-COMMERCE-CONTRACT-A-REFUND-POLICY-PUSH-GO`** — push this doc + SSOT index |
| **P1** | **`BACKEND-COMMERCE-CONTRACT-A-REFUND-MONITOR-READONLY-PLANNING`** |
| **P2** | **`BACKEND-COMMERCE-CONTRACT-A-REFUND-WEBHOOK-IMPLEMENTATION-PLANNING`** |
| **P3** | **`VERIFY-C-REENTRY-PLANNING`** |
| **P4** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-PLANNING`** |
| **P5** | **`RELEASE-READINESS-OPS-MONITOR-R11`** |

---

## L. Evidence registry

| Evidence ID | Role |
|-------------|------|
| **`M55-EVID-20260526-BACKEND-COMMERCE-CONTRACT-A-REFUND-POLICY-CLOSEOUT-001`** | **This closeout** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** | Contract-A planning · BC-GAP-006 |
| **`M55-EVID-20260526-RELEASE-READINESS-OPS-MONITOR-R10-R-001`** | Ops monitor anchor |

---

## M. No-mutation confirmation

| Prohibition | Status |
|-------------|--------|
| Runtime code edit | **no** |
| Stripe refund / settings | **no** |
| DB / SQL execution | **no** |
| Production mutation | **no** |
| old 62-file pending Cursor thread | **untouched** |
