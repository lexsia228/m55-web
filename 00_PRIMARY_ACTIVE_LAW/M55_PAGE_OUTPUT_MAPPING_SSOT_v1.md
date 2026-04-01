# M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGHEST
Scope: Layer3 binding boundary / page-by-page field exposure
Intent: Page × Output Field の唯一表を固定し、無料/深掘りの境界をページ単位で壊れなくする

---

## 0. Purpose

本書は、Layer2 output を各ページで **どこまで見せてよいか** を定義する。

目的は以下。

1. Home / core / today / weekly / my / dtr の責務差を固定
2. free/deep leakage を防ぐ
3. public surface に raw logic を出さない
4. DTR の価値差を静かに保つ

---

## 1. Page classes

### Class A — Public free summary
- `/`
- `/core`
- `/today`
- `/weekly`

### Class B — Ownership / library
- `/my`

### Class C — DTR value explanation
- `/dtr/lp`

### Class D — Reserved future full reader
- `/dtr/[id]` など
- 現時点では reserved

---

## 2. Home (`/`) mapping

### Allowed fields
- `essence.summaryShort`
- `essence.keywords`
- `today.heading`
- `today.summaryShort`
- `weekly.heading`
- `weekly.weeklyKey`
- `dtr.teaserSections`
- envelope `freeVisible`
- envelope `dtrExpandable`

### Not allowed
- `rawTraits`
- `rawSignals`
- `fullSections`
- relationship / long-term detail
- deep background paragraphs

### Intent
Home は free-first の入口。  
“何が見えるか” を知らせるが、logic raw output 全部は出さない。

---

## 3. Core (`/core`) mapping

### Allowed fields
- `essence.summaryShort`
- `essence.keywords`
- `essence.focusAreas`
- envelope metadata (safe subset)
- bridge links to today / weekly / dtr

### Conditional internal use only
- `rawTraits` may be stored, not displayed directly

### Not allowed
- giant analysis board
- DTR full body
- raw dramatic labels
- long-term detail

### Intent
本質の無料面。  
Home より一段深いが、まだ free summary の範囲。

---

## 4. Today (`/today`) mapping

### Allowed fields
- `today.heading`
- `today.summaryShort`
- `today.focus`
- `today.step`
- `today.bridgeToTomorrow`
- bridge links to weekly / dtr

### Not allowed
- rawSignals direct display
- long body text
- relationship / long-term detail
- fortune-site filler

### Intent
毎日開く理由を作る短い面。  
today の責務は “即読” である。

---

## 5. Weekly (`/weekly`) mapping

### Allowed fields
- `weekly.heading`
- `weekly.weeklyKey`
- `weekly.lines`
- `weekly.focusAreas`
- `weekly.nextBridge`
- bridge links to dtr

### Not allowed
- monthly clutter
- rawSignals direct display
- full deep narrative
- deterministic long-term claims

### Intent
週次の整理面。  
today より少し広く、しかし DTR ほど深くない。

---

## 6. My (`/my`) mapping

### Allowed fields
- Layer1 ownership facts
- `dtr.title`
- `dtr.ownershipType`
- `dtr.expiresAt`
- `dtr.aiConsultIncluded`
- `dtr.version`
- safe preview labels
- consult credit counts
- recent session metadata

### Conditional
- owned content preview
- last opened section metadata

### Not allowed
- public teaser copy only
- full DTR body for not-owned state
- raw logic labels shown as-is

### Intent
所有・再開・見返しの整理面。  
My は “権利と利用の結節点” である。

---

## 7. DTR LP (`/dtr/lp`) mapping

### Allowed fields
- `dtr.title`
- `dtr.teaserSections`
- `dtr.ownershipType`
- `dtr.aiConsultIncluded`
- `dtr.version`
- calm explanation copy
- FAQ / trust bridge

### Not allowed
- `dtr.fullSections`
- raw layer output
- owned-only detail
- alarmist deep claims

### Intent
logic の全表示面ではなく、**深掘り価値の説明面**。

---

## 8. Reserved full reader mapping

### Reserved page
- `/dtr/[id]`
- current Web MVP では future slot

### Allowed fields when owned
- `dtr.fullSections`
- `dtr.teaserSections`
- `dtr.title`
- `ownershipType`
- `expiresAt`
- `aiConsultIncluded`
- `version`

### Required gate
- Layer1 ownership check required
- mismatch -> fail

---

## 9. Field exposure matrix

### Home
- summary only
- teaser only

### Core
- essence free main
- keywords / focusAreas

### Today
- today free main
- short actionability

### Weekly
- weekly free main
- short structure

### My
- ownership + library metadata
- owned preview

### DTR LP
- value explanation + teaser

### Full reader (future)
- full sections only when owned

---

## 10. Binding rules

- Page may only expose fields explicitly allowed here
- New field addition requires mapping update
- Raw field direct display requires explicit approval
- Deep-only fields leaking into public free pages -> fail

---

## 11. Final command

ページ責務を曖昧にすると、無料と深掘りの境界は必ず壊れる。  
本書を唯一表として、Page × Output Field の露出範囲を固定すること。
