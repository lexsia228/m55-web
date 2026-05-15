# M55 Web Page Family Consistency SSOT

Status: DRAFT FOR FREEZE
Mode: frame and family law
Scope: release-night MVP, Wave A visual consolidation

## 1. Objective

All public M55 pages must feel like members of one product family.

The user must not feel that:
- home is one site
- DTR is another site
- support/success are admin pages
- core/today/weekly are pasted legacy pages

## 2. Page families

### Entry family
- /

### Content family
- /core
- /today
- /weekly

### Commerce family
- /dtr/lp

### Ownership family
- /my
- /purchase/success

### Support family
- /support
- legal pages

Each family may vary in emphasis,
but all must share the same visual language.

## 3. Shared family law

All families must share:
- same background temperature
- same card language
- same typography hierarchy
- same link style
- same nav temperature
- same spacing rhythm
- same CTA restraint

## 4. Skeleton consistency law

Each page may differ in content,
but skeleton logic must remain coherent.

Required skeleton primitives:
- page identity block
- primary content block
- secondary/supporting block
- trust/recovery block when relevant
- stable nav frame

No family may invent a completely separate layout grammar.

## 5. Frame law

Entry / commerce / support / ownership pages:
- must use direct card surfaces

Content family using legacy iframe:
- must use outer frame surfaces matching the same card family
- must not visually detach from the product

## 6. Trust language consistency

Legal, refund, support, and post-purchase explanations
must appear in the same visual language across:
- DTR page
- success
- My Page
- support

## 7. CTA law

Each page must present a clear primary action.

Examples:
- / → begin / open your view
- /dtr/lp → purchase
- /purchase/success → go to My Page
- /my → open owned content / check status
- /support → contact / resolve

CTA shape, size, and tone must remain family-consistent.

## 8. Consistency violations

Violations include:
- one page uses heavy shadows while another uses none
- support/success look like internal utility pages
- content family feels pasted into shell
- random color drift
- unrelated card language between pages

## 9. Release priority

Fix in this order:
1. /
2. /dtr/lp
3. /my
4. /purchase/success
5. /support
6. /core /today /weekly outer frame

## 10. Freeze summary

M55 page family consistency means:
- one product
- one visual language
- one trust language
- one shell temperature
- clear family variation without fragmentation
