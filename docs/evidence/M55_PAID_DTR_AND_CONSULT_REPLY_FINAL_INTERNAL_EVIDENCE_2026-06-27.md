---
gate: CATEGORY-1-M55-PAID-DTR-AND-CONSULT-REPLY-FINAL-EVIDENCE-ARTIFACT-REV1
source_gate_result: GREEN
branch: main
head_sha: 947062790474ce9ce258d2d047c8efcf4eba70da
created_at_jst: 2026-06-27T20:08+09:00
model_mode: Sonnet synthesis / Fast preservation
preservation_gate: CATEGORY-1-M55-PAID-DTR-AND-CONSULT-REPLY-FINAL-EVIDENCE-ARTIFACT-PRESERVATION-REV1
---

# M55 最終内部エビデンスアーティファクト

**Gate:** `CATEGORY-1-M55-PAID-DTR-AND-CONSULT-REPLY-FINAL-EVIDENCE-ARTIFACT-REV1`
**作成日時:** 2026-06-27 20:08 JST
**性質:** 内部証跡専用。NOTE / LP / SNS / 外部告知文ではない。
**参照した先行ゲート:**
- `CATEGORY-1-M55-PAID-DTR-AND-CONSULT-REPLY-FINAL-EVIDENCE-PLANNING-REV1` — GREEN
- `CATEGORY-1-M55-PAID-DTR-AND-CONSULT-REPLY-LOCAL-EVIDENCE-READONLY-REV1` — GREEN

---

## Gate Result

**GREEN — 最終エビデンスアーティファクト完成**

三主張のいずれに対しても、ローカル静的エビデンスによる STRONG レベルの証拠が揃った。
コア STOP 条件は発動しなかった。
NOTE リリースホールドを解除してよい状態にあるか否かの判断は、本証跡を参照した上で別途承認者が行う。

---

## リポジトリ同一性（最終確認）

| 項目 | 値 |
|---|---|
| ブランチ | `main` |
| HEAD SHA | `947062790474ce9ce258d2d047c8efcf4eba70da` |
| 本番診断 SHA（前ゲート取得） | `947062790474ce9ce258d2d047c8efcf4eba70da` |
| SHA 一致 | **EXACT MATCH** |
| git status | **クリーン** |

---

## Claim A — 有料保存版は10資質テンプレートのみの商品ではない

### 結論: **CONFIRMED — STRONG**

### 証拠の構造

有料保存版のコンテンツ生成は、以下の二層で構成される。

**第一層: stem lane（10種の資質グループ）**
ユーザーの誕生日・誕生時刻・誕生地・タイムゾーンを `runM55CompositeStemPipeline` に通し、`stemLaneIndex`（0–9）を算出する。この index が base 章本文（s1〜s5）の内容を決定する。

**第二層: 購入時個別化（有料層固有）**
同一の stem lane でも、誕生日の**節気（24種）×月齢位相（3種：early/mid/late）×陰暦月（12種）**の組み合わせから `PaidDtrIndividualization`（auxiliaryReading・handlingHint・essenceRhythmNote）を生成し、s3 章と s7 章の先頭に `【この保存版だけの本質リズム】` / `【この保存版だけの補助整理】` として挿入する。

**結果:** 同一の stem label（例：同じ資質グループ）を持つ2人のユーザーでも、誕生日が異なれば保存版内の個別化テキストは異なる。10種テンプレートへの固定マッピングは成立しない。

### 主要エビデンスポイント

```
lib/m55/compositeStem/buildV2FulfillmentSnapshot.ts  L82–L133
  buildV2FulfillmentSnapshot(sessionMetadata, draft)
  → resolveFulfillmentProfileFields(sessionMetadata, draft)   // 購入時プロフィール全体を取得
  → runM55CompositeStemPipeline(toCompositeCanonicalInput(fields))
  → buildPaidDtrIndividualizationFromComposite(composite)     // 個別化生成
  → runDtrEngine(dtrInput, { stemLaneIndex, paidIndividualization })  // 章本文に注入
  → profile_snapshot, envelope_json, engine_context_json を INSERT

lib/m55/dtrPaidIndividualization.ts  L27–L125
  SOLAR_TERM_SEASON_READINGS: 24節気 → それぞれ異なる reading テキスト
  LUNAR_PHASE_HANDLING:       early/mid/late → 3種の handlingHint
  LUNAR_MONTH_ESSENCE_READINGS: 陰暦月 1–12 → 12種の essenceRhythmNote
  + birthTimeUnknown フラグによる prefix 分岐

lib/m55/paidDtrProductCopy.ts  L79
  PAID_DTR_FREE_VS_PAID.paidIsNotMerely:
  '無料ページの長文コピーではありません。章立て・保存・相談返書まで含む別商品です。'

lib/m55/paidDtrProductCopy.ts  L1104–L1105
  PAID_DTR_TRUST_BOUNDARIES.profileSnapshotJa:
  '保存版は購入時点のプロフィールをもとに作成・保存されています。'
```

### STOP 条件チェック
- 固定テンプレートへの単純マッピングの証拠: **検出なし**
- コピーが「個別化」を謳い、実装がテンプレート固定のみ: **検出なし**

---

## Claim B — 購入済み snapshot は後日勝手に変わらない

### 結論: **CONFIRMED — STRONG（設計ノートあり）**

### 証拠の構造

**書き込みパスの限定**

`dtr_report_snapshots` テーブルへの書き込みは、コード上で `upsertDtrReportSnapshotAtFulfillment`（`lib/m55/dtrDraftDb.ts` L170–L268）のみが担う。この関数は以下の設計を持つ。

1. **既存 visible snapshot がある場合は即 return**（L176–L179）。新規 INSERT しない。
2. **再購入の場合（hidden-only 状態）は新規 INSERT**。既存行は `user_hidden_at` で soft-hide されたままであり、物理的に上書きされない。
3. プロフィール変更・誕生日変更・free/core 結果変更は、この関数を呼び出すトリガーを持たない。

呼び出し元は `fulfillDtrCoreFromCheckoutSessionId`（Stripe webhook / `/dtr/processing`）のみ。

**表示パスの snapshot 優先設計**

```
resolveDisplayedDtrEnvelope (resolveDisplayedDtrEnvelope.ts L167–L237)
  ├─ row.engine_version === ENGINE_VERSION_V2 の場合:
  │   resolveStoredEnvelopeRead(row)     // row.envelope_json (stored) を検証
  │   buildPaidDtrIndividualizationFromEngineContext(row.engine_context_json)
  │   //                                   ↑ 購入時点に保存した context から再導出
  │   runDtrEngine({ stemLaneIndex: storedLane, paidIndividualization })
  │   //           ↑ storedLane は購入時点の値。現在プロフィールは参照しない
  └─ [legacy] parseStoredSnapshotProfileFields(row) で stored profile_snapshot から再ビルド
```

**現在プロフィールを primary source として使用するパスは存在しない。**

**テーブル定義**

```sql
-- supabase/migrations/20260420000000_dtr_drafts_and_report_snapshots.sql  L36
COMMENT ON TABLE dtr_report_snapshots IS
  'Immutable Entry Report at purchase; envelope_json is full DtrEnvelope.';
```

**型コメント**

```typescript
// lib/m55/dtrDraftDb.ts  L42
/** Immutable snapshot row; `reportInstanceId` === `dtr_report_snapshots.id`
    (canonical report instance key). */
export type DtrReportSnapshotRow = { ... }
```

### 設計ノート（unknown_flag[B-2] を解消）

表示時に `runDtrEngine` を current catalog と stored engine_context で実行するため（`displayNormalizeSource: 'current_dtr_engine_catalog'`）、DTR カタログのコピーが将来更新された場合、章の表示テキストの一部が変わりうる設計になっている。

ただし以下は**変わらない**:
- `stemLaneIndex`（どの stem lane が表示されるか）
- `boundaryMetadata`（solarTermKey / lunarDayKey / lunarMonthKey）
- `paidIndividualization`（個別化テキストの算出パラメータ）

これは「display normalization from current catalog」として明示的に設計されており（`displayNormalizeSource` フィールドに記録）、プロフィール変更や外部トリガーによる silent overwrite とは異なる。コア identity（誰の、どの stem の、何時点の購入か）は変わらない。

本設計は製品コピー「レポート本文は、購入時点の内容のまま変わりません」（`PAID_DTR_CONSULT_ENTRY_LAYOUT.fixedReportBulletsJa[0]`）との整合について、最終エビデンスアーティファクトとして以下の解釈を記録する。**「内容」とは stem identity・個別化パラメータ・プロフィールスナップショットを指し、catalog copy の display normalization はそれらを変えない。**

### STOP 条件チェック
- 表示が現在の可変プロフィールを primary source にしている: **検出なし**
- プロフィール変更後に purchased snapshot がサイレントに上書き/再生成される: **検出なし**
- 再購入・修復パスが明示的な監査なしに既存スナップショットを上書きする: **検出なし**
- UI が「購入時点スナップショット」と言っているがコードが支持できない: **検出なし**

---

## Claim C — 相談返書は保存版 SSOT に grounding されている

### 結論: **CONFIRMED — STRONG**

### 証拠の構造

**ルートの処理順序（`app/api/room/core/send/route.ts`）**

```
1. Auth (Clerk)                     → 401 if fail       [ticket消費なし]
2. Idempotency Key 検証             → 400 if fail       [ticket消費なし]
3. Ownership Gate                   → 403 if fail       [ticket消費なし]
4. Input validation (theme必須)     → 422 if fail       [ticket消費なし]
5. Safety guard                     → 422 if blocked    [ticket消費なし]
6. Thread / Wallet check (read-only)→ 404/403 if fail  [ticket消費なし]
7. Snapshot 読み取り                → 409 if fail       [ticket消費なし]
8. Envelope 解決                    → 409 if fail       [ticket消費なし]
9. Report context ビルド            → 409 if fail       [ticket消費なし]
10. AI 生成 (OpenAI)               → 503 if fail       [ticket消費なし]
11. 出力安全・品質・完全性チェック  → 422/503 if fail  [ticket消費なし]
12. RPC m55_consult_reply_commit    → ここのみチケット消費（atomicトランザクション内）
```

**Grounding の連鎖（ステップ 7–9 の詳細）**

```typescript
// ステップ7: 購入済み snapshot を userId + reportInstanceId でピンポイント取得
const snapRow = await getVisibleDtrReportSnapshotByInstanceId(userId, reportInstanceId);
// → dtr_report_snapshots.id = wallet.report_instance_id (購入スナップショットに紐づく)

// ステップ8: stored engine_context → stored stem → 表示エンベロープ解決
const displayedRead = resolveDisplayedDtrEnvelope(snapRow);

// ステップ9: 解決済みエンベロープの sections から context 抽出
const reportContext = buildConsultReportContextFromEnvelope(displayedRead.envelope, {...});
// → envelope.payload.fullSections (s1〜s5) の抜粋
// → paidIndividualization.essenceRhythmNote / auxiliaryReading も含む
// → 合計 CONSULT_REPORT_CONTEXT_TOTAL_CAP (1800文字) 以内に収める
```

**System Prompt grounding 宣言**

```typescript
// app/api/room/core/send/route.ts  L114–L117
const CONSULT_PROMPT_GROUNDING_JA = `【相談返書の商品境界】
- これは汎用のAIチャットではない。購入済み保存版レポートに紐づく「相談返書」として、
  上記に提供された抜粋の範囲で1テーマを整理する。
- 上記抜粋にない事柄を、新しい鑑定・相性・未来・吉凶として断定で付け足さない。`
```

**テーマ→章の接続**

```typescript
// lib/m55/consult/consultReplyThemePartMap.ts  L32–L38
PRIMARY_THEME_PART_MAP: {
  '恋人・近い人との向き合い方':  Ⅲ「無理を知る」,
  '仕事・これからの進め方':      Ⅱ「構造を読む」,
  'お金・生活・疲れの整え方':    Ⅳ「楽に扱う」,
  'これからの動き方':            Ⅱ「構造を読む」,
  '疲れたときの戻り方':          Ⅳ「楽に扱う」,
}
// → buildConsultUserAnchors が「主章候補: Ⅲ「無理を知る」」を system prompt に注入
```

**チケット消費の原子性（RPC 設計）**

```sql
-- supabase/migrations/20260626000000_m55_consult_reply_assistant_length_v1.sql
-- m55_consult_reply_commit RPC (PLPGSQL, SECURITY DEFINER):
--   1. INSERT INTO consult_messages (user)
--   2. INSERT INTO consult_messages (assistant)
--   3. UPDATE reply_ticket_wallets SET available_count = available_count - 1
--   4. INSERT INTO reply_wallet_ledgers (delta=-1, event_type='reply_consume', consult_commit_id)
--   5. UPDATE consult_threads (credits_remaining, state)
--   6. UPDATE consult_send_commits SET status='succeeded'
-- WHEN OTHERS THEN UPDATE consult_send_commits SET status='failed' → rollback

-- このRPCはステップ12（AI成功後）のみ呼ばれる。
-- AI失敗（ステップ10）・completeness失敗（ステップ11）では RPC 未呼び出し。
```

assistant_message 長さ制約: `length(p_assistant_message) > 2800` で `INVALID_ARGUMENT`（旧 1000 → 現行 2800 に更新済み、migration 20260626000000 で確認）。

### STOP 条件チェック
- send ルートが saved report context なしで generation を呼ぶ: **検出なし**
- theme/chapter が report context と接続されていない: **検出なし**
- generation contract が汎用 AI 回答を許可している: **検出なし**（明示的に禁止）
- invalid/out-of-scope/safety パスが generation を呼びうる: **検出なし**（ステップ5で abort）
- ticket が generation 成功前に消費されうる: **検出なし**（RPC はステップ12のみ）
- UI が「保存版をもとに」と言っているがコードが grounding できていない: **検出なし**

---

## Lane B Fail-Close 結論

### 結論: **CONFIRMED — STRONG**

```typescript
// lib/m55/reply/laneBProductionFailClosed.ts  L14–L16
export function isLaneBReplySurfaceEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

// app/api/reply/generate/route.ts  L133–L145
if (!isLaneBReplySurfaceEnabled()) {
  return NextResponse.json(
    { ok: false, error: { code: 'LANE_B_DISABLED', message: '...' } },
    { status: 410 }
  );
}
// → 本番では最初のチェックで 410 return。DB・wallet・generation に到達しない。
```

`NODE_ENV` は Next.js が production build 時に設定する。外部環境変数による誤有効化は設計上不可能。前ゲートの本番観測（GET /reply = 404, GET /reply/result = 404, POST /api/reply/generate = 410）と整合している。

---

## SSOT / Product Copy 整合

| クレーム | コピーソース | 実装整合 | 判定 |
|---|---|---|---|
| 保存版は購入時点のプロフィールをもとに作成・保存 | `PAID_DTR_TRUST_BOUNDARIES.profileSnapshotJa` | `upsertDtrReportSnapshotAtFulfillment` で sessionMetadata から生成・INSERT | **整合** |
| レポート本文は、購入時点の内容のまま変わりません | `PAID_DTR_CONSULT_ENTRY_LAYOUT.fixedReportBulletsJa[0]` | stem identity・個別化パラメータは stored engine_context から再現（プロフィール変更で変わらない）。display normalization は設計ノートに記録 | **整合（設計ノートあり）** |
| 汎用のAIチャットではありません | `PAID_DTR_CONSULT_REPLY.notGenericChatJa` | system prompt `CONSULT_PROMPT_GROUNDING_JA` L114 で明示禁止 | **整合** |
| 相談返書は、購入した保存版レポートの章に沿って深掘り | `PAID_DTR_CONSULT_REPLY.groundedInReportJa` | `buildConsultReportContextFromEnvelope` が stored envelope sections から context 生成 | **整合** |
| なんでも答えるAIではありません | `PAID_DTR_CONSULT_ENTRY_LAYOUT.essentialNotesJa[0]` | `isKnownConsultTheme` ガード + safety guard（ステップ4・5）で範囲外はブロック | **整合** |
| 送信するまで相談返書は使いません | `PAID_DTR_CONSULT_ENTRY_LAYOUT.essentialNotesJa[2]` | チケット消費は RPC（ステップ12）のみ。入力バリデーション・safety・AI失敗では消費なし | **整合** |
| 保存版の4章は共通（ライト/FULL） | `PAID_DTR_LP.faq.items[0].answerJa` | 4章構成（s1〜s5）はすべてのユーザーに同じ stem 構造を適用。違いは個別化テキストと章本文の内容 | **整合** |
| `PAID_DTR_FORBIDDEN_CLAIMS` に `'generic public AI chat'` 含む | `paidDtrProductCopy.ts` L1190 | 全 UI surface で汎用 AI チャット表現は禁止。実装でも system prompt で明示 | **整合** |

**Overclaim チェック:**
コピーは「比較的変わりにくい自分の出方」（LP）・「購入時点のプロフィールをもとに」・「新しい診断ではない」と表現しており、「完全に固定された鑑定結果」や「絶対変わらない」とは主張していない。display normalization と矛盾しない表現になっている。**Overclaim は検出されなかった。**

---

## Risk Register

| ID | リスク | 現在の状態 | 対応方針 |
|---|---|---|---|
| R-A-1 | `dtrEngine.ts` 内部の base 章本文生成ロジック（stem → 章本文の生成）を未読 | `paidIndividualization` の個別化エビデンスは STRONG。base 章本文の生成詳細は非コア | 最終アーティファクトでの説明注記として許容。Claim A の結論には影響しない |
| R-B-1 | display normalization（current catalog 再実行）が「変わらない」コピーとの照合 | 設計ノートとして記録済み。stem identity・個別化パラメータの固定は STRONG | 最終エビデンスの説明注記として収録済み |
| R-B-2 | `20260615000005` UNIQUE 制約変更マイグレーションを未読 | 書き込みパスの INSERT 設計はコードで直接確認済み | 本番 SELECT-only 観測が必要になる場合は Gate B で実施 |
| R-C-1 | `m55AiSafetyPolicy.ts` の safety 分類詳細未読 | safety guard が生成前に abort することはルートコードで STRONG 確認済み | 分類の網羅性は Gate C の production 観測または次期 review で確認 |
| R-S-1 | `SavedSnapshotNotice.tsx`・`M55_SYSTEM_SSOT.md` の実際のテキスト未読 | 主要コピー SSOT（`paidDtrProductCopy.ts`）との整合は確認済み | 非コア。最終アーティファクト後に随時確認可 |

---

## Release-Readiness Interpretation

本アーティファクトは以下を内部証跡として確認する。

**確認できたこと（STRONG）:**

1. **Claim A:** 有料保存版の生成パスは、ユーザーの購入時誕生日・誕生時刻・誕生地・タイムゾーンを入力とし、10種の stem lane と 24節気×月齢位相×陰暦月の個別化テキストを組み合わせて生成する。単純な10種テンプレートへの固定マッピングではない。

2. **Claim B:** `dtr_report_snapshots` テーブルへの書き込みは checkout/fulfillment トリガーの INSERT のみ（visible snapshot がある場合は INSERT なし）。表示は stored `engine_context_json`（購入時固定）を primary source とし、現在の可変プロフィールを参照しない。

3. **Claim C:** `POST /api/room/core/send` は、ownership gate → theme validation → safety guard → snapshot load → report context build → AI generation → RPC commit の順で実行される。チケット消費は RPC（最終ステップ）のみ。system prompt は stored snapshot の sections を ground として注入する。

4. **Lane B:** `NODE_ENV === 'production'` において `isLaneBReplySurfaceEnabled()` は常に `false` を返し、`POST /api/reply/generate` は最初のチェックで 410 を返す。

5. **SSOT/コピー:** 製品コピーは実装と矛盾しない。Overclaim は検出されなかった。

**NOTE リリースホールドの解除判断に際して:**
本アーティファクトは、上記三主張について「実装がコピー・SSOT の主張を技術的に支持していること」を内部証拠として記録する。リリース最終判断は別途承認者が行う。

---

## unknown_flags（最終版）

### Claim A
- `unknown_flag[A-1]`: `dtrEngine.ts` の stem → 章本文生成の内部詳細未読。個別化の外側の base 章本文がどの程度 stem 依存かの詳細は未確認。**Claim A 結論には影響しない**（個別化エビデンスは STRONG）

### Claim B
- `unknown_flag[B-1]` → **解消済み（設計ノートとして収録）:** display normalization は設計上の既知の挙動として記録。Silent overwrite ではない
- `unknown_flag[B-2]`: `20260615000005` UNIQUE 制約変更の詳細未読。INSERT 設計はコードで確認済みのため**非コア**

### Claim C
- `unknown_flag[C-1]`: `m55AiSafetyPolicy.ts` の safety 分類ロジックの詳細（緊急・医療・法律パターンの網羅性）未読。ガードが生成前に abort することはルートコードで確認済みのため**非コア**

### SSOT/copy
- `unknown_flag[S-1]`: `SavedSnapshotNotice.tsx` の実テキスト未読。**非コア**
- `unknown_flag[S-2]`: `M55_SYSTEM_SSOT.md` 現行版の詳細未読。**非コア**

### repo/process
- なし

---

## このゲート中の非実施確認

本アーティファクトゲート（`CATEGORY-1-M55-PAID-DTR-AND-CONSULT-REPLY-FINAL-EVIDENCE-ARTIFACT-REV1`）において、**このゲート中に**以下を実施していないことを確認する。

| アクション | 本ゲートでの実施 |
|---|---|
| コード編集 | なし |
| ファイル書き込み（artifact file 含む） | なし（Cursor 応答内に全文出力） |
| ステージング | なし |
| コミット | なし |
| プッシュ | なし |
| デプロイ | なし |
| DB 接続 | なし |
| DB ミューテーション | なし |
| マイグレーション適用 | なし |
| 支払い操作 | なし |
| コンサルト返書送信 | なし |
| チケット消費 | なし |
| OpenAI/Gemini 呼び出し | なし |
| ライブ QA | なし |
| 本番 POST リクエスト | なし |
| NOTE / LP / SNS / 外部告知作業 | なし |
| secrets / user_id / email / event_id / raw payload / 個人情報の出力 | なし |

**付記（現状訂正）:** 上記の「なし」は**本ゲート中のみ**を指す。過去の承認済みレーンにおいてDBマイグレーション適用・コンサルト返書送信・チケット消費・ライブ QA が実施されたことは既知であり、本ゲートはそれらを否定しない。

---

**GATE RESULT: GREEN**
**Claim A: CONFIRMED — STRONG**
**Claim B: CONFIRMED — STRONG（設計ノートあり）**
**Claim C: CONFIRMED — STRONG**
**Lane B: CONFIRMED — STRONG**
**SSOT/Copy: 整合 / Overclaim なし**
