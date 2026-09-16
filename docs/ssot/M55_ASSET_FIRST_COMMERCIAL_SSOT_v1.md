# M55 Asset-First Commercial SSOT v1

Status: **Frozen implementation authority (2026-07-28)**

Machine ledger: `lib/m55/commercialUx/assetLedger/`

## Top rules

1. **Core user job:** The user wants to understand themselves.
2. **M55 responsibility:** M55 organizes readability, structure and commercial presentation.
3. **Prohibited user delegation:** Never ask for reading style, section order, report format or presentation preference.
4. **Asset-first:** Use approved canonical assets; do not invent replacement copy when a canonical owner exists.
5. **Benchmark-first public expression:** Before adding or changing public-facing copy, FAQ, trust content, CTA, section, explanatory text, or commercial page structure, map the item against the benchmark set already defined by M55 SSOT. Do not invent a new expression pattern first and validate it later.

## Benchmark-first public expression gate

This gate is mandatory before implementation of user-facing commercial expression.

- **Mapping before implementation:** Benchmark mapping must happen before code or copy is added. “Implement first, remove later” is prohibited.
- **UNMAPPED = NO_IMPLEMENT:** If an item has not been mapped against the SSOT-defined benchmark set, do not implement it.
- **Repeated benchmark presence = required gap:** If the same class of item is present across multiple relevant benchmark sites and M55 does not have it, treat it as a required gap to close unless a higher Product / Legal authority explicitly conflicts.
- **Repeated benchmark absence = do not add:** If the item is not present across multiple relevant benchmark sites, do not add it merely because it sounds reassuring, complete, premium, or helpful.
- **Single-site novelty is insufficient:** A pattern found on only one benchmark is not enough to introduce it into M55 without separate Human approval.
- **No AI-style explanatory inflation:** Do not add extra explanations, reassurance paragraphs, FAQ questions, trust copy, or invented framing beyond what the mapped pattern and M55 authority require. Unnecessary explanatory copy lowers clarity and can make the site feel AI-generated.
- **Use proven templates:** Prefer established commercial information architecture, wording patterns, disclosure placement, and conversion structure from mapped high-performing / relevant sites over novel AI-generated structures.
- **No invented trust problem:** Do not introduce a question or explanation that implies a user concern unless the concern is evidenced by repeated benchmark usage, M55 user evidence, or explicit Product / Legal authority.
- **Minimal delta only:** After mapping, implement only the missing benchmark-supported delta. Reuse existing M55 assets, copy owners, components, disclosures, and routes wherever possible.

Required implementation table for any new commercial expression:

`Item | Benchmark A | Benchmark B | Benchmark C+ | M55 current state | Product/Legal authority | Classification | Implement?`

Allowed classifications:

- `BENCHMARK_REQUIRED_GAP` — repeated benchmark presence; missing in M55; implement the minimum required form.
- `COMPLETE_AND_WIRED` — repeated benchmark presence and already correctly implemented in M55; no-op.
- `UNMAPPED_NO_IMPLEMENT` — mapping not completed; implementation prohibited.
- `BENCHMARK_ABSENT_NO_IMPLEMENT` — not supported across multiple relevant benchmarks; do not add.
- `SINGLE_SITE_HOLD` — supported by only one benchmark; Human approval required before implementation.
- `REQUIRED_BY_AUTHORITY` — explicitly required by Product / Legal authority even when benchmark frequency differs.

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

1. Run the benchmark-first public expression gate for any new user-facing commercial expression
2. Search CANONICAL assets
3. Use existing asset or create DERIVED view
4. Add CANONICAL only when genuinely missing and benchmark/authority-supported
5. Register ledger + consumption + verifier + tests in same PR
6. Human representative-screen review required

## Verification

```bash
npm run verify:m55-asset-ledger
npm run verify:m55-experience-control-plane
```
