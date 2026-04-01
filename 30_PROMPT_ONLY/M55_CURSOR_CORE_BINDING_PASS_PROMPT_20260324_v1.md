# M55_CURSOR_CORE_BINDING_PASS_PROMPT_20260324_v1.md

Status: READY-TO-PASTE
Mode: binding pass / step 1 only / core only
Authority scope: canonical engine established + binding rollout SSOT

---

## 0. Mission

あなたは M55 Web MVP の binding AI である。  
今回の任務は、**`/core` だけ** を canonical engine の `essence` 出力へ bind すること。

他のページには触るな。  
Home には触るな。  
UI 再設計をするな。

---

## 1. Read first

1. `M55_BINDING_ROLLOUT_FROM_DEFINITION_TO_CONNECTION_SSOT_20260324_v1.md`
2. `M55_CANONICAL_IO_CONTRACT_SSOT_v1.md`
3. `M55_CANONICAL_IO_CONTRACT_PATCH_P0_20260324_v1.md`
4. `M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md`
5. `M55_PAGE_OUTPUT_MAPPING_PATCH_P1_20260324_v1.md`
6. `M55_LAYER3_VOCABULARY_AND_NARRATIVE_PACK_SSOT_v1.md`
7. canonical engine files under `lib/m55-canonical/`

---

## 2. Absolute constraints

### NO TOUCH
- Home
- `/today`
- `/weekly`
- `/my`
- `/dtr/lp`
- pricing
- routing
- product surface
- shell hierarchy
- support / legal / FAQ

### MUST
- `/core` only
- canonical engine only
- `contextScope = essence`
- display mapper only
- page-safe fields only
- no raw leakage

---

## 3. Goal

`/core` を legacy / ad-hoc / placeholder source から切り離し、  
canonical engine の `essence` 出力を使う current Web page にする。

---

## 4. Required implementation shape

### A. Thin binding adapter
必要なら最小の adapter / helper を作れ。

Responsibilities:
- assemble canonical input
- call canonical engine
- call display mapper
- select `/core` allowed fields
- fail fast on mismatch

### B. `/core` visible fields
Allowed:
- essence.summaryShort
- essence.keywords
- essence.focusAreas
- safe bridge links

Not allowed:
- rawTraits
- raw dramatic labels
- DTR deep fields
- long-term detail
- Layer1 truth details

### C. Determinism
同じ input なら同じ render source になるようにする。  
golden engineVersion を壊すな。

---

## 5. File scope

Prefer touching only:
- `app/core/page.tsx`
- minimal helper / adapter under `lib/` if needed
- no broad refactor

---

## 6. Forbidden moves

- Home をついでに直す
- `/today` `/weekly` も一緒に bind する
- UI を派手に変える
- raw payload をそのまま見せる
- new product surface を追加する
- Free / Standard / Premium を戻す
- app commerce surface を戻す

---

## 7. Required report format

1. changed files
2. binding adapter shape
3. `/core` input assembly
4. `/core` visible fields
5. what was intentionally not exposed
6. no-touch confirmation
7. remaining gaps

---

## 8. Final command

1 step = 1 page.  
今回は `/core` だけを bind せよ。

Home は基準面のまま固定。  
binding は静かに、薄く、壊さず進めること。
