# M55_PAGE_OUTPUT_MAPPING_PATCH_P1_20260324_v1.md

Status: READY-FOR-CURSOR
Authority target: `M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md`
Intent: review pass で出た Layer3 skeleton と page scope の対応を補完する patch

---

## 0. Patch purpose

この patch は主に C8 を埋める。

- `魂の原石 / 才能の変換機 / 航路` と
- `essence / today / weekly`
- 各ページの責務

の対応を presentation mapping として明文化する。

重要:
これは **presentation correspondence** であり、Layer2 scope そのものを置き換えるものではない。

---

## 1. Narrative correspondence table

| Layer3 skeleton | Primary Layer2 scope | Main page |
|---|---|---|
| 魂の原石 | `essence` | `/core` |
| 才能の変換機 | `today` | `/today` |
| 航路 | `weekly` | `/weekly` |

### Interpretation
- `/core` は「あなたらしさの核」を最もよく受ける
- `/today` は「今日の活かし方 / 出力の整え方」を最もよく受ける
- `/weekly` は「流れ / 見方 / 長めの整理」を最もよく受ける

---

## 2. Home bridge rule

Home (`/`) はこの3層を全部“薄く”扱う。

### Allowed bridge labels
- 本質 = 魂の原石の入口
- 今日 = 才能の変換機の入口
- 今週 = 航路の入口

### Rule
- Home は narrative full display をしない
- 入口ラベルとしてのみ使う
- raw layer names を hero 主語にしない

---

## 3. DTR rule

DTR は 3層すべてを一段深く持てる。

### DTR chapter use
- Section group A = 魂の原石
- Section group B = 才能の変換機
- Section group C = 航路

### Rule
- public LP では teaser only
- owned reader で full sections
- current `/dtr/lp` では重い断定コピーにしない

---

## 4. My rule

`/my` は 3層の全文表示面ではない。  
所有と再開のハブである。

### Allowed
- 短い section labels
- 最後に見た章
- 所有 DTR の章構造メタ情報

### Not allowed
- Home 代替
- DTR full body 全表示
- strong narrative copy

---

## 5. Tone constraints by page

### `/core`
- 本質の要約
- 静か
- 2〜4キーワード
- “核” を強調

### `/today`
- 即読
- 焦点 / 一歩
- 活かし方を強調

### `/weekly`
- 週次整理
- line / focusAreas
- 流れを強調

### `/`
- 全部の入口
- narrative は薄く
- value explanation を優先

---

## 6. Patch acceptance

この patch 適用後、Layer3 skeleton と current Web free pages の対応は以下で固定される。

- 魂の原石 -> `/core`
- 才能の変換機 -> `/today`
- 航路 -> `/weekly`

ただし、これは **display correspondence** であり、Layer2 scope 置換ではない。
