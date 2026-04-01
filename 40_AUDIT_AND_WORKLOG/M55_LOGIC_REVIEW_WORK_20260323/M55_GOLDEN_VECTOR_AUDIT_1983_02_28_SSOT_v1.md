# M55_GOLDEN_VECTOR_AUDIT_1983_02_28_SSOT_v1.md

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGH
Scope: golden vector audit / Layer2-Layer3 integration check
Intent: 1983-02-28 を golden vector として、決定論・蒸留安全性・page mapping を監査する

---

## 0. Purpose

本書は 1983-02-28 ケースを golden vector として固定し、
Layer2 と Layer3 の結合が壊れていないかを監査するためのもの。

---

## 1. Golden vector definition

### Input
- `birthDate = 1983-02-28`
- `nickname = T`（or canonical audit label）
- `locale = ja-JP`
- `nowDate = fixed test date`
- `contextScope` は `essence` / `today` / `weekly` / `dtr` を順に監査

### Rule
同一条件では、同一 raw output と同一 display output が返ること。

---

## 2. Audit targets

### A. Determinism
- same input -> same raw output

### B. Display stability
- same raw output -> same display output

### C. Safety
- forbidden wording leak がない
- public-safe wording を守る

### D. Free / deep split
- public pages に deep-only fields が漏れていない

### E. Page mapping
- Home / core / today / weekly / my / dtr の露出が mapping に一致する

---

## 3. Required snapshots

各 scope で次を保存する。

- canonical input snapshot
- raw output snapshot
- display output snapshot
- page exposure snapshot
- diff report

---

## 4. Failure conditions

- raw output が run ごとに変わる
- display text が run ごとに変わる
- raw dramatic language が Home に漏れる
- deep-only field が public free page に漏れる
- ownershipType / mapping mismatch
- forbidden wording leak

---

## 5. Pass conditions

- raw determinism pass
- display determinism pass
- public-safe wording pass
- free/deep boundary pass
- page mapping pass

---

## 6. Final command

1983-02-28 は golden vector である。  
今後の logic / vocabulary / mapping 更新は、必ずこの監査を通してから採用すること。
