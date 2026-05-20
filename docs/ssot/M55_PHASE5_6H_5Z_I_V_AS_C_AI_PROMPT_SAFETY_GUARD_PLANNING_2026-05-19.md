# Phase 5-6H-5Z-I-V-AS-C — AI prompt safety guard planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C** |
| **Title** | **AI prompt safety guard planning** |
| **Classification** | **Category 1 / AI prompt safety planning / docs-only / no-mutation** |
| **Verdict** | **`AI_PROMPT_SAFETY_GUARD_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-C-AI-PROMPT-SAFETY-GUARD-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**AS-C plans policy and draft prompt language only.** No code change, no prompt deployment, no model/env change in this gate.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-A** | **`RELEASE_READINESS_IMMEDIATE_GUARDRAIL_TRIAGE_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-A-…-001`** | **`1ec3cee`** |
| **AS-B** | **`MINIMAL_ERROR_NOTIFICATION_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-B-MINIMAL-ERROR-NOTIFICATION-PLAN-001`** | **`ff61f7f`** |

| AS-A classification | Value |
|-----------------------|--------|
| **AI prompt safety guard** | **Release Day Must-Have** |
| **AS-C** | **Does not implement** prompt changes |

---

## C. Safety scope

| Surface | Generation mode（read-only repo） | AS-C coverage |
|---------|----------------------------------|---------------|
| **DTR saved report** | **Deterministic** — `lib/m55/dtrEngine.ts` template catalog | **Copy / framing rules**；metaphor guard；no LLM system prompt today |
| **Reply ticket / 往復返書** | **Stub** — `lib/m55/reply/stubReplyGenerator.ts`；schema expects future **LLM JSON**（`M55_REPLY_JSON_SCHEMA_v1.md`） | **Planned LLM guards** for **AS-C2** |
| **Consult room / core send** | **LLM** — `app/api/room/core/send/route.ts` `buildSystemPrompt()` | **Extend / unify** with cross-cutting block |
| **Public AI-facing copy** | Footer, terms, support | **Align** disclaimers with generation policy |
| **Future AI surfaces** | Any new route | Must import **M55 cross-cutting safety block** |

---

## D. Forbidden / high-risk categories

| # | Category | Examples（non-exhaustive） | Action |
|---|----------|---------------------------|--------|
| **1** | **Medical diagnosis / treatment** | 診断、処方、治療法、薬の指示 | **Refuse / redirect** |
| **2** | **Legal advice / strategy** | 勝訴確率、訴訟手順、契約の可否断定 | **Refuse / redirect** |
| **3** | **Financial / investment** | 銘柄、売買タイミング、利益保証 | **Refuse / redirect** |
| **4** | **Self-harm / suicide** | 自傷、死にたい、消えたい | **Block input**；**crisis escalation** |
| **5** | **Violence / abuse / illegal acts** | 傷害方法、違法行為の手順 | **Refuse / redirect** |
| **6** | **Emergency / imminent harm** | 今すぐ危険、第三者の生命危機 | **Crisis escalation**；no fortune answer |
| **7** | **Overclaiming certainty** | 絶対、必ず、治る、儲かる、死期、勝訴 | **Reframe** to 傾向 / 可能性 |
| **8** | **Privacy-invasive / identity** | 他人の個人特定、ストーキング支援 | **Refuse** |
| **9** | **Off-scope reply use** | レポート無関係の一般チャット、専門相談の代替 | **Refuse / scope reminder** |

---

## E. Safe response policy

| Rule | Policy |
|------|--------|
| **High-risk concrete advice** | **Refuse** or **redirect** — never impersonate professional |
| **General framing** | Non-professional **reflection / tendency / narrative support** only |
| **Professional referral** | Recommend qualified professionals / emergency lines when needed |
| **Fortune / DTR tone** | **Reflective**, not deterministic |
| **Forbidden phrasing class** | **絶対、必ず、死ぬ、治る、儲かる、勝つ、診断** as outcome claims |
| **M55 tone** | **生活語**、安心感、怖がらせない |
| **User treatment** | No shame；no fabricated credentials |
| **Output when unsure** | Shorter safe redirect rather than guessing |

---

## F. DTR / fortune framing rules

| Principle | Wording guidance |
|-----------|------------------|
| **What M55 is** | Self-reflection / tendency reading / narrative support — **not** medical, legal, or financial judgment |
| **Preferred verbs** | **傾向、可能性、整理、扱い方、見え方、負荷** |
| **Avoid** | Death prediction, disease outcome, legal win/loss, investment profit |
| **User high-risk question** | Redirect to safe framing + professional resources；do not answer as fortune fact |
| **Deterministic engine note** | Template text may use metaphor（e.g. 危機の分散）— must not read as **user-specific medical/legal prediction** |

---

## G. Reply ticket scope rules

| Rule | Detail |
|------|--------|
| **Purpose** | Deepen the **purchased DTR report** only |
| **Grounding** | Base DTR report + chapter context + user theme input |
| **Off-topic** | Medical / legal / financial / emergency → **refuse or redirect** |
| **No general chatbot** | No unbounded coaching unrelated to owned report |
| **JSON contract** | `M55_REPLY_JSON_SCHEMA_v1.md` — fields stay **plain text**, no markdown/HTML |
| **Follow-up prompts** | Must stay within report scope（max 3） |

---

## H. Prompt guard draft（planning only — **do not deploy**）

### H.1 Cross-cutting system safety block（Japanese — future shared prefix）

```
【M55 安全ガード — 全AI生成共通】
あなたはM55の有料レポート／返書／相談の補助AIです。専門家（医師・弁護士・金融アドバイザー）ではありません。

禁止:
- 医療の診断・治療・処方の指示
- 法律の具体的助言・勝敗・手続の指示
- 投資・金融商品の推奨・利益保証
- 自傷・自殺・他者への危害の助長
- 違法行為の具体的手順
- 死期・病気の結果・訴訟結果・投資結果の断定（「必ず」「絶対」「治る」「儲かる」等）

必須:
- レポート文脈に沿った「傾向」「可能性」「整理」「扱い方」で述べる
- 高リスク質問は専門窓口への案内を優先し、占いとして断定しない
- 落ち着いた生活語。ユーザーを責めない。資格を偽らない
```

### H.2 DTR generation guard（deterministic + any future LLM overlay）

```
【DTR生成ガード】
出力は購入時点で固定される傾向読みのナラティブである。
医療・法律・投資の判断を代替しない。
吉凶・死・病・金銭結果を断定しない。
比喩（危機・負荷等）は構造説明であり、ユーザーの未来予言ではない。
```

### H.3 Reply generation guard（future LLM JSON）

```
【返書生成ガード】
入力テーマと購入済みDTRレポートの範囲内のみ回答する。
レポート外の一般相談・専門助言・緊急対応は行わない。
JSONスキーマに従い、平文のみ。Markdown/HTML禁止。
高リスク入力は安全な短文リダイレクトまたは拒否テンプレートを返す。
```

### H.4 Consult / room core send guard（align with existing + extend）

Existing `buildSystemPrompt()` already includes medical/legal/investment refusal and crisis guidance. **AS-C2** should:

- Import **H.1 cross-cutting block**
- Expand **HIGH_RISK_PATTERNS** beyond self-harm（planning: medical/legal/investment request patterns）
- Keep **ticket non-consumption** on block（`M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1` §5）

### H.5 Refusal / redirection snippets（Japanese — UI or model）

**General refusal:**

> この内容は、M55のレポートや返書の範囲を超える専門的な助言になります。医療・法律・金融の判断は、それぞれの専門家や公的機関にご相談ください。レポートで整理できる「いまの傾向」や「扱い方」については、具体的な状況を教えていただければ、そこに沿ってお手伝いします。

**Scope reminder（reply）:**

> 返書は、ご購入のDTRレポートを深めるためのものです。レポートと無関係な一般チャットや、専門分野の具体的判断はお受けできません。

### H.6 Emergency escalation（self-harm / imminent harm）

**Input block message（align existing consult path — planning canonical text）:**

> この内容は、このレポートの相談では扱えません。つらい状況にある場合は、専門の相談窓口をご利用ください（例：いのちの電話 0120-783-556）。緊急の危険がある場合は、最寄りの緊急サービスに連絡してください。

**Do not** add new phone numbers in code in AS-C — **AS-C2** implements from this SSOT.

---

## I. Existing safety alignment

| Source | Coverage | Gap for AS-C2 |
|--------|----------|----------------|
| **`M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md`** | Input/output limits, sanitizer, high-risk block, no crisis monetization | **Authoritative for consult** — needs **code pointer** in shared module |
| **`app/api/room/core/send/route.ts`** | `buildSystemPrompt()` + `HIGH_RISK_PATTERNS` + block message | **Partial** — expand categories；shared import |
| **`app/legal/terms/page.tsx` / support** | User-facing block explanation | Align with **H.5/H.6** |
| **`lib/m55/dtrEngine.ts`** | Deterministic templates | **No LLM prompt** — policy for **wording review** not model guard |
| **`lib/m55/reply/stubReplyGenerator.ts`** | Stub only | **LLM guard not wired** — required before production LLM reply |
| **`M55_REPLY_JSON_SCHEMA_v1.md`** | Structure only | Add **safety field expectations** in **AS-C1** if needed |

---

## J. Future implementation gate split（not executed in AS-C）

| Gate | Purpose |
|------|---------|
| **`5Z-I-V-AS-C1`** | Prompt safety **implementation planning**（files, shared module, test matrix） |
| **`5Z-I-V-AS-C2`** | Prompt safety **implementation execution**（Category 2 GO） |
| **`5Z-I-V-AS-C3`** | **Local / static** prompt review（no Production payment） |
| **`5Z-I-V-AS-C4`** | **Production-safe verification** without live payment |

---

## K. Acceptance criteria for future implementation

| # | Criterion |
|---|-----------|
| 1 | High-risk prompts **refused or redirected** safely |
| 2 | Normal DTR-scoped / report-scoped questions **still work** |
| 3 | **No** medical / legal / financial concrete advice in samples |
| 4 | **No** deterministic death / fate / profit claims |
| 5 | Tone remains **M55-compatible**（生活語、非恐怖） |
| 6 | **No** unauthorized code / env / deploy beyond approved scope |
| 7 | **Rollback** — revert prompt module or feature flag off |

---

## L. Current decision

| Statement | Value |
|-----------|--------|
| **AI prompt safety guard planning** | **GREEN** |
| **Implementation** | **Later**（**AS-C1** onward） |
| **AS-B manual polling** | **Release Day Must-Have**（unchanged） |
| **AX-PROD** | **blocked** |
| **AL** | **unauthorized** |
| **Auth compliance** | **RED** under **AS** exception |

---

## M. No-mutation statement

- **No** code change
- **No** prompt deployment
- **No** env / model / provider change
- **No** redeploy
- **No** DB write
- **No** Stripe / webhook / checkout / payment
- **No** Clerk / auth change
- **No** notification integration
- **No** raw key / secret / fragment recorded
- **No** full **user_id** / email / session recorded
- **No** Stripe IDs recorded
- **No** **AL / AL-PRE**
- **No** full normal dev flow release

---

## N. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **Error notification impl** | **AS-B1 / B2 / B3** later |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |

---

## O. Next phase

| Priority | Gate |
|----------|------|
| **Recommended** | **`5Z-I-V-AS-D`** — Release readiness checklist consolidation |
| **Alternative** | **`5Z-I-V-AS-B1`** — Manual `failed_fulfillments` polling runbook if paid traffic imminent |

---

## Files reviewed（read-only）

| Path |
|------|
| `00_PRIMARY_ACTIVE_LAW/M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md` |
| `app/api/room/core/send/route.ts` |
| `app/api/reply/generate/route.ts` |
| `lib/m55/dtrEngine.ts` |
| `lib/m55/reply/stubReplyGenerator.ts` |
| `docs/ssot/M55_REPLY_JSON_SCHEMA_v1.md` |
| `app/_components/SiteFooter.tsx` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_A_*.md` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_B_*.md` |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-C-AI-PROMPT-SAFETY-GUARD-PLAN-001`** | **本条** |
