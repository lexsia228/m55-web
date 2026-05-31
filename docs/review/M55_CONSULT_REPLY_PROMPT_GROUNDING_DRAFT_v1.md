# M55 Consult Reply — Prompt Grounding DRAFT v1

## Document control

| Field | Value |
|-------|--------|
| Status | **PROMPT-GROUNDING-DRAFT** (文案のみ — 実装 GO ではない) |
| Scope | Lane A — `POST /api/room/core/send` → `buildSystemPrompt` 補強文案 |
| Method | Read-only code/docs 参照 + 新規レビュー文書 1 本 |
| Date | 2026-05-31 |
| Upstream | `M55_CONSULT_REPLY_QUALITY_ANTI_SYCOPHANCY_READONLY_AUDIT_v1.md`, `M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` |
| Target implementation file (将来) | `app/api/room/core/send/route.ts` — **本ゲートでは未変更** |

**This document is not:**

- 実装 GO / prompt 実装 GO / code 変更 GO
- 返書生成 GO / consult 送信 GO
- commit / push / deploy GO
- context source（snapshot `envelope_json`）解決済みの表明
- sanitizer / Lane B 解決済みの表明

---

## 1. 総合判定

| Item | Result |
|------|--------|
| **DRAFT 完成度** | **GREEN** — 商品境界・anti-sycophancy・別視点・保存版接地・5 段骨格の prompt 文案を提示可能 |
| **Lane A 品質（as-is）** | **PARTIAL**（監査と同じ — 本 DRAFT は as-is を直さない） |
| **prompt 実装 GO** | **No** |
| **code 変更 GO** | **No** |
| **返書生成 GO** | **No** |

**要約:** UI（`paidDtrProductCopy.conflictPerspectiveJa` 等）が示す品質バーを、Lane A の `buildSystemPrompt` に **明示的にエンコードする文案**を本書に固定する。ただし **購入 snapshot との本文一致**は context source 別ゲートが必要であり、prompt だけでは **PARTIAL** のまま残る。

---

## 2. git 状態（本ゲート実行時点）

| Item | Value |
|------|-----|
| branch | `main` |
| HEAD | `6aea164` |
| origin/main | `6aea164`（一致） |
| ahead / behind | 0 / 0 |
| working tree | 本ファイル追加のみ（他変更なし想定） |

---

## 3. Lane A 現状整理

### 3.1 経路

| 層 | 参照 |
|----|------|
| API | `app/api/room/core/send/route.ts` |
| UI | `components/dtr/ConsultRoom.tsx` → `DtrFullReader`（`/dtr/core`） |
| 送信 body | `{ message, birthDate, nickname }`（`birthDate` は UI props） |

### 3.2 LLM パラメータ（現状）

| 項目 | 値 |
|------|-----|
| model | `gpt-4o-mini` |
| temperature | **0.7** |
| max_tokens | 600 |
| 出力 | `clampOutput` — 目安 700–900 字、hard cap 1000 |

### 3.3 system prompt 構造（現状）

```
buildSystemPrompt(reportSections) =
  buildM55AiSafetySystemInstruction('consult')   // 先頭
  + Entry Report 相談AI 導入
  + reportSections（注入抜粋）
  + 役割 4 行（穏やか整理 / 断定付け足し禁止 / 専門助言禁止 / 危機案内）
  + 文字数・トーン指示
```

**現状の `buildSystemPrompt` 本文（参照用・変更なし）:**

```105:123:app/api/room/core/send/route.ts
/** Build report-scoped system prompt (no generic chat). */
function buildSystemPrompt(reportSections: string): string {
  const safetyPrefix = buildM55AiSafetySystemInstruction('consult');
  return `${safetyPrefix}

あなたはM55のEntry Reportに付帯する相談AIです。
このユーザーの取り扱い説明書の要点は以下のとおりです：

${reportSections}

あなたの役割：
- このレポートの内容に関するユーザーの質問・疑問を穏やかに整理・補足すること
- レポートにない事柄を、断定調で付け足したり、未来や吉凶を示唆する形で述べないこと
- 医療・法律・投資等の専門的助言は行わないこと
- 危機的・自傷的な内容を検知した場合は相談窓口等の安全な案内のみ行うこと

回答は700〜900文字を目安にし、1000文字を超えないこと。
簡潔で読みやすく、落ち着いたトーンで書くこと。`;
}
```

### 3.4 safety instruction との関係

- `buildM55AiSafetySystemInstruction('consult')` は `CROSS_CUTTING_INSTRUCTION` + `【相談AI】購入済み Entry Report 範囲内のみ`（`m55AiSafetyPolicy.ts`）。
- **入力:** `classifyM55AiSafetyInput(userMessage, { surface: 'consult' })` — block 時はチケット未消費。
- **重複:** 医療・法律・投資・予言断定・jailbreak は safety 側で既にカバー。**本 DRAFT の商品境界ブロックは相談返書の非汎用・非無制限・保存版抜粋外断定禁止に寄せ、医療詳細は重複最小で再掲のみ。**

### 3.5 output sanitizer との関係

- `sanitizeM55AiTextOutput(aiContent, { surface: 'consult' })` — 出力を再分類；`allow` なら LLM 全文を通す。
- **同調・別視点・5 段構造:** sanitizer 未実装（別トラック）。

### 3.6 report context 注入（現状・重要）

```229:246:app/api/room/core/send/route.ts
  // Build report context for system prompt (deterministic, birthDate-bound)
  let reportContext = '';
  if (body.birthDate) {
    try {
      const engine = runDtrEngine({
        birthDate: body.birthDate,
        nickname: body.nickname ?? 'ユーザー',
        locale: 'ja-JP',
        contextScope: 'dtr',
      });
      reportContext = engine.payload.fullSections
        .filter((s) => ['s3_essence', 's4_strengths', 's5_friction'].includes(s.id))
        .map((s) => `【${s.title}】\n${s.body.slice(0, 300)}`)
        .join('\n\n');
    } catch {
      reportContext = '（レポートコンテキスト取得エラー）';
    }
  }
```

| 事実 | 内容 |
|------|------|
| context 源 | クライアント `birthDate` → **`runDtrEngine` 再実行** |
| snapshot | `reportInstanceId` は wallet/RPC 用；**`dtr_report_snapshots.envelope_json` 未使用** |
| 注入章 | `s3_essence` / `s4_strengths` / `s5_friction` のみ、各 **300 字** |
| 章タイトル（engine） | 本質と安定の条件 / 自分の出やすい面 / 無理が出やすいところ |
| birthDate 欠落 | `reportContext === ''` のまま LLM 呼び出し（空 context リスク） |

**本 DRAFT は上記 context 実装を変更しない。** 文案は「提供された抜粋」前提で書く。

---

## 4. prompt で補強する範囲（方針 A–E）

### A. 商品境界

- 相談返書は **購入済み保存版に紐づく** 相談である（汎用チャットではない）。
- **無制限相談ではない**（1 回送信 = 相談返書 1 件；付属 1 + 追加最大 4 = 合計 5 — Product Truth は UI/RPC で担保、prompt は含意を補強）。
- **提供された保存版抜粋の外**を断定しない。
- 医療・法律・投資・**転職の可否判断**の代替にしない。
- 占い・予言・成功保証・吉凶断定にしない。

### B. anti-sycophancy

- 感情は受け止める。
- 正誤判定・裁判・「どちらが正しいか」の結論はしない。
- 「あなたは悪くない」を**結論にしない**。
- 「相手が悪い」へ**誘導しない**。
- 相談者を**常に正しい**ものとして扱わない。
- **自己正当化だけ**を補強しない。
- 対人・対立テーマでは、相手側または状況側の可能性を **非攻撃的に 1 つ**置く（`conflictPerspectiveJa` と整合）。

### C. 保存版接地

- 返書内で、**注入されている章タイトル**（またはその観点）に **1 つ以上**戻す。
- 相談内容を、保存版の **傾向・疲れやすい条件・戻し方**の語彙に接続する（抜粋に含まれる範囲で）。
- 章・傾向の**外側**にある新規鑑定・相性断定・未来断定をしない。
- **購入時点プロフィールに基づく保存版**として扱う（文言上；snapshot 一致は context source ゲート）。

### D. 返書の最小骨格（5 段）

1. **受け止め** — 感情・疲れを認める；「あなたが正しい」とは言わない。
2. **保存版の章・傾向への接続** — 章タイトル名を明示；抜粋の観点で論点を接続。
3. **別視点** — 対人・関係・違和感テーマでは必須；それ以外でも「相手／状況」の可能性が自然なら 1 つ。非断罪。
4. **ずれの整理** — 言葉 / 距離 / タイミング / 疲労 / 期待 のいずれか（複数可、短く）。
5. **小さな一手** — **1 つだけ**；断定しすぎない；医療/法律/投資/転職判断にしない。

### E. 資質名保護

- プロデューサー等の **資質名（publicTitle）を改名しない**。
- 資質名を **新しいラベルに作り替えない**。
- **性別ロジック**（性別による性格・相性の断定）を使わない。

---

## 5. prompt 文案（実装候補 — route.ts には未貼付）

### 5.1 置き場所案

| ブロック | 推奨位置 |
|----------|----------|
| `PROMPT_PRODUCT_AND_SCOPE` | `${reportSections}` の**直後**、`あなたの役割：` の**直前** |
| `PROMPT_ANTI_SYCOPHANCY` | 上記の直後（または `役割` リストを置換拡張） |
| `PROMPT_REPLY_STRUCTURE` | anti-sycophancy の直後 |
| `PROMPT_GROUNDING_AND_NAMES` | reply structure の直後 |
| 既存 `あなたの役割` 4 行 | **削らない** — 重複する専門助言・吉凶行は維持（safety と二重化は許容） |
| 文字数・トーン行 | **末尾のまま維持** |

**`buildM55AiSafetySystemInstruction('consult')`:** **変更しない**（`m55AiSafetyPolicy` 側は本 DRAFT 対象外）。

### 5.2 追加候補ブロック（コピペ用文案）

以下は `buildSystemPrompt` 内、`${reportSections}` の後に連結する想定の **日本語指示ブロック**である。

```
【相談返書の商品境界】
- これは汎用のAIチャットではない。購入済み保存版レポートに紐づく「相談返書」として、上記に提供された抜粋の範囲で1テーマを整理する。
- 無制限の相談や、なんでも答えるボットではない。1回の回答は相談返書1件分の整理に留める。
- 上記抜粋にない事柄を、新しい鑑定・相性・未来・吉凶として断定で付け足さない。
- 医療の診断・治療、法律の勝敗・手続、投資・金融の推奨、転職・進路の可否判断の代替は行わない。
- 占い・予言・成功保証・「必ず」「絶対」による結果断定は行わない。

【反同調（感情は受け止め、裁判はしない）】
- ユーザーの感情や疲れは認める。ただし「あなたは悪くない」「あなたは正しい」「相手が悪い」と結論づけない。
- 正しさの判定・裁判・どちらが正しいかの決着はしない。ユーザーの自己正当化だけをきれいに補強する返答にしない。
- 対人の違和感・対立・関係の負荷がテーマのときは、相手側または状況側から見える可能性を1つ、非攻撃的に置く（悪い／悪くないの結論にはしない）。
- 別れろ・辞めろ・絶対に距離を置け等の絶対助言はしない。通知やメールで結果を届ける約束もしない。

【保存版への接地】
- 回答では、上記抜粋に含まれる章タイトル（例：本質と安定の条件／自分の出やすい面／無理が出やすいところ）を少なくとも1つ名指しし、その章の観点でいまの論点を接続する。
- 相談内容を、保存版の傾向・疲れやすい条件・戻し方の整理として述べる。抜粋の外側にある断定・新しい資質ラベル・相性鑑定はしない。
- 購入時点のプロフィールに基づく保存版の読みとして扱う。レポートにない専門判断はしない。

【返書の構成（この順で、700〜900字目安）】
1. 受け止め：感情や疲れを短く認める（「あなたが正しい」とは言わない）
2. 保存版との接続：章タイトルを1つ以上示し、抜粋の傾向に沿って論点を接続する
3. 別視点：対人・関係テーマでは必須。それ以外でも自然なら、相手側または状況側の見え方を1つ（非断罪）
4. ずれの整理：言葉・距離・タイミング・疲労・期待のいずれかで、短く整理する
5. 小さな一手：今の場面でできることを1つだけ、1行程度で示す（断定しすぎない）

【資質名・表現】
- レポートに現れる資質名（例：プロデューサー等）は改名・別名化・新ラベルへの作り替えをしない。
- 性別に基づく性格・相性・適性の断定はしない。
```

### 5.3 既存 prompt との関係

| 区分 | 扱い |
|------|------|
| **重複（維持）** | 医療・法律・投資禁止、吉凶・未来の付け足し禁止、危機案内 — 既存 `役割` + safety prefix と整合 |
| **弱いので補強** | 「穏やかに整理」のみ → anti-sycophancy + 5 段で具体化 |
| **削らない** | `buildM55AiSafetySystemInstruction` 呼び出し、4 行 `役割`、700–900 / 1000 cap |
| **UI 整合** | `PAID_DTR_CONSULT_REPLY.conflictPerspectiveJa`, `strongEmotionJa`, `notGenericChatJa`, `savedReportLinkedShortJa` |

### 5.4 追加時の期待効果

- LLM が **無条件肯定・相手断罪・絶対助言**に寄りにくくなる。
- **章タイトル明示**により、保存版接地の見え方が上がる（抜粋 3 章×300 字の範囲内）。
- UI が約束する **別視点**が prompt 上も必須化される。
- 汎用コーチング・無制限チャット含意を抑制。

### 5.5 残るリスク（本 DRAFT では未解消）

| リスク | 理由 |
|--------|------|
| context と画面保存版のズレ | `runDtrEngine(birthDate)` 再導出 ≠ 購入 snapshot |
| 接地の薄さ | s1/s2/s6/s7 未注入；3×300 字のみ |
| birthDate 欠落 | 空 `reportSections` で grounding 指示が機能しにくい |
| 同調フレーズ漏れ | sanitizer 未対応 |
| temperature 0.7 | 共感・断定のブレ（別ゲートでパラメータ検討） |
| Lane B | 本 DRAFT 非対象 |

---

## 6. 分離するもの（本 DRAFT に混ぜない）

| トラック | 現状 / 望ましい方向 | 本 DRAFT |
|----------|---------------------|----------|
| **context source** | `birthDate` → `runDtrEngine` 再実行 | **別ゲート:** 所有済み `report_instance_id` から `envelope_json` を read-only 抜粋 |
| **sanitizer** | カテゴリ拒否のみ | **別ゲート:** 「悪くない」「相手が悪い」等の出力後検知 |
| **Lane B stub** | `/api/reply/generate` → stub のみ | **扱わない** |
| **temperature / model** | 0.7 / gpt-4o-mini | **メモのみ:** 0.4–0.5 検討可；実装判断は別 GO |
| **UI copy** | `ConsultRoom`, `paidDtrProductCopy` | **変更しない** |
| **DB / RPC / wallet** | 消費・cap は正しい | **変更しない** |

---

## 7. 受け入れ基準案（次: 実装 GO 前の REVIEW-COMMIT-PLANNING 用）

次に **`route.ts` へ prompt 実装**へ進む場合、少なくとも以下を満たすこと:

- [ ] 本 DRAFT の `PROMPT_*` ブロックが `buildSystemPrompt` に反映されている（明示 GO 後）
- [ ] 保存版紐づき・非汎用・非無制限が prompt に明示されている
- [ ] anti-sycophancy（悪くない結論・相手悪化・自己正当化補強禁止）が明示されている
- [ ] 対人テーマでの別視点が必須化されている
- [ ] 5 段骨格が明示されている
- [ ] 資質名改名・性別ロジック禁止が明示されている
- [ ] Product Truth（1+4=5、¥500、プロデューサー名等）を**変更していない**
- [ ] context source / sanitizer / Lane B を**解決済みと誤記していない**
- [ ] 本 REVIEW ゲート時点では **code / prompt 実装 / consult 送信 / 返書生成なし**

---

## 8. 次ゲート提案

**推奨（docs のみ）:**

`CATEGORY-1-M55-CONSULT-REPLY-QUALITY-ANTI-SYCOPHANCY-PROMPT-GROUNDING-DRAFT-REVIEW-COMMIT-PLANNING`

- 対象: **本ファイル** `docs/review/M55_CONSULT_REPLY_PROMPT_GROUNDING_DRAFT_v1.md` のレビューと commit 可否
- **含めない:** `app/api/room/core/send/route.ts` への貼付・deploy

**実装順序の推奨（別 GO ごと）:**

1. PROMPT-GROUNDING-IMPLEMENT（`buildSystemPrompt` のみ）
2. CONTEXT-SOURCE-GROUNDING-PLANNING → IMPLEMENT（snapshot read-only）
3. SANITIZER-PLANNING → IMPLEMENT

---

## 9. 実行証跡（本ゲート）

| Action | Done? |
|--------|-------|
| `docs/review/` 新規 1 本のみ作成 | Yes |
| `app/api/room/core/send/route.ts` 変更 | **No** |
| prompt 実装 | **No** |
| 既存 `docs/review/**` 編集 | **No** |
| consult 送信 / 返書生成 | **No** |
| snapshot / envelope_json / DB | **No** |
| commit / push / deploy | **No** |

---

## 10. 参照ファイル一覧

| 種別 | Path |
|------|------|
| Lane A API | `app/api/room/core/send/route.ts` |
| Safety | `lib/m55/ai/m55AiSafetyPolicy.ts`, `lib/m55/ai/m55AiOutputSanitizer.ts` |
| UI | `components/dtr/ConsultRoom.tsx` |
| Product Truth copy | `lib/m55/paidDtrProductCopy.ts` |
| Bridge copy | `lib/m55/dtrReportBridgeCopy.ts` |
| SSOT | `00_PRIMARY_ACTIVE_LAW/M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md` |
| 監査 | `docs/review/M55_CONSULT_REPLY_QUALITY_ANTI_SYCOPHANCY_READONLY_AUDIT_v1.md` |
| 安全メモ | `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` |
