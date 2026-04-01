# M55 Reproducibility Appendix v1

**Status:** additive SSOT appendix (does not supersede existing frozen law).  
**Intent:** state what M55 may truthfully communicate today about reproducibility and consistency, and what must not be claimed without stronger evidence and assets.

---

## A. Scope and intent

- This appendix bounds **public-trust and payment-adjacent** statements about determinism, repeatability, and “same input → same output.”
- It is **not** a mathematical proof document and introduces **no new numeric or combinatorial claims**.
- Current product posture is **rebuildable and consistency-oriented**: engineering choices favor stable skeletons under stable inputs; it is **not** “fully proven perfect reproducibility” in a formal sense.

---

## B. Current provable truths (engineering / operations)

- For a **fixed product version**, **fixed rule set**, and **fixed user inputs** used in generation, the service is designed so that **core structural readouts** (e.g., archetype lane, balance visualization patterns tied to documented rules) **do not drift arbitrarily** from request to request.
- **Time-dependent surfaces** (e.g., “today” / “this week”) **change by design** when the calendar context changes; this is not inconsistency of the base profile readout.
- **Fulfillment and access** are governed by **database-backed entitlements** and server checks; these are **auditable** operationally (who has access, when it was granted) independent of narrative marketing claims.

---

## C. Current non-provable / not-yet-public-safe claims

Do **not** present the following as established public fact without a separate evidence pack and legal review:

- “**Anyone, anytime, identical bytes**” guarantees across all environments and future versions.
- **Statistical universes** or **historical population** claims (e.g., millennium-scale empirical proof).
- **Factor-count** or **cycle-count** marketing tied to internal taxonomies (e.g., explicit “33 / 12” style claims on public surfaces).
- **Benchmark superiority**, **accuracy rankings**, or **market-wide comparisons**.
- Implications of **formal peer review** or **third-party certification** unless actually obtained and scoped.

---

## D. Preconditions for re-running the “same result skeleton”

To meaningfully repeat the **same structural skeleton** a user saw:

- **Same** deployed **application logic version** (or a documented artifact that pins that version).
- **Same** documented **engine / catalog versions** that feed the readout.
- **Same** **birth date** (and any other inputs defined as in-scope for that readout).
- **Same** **locale / copy templates** where text is generated from templates.
- Acknowledgment that **rolling deployments**, **content template edits**, or **intentional product updates** may change wording or secondary presentation while preserving documented core rules.

---

## E. Missing assets still required for true 100% reproducibility (acknowledgment)

Full, **bit-identical** reproducibility across arbitrary future environments typically requires items **not all of which are published as a single frozen bundle today**, for example:

- A **pinned, immutable build artifact** (container image hash or equivalent) per release.
- **Frozen snapshots** of all **text catalogs**, **prompt templates** (where applicable), and **engine configuration** used for that artifact.
- **Deterministic build and deployment records** (dependency lockfiles, CI provenance) retained for the release.
- A **published rerun procedure** (scripted or documented) that third parties could execute **without undisclosed steps**.

Until those are complete and attested, public language should remain **consistency-oriented**, not **perfect-reproducibility-certified**.

---

## F. Safe public wording examples (illustrative)

- 「同じ入力を、同じルールで読む限り、**骨組みがぶれにくい**よう設計しています。」
- 「日付が変わる読み（今日・今週など）は、**時間とともに更新**されます。」
- 「表示や文章は、**プロダクト更新**で調整されることがあります。核となる入力とルールの関係は SSOT に沿って管理します。」

---

## G. Unsafe public wording examples (non-exhaustive)

- 「誰がいつ解析しても**完全に不変**」
- 「**1,000年**の…に基づく」など、**検証不能な歴史・統計**の暗示
- 「**世界初**」「**日本発の唯一**」等の**独占・起源**表現
- 「**AI精度 No.1**」「**best in Japan**」等の**順位・優越**表現
- 内部因子数・サイクル数（例：**33** / **12** を前面に出す主張）を、**科学的に証明済み**のように読ませる言い回し

---

**Stop boundary:** This appendix does not authorize new marketing claims; it **narrows** safe language. **Existing frozen SSOT and law remain authoritative** where they conflict with examples—follow the stricter rule.
