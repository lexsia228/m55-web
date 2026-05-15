# M55 Public Claims Allowlist v1

**Status:** additive SSOT (does not replace existing monetization, legal, or product freeze documents).  
**Use:** default checklist before publishing or shipping user-visible copy in app routes, marketing, or support.  
**Automation:** `scripts/run-sonnet-audit.js` enforces vocabulary on public-surface paths; optional `app/api` via `--reserve-scan`.

---

## A. Allowed public claims now (aligned with current frozen law)

The following **themes** are in-family with current public truth: **Free → ¥1,000 Entry Report → purchaser-only, report-bound consult**; **no generic public AI chat**; simple vocabulary (**10通りの資質** / **5つの解析軸**).

Illustrative phrasing (must still match actual product behavior at ship time):

1. **Input & framing**  
   - 生年月日を手がかりに、**輪郭**や傾向を**文章として整理**する。  
   - **自己観測**・**見取り図**として読むためのサービスである（**診断・投資助言の代替ではない**）。吉凶の断定や順位づけの代替でもない。

2. **Vocabulary (approved simple numbers)**  
   - **10通りの資質**（公開面ではこれに統一）  
   - **5つの解析軸**（五行バランスの**比喩**としての読み取り枠）

3. **Free tier**  
   - 無料で、**輪郭**や当日・週の**観測の入り口**が見える（範囲は SSOT の無料面に従う）。

4. **Entry Report (paid)**  
   - **Entry Report** で、**理由や重なり方**などが**章立て**で深まる。  
   - **デジタル提供**（**物理配送なし**）である旨。

5. **Consultation**  
   - **購入後**、**レポートに紐づく**範囲での **AI による個別相談**（**回数・上限は商品・SSOT に従う**）。  
   - **購入者専用**であり、**公開の汎用チャットではない**。

6. **Consistency (careful)**  
   - **同じ入力**を**同じルール**で読む限り、**結果の骨組みがぶれにくい**よう**設計している**（**保証の過剰表現にしない**）。

7. **Trust hygiene**  
   - 医療・法律・投資等の**専門的判断に代わらない**。

---

## B. Forbidden or reserved claims (do not ship without new evidence + review)

### B.1 Explicitly blocked phrases (automation enforces a subset in `scripts/run-sonnet-audit.js`)

- **世界初**  
- **日本発**（唯一・初などの**起源・独占**に結びつく用法）  
- **20万7,360**  
- **33の基本因子**  
- **12の動的サイクル**  
- **1,000年の統計**  
- **誰がいつ解析しても不変**（同趣旨の**絶対同一性**の断言）  
- **AI精度No.1**  
- **best in Japan**（および同趣旨の**英語順位表現**）  
- **ぼったくり**等の**敵対的競合**フレーミング  

### B.1a Public-surface vocabulary (zero on user-visible routes in audit scope)

- **占い**（漢字2文字の語）  
- **10の資質**（**10通りの資質**へ統一）  
- **偏り**（**5つの解析軸**へ統一）

### B.2 Reserved without external proof

- **ベンチマーク**・**市場比較**・**シナリオ換算**（CVR 等）の**具体的数値主張**  
- **会員数・販売数・専門家数**など（**第三者検証可能**でない限り）  
- **world-class** / **業界最高** 等の**グローバル優越**表現  
- **一般向けパブリック AI チャット**があるかのような**誤認**を招く表現  

### B.3 Internal-only numerics

- **33** / **12** を**マーケ主語**にした主張（FAQ 等の**静かな裏付け層**以外では使わない方針。使う場合は別 SSOT でスコープ限定）

---

**Governance:** Any expansion of Section A requires **product + trust review**. Section B is **non-exhaustive**; when in doubt, **do not claim**.
