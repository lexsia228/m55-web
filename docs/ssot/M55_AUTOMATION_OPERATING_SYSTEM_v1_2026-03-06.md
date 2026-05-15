# M55_AUTOMATION_OPERATING_SYSTEM_v1 (2026-03-06 JST)
Status: SSOT
Scope: Web / prototype lane / docs / audit / CI / team handoff

## 0. Purpose
M55 must continue operating with minimal human intervention. Human work should be limited to:
- secret issuance / rotation
- external service configuration changes
- product policy changes
- explicit approval for public-surface copy or pricing changes

Everything else should be automated, codified, or converted into deterministic repo workflows.

## 1. Core Principle
All useful output from daily work is an asset. Assets must be classified into exactly one of these layers:
1. SSOT (canonical rule / current law)
2. Audit (why / evidence / incident / ingest)
3. Implementation (code / migration / workflow / script)
4. Archive (frozen reference, not active law)

Anything not classified is not trusted.

## 2. Non-Negotiables
- Storefront remains frozen unless explicitly unlocked by checkpoint.
- `/prototype` is the isolated implementation lane and must remain header-gated.
- Entitlement decisions are Silent Free on failure, missing data, mismatch, or expiry.
- DB is the source of truth for entitlement state. Client or local persistence is cache only.
- Public HTML must not contain forbidden terms.
- Secrets must never be committed, echoed in logs, or copied into docs.
- Runtime behavior must not depend on live schema/OpenAPI fetching.

## 3. Automation Boundaries
### 3.1 Fully automated
- repo guardrails checks
- forbidden-term scan
- secret-pattern scan (best-effort)
- markdown/manifest presence checks
- checkpoint hygiene checks
- daily/weekly asset index generation from repo contents
- issue templates / release checklist generation

### 3.2 AI-assisted but approval required
- SSOT draft generation
- audit summary generation
- migration plan drafting
- copy variants for isolated UI
- implementation prompts for Cursor

### 3.3 Human-only
- Vercel/Supabase/Stripe/Clerk secret values
- billing / legal policy changes
- domain / environment wiring
- external account permissions

## 4. Repo Structure Contract
- `docs/ssot/` = current law
- `docs/audit/` = evidence, postmortems, ingest indexes, implementation reports
- `docs/archive/` = frozen legacy references
- `.github/workflows/` = automation and guardrails
- `scripts/m55/` = deterministic local/CI scripts

## 5. Mandatory Automation Jobs
### 5.1 Guardrails CI
Run on every push / PR:
- verify storefront files were not modified unless explicitly allowed
- verify prototype matcher exists
- verify `api/me/entitlements` is non-cacheable
- verify webhook route references runtime/nodejs and idempotency markers
- verify forbidden terms absent from public HTML/text surfaces
- verify no obvious secret values are committed

### 5.2 Asset Index CI
Run on schedule and on-demand:
- scan repo for SSOT/audit files
- produce machine-readable index and human summary
- fail if core canonical files disappear

### 5.3 Checkpoint Hygiene
- newest checkpoint at top of `M55_SYSTEM_SSOT.md`
- every new operational shift must have one corresponding checkpoint
- checkpoint text must not include secrets

## 6. Daily Work Capture Rule
Each meaningful work session must yield exactly one of:
- new SSOT file
- audit implementation report
- migration file
- checkpoint update
- asset ingest index update

If no artifact is produced, the work is not complete.

## 7. Reuse for App/Mobile Development
This operating system is reusable for app/mobile work because the invariant layer is product-agnostic:
- entitlement semantics
- silent-free behavior
- forbidden public wording
- audit/evidence discipline
- checkpoint-at-top model
- ingest/index/hash pattern

Only the presentation layer changes. The law does not.

## 8. Operating Order (ultimate efficiency route)
1. Fix law first (SSOT)
2. Add proof second (audit/evidence)
3. Implement smallest safe backend delta
4. Expose only isolated UI
5. Validate gates
6. Only then expand monetization surface

## 9. Next Default Route
After Phase 1 foundation:
1. safe Premium monthly DTR grant in webhook
2. entitlement reflection verification
3. isolated annual-plan / retention-value UI
4. shelving/description AB in isolated hub only

(END)
