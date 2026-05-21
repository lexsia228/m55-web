# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-A — User-visible hide + repurchase unlock specification（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-A** |
| **Title** | **User-visible report deletion/hide and repurchase unlock — planning / docs-only** |
| **Classification** | **Category 1 / product + data policy planning / no-mutation** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_A_PLANNING_GREEN_NO_MUTATION`** |
| **Verdict（A-R）** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_A_R_DELETE_WORDING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-A-001`** |
| **Evidence ID（A-R）** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-A-R-001`** |
| **Date** | **2026-05-21** |
| **Surface** | **`/my`** saved-report card · **`/dtr`** shelf · **`/dtr/core`** read · **`/api/purchase/checkout`** |
| **Policy anchors** | **CORE-DTR-A** P3–P8（evidence preservation）；**CORE-DTR-UI-GUARD**（saved notice — orthogonal） |

**This gate:** specification only.** **No** code, migration apply, checkout, payment, Production DB write, env change, or **CORE-DTR-VERIFY-C** execution.

---

## B. Problem statement

| Need | Constraint |
|------|------------|
| User wants to **remove** a saved DTR from their UI | Must **not** hard-delete DB evidence |
| User may want a **new purchase** of the same DTR SKU after hiding | Must **not** overwrite legacy/v2 snapshot rows |
| Support / audit must retain purchase trail | **entitlements**, **fulfillment**, **Stripe** history unchanged |
| Current repo assumes **one row** per `(user_id, product_id)` | `UNIQUE (user_id, product_id)` + `maybeSingle` — **blocks** repurchase INSERT today |

**User-visible label:** **「削除」** only（**A-R** Human lock — not **非表示**）.

---

## B1. Phase A-R — User-visible 「削除」 wording（Human-approved · 2026-05-21）

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-A-R** |
| **Classification** | **Category 1 / copy reinforcement / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_A_R_DELETE_WORDING_GREEN_NO_MUTATION`** |

### B1.1 Human decision（binding）

| # | Decision | Mandatory |
|---|----------|-----------|
| **R1** | UI label = **削除**（**not** 非表示） | **yes** |
| **R2** | **Reason:** 「非表示」implies user may **re-show** later — **reject** that framing | **yes** |
| **R3** | Copy must state saved report **no longer visible** on **マイページ** and **レポート一覧**；**cannot open** from user surfaces | **yes** |
| **R4** | Copy must state **purchase + saved records retained** for ops / support / audit | **yes** |
| **R5** | Recreating saved report for **same profile** requires **再購入** | **yes** |
| **R6** | Operation is **irreversible on user UI**（no user-facing undo） | **yes** |
| **R7** | Implementation still **soft hide**（`user_hidden_at` etc.）— **not** hard DELETE | **yes** |

### B1.2 Terminology map（user vs internal）

| Layer | Term | Meaning |
|-------|------|---------|
| **User UI** | **削除** / **削除する** | Soft hide — row leaves all user-visible surfaces |
| **User toast** | **保存版を削除しました** | Confirms user-visible removal |
| **Internal / code / DB** | **soft hide**, `user_hidden_at`, optional `user_hidden_source` | **No** SQL `DELETE` on snapshot |
| **Forbidden in user copy** | 「非表示」「元に戻す」「再表示」 | Misleading vs R1–R6 |
| **Admin / support** | Future restore via clearing `user_hidden_at` | **Out of user UI** — not A-R scope |

### B1.3 Canonical copy（exact — SOFT-HIDE-C must match）

**Dialog — `dtr_saved_report_delete_confirm`**

| Key | JP（canonical · verbatim） |
|-----|---------------------------|
| **`title`** | **この保存版を削除しますか？** |
| **`body_p1`** | **削除すると、この保存版はマイページとレポート一覧から表示されなくなり、ユーザー画面からは開けなくなります。** |
| **`body_p2`** | **購入記録と保存記録は、確認・不具合対応・運営上必要な記録としてシステム内に保持されます。** |
| **`body_p3`** | **もう一度このプロフィールで保存版を作成する場合は、再購入が必要です。** |
| **`body_p4`** | **この操作は取り消せません。** |
| **`btn_cancel`** | **キャンセル** |
| **`btn_confirm`** | **削除する** |

**Post-action toast — `dtr_saved_report_delete_toast`**

| Key | JP（canonical · verbatim） |
|-----|---------------------------|
| **`toast_primary`** | **保存版を削除しました。** |
| **`toast_secondary`** | **必要な場合は、同じプロフィールで新しい保存版を作成できます。** |

**Trigger label（`/my` card · shelf if applicable）:** **削除**（not 非表示）.

**Implementation note:** Body may render as one block or four paragraphs；**wording must not change** meaning.

### B1.4 Internal spec（unchanged by A-R wording）

| Rule | Status |
|------|--------|
| Hard `DELETE` / `TRUNCATE` / `DROP` | **forbidden** |
| `user_hidden_at` / visibility soft hide | **required implementation** |
| snapshot / entitlement / fulfillment / Stripe history | **retained** |
| Visible snapshot → repurchase **blocked** | **yes** |
| Hidden-only → repurchase **allowed** | **yes** |

### B1.5 A-R no-mutation

| Action | Status |
|--------|--------|
| code / deploy / env | **no** |
| checkout / payment | **no** |
| Production / Staging DB write | **no** |
| **CORE-DTR-VERIFY-C** | **no** |

**Next gate:** **`CORE-DTR-SOFT-HIDE-REPURCHASE-A-COMMIT`** — commit A + A-R SSOT docs.

---

## C. Canonical decisions（Human — binding for downstream gates）

| # | Decision | Mandatory |
|---|----------|-----------|
| **D1** | User-facing action = **削除** only（**A-R** locks copy；internal = soft hide） | **yes** |
| **D2** | Internal persistence = **soft hide / archive**（timestamp + source + optional reason） | **yes** |
| **D3** | **Retain** `dtr_report_snapshots` row, **entitlements**, **entitlement_rights**, **one_time_fulfillments**, **Stripe** events/charges | **yes** |
| **D4** | **Visible** snapshot exists for product → **repurchase blocked** | **yes** |
| **D5** | **Only hidden** snapshot(s) for product → **repurchase allowed** | **yes** |
| **D6** | Repurchase fulfillment → **new snapshot INSERT**（new `id` / `report_instance_id`） | **yes** |
| **D7** | Older hidden snapshot(s) remain as **restorable audit evidence** | **yes** |
| **D8** | **Independent** of `M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED`（hide/repurchase policy does not toggle engine flag） | **yes** |
| **D9** | **Not** **CORE-DTR-VERIFY-C**（VERIFY-C = one live purchase **verification** on Production；no hide/repurchase conflation） | **yes** |

---

## D. Distinction from adjacent policies

| Topic | Relationship |
|-------|----------------|
| **CORE-DTR-A P6**（profile drift · de-emphasize nav） | **Automatic** UX when live profile ≠ snapshot — **does not** remove row |
| **SOFT-HIDE-A** | **Explicit user-initiated** hide — row leaves **user-visible** lists |
| **CORE-DTR-UI-GUARD** saved notice | Unchanged by hide spec；new visible snapshot gets its own purchase-time notice |
| **Refund / chargeback** | **Out of scope** — no Stripe refund API；no entitlement revocation |
| **Admin restore** | **Future** ops gate（`user_hidden_at` cleared by support tool — not in A） |

---

## E. Data model（recommended — SOFT-HIDE-B migration）

### E1. Column set（preferred over single `visibility_status` enum）

| Column | Type | Purpose |
|--------|------|---------|
| **`user_hidden_at`** | `timestamptz NULL` | **NULL** = user-visible；**non-null** = hidden from user surfaces |
| **`user_hidden_source`** | `text NULL` | e.g. **`my_panel`**, **`dtr_shelf`**（audit who initiated） |
| **`user_hidden_reason`** | `text NULL` | optional freeform / enum slug（**no PII** in reason） |

**Rejected as sole field for A:** `visibility_status text` only — harder to audit **when** hide occurred；timestamp column is SSOT for ordering and restore.

### E2. Constraint migration（required before repurchase INSERT）

**Current（`20260420000000_dtr_drafts_and_report_snapshots.sql`）：**

```sql
UNIQUE (user_id, product_id)
```

**Target:**

| Constraint | Definition |
|------------|------------|
| **Drop** | `UNIQUE (user_id, product_id)` |
| **Add** | **Partial unique** — at most **one visible** snapshot per user+product |

```sql
CREATE UNIQUE INDEX dtr_report_snapshots_one_visible_per_user_product_uq
  ON public.dtr_report_snapshots (user_id, product_id)
  WHERE user_hidden_at IS NULL;
```

| Rule | Behavior |
|------|----------|
| Multiple **hidden** rows per `(user_id, product_id)` | **allowed**（repurchase history） |
| Multiple **visible** rows | **forbidden**（DB enforces） |
| Hide last visible row | Sets `user_hidden_at` → unlocks repurchase lane |

### E3. Read-path SSOT（all consumer queries）

| Function / surface | Today | After implementation |
|------------------|-------|----------------------|
| **`getDtrReportSnapshot`** | `.maybeSingle()` no hide filter | **`getVisibleDtrReportSnapshot`** — `user_hidden_at IS NULL` · order `created_at DESC` · `limit 1` |
| **`/dtr/core`** | loads visible snapshot | **no visible** → **not** served hidden body；redirect per existing owned-without-visible policy **until** repurchase completes |
| **`/my` OwnedReportsBlock** | shows owned + ready | **hidden** → row **absent** from list |
| **`resolveDtrShelfAccess` / `snapshotReady`** | `snap != null` | **`visibleSnap != null`** |
| **`dtrOwnershipGate`** | may pass hidden `reportInstanceId` | **Must not** expose hidden snapshot id as active reader target |

**Forbidden:** `DELETE` / `TRUNCATE` / `DROP` on snapshot or commerce tables；`UPDATE` of `envelope_json` / `profile_snapshot` / `engine_context_json` on existing rows.

---

## F. User hide operation（API sketch — SOFT-HIDE-C）

| Item | Spec |
|------|------|
| **Method** | `POST`（idempotent hide）— path TBD e.g. `/api/dtr/report-snapshot/hide` |
| **Auth** | Clerk user must own row |
| **Target** | Current **visible** snapshot for `DTR_CORE_STATIC_V1` |
| **Effect** | `UPDATE` set `user_hidden_at = now()`, `user_hidden_source`, optional `user_hidden_reason` |
| **Response** | `{ ok: true, hiddenAt: ISO }` — **no** raw UUID in public logs beyond length check |
| **Idempotent** | Re-hide visible-none → **404** or **409** `no_visible_snapshot` |

### F1. Confirmation dialog + toast（SSOT — see §B1.3）

**Authoritative copy:** **§B1.3** only.** **SOFT-HIDE-C** must import constants matching §B1.3 keys verbatim.

| Forbidden in dialog/toast | Reason |
|---------------------------|--------|
| **非表示** / **再表示** / **元に戻す** | R1–R2 |
| Implied refund | Out of scope（refund = separate gate） |
| 「DBから完全削除」**without** retention sentences | Misleading vs R4 |

**CORE-DTR-UI-GUARD notice** on a **future visible** snapshot remains the existing purchase-time line — **not** replaced by delete dialog.

---

## G. Repurchase / checkout policy

### G1. Decision table

| DB state | Checkout `DTR_CORE` | Shelf / `/my` CTA |
|----------|---------------------|-------------------|
| **Visible snapshot** | **Block** → `409 already_purchased`（today behavior — scope to **visible** only） | **Open** / no repurchase CTA |
| **No visible snapshot**, hidden only | **Allow** new Stripe Checkout session | **Repurchase** CTA → `/dtr/lp` or checkout |
| **No snapshot at all**, owned entitlement | Today → `409 fulfillment_pending` | **Unchanged** until hide path — **do not conflate** with repurchase |
| **No snapshot, not owned** | Fresh purchase | Unchanged |

### G2. Checkout code touchpoints（implementation gate — not A）

| File | Change |
|------|--------|
| **`app/api/purchase/checkout/route.ts`** | Replace `getDtrReportSnapshot` check with **visible-only**；add **repurchase lane** when `owned` + hidden-only + Human-approved product policy |
| **`lib/m55/dtrDraftDb.ts`** | `upsertDtrReportSnapshotAtFulfillment` — if **only hidden** exists, **INSERT** new visible row（never UPDATE envelope on hidden row） |
| **`lib/m55/dtrShelfAccess.ts`** | `showPurchaseCta` true when authenticated + **no visible snapshot** + repurchase policy satisfied |

### G3. Entitlement on repurchase（policy）

| Artifact | On repurchase |
|----------|---------------|
| **`entitlements` / `entitlement_rights`** | **Retain** — user already owns product right；second payment is **new report instance**, not re-grant deletion |
| **`one_time_fulfillments`** | **Append** new fulfillment row for new checkout session |
| **Stripe** | **New** Checkout session + charge — **no** modification of prior PaymentIntent/charge |
| **Webhook** | Idempotent by `event_id` — new session → new fulfillment path |

**Open question for SOFT-HIDE-B（Human）：** second charge while entitlement still **active** — confirm SKU/price display copy on LP（「再購入」）.

### G4. Reply wallet linkage（planning risk）

| Risk | Mitigation direction |
|------|---------------------|
| `reply_ticket_wallets.report_instance_id` points at **hidden** snapshot | On new fulfillment, **link active wallet** to **new** `report_instance_id`（mirror existing `.is('report_instance_id', null)` update path） |
| Consult room bound to old instance | **Fail-closed** read old hidden only via admin/support — user reader uses **visible** id only |

---

## H. UI specification

### H1. `/my` — あなたのレポート card

| Element | Behavior |
|---------|----------|
| **Action** | Text button **削除**（§B1.3 — opens §B1.3 dialog） |
| **After delete** | Show §B1.3 toast |
| **Placement** | `OwnedReportsBlock` core row — secondary destructive-quiet style |
| **After hide** | Row **removed** from list；empty state may show repurchase hint if policy allows |
| **「開く」** | Hidden → **not shown** |

### H2. `/dtr` shelf · catalog strip

| State | Behavior |
|-------|----------|
| Visible snapshot ready | Existing owned shelf display |
| Hidden only | Treat as **no visible snapshot** — show **再購入** path（not “準備中” forever on hidden body） |
| **Do not** surface hidden stem/type on shelf hero |

### H3. `/dtr/core`

| State | Behavior |
|-------|----------|
| Visible snapshot | Current `DtrFullReader` |
| Hidden only | **Redirect** away from reader（LP or processing）— user must not deep-link to hidden envelope via public route |

---

## I. Forbidden actions（absolute）

| Forbidden | Reason |
|-----------|--------|
| `DELETE` / `TRUNCATE` / `DROP` on snapshots or commerce | Evidence destruction |
| Overwrite `envelope_json` / `profile_snapshot` on existing row | Immutability（CORE-DTR-A P4） |
| Delete / revoke **entitlements** for hide | Hide ≠ refund |
| Alter **Stripe** historical records | Audit |
| Conflate with **refund** UX | Separate product/legal gate |
| **Execute** checkout / payment in planning gate A | Human GO per gate |
| **Production DB write** in A | Migration in **SOFT-HIDE-B** only after Human GO |
| **env** change in A | — |
| Run **CORE-DTR-VERIFY-C** as part of hide testing | Separate verification track |

---

## J. Verification matrix（future gates — not A）

| Gate | Scope | Pass criteria（summary） |
|------|-------|-------------------------|
| **SOFT-HIDE-B** | Staging migration + readonly preflight | Partial unique index exists；no DELETE scripts |
| **SOFT-HIDE-C** | API + `/my` hide UI | Hide → row hidden_at set；list empty；`/dtr/core` no hidden body |
| **SOFT-HIDE-D** | Checkout repurchase | Hidden-only → checkout **200** session；visible → **409** |
| **SOFT-HIDE-E** | Fulfillment INSERT | Second snapshot visible；first remains hidden；envelope not updated on hidden |
| **SOFT-HIDE-F** | Production Human smoke | Counts-only + one controlled repurchase（**not** VERIFY-C substitute） |

**Staging test user reset scripts** that `DELETE FROM dtr_report_snapshots` remain **dev-only** — never Production pattern.

---

## K. Repo baseline（read-only trace — 2026-05-21）

| Location | Current behavior relevant to A |
|----------|--------------------------------|
| `supabase/migrations/20260420000000_dtr_drafts_and_report_snapshots.sql` | `UNIQUE (user_id, product_id)` |
| `lib/m55/dtrDraftDb.ts` | `getDtrReportSnapshot` — no hide；fulfillment **skip INSERT** if any row exists |
| `app/api/purchase/checkout/route.ts` | Any snapshot row → `409 already_purchased` |
| `lib/m55/dtrShelfAccess.ts` | `snapshotReady = snap != null` |
| `components/my/MyPanel.tsx` | `OwnedReportsBlock` — no hide control |

---

## L. Next gates（ordered）

| Priority | Gate | Classification |
|----------|------|----------------|
| **0** | **CORE-DTR-SOFT-HIDE-REPURCHASE-A-COMMIT** | Commit A + A-R SSOT（docs-only） |
| **1** | **CORE-DTR-SOFT-HIDE-B** | Migration planning + staging apply（Human GO） |
| **2** | **CORE-DTR-SOFT-HIDE-C** | Hide API + `/my` UI + read-path visible filter |
| **3** | **CORE-DTR-SOFT-HIDE-D** | Checkout repurchase lane + shelf CTA |
| **4** | **CORE-DTR-SOFT-HIDE-E** | Fulfillment multi-row INSERT + wallet link |
| **5** | **CORE-DTR-SOFT-HIDE-F** | Production smoke（separate Human GO from **VERIFY-C**） |

**Parallel allowed:** **CORE-DTR-UI-POLISH-A**, **CORE-DTR-UI-GUARD Production** — no file overlap if hide untouched.

---

## M. No-mutation statement

| Action | Status |
|--------|--------|
| checkout / payment / webhook test charge | **no** |
| Production / Staging DB write | **no** |
| env change | **no** |
| snapshot UPDATE（hide columns） | **no** |
| **CORE-DTR-VERIFY-C** | **no** |
| code change | **no** |

---

## N. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Initial planning spec per Human decisions D1–D9 |
| v1.1 | 2026-05-21 | **A-R** — Human-approved **削除** dialog + toast copy（§B1）；D1 locked to 削除 |
