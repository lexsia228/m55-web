# M55 Prototype Gate Postmortem & Reuse Playbook (v1.0)

Created: 2026-03-05 11:00 UTC
Audience: M55 Web (Project B) operators + implementers
Scope: `/prototype` isolation hub on Vercel/Next.js under Gate R GREEN / Stripe-review constraints.

---

## 0. One-line conclusion
This was a **layered security + deployment-state** issue, not a "route is broken" issue: you must satisfy (A) Vercel protection *and* (B) M55 middleware gate, and your build must include the route under the correct app root (`app/` vs `src/app/`).

## 1. Non-negotiable constraints (SSOT invariants)
1) Production (`https://m55-web.vercel.app`) must not be modified during Stripe review.
2) URL-based context injection is forbidden. Prototype access is header-based only (`x-m55-proto`).
3) Fail-Closed: env missing or mismatch → always deny (`302 Location: /`).
4) Public pages (`/`, `/dtr/lp`, `/support`, `/legal/*`) are not touched by prototype work.
5) No secrets in logs or chats (prototype token, bypass tokens, secret keys).

## 2. System model: the three-gate stack
Think of the request path as moving through three distinct planes.

### Gate A: Vercel Deployment Protection (outer gate)
Denies at the edge before your app executes.
- Symptom: `401 Unauthorized` + Vercel auth/SSO HTML and `_vercel_sso_nonce` cookie.
- Meaning: your Next.js app never ran. Middleware never ran.

### Gate B: M55 Middleware (inner gate)
Runs only after Gate A is satisfied.
- Matcher: `["/prototype", "/prototype/:path*"]`.
- Checks: `process.env.M55_PROTO_TOKEN` vs `req.headers.get("x-m55-proto")`.
- Deny: `302 Found` → `Location: /` (Fail-Closed).
- Allow: request proceeds to `/prototype` page handler.

### Gate C: Next.js Route Inclusion (build-time gate)
Even if A and B are satisfied, the route must exist in the deployed build.
- Symptom: `404 Not Found` and `X-Matched-Path: /404`.
- Meaning: the deployed build does not include `/prototype` at that moment (wrong folder root or not deployed).

## 3. Status-code decoding (fast triage)
This table is the core diagnostic tool.

- `401` → Gate A blocked (Vercel protection). You are not reaching your app.
- `404` → Gate C failed (route missing) *or* you are not actually hitting the expected deployment.
- `302 Location: /` → Gate B blocked (middleware token mismatch or env missing). This is "progress" because middleware is executing.
- `200` + `X-Matched-Path: /prototype` → Gates A/B/C all satisfied (entry success).

## 4. What we observed in this incident (high-level timeline)
1) Early phase: `/prototype` returned 404 (often from static 404 payload). This pointed to Gate C (route not in build) or wrong deployment.
2) Intermittent `401` on `/_next/*` or `/api/*` indicated Gate A still active (bypass not consistently applied).
3) After bypass was correct: `/prototype` shifted to `302 Location: /` — proof that middleware began executing (Gate B now visible).
4) After env `M55_PROTO_TOKEN` was added and a redeploy occurred, and after operator input was corrected, `/prototype` returned `200 OK` with `X-Matched-Path: /prototype`.

## 5. Root causes (why it "kept changing")
### 5.1 Misclassification of denials across layers
Treating 401/404/302 as one problem led to wrong fixes. Each status code is a different layer speaking.

### 5.2 App root mismatch (`app/` vs `src/app/`)
At different points, the deployed build recognized one root.
Evidence state observed: `HAS_APP=True / HAS_SRC_APP=False`.
Impact: pages placed under `src/app/*` can be **invisible** if the build is using `app/*` as root (and vice versa). This creates "phantom 404".

### 5.3 Env changes require redeploy (deployment state lag)
Adding `M55_PROTO_TOKEN` in Vercel does not back-propagate into already-built artifacts.
Until a redeploy, middleware reads the old env and denies (302) even with correct header.

### 5.4 Operator-channel risk: PowerShell copy/paste and reserved names
Observed failure patterns:
- `$base` polluted with placeholder text/script chunks → invalid URL / unexpected routes.
- `$host` (reserved) assignment errors.
- Multi-line/backtick blocks executing partially → hidden state drift.
Mitigation: single-line commands, one command per line, no backticks, and explicit echo of safe diagnostics (length only).

## 6. Work performed (auditable)
### 6.1 Middleware hardening
- Ensured Fail-Closed redirect on mismatch.
- `Vary` was appended (not overwritten) with `x-m55-proto` to avoid cache header clobbering.
- Added `X-Robots-Tag: noindex, nofollow, noarchive` (prevents indexing and cached snapshots).
- Matcher constrained strictly to `/prototype` only.

### 6.2 Two-key operational protocol
- Vercel bypass is required to reach the app (Gate A).
- Prototype token is required to pass middleware (Gate B).
Both must be present for `/prototype` entry.

### 6.3 Optional cache neutralization at page level
Recommended for `/prototype` route handlers:
- `export const dynamic = "force-dynamic";`
- `export const revalidate = 0;`

Why: it minimizes surprises from prerender artifacts and ensures per-request behavior is honored.
Note: do not apply this globally; keep it confined to `/prototype` only.

## 7. The decisive "why it finally worked"
It worked only after these were simultaneously true:
1) You were hitting the correct deployment URL.
2) Gate A was bypassed successfully (no more 401).
3) The route existed in that deployed build (no more 404).
4) The server-side env had the correct `M55_PROTO_TOKEN` (after redeploy).
5) The client header `x-m55-proto` matched exactly (no whitespace/hidden chars).

## 8. Transferable assets (technical reuse)
### 8.1 Shadow development during compliance review
This pattern is specifically valuable for Stripe review periods:
- Keep all public URLs stable and review-safe.
- Develop behind `/prototype` using a strict deny-by-default gate.
- Prevent indexing (`X-Robots-Tag`) and cache confusion (`Vary`).

### 8.2 Partner previews / whitelisted trials (B2B)
You can grant limited access by distributing the prototype token out-of-band.
Risk controls:
- Token rotation policy.
- Optional additional gate: IP allowlist or user auth (Clerk) *inside* `/prototype` once review passes.
- Do not treat the token as a monetization entitlement; keep entitlements as DB SSOT.

### 8.3 Runbook for "multi-layer gate" systems (generalizable)
This maps directly to:
- Cloudflare Access / Zero Trust gateways (outer gate)
- Edge middleware feature gates (inner gate)
- Build-time routing inclusion (route gate)

## 9. Monetization transfer (M55-compatible, SSOT-preserving)
This gate is an operational safety mechanism, not a paywall.
Correct monetization shape for M55 remains:
Payment (Stripe) → Webhook → DB entitlement SSOT → post-purchase UX.

How this gate helps monetization without violating SSOT:
- Build and test post-purchase UX safely under `/prototype` while public pages are frozen.
- Simulate "parallel observation UI" (DTR+chat 2-pane) without public impact.
- After approval, replace (or complement) header gate with entitlement checks while keeping route topology intact.

## 10. Market mapping (similar approaches; where M55 fits)
Examples of adjacent patterns (category-level; stable references):
- Feature flag platforms (LaunchDarkly / Unleash): cohort toggles inside the app.
- Remote config (Firebase Remote Config): runtime switches for experiments.
- Zero-trust access gateways (Cloudflare Access / Google IAP): outer authentication barrier.
- "Staging" / "Preview" environments (Vercel preview deployments): separate deploy surfaces.
M55 is a hybrid:
- Uses Vercel preview protection + path-isolated middleware gate to keep a single codebase and avoid ops bloat, while meeting strict review constraints.

## 11. Hardening recommendations for M55
1) Choose **one** app root (`app/` or `src/app/`) and enforce via CI (fail build if both exist).
2) Provide a non-secret probe endpoint that returns deployed git SHA (e.g., `/.well-known/m55-build` or `/__probe.txt`).
3) Document "env change requires redeploy" as a checklist item (SSOT).
4) Add an operator-safe PowerShell "smoke test" that blocks production domain and prints only safe diagnostics.
5) Check domain hygiene: ensure the review production domain is not accidentally attached to the prototype/preview project (domain drift prevention).
6) Secrets hygiene: never paste tokens; print only lengths and status codes.

## 12. Appendix A: Minimal smoke test commands (PowerShell; no backticks)
Assumes `$base` (preview URL) and `$bp` (vercel bypass) are already set and correct.

- Gate A (outer) check:
`curl.exe -I -sS -H ("x-vercel-protection-bypass: 0" -f $bp) "$base/"`

- Gate B visible check (expect 302 without prototype token):
`curl.exe -I -sS -H ("x-vercel-protection-bypass: 0" -f $bp) "$base/prototype?__cb=$(Get-Random)"`

- Load prototype token (length only; never paste token into chat):
`$tok = ((Read-Host "Paste M55_PROTO_TOKEN (do not paste into chat)") -replace '[\u200B-\u200D\uFEFF]','').Trim(); "TOK_LEN=[$($tok.Length)]"`

- Gate B allow check (expect 200 + X-Matched-Path):
`curl.exe -I -sS -H ("x-vercel-protection-bypass: 0" -f $bp) -H "Cache-Control: no-store" -H ("x-m55-proto: 0" -f $tok) "$base/prototype?__cb=$(Get-Random)"`

## 13. Appendix B: What is safe to paste into chat vs not
Safe:
- HTTP status lines (200/302/401/404) and non-secret headers.
- npm deprecation warnings.
- `X-Matched-Path`, `X-Robots-Tag`, `X-Vercel-Id`, `X-Vercel-Cache`.

Not safe:
- `M55_PROTO_TOKEN` value.
- Any Vercel bypass token value.
- Any secret keys (Clerk secret key, Supabase service role key, etc.).

---
End of report.
