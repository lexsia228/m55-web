# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PROFILE-GATE-RELAXATION-PLANNING — Checkout profile gate（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PROFILE-GATE-RELAXATION-PLANNING** |
| **Title** | **Remove birthTime / explicit unknown as checkout prerequisite — planning only** |
| **Classification** | **Category 2 / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PROFILE_GATE_RELAXATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-FRESH-PRECHECKOUT-PROFILE-GATE-RELAXATION-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **Production @ `7ebdc63`** |
| **Checkout / payment** | **HOLD** |

**Planning GREEN.** Policy: **missing `birthTime` → implicit unknown-time at checkout/fulfillment** · not a purchase blocker.

---

## B. Human observation（Production @ `7ebdc63`）

| Surface | Result |
|---------|--------|
| **`/core`** | **ANALYST / 静観分析** · PASS |
| **`/dtr` locked shelf** | **Generic card** · **`クリエイター` absent** · PASS |
| **`/my`** | **旧形式** · birthDate · country=日本 · timezone=Asia/Tokyo · **blocking copy remains** |
| **Checkout** | **not executed** · HOLD |

### B.1 Observed fixed items

- Locked shelf **`クリエイター`** mismatch **resolved**（bundle fix @ `7ebdc63`）
- Generic locked card when server preview null / incomplete

### B.2 Remaining blocker

**`/my` message:**

> 購入前に出生時刻（または「時刻不明」）を入力してください。

**Root:** **`isV2ProfileFieldsComplete`** requires explicit **`birthTime`** or **`birthTimeUnknown === true`** · **`hasLegacyProfileOnly`** true for cohort profile.

---

## C. Planning Q&A

### Q1. Which function currently blocks checkout?

| Layer | Function / surface | Role |
|-------|-------------------|------|
| **SSOT gate** | **`isV2ProfileFieldsComplete`** · **`v2ProfileBlockReason`** | **`birth_time_or_unknown`** when no time + no explicit unknown |
| **Checkout API** | **`validateDtrCheckoutProfile`** | Server **400** `composite_profile_incomplete` |
| **Client CTA** | **`PurchaseButton`** | Client pre-check + **`needsProfile`** copy |
| **My UI** | **`MyPanel`** | **`legacy`** / **`!v2Ready`** nag copy · not API authority |
| **Fulfillment** | **`isV2FulfillmentProfileComplete`** | **Separate** · already treats missing time as unknown via **`parseBirthTimeUnknown`** |

**Authority chain:** **`birthProfileV2.ts`** → **`checkoutProfileGate.ts`** → **`PurchaseButton`** + **`app/api/purchase/checkout/route.ts`**.

### Q2. Can paid DTR fulfillment safely run with missing birthTime?

**Yes — already supported on fulfillment path.**

```typescript
// parseFulfillmentMetadata.ts — parseBirthTimeUnknown
return !birthTime; // when no explicit flag → unknown
```

**`runM55CompositeStemPipeline`** accepts **`birthTimeUnknown: true`** with null **`birthTime`** · golden tests pass. **Human `/core` ANALYST** confirms runtime behavior for cohort birthDate.

**Risk:** low · align checkout gate with existing fulfillment normalization · no new engine path.

### Q3. Where should normalization occur?

| Priority | Location | Change |
|----------|----------|--------|
| **P0** | **`lib/soul/birthProfileV2.ts`** | Relax **`isV2ProfileFieldsComplete`** · update **`v2ProfileBlockReason`** |
| **P0** | **`enrichBirthProfileForSave`** | Persist **`birthTimeUnknown: true`** when **`!birthTime`** (metadata consistency) |
| **P1** | **`mergeBirthProfileWithDraftExtra`** | Infer unknown when time missing + no explicit false |
| **P1** | **`parseFulfillmentMetadata`** | **Document only** · already aligned |
| **P2** | **`checkoutProfileGate.ts`** | Thin wrapper · likely no logic change if **`birthProfileV2`** updated |
| **UI** | **`MyPanel`** · **`PurchaseButton`** | Remove purchase-blocking copy · optional helper |

**Do not** add client-only bypass — server **`validateDtrCheckoutProfile`** must match.

### Q4. Minimum required fields（selected policy）

| Field | Checkout required | Notes |
|-------|-------------------|-------|
| **nickname** | **yes** | existing |
| **birthDate** | **yes** | existing |
| **country** | **implicit** | **`DEFAULT_COUNTRY` JP** on save · not user-blocking |
| **birthTime** | **no** | missing → **implicit unknown** |
| **birthTimeUnknown checkbox** | **no** | not required for purchase |
| **birthplace / timezone** | **no** | optional · timezone derived from country |

### Q5. Copy policy

| Surface | Action |
|---------|--------|
| **`MyPanel` legacy / !v2Ready nag** | **Remove** purchase-blocking birthTime messages |
| **`PurchaseButton` needsProfile** | **Remove** birthTime requirement wording · only if nickname/birthDate missing |
| **Optional helper（non-blocking）** | 出生時刻が未入力の場合は、時刻不明として扱います。 |

### Q6. Locked shelf interaction

After relaxation, cohort with **nickname + birthDate + country（JP）** satisfies fulfillment-complete with implicit unknown → **server `lockedShelfDisplay` may show concrete type**（e.g. **アナリスト**）when draft synced · **aligned with `/core` ANALYST** · **not a regression**.

If draft not synced, generic card may persist until server draft read — acceptable.

---

## D. Selected policy（fixed for implementation）

**Policy ID:** **`IMPLICIT_UNKNOWN_TIME_AT_CHECKOUT`**

| Rule | Behavior |
|------|----------|
| Missing **`birthTime`** at checkout | Treat as **`birthTimeUnknown=true`** · **not a blocker** |
| Explicit **`birthTime`** | Use as today |
| Explicit **`birthTimeUnknown: true`** | Unchanged |
| Checkout minimum | **nickname + birthDate** · country defaults **JP** |
| Fulfillment | Use same normalized profile · pipeline unchanged |

---

## E. Files to edit（implementation gate）

| Priority | File |
|----------|------|
| **P0** | **`lib/soul/birthProfileV2.ts`** |
| **P0** | **`lib/m55/compositeStem/profileCheckout.test.ts`** |
| **P1** | **`components/my/MyPanel.tsx`** |
| **P1** | **`components/PurchaseButton.tsx`** |
| **P2** | **`lib/m55/compositeStem/checkoutProfileGate.ts`**（if reason strings need update） |
| **docs** | **`profileCheckout.test.ts`** coverage for legacy cohort profile |
| **non-touch** | **`runM55CompositeStemPipeline`** · webhook · Stripe · locked shelf server path logic（behavior follows normalized profile） |

---

## F. Validation plan（implementation + re-attestation）

| # | Check | Type |
|---|-------|------|
| **V-1** | Unit: legacy profile `{ nickname, birthDate, country: JP }` → **`validateDtrCheckoutProfile` ok** | automated |
| **V-2** | Unit: missing nickname/birthDate still **blocked** | automated |
| **V-3** | Unit: fulfillment metadata **`profileBirthTimeUnknown`** true when time missing | automated |
| **V-4** | `npm run build` webpack compile PASS | automated |
| **V-5** | Human **`/my`**: no purchase-blocking birthTime message | visual |
| **V-6** | Human **`/dtr/lp`**: purchase button eligible（no click / no payment） | visual |
| **V-7** | Human **`/dtr`**: locked shelf stable · no **`クリエイター`** regression | visual |
| **V-8** | Checkout / payment | **HOLD** until separate GO |

---

## G. Visual re-attestation checklist（post-implementation · no payment）

| ID | Observation | Expected |
|----|-------------|----------|
| **PGR-1** | **`/my`** signed-in legacy cohort | **No** blocking birthTime nag |
| **PGR-2** | **`/dtr/lp`** | Purchase CTA **enabled**（minimum fields present） |
| **PGR-3** | **`/dtr`** locked shelf | No **`クリエイター`** · generic or analyst per draft |
| **PGR-4** | Optional helper copy | Non-blocking only if shown |
| **PGR-5** | Checkout | **not executed** |

---

## H. Checkout HOLD confirmation

| Item | Status |
|------|--------|
| **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** |
| Live payment / webhook / VERIFY-C | **HOLD** |

Profile gate relaxation **does not** authorize checkout execution.

---

## I. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| code edit / commit / deploy | **no** |
| checkout / payment / DB / SQL | **no** |
| webhook / VERIFY-C / env / Stripe | **no** |
| raw ID recording | **no** |

---

## J. Recommended next gate

| Priority | Gate |
|----------|------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PROFILE-GATE-RELAXATION-IMPLEMENTATION`** |
| **2** | **`…PROFILE-GATE-RELAXATION-COMMIT-PLANNING`** → **`…COMMIT-EXEC`** |
| **3** | Human visual re-attestation §G |
| **4** | Close **`DEPLOY-OBSERVATION-RE-RUN`** Human pending items |
| **5** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`** |
| **6** | **`FRESH-CHECKOUT-D-EXEC`** · **HOLD** until fresh GO |

---

## K. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PROFILE-GATE-RELAXATION-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION-RERUN-001`** | Human deploy observation |
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-001`** | Original profile gate diagnostic |

---

## L. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | PROFILE-GATE-RELAXATION planning GREEN |
