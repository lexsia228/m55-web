# M55 Asset-First Commercial SSOT v1

Status: **Frozen implementation authority (2026-07-28)**

Machine ledger: `lib/m55/commercialUx/assetLedger/`

## Top rules

1. **Core user job:** The user wants to understand themselves.
2. **M55 responsibility:** M55 organizes readability, structure and commercial presentation.
3. **Prohibited user delegation:** Never ask for reading style, section order, report format or presentation preference.
4. **Asset-first:** Use approved canonical assets; do not invent replacement copy when a canonical owner exists.

## Asset classifications

| Class | Meaning |
|---|---|
| CANONICAL | Human-approved source material for new implementations |
| DERIVED | Surface-specific transformation of canonical parents |
| LEGACY | Historical compatibility only; prohibited in new UI |
| REJECTED | Invalid or commercially harmful; must not render |

## Single commercial fence

Authority: `lib/m55/commercialUx/assetLedger/commercialFence.ts`

- **FREE:** what appears now, closest trait, evidence, one scene, useful conclusion, save/share
- **PREMIUM:** why it continues, strength conditions, burden accumulation, interpersonal load, recovery, easier next action

## Premium questions

Authority: `lib/m55/commercialUx/assetLedger/premiumQuestionContract.ts`

- Q1–Q4: preserved (work, decision, relation, fatigue)
- Q5: `paid.recovery_sequence` — recovery selector catalog
- Q6: `paid.restart_condition` — chapter IV emphasis catalog
- Legacy `paid.report_usage` / `paid.reading_style`: cleared from in-progress unpaid sessions; snapshots remain immutable

## User-facing terminology

Product name: **プレミアムレポート**

User-facing surfaces must not use internal chapter-construction terminology (`4章`, `4章構成`, `第N章`).

Internal purchased-report generation may retain section identifiers.

## Change protocol

1. Search CANONICAL assets
2. Use existing asset or create DERIVED view
3. Add CANONICAL only when genuinely missing
4. Register ledger + consumption + verifier + tests in same PR
5. Human representative-screen review required

## Verification

```bash
npm run verify:m55-asset-ledger
npm run verify:m55-experience-control-plane
```
