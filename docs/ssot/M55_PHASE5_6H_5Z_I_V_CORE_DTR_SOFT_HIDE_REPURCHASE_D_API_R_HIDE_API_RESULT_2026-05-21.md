# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-API-R — Hide API result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-API-R** |
| **Title** | **Hide API — implementation result recording** |
| **Classification** | **Category 1 / implementation result / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_API_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-API-R-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **D-READ-COMMIT** @ **`61a1a9d`** · Production `user_hidden_*` schema @ **C-D-R** |
| **Human GO** | **`CORE-DTR-SOFT-HIDE-REPURCHASE-D-API go`** |
| **Git baseline (read path)** | **`work/home-cluster` @ `61a1a9d`** |
| **Code status** | **Implemented in workspace** · pending **`D-API-COMMIT`** |

**Hide API layer complete.** **`/my` delete UI, checkout repurchase lane, fulfillment INSERT policy — not in this gate.**

---

## B. Implementation summary

| Item | Status |
|------|--------|
| **`hideVisibleDtrReportSnapshotForUser`** | **Implemented** (`lib/m55/hideDtrReportSnapshot.ts`) |
| **`POST /api/dtr/report-snapshot/hide`** | **Implemented** (`app/api/dtr/report-snapshot/hide/route.ts`) |
| **Clerk auth** | **Required** — non-public route + `401` when unauthenticated |
| **Visible snapshot hide** | **200** `{ ok: true }` |
| **No visible snapshot** | **404** `{ code: 'no_visible_snapshot' }` |
| **Hidden-only (no re-UPDATE)** | **409** `{ code: 'already_hidden' }` |
| **DB / unexpected error** | **500** `{ code: 'hide_failed' }` |
| **Response** | **No** raw snapshot id · **no** `hiddenAt` |
| **Logging** | Safe summary — `userIdHash` only (`hashUserIdForLedgerLog`) |

---

## C. UPDATE fields（only）

| Column | Value |
|--------|--------|
| **`user_hidden_at`** | `now()` ISO timestamp |
| **`user_hidden_source`** | **`my_panel`** |
| **`user_hidden_reason`** | **`user_delete`**（non-PII slug） |

**Forbidden in UPDATE:** `envelope_json` · `profile_snapshot` · `draft_snapshot` · `engine_version` · `engine_context_json` · entitlement / fulfillment / Stripe tables.

**Hard DDL/DML forbidden:** `DELETE` · `TRUNCATE` · `DROP TABLE` — **not present** in implementation.

---

## D. Changed files（D-API implementation）

| File | Role |
|------|--------|
| `lib/m55/hideDtrReportSnapshot.ts` | Hide helper + payload guard |
| `app/api/dtr/report-snapshot/hide/route.ts` | HTTP `POST` handler |
| `lib/m55/hideDtrReportSnapshot.test.ts` | Contract tests |

**Not changed:** `components/my/MyPanel.tsx` · checkout repurchase · fulfillment · DB migration · env · middleware public list（route uses `auth.protect()` via non-public API path）.

---

## E. Test attestation

| Command | Result |
|---------|--------|
| `npx tsx --test lib/m55/hideDtrReportSnapshot.test.ts` | **9/9 pass** |
| `npx tsc --noEmit` | **pass** |
| `git diff --check` | **pass** |

**Coverage highlights:** auth `401` mapping · hide-only UPDATE columns · forbidden body fields rejected · visible-row `user_hidden_at IS NULL` guard · no `.delete(` / DDL · no raw id in response · safe log shape.

---

## F. Acceptance criteria

| Criterion | Met |
|-----------|-----|
| Visible snapshot can be soft-hidden via API | **yes**（runtime when called） |
| Hidden-only does not second UPDATE | **yes** → **409** |
| Snapshot body / entitlements untouched | **yes** |
| No deploy in gate | **yes** |
| No `/my` UI in gate | **yes** |

---

## G. No-mutation statement

| Action | Status |
|--------|--------|
| deploy / redeploy | **no** |
| env change | **no** |
| manual Production DB write / SQL in gate | **no** |
| `/my` delete UI | **no** |
| checkout repurchase lane | **no** |
| fulfillment INSERT policy change | **no** |
| snapshot body UPDATE/DELETE | **no** |
| entitlement deletion | **no** |
| **VERIFY-C** | **no** |

---

## H. Next gates

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-API-COMMIT** | Commit D-API code + this result SSOT |
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-MY** | `/my` 削除 UI + dialog（別 Human GO） |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | D-API-R result post Human GO |
