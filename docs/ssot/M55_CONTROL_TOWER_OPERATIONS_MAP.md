# M55 Control Tower Operations Map

Status: **ACTIVE** (durable memory for AI + operators)
Last updated: **2026-09-09**
Companion: `M55_HIGH_COST_EVIDENCE_LEDGER.md` · `AGENTS.md`

## Purpose

This map is **Context-as-Code**: repo-local durable memory for where M55 runs, how environments separate, and what must not be rerun without invalidation. It stores **no secrets** (no keys, tokens, emails, payment IDs, or customer IDs).

## Permanent control rule

`GATE_LOCAL_UNPROVEN != HISTORICALLY_UNPROVEN`

Missing evidence in the current chat or gate report does **not** authorize rerunning a high-cost test. Search SSOT, Git history, prior gate reports, and the high-cost ledger first.

---

## GitHub

| Field | Value |
|---|---|
| Repository | `lexsia228/m55-web` (public Git remote for `m55-webv2` Vercel project) |
| Production source branch | `main` |
| Feature / Preview source | feature branches (e.g. `feat/m55-pair-funnel-v1`) |
| Worktree authority | `docs/ssot/M55_WORKTREE_REGISTRY.md` — folder names are not authority |
| Local vs remote | `git rev-parse HEAD`, `origin/<branch>`, and registry must agree before mutation |
| Force push | **Human-authorized only** — never force-push `main` without explicit instruction |

Evidence in Git commits and SSOT docs is durable. Chat memory is not.

---

## Cross-device AI operating topology

Semantic authority: `docs/ssot/M55_MULTI_AGENT_PARALLEL_OPERATING_MODEL_SSOT.md`.

Current Human operating arrangement (dated 2026-09-09):

| Plane | Current use | Authority boundary |
|---|---|---|
| Mac local plane | Cursor implementation · registered worktrees · local tests · Mac Codex local review | local-only candidate facts remain local until pushed or explicitly exported |
| Windows control plane | Control-Tower ChatGPT · additional bounded ChatGPT tasks | integration/adjudication; no invented local Mac facts |
| Windows remote-audit plane | Grok Bot · ordinary Codex task when available | read-only independent review of pushed PR/HEAD or explicit artifacts; Replay is not the direct PR-review path |
| GitHub | branch · PR · exact SHA · CI · durable evidence | canonical cross-device handoff for remote review |

Rules:

- `GITHUB_IS_CROSS_DEVICE_HANDOFF_AUTHORITY = TRUE`.
- An unpushed Mac diff is **not** visible remote authority.
- Remote reviewers pin exact SHA/PR before exact-diff claims.
- Grok and ordinary Codex reviewers are not mutation owners or payout executors. Codex Replay is an optional historical-thread comparison tool, not the default PR reviewer.
- Before declaring an integration unavailable, inspect current connected capabilities when the environment supports discovery.
- Use risk-weighted audit depth; do not run every AI on low-risk changes.

---

## Vercel

| Field | Value |
|---|---|
| Team | `m55-official` |
| Project | `m55-webv2` |
| Production URL | `https://m55-webv2.vercel.app` |
| Production deployment source | `main` @ merged commit SHA |
| Preview deployment model | one Preview deployment per Git branch push; branch alias pattern `m55-webv2-git-<branch-slug>-m55-official.vercel.app` |
| Binding rule | Preview runtime SHA must match intended feature HEAD before high-cost Preview work; verify via `GET /api/diagnostics/build` → `vercel_env`, `vercel_git_sha`, `vercel_branch` |
| Redeploy policy | do not redeploy to “fix” evidence gaps; fix source or obtain Human GO |

Production diagnostics on Vercel return **404** for sensitive env routes by design.

---

## Clerk

| Namespace | Role |
|---|---|
| **M55-core / Development** | fresh checkout / launch-validation cohort (`launch-cohort-primary`); test users for payment experiments |
| **M55-Official / Production** | live customer-facing auth (`pk_live_*` on Production host) |
| Preview hosts | Development Clerk instance (e.g. `*.clerk.accounts.dev`, `pk_test_*`) — not Production |

Rules:

- Development and Production are **separate namespaces** — do not infer one from the other.
- Synthetic test users belong to **Development / Preview** workflows only.
- **Never reuse Production customer identities** for Preview payment or consult smokes.
- Do not delete users or mutate Production Clerk without explicit Human scope.

---

## Supabase

| Plane | Organization | Project | Notes |
|---|---|---|---|
| **Preview** | `m55-preview` | `m55-soul-preview` | approved preview project ref pinned in `lib/m55/previewRemoteApply/` |
| **Production** | `m55-soul` | `m55-soul-core` | live customer data plane |

Rules:

- Preview and Production are **separate projects** — never infer connection strings across environments.
- **No cross-environment mutation** (no Production writes while proving Preview, and vice versa).
- Read-only SQL attestation uses operator-local credentials only; never paste secrets into SSOT or chat.
- Forbidden Production identity labels are enforced in preview remote-apply authority code.

---

## Stripe

| Topic | Policy |
|---|---|
| Commercial SKU keys (Product Truth) | `dtr_core_light_v1` (¥1,000 · 追加読み解き 1) · `dtr_core_full_v1` (¥1,480 · 合計5) · `dtr_core_light_to_full_upgrade_v1` (¥600 top-up) |
| Machine contract | `lib/m55/contracts/m55CommercialFunnelContract.ts` |
| Historical payment evidence | documented in `M55_HIGH_COST_EVIDENCE_LEDGER.md` and Phase-5/Contract-C SSOT series |
| High-cost payment tests | **CLOSED GREEN** unless an invalidating dependency changed (checkout, webhook, fulfillment, wallet grant/consume) |
| Test vs real customer ops | Stripe TEST mode / Development cohort evidence ≠ Production customer operations — classify separately |
| Rerun | **prohibited** for Phase-B and closed lanes without documented invalidation |

Do not store PaymentIntent IDs, customer IDs, price secret values, or webhook signing secrets in this map.

---

## Creator application notification — Resend DNS verification (2026-10-19)

**Evidence class:** Human-observed Resend and お名前.com Navi setup screenshots (2026-10-19), followed by one Human-observed Preview Creator application and Gmail inbox receipt (2026-10-22), independent Preview Supabase aggregate inspection and Vercel deployment/environment readback (2026-10-23). The Preview proof does **not** authorize Production activation.

| Item | Verified fact / boundary |
|---|---|
| Resend sending domain | `notify.m-55.jp` — **VERIFIED** (Resend domain page and DNS-record statuses) |
| Sending region | Tokyo (Resend UI) |
| DNS manager | お名前.com Navi for zone `m-55.jp` |
| Nameservers | Existing `01.dnsv.jp` through `04.dnsv.jp`; **nameserver change = しない** at DNS confirmation |
| Domain DKIM | TXT `resend._domainkey.notify.m-55.jp` — Resend **Verified**; full public key intentionally not duplicated in repo |
| Sending DNS CNAME 1 | `rsend.notify.m-55.jp` → `rsend-apne1.forge.rmta.net` — Resend **Verified** |
| Sending DNS CNAME 2 | `send.notify.m-55.jp` → `send.forge.rmta.net` — Resend **Verified** |
| DNS TTL | 3600 on the three added records in お名前.com |
| Website / existing mail | Existing A, Clerk CNAME, MX and apex TXT/SPF preserved in Human DNS-confirmation screenshot; no nameserver change requested |
| Receiving in Resend | OFF; inbound email is outside this notification task |
| API-key and notification environment | **CONFIGURED — BRANCH-SCOPED PREVIEW ONLY** as of 2026-10-20 Vercel read-only inventory: `RESEND_API_KEY` (Secret), `M55_CREATOR_NOTIFY_TO` (Secret), `M55_CREATOR_NOTIFY_FROM` (Config), `M55_CREATOR_NOTIFY_ENABLED` (Config) all have `target=preview` and `gitBranch=feat/m55-creator-application-email-notification-v1` in `m55-webv2`. Human-confirmed notify flag is literal `false`. No secret/recipient values stored in SSOT. Production-scoped versions of these four variables were absent from that project inventory. |
| Sender / recipient | Configured sender `notifications@notify.m-55.jp`; recipient is configured as a private, branch-scoped Preview variable; recipient address is **not** duplicated in this SSOT |
| Live application-to-inbox proof | **PREVIEW E2E CLOSED GREEN (2026-10-22 JST)**: Human used a Development test account on the exact Preview deployment and submitted one Creator application. UI displayed `申請を受け付けました`, Creator Portal showed `申請受付済み`; a Gmail inbox screenshot independently showed one received message titled `【M55】新しいCreator応募が届きました` from `notifications@notify.m-55.jp` with the expected `/internal/creator-review` link. Preview Supabase read-only counts changed from 0 applications to **1**, with **1 SUBMITTED** (confirmed again 2026-10-23). The screenshot proves **receipt of one message**, not a provider-side delivery SLA, global deduplication or durable retry. No identifiers or applicant media details recorded. |
| Production enablement | **NOT AUTHORIZED / NOT ENABLED** as of 2026-10-23: Production-scoped copies of these four variables absent from Vercel project inventory; Production deploy remains the existing main deployment `dpl_ANJtkE2f8Ykzcgg8jKpqMkUMnC4c` at `be22b44a16e789d07c2f21e7f7a61de8778d6b40` READY. No Production provider key, activation, smoke or migration authorized here. |
| Code authority | Notification source merged through PR #252, merge commit `edfeedbce6f354f6097ddefeeaf47d9b46fa3dfe`; no change to current executable `CREATOR_DASHBOARD` gate |

**Preview controlled test / safe shutdown (2026-10-22–23 JST):** Single Preview on/off cycle is complete. Vercel `M55_CREATOR_NOTIFY_ENABLED` was scoped solely to `gitBranch=feat/m55-creator-application-email-notification-v1`, set to literal `true` for the one Human-controlled E2E, and later returned to literal **`false`**; a fresh Vercel management read proved the current stored value false (2026-10-23). Post-OFF Preview deployment `dpl_9kbw1C7vTepwV3Cq9QNRXSLNEkCQ`, commit `31056f0cb33d4f1aa2b9e3536c6f2010d596aa2a`, was verified **READY**. Only one synthetic/test application is recorded in Preview DB. Historical immutable deployment URLs may retain their build-time environment snapshot; do not infer each older URL has become disabled. No further human test submission or email test is required without a changed contract.

**Human Vercel admin access (2026-10-23):** Human reported GitHub-connected 2FA recovery and re-entry succeeded, TOTP is Active, and a new set of recovery codes was generated and saved after the prior codes appeared in chat. **No TOTP secret, recovery code, email OTP, or provider API key belongs in this repository, future chat or an audit bundle.** Whether the newly enrolled TOTP secret is distinct from any earlier shared setup QR must be verified privately if in doubt.

**No-replay / next gate:** Do **not** recreate Resend sending domain/DNS, API key, the four Preview-scoped Vercel variables, repeat the single green application-to-Gmail proof, or reopen the existing PR #252 merge without an invalidating change. Code is already on main, but this operations note is on **Draft PR #253 only**, not yet merged. NEXT for this sidecar is an independent PR #253 docs-only review/CI gate, then a **separately authorized merge**. Production enablement is an entirely separate Human gate and requires Production-scoped provider/secret/env setup, controlled deployment, delivery smoke and explicit GO. Preserve `M55_EXECUTION_STATE.json` `CREATOR_DASHBOARD` as the sole executable owner; R7 PR #249 remains unrelated and must not be altered. Until authorized, Production notifications remain disabled.


## Risk-based release path — latest Human decision (2026-10-27)

**LATEST HUMAN DECISION / DEFAULT ROUTING:** `DEFAULT_PREVIEW_BEFORE_PRODUCTION = FALSE`; `RISK_BASED_PREVIEW_ONLY_WHEN_MATERIALLY_NECESSARY = TRUE`. A generic claim that "Preview is safer" is **not** enough to force an extra environment, second provider credential, repeated setup, duplicated verification, or a second deployment. This replaces earlier assistant-proposed *default* Preview-first process; it does not retroactively erase prior proof or change an immutable safety/release contract.

**Operational sequence for new M55 work units:**
1. **Existing evidence first:** identify the exact runtime/capability, newest Human decision, relevant SSOT, accepted GREEN/no-replay proof, live Production source/config, and remaining delta. Do not rebuild or rerun already proven capability without a concrete invalidating change.
2. **Default to the shortest authorized completion path:** for bounded, low-risk and reversible work with adequate existing proof, implement/configure once in the **intended final environment** (including Production when separately authorized), make a single deployment where needed, and verify only the new delta there. Prefer no-op/reuse to recreation and one consolidated Human UI request to serial requests.
3. **Preview only with a documented material risk:** require isolated rehearsal when existing evidence cannot reasonably control the impact of irreversible/destructive data operations, real charges or payouts, permissions/identity/security boundary changes, sensitive-data exposure, disruptive migrations, or another concrete high-impact failure mode. Specify the exact risk, why existing proof and rollback/feature controls are insufficient, and the **minimum** targeted isolated check. Do not extrapolate "risky" to unrelated functionality or repeat unrelated Preview tests.
4. **No safety-gate waiver:** mandatory repo/CI/branch rules, existing release approvals, exact Production-target identity verification, secret protection, and targeted rollback/observability remain in force. High-risk work must not be sent straight to Production merely to avoid waiting. Preview evidence is reused when already valid; an additional Preview run is not automatically required.
5. **Minimize tool/UI handoffs:** gather existing facts independently first, present a single consolidated list of truly necessary user-only operations, and perform all authorized non-sensitive work directly. Do not promise guaranteed first-attempt success; if an external provider returns a real error, recover from that specific failure without resetting earlier GREEN gates.

**Scope/precedence:** This is the latest explicit Human operating instruction across M55 tasks, subject to concrete non-waivable safety contracts. `docs/ssot/M55_EXECUTION_STATE.json` remains sole executable gate/NEXT authority; task-specific security invariants and other Human decisions remain authoritative. This operations-map note records the Human decision without changing global execution owner, implementation code, payment/DB rules, or another lane. Future release requests must assess the actual risk, not assume Preview-by-default.

## Creator notification Production rollout — Human one-pass decision (2026-10-27)

**Authority:** Latest explicit Human decision (2026-10-27 JST), after confirming the 2026-10-22 Preview application-to-Gmail E2E was `CLOSED GREEN` and remains relevant. This is an operational reuse/no-replay instruction, not a change to `M55_EXECUTION_STATE.json`, Creator Revenue executable NEXT, or a blanket waiver of required security checks.

**ONE-PASS / EVIDENCE-FIRST RULE (`CREATOR_NOTIFY_PRODUCTION_ONE_PASS = HUMAN_APPROVED`):**

1. **Reuse first, no replay.** Before requesting UI operations, keys, DNS changes, staging, submission, live sending, or deployments, inspect this operations map, PR #252/#253, the exact deployed source, provider/domain evidence, current Vercel environment scopes, and the prior accepted E2E. Never repeat verified DNS/domain setup, Preview email smoke, or existing code implementation solely because Production rollout is next. A new chat, a different environment, or missing local screenshots is not itself invalidation.
2. **Single scoped Production completion.** When the runtime behavior and email contract are unchanged and the Preview receipt proof is still valid, complete only genuinely Production-specific missing environment entries, one controlled Production deployment after all required entries are present, and one bounded Production delivery verification. Group the necessary settings before deploying; do not issue multiple deployments or multiple live test submissions for convenience. Document a specific invalidating change before any replay.
3. **Existing provider key before new key.** The existing `M55-Creator-Notify-Preview` Resend `Sending access` credential is proven to work in Preview. Investigate reusing its stored value without revealing or copying secrets and without losing its Preview branch scope. Do **not** reflexively require another key because its display name says Preview. A distinct Production credential may be necessary if provider/host scope controls, blast-radius isolation, write-only secret handling, or policy prevent safe sharing; verify and state the concrete reason *before* requiring creation. No credential may be exposed in chat, source, screenshots, or SSOT.
4. **Production safety boundary.** Confirm Resend `notify.m-55.jp` remains an authorized sending domain, sending identity and recipient match the accepted production intent, the Vercel change is scoped exactly to intended environments, and the intended Production main SHA/domain are pinned before deployment. Preserve application acceptance semantics and the best-effort sidecar. Do not re-submit, approve, or modify a real applicant merely to test notification. Existing real applications are not retroactively re-notified unless separately explicitly authorized.
5. **Minimal action and truthful status.** Observe and report a single consolidated blocker list before more Human UI requests. Do not claim Production notification `GREEN` before actual post-deployment receipt evidence. Never promise universal one-shot success where a real provider or security failure may require a targeted recovery. Do not involve PAIR P5, R7 D1–D5 migrations, or unrelated lanes.

**2026-10-27 observed Production environment checkpoint (historical, not everlasting):** `M55_CREATOR_NOTIFY_ENABLED=true`, `M55_CREATOR_NOTIFY_FROM=notifications@notify.m-55.jp` and `M55_CREATOR_NOTIFY_TO` (private exact recipient recovered from the 2026-10-22 successful Gmail evidence) are registered with `target=production` in Vercel `m55-webv2`. A Production-targeted `RESEND_API_KEY` had **not yet been registered**, and no activation deployment or Production notification delivery smoke had been performed at this checkpoint. The existing `RESEND_API_KEY` is a write-only secret scoped to `target=preview` and `gitBranch=feat/m55-creator-application-email-notification-v1`. Recheck these *dynamic* facts before action. Existing Preview proof remains accepted; do not repeat it. No recipient address or key value is recorded here.

## Creator application notification — Production rollout observation (2026-10-27)

**Fresh Vercel management read (post-deploy):** project `m55-webv2`, team `M55-Official`; four Production-targeted variables are registered: `M55_CREATOR_NOTIFY_ENABLED=true` (readable non-secret flag), `M55_CREATOR_NOTIFY_FROM`, `M55_CREATOR_NOTIFY_TO`, and `RESEND_API_KEY`. The latter three values are intentionally not copied into this repository. The original `RESEND_API_KEY` for `target=preview`, `gitBranch=feat/m55-creator-application-email-notification-v1` remains present. An existing Resend `Sending access` API credential was reused by Human without creating a second provider key.

**Fresh Production deployment read:** Vercel deployment `dpl_9UPwX3zsqjbDPkHPANMFr4oF4kTb` is **READY / Production**, sourced from `main` commit `ac604ef7c964a350e68bdae8f532d0ff97706b02` and assigned to `m-55.jp`. Exactly one Production deployment was initiated for notification configuration activation; notification runtime code, DNS, and previously accepted Preview E2E remain unchanged.

**Production receipt status: `PRODUCTION_RECEIPT_CLOSED_GREEN` (2026-10-27 JST).** After the single Production notification activation deploy `dpl_9UPwX3zsqjbDPkHPANMFr4oF4kTb` (READY, `main` at `ac604ef7c964a350e68bdae8f532d0ff97706b02`, `m-55.jp`), Human performed one authorized real Production Creator application through `https://m-55.jp/creator/apply`. The Human screenshot shows the success UI `申請を受け付けました`. A separate Human Gmail screenshot shows one new incoming message `【M55】新しいCreator応募が届きました` from `notifications@notify.m-55.jp` with the expected Production review link `https://m-55.jp/internal/creator-review`. An independent connected-Gmail read confirmed exactly one message matching the subject and sender in the checked window, received at `2026-10-26T18:00:28Z` (`2026-10-27 03:00:28 JST`), in INBOX, with one recipient and exact expected review-link body. No applicant identity, recipient address, secret, or message identifier is stored in SSOT.

**Acceptance boundary:** Production application-receipt-to-Gmail delivery **CLOSED GREEN for this one controlled E2E**. This does not prove universal deliverability, provider SLA, durable queue/retries, or cross-request deduplication. No more Production application submission, Preview replay, DNS/key recreation, or redeploy is necessary for this unchanged notification contract. The Production test application is a real Production record; do not automatically approve, reject, delete, or repurpose it. Further Creator reviews follow their ordinary Human-controlled workflow. Earlier historical `PRODUCTION_RECEIPT_NOT_YET_VERIFIED` reflected the pre-test checkpoint and is superseded by this fresh evidence.

**Operational separation:** Production Creator review routing remains authorized through the pre-existing `M55_CREATOR_REVIEWER_USER_IDS` Production secret; actual reviewer login/queue UX and any pending applicant's Human review are not established by environment-variable presence. R7 `CREATOR_DASHBOARD` remains the sole executable stage in `M55_EXECUTION_STATE.json`; PR #249 still Draft, R8 remains future. PR #254 itself is documentation-only and requires ordinary Human review/merge. The single controlled Production application-to-email receipt is CLOSED GREEN; broad delivery guarantees and durable retries remain unproven.

**Implementation ownership:** This note is a docs-only recorded Human decision. It does not itself authorize unreviewed Production provider, credential, branch, database, or deployment mutation. Any subsequent real action requires its own exact scope/identity check and Human-approved execution boundary.

---

## Boot cross-reference

Every AI session boot must read, in order:

1. `AGENTS.md`
2. `docs/ssot/M55_CURRENT_STATE.md`
3. `docs/ssot/M55_ROADMAP.md`
4. `docs/ssot/M55_WORKTREE_REGISTRY.md`
5. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md` (this file)
6. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
7. Fresh Git / remote facts (`pwd`, branch, HEAD, `git status`, registry drift)
8. **`npm run m55:context`** — fresh runtime authority for volatile facts
9. Current lane + **NEXT SINGLE ACTION** from `M55_CURRENT_STATE.md`
10. CLOSED GREEN gates (do not re-audit)
11. Invalidating dependencies for any proposed rerun
12. Execute only the authorized **NEXT SINGLE ACTION**

Verification: `npm run m55:context` · `npm run verify:m55-control-tower`
