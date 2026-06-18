# M55 Preview Post-Remediation Deletion Smoke — Human Runbook

**Status:** post-P7 correlation remediation runbook (local artifacts only)
**Branch authority:** `feat/m55-paid-lp-canonical-wave1`
**Base HEAD:** `c5cae11010c29fe9f8207bc5891338a723a51a3b`
**Existing subject:** `M55_PREVIEW_DELETE_POST_REMEDIATION_01` was already created exactly once and must not be recreated.
**Preview execution authorized now:** false

## Single SSOT

This file is the only live runbook for the Preview deletion smoke. Do not create a parallel runbook. Production is unauthorized.

## Exact 18-Step Sequence

1. Local implementation and review of the seven allowed paths only.
2. One atomic commit with normal hooks.
3. One non-force feature push to `feat/m55-paid-lp-canonical-wave1`.
4. Discover the exact fresh/current Preview deployment for the final pushed HEAD.
5. Human applies the Preview migration in `m55-preview / m55-soul-preview` only.
6. Run post-apply SELECT-only catalog/function verification.
7. Refreeze bindings to final HEAD, deployment, migration, catalog, Clerk Development, and Supabase Preview.
8. Generate the precheck SQL package from one local raw Clerk Development user ID input.
9. Human executes the precheck SELECT exactly once.
10. Validate and canonicalize the precheck result locally; compute `precheck_evidence_sha256`.
11. Generate a non-repository single-use deletion authority bound to `precheck_evidence_sha256`.
12. Present the irreversible summary. No deletion authority exists before this point.
13. Human performs exactly one Clerk Development delete of the existing labeled subject.
14. Observe exactly one natural signed webhook. No Replay and no Send Example.
15. Generate postcheck SQL from the bound precheck evidence artifact.
16. Human executes the postcheck SELECT exactly once.
17. Final classification is computed from bound evidence and postcheck result.
18. Integrated RC remains separate.

## Subject Rules

- Existing subject only: `M55_PREVIEW_DELETE_POST_REMEDIATION_01`.
- No second create. No subject recreation. No real user.
- Evidence may contain only the safe label and `precreated=true`.
- Raw Clerk ID, email, Svix ID, payload, headers, secrets, tokens, and the derived user_ref_hash must never be copied into evidence artifacts or final reports.

## Evidence Chain

The local helper derives `user_ref_hash` from one raw local input with the same algorithm as the route: SHA-256 over UTF-8, lowercase hex, first 16 characters. Humans never author or edit the hash.

The precheck returns one canonical safe JSON object. The local validator rejects missing, extra, reordered, tampered, or mismatched fields; recomputes UUID bundle digests and unrelated-surface digests; then stores only the safe artifact and its SHA-256.

The deletion authority is external to the repository, single-use, expiring, and bound to the final pushed HEAD, exact Preview deployment, applied migration SHA, post-apply catalog identity, binding confirmations, safe subject label, and `precheck_evidence_sha256`.

## Stops

STOP on any HOLD. No Replay, no Send Example, no synthetic POST, no manual RPC, no manual DB repair, no redeploy, no env/runtime/region change, no Production action, no second subject, no force push.

## Commit/Push Boundary

Commit subject: `feat: add deletion smoke correlation evidence chain`.

The commit contains exactly seven paths. After push, fresh deployment discovery, Preview migration apply, post-apply catalog verification, binding refreeze, corrected precheck, and external authority are all separate boundaries. Smoke execution is not authorized by this runbook alone.
