# Phase 5-6H-5Z-I-O — Dry-run repair runner execution planning gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-O Dry-run repair runner execution planning gate**

本条は **dry-run 実行計画のみ**。**Production DB の write／repair 実行／Events API／webhook／CLI／Dashboard は行わない**。**本条フェーズでの runner 実行は明示指示が無い限り行わず**（**計画のみ**）。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-N`** | **minimal runner 作成済**（`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`）。**静的型チェック**（`npx tsc --noEmit -p tsconfig.json`）は **`5Z-I-N`** で報告済。 |
| **実行状態** | **runner 実行なし**／**dry-run 実行なし**／**repair 実行なし**／**Production DB write なし**／**フル ID／secrets は SSOT 未転記**。 |
| **`5Z-I-K-A` 継続前提** | 対象 fulfillment 系 artifact **期待 missing**。**safe label（非 ID）：** **`cs_live_JSRW`**／**`user_36xz`** — **DB 値に使用しない**。 |

**Work anchor：** **`ea3f75889fcf4a68e37fc9b49a06caa88567a499`** — **`chore: add minimal dtr fulfillment repair runner`**（**`5Z-I-N`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-O-DRY-RUN-REPAIR-RUNNER-PLAN-001`** | **本条：** **dry-run 実行計画**（SSOT）。 |
| **`M55-EVID-20260516-5Z-I-N-MINIMAL-REPAIR-RUNNER-CODE-CREATED-001`** | runner **ソース作成** |
| **`M55-EVID-20260516-5Z-I-M-MINIMAL-REPAIR-RUNNER-DESIGN-001`** | runner **設計** |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | Human **expected missing** |

**転記禁止：** Session／Event／PI／ユーザー全文／秘密鍵／whsec 等。**safe label のみ参照可**。

---

## 4. Runner safety review（read-only）

対象ソース：**`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`**（本条は **読取のみ**。）

| Topic | 要約 |
|------|------|
| **既定** | **`M55_REPAIR_DRY_RUN` 未設定または空 ⇒ dry-run**。 |
| **エントリ** | **`import` だけでは副作用なし**。**CLI が当ファイルをエントリのときのみ** `main`。 |
| **write 経路ガード** | **`M55_REPAIR_DRY_RUN=false`** かつ **`M55_REPAIR_CONFIRM`** がソース定数 **`M55_EXECUTE_CONFIRM_PHRASE`** と **完全一致**のときのみ **execute 経路**。dry-run で **`stripe_events` insert／`fulfill`** は実行されない実装になること。 |
| **ログ政策** | **full ID／secrets／client_reference を出さない**。**JSON：** phase／`safeLabelsReference`／検証 booleans／`row_count`／終端ラベルのみ。 |
| **静的検証（継続）** | 実行前：**`npx tsc --noEmit -p tsconfig.json`**（**runner は起動しない**）。 |

---

## 5. Dry-run input plan（Human ローカルのみで値）

| 環境変数（名前のみ・値は転記しない） | 備考 |
|-------------------------------------|------|
| **`M55_REPAIR_CHECKOUT_SESSION_ID`** | フル session id。**ローカルのみ**。 |
| **`M55_REPAIR_EXPECTED_USER_ID`** | `client_reference_id` と一致させるユーザー id。**ローカルのみ**。 |
| **`M55_REPAIR_STRIPE_EVENT_ID`** | 実 **`event.id`（将来 `stripe_events` 照会用）**。**dry-run でもカウント SELECT に使用**。**ローカルのみ**。 |
| **`M55_REPAIR_PRODUCT_ID`** | 計画：**`DTR_CORE_STATIC_V1`**。 |
| **`M55_REPAIR_DRY_RUN`** | 計画：**`true` または省略**。**`false` は dry-run で禁止**。 |
| **`M55_REPAIR_CONFIRM`** | **dry-run／計画フェーズでは未設定を推奨**（実行ゲート混入防止）。 |

**サービス側 credentials（名前のみ）：**

- **`STRIPE_SECRET_KEY`**
- **`NEXT_PUBLIC_SUPABASE_URL`**
- **`SUPABASE_SERVICE_ROLE_KEY`**

**`.env.local`：** runner は必要に応じ **リポジトリルート `.env.local` を読み込み既存変数のみ補う**実装。**本文書は値を載せない**。

---

## 6. Dry-run command plan（実行は本条では行わない）

| 項目 | 内容 |
|------|------|
| **依存** | **追加しない**。**`tsx` が未収録でも `npx tsx`** で単発実行できる旨は **`5Z-I-M`/runner コメント**踏襲。**`package.json` scripts 追加しない**。 |
| **形（マスク済みメモのみ）** | `npx tsx scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` |
| **実行タイミング** | **本条コミット時点：** **未実行**。**実行は **`5Z-I-O-A`**（明示 GO）**。 |

実行直前チェックリスト（Human）

1. **`M55_REPAIR_DRY_RUN`** が **`false` でないこと**。
2. **誤って本実行しないこと**（**`CONFIRM` は空**推奨）。
3. **ターミナル／ログ転記ポリシー**（スクショ等に **フル ID** が写らない）。

---

## 7. Expected dry-run validation checklist（出力イメージ）

### 7.1 Stripe（retrieve 結果に対応する booleans）

- **livemode** `true`
- **mode** `payment`
- **status** `complete`
- **payment_status** `paid`
- **amount_total** `1000` / **currency** `jpy`
- **metadata.productId** が **`DTR_CORE_STATIC_V1`** と論理整合
- **success_url／cancel_url** が **`m55-webv2.vercel.app`** を含む
- **`client_reference_id` と `M55_REPAIR_EXPECTED_USER_ID` 一致**（**値はログに出さず boolean のみ可**）

### 7.2 Supabase（**SELECT／head count のみ**）

| Artifact | **期待（`5Z-I-K-A` 準拠）** |
|----------|------------------------------|
| **`stripe_events`（対象 event）** | count **0** |
| **`one_time_fulfillments`**（対象 session） | **0** |
| **`entitlements`（ユーザー×product）** | **0** |
| **`entitlement_rights`（コア権）** | **0** |
| **`reply_ticket_wallets`** | **0** |
| **`reply_wallet_ledgers`** | **0** |
| **`dtr_report_snapshots`** | **0** |
| **`failed_fulfillments`**（対象 checkout） | **0** |

### 7.3 終端

- **`finals`** に **`READY`** か **`dry_run_ok_no_writes`** と同種の許容ラベル → **論理 READY**
- **`STOP`** 系の理由コード → Human が **読取／修正／SSOT で再ゲート**

---

## 8. STOP conditions（dry-run と計画上の共通）

Dry-run が **`STOP`** となるべき状況、または **コマンド実行前に中止**すべき状況（要約）。

| Category | STOP 契機 |
|-----------|-----------|
| **ポリシー** | **`M55_REPAIR_DRY_RUN=false`**／**確認フレーズが誤設定**／**write が走り得る**と判断できる |
| **ログ** | **full session／event／user／secret** がログ・スクショに出そうになる |
| **Stripe** | **livemode false**／**mode／status／paid 不一致**／**金額・通貨不一致**／**product 不一致**／**URL ドメイン不一致**／**user 映射不一致** |
| **Supabase** | **`stripe_events` 既存有り**／**期待 missing と矛盾する非ゼロ count**／**`failed_fulfillments` ブロッキング行** |
| **運用** | **依存インストールが必要**／**コマンド形状が不確実**／**runner 改変が先** |

---

## 9. Determination（判定）

| Field | Value |
|--------|--------|
| **本条** | **`READY_FOR_DRY_RUN_REPAIR_RUNNER_EXECUTION_GATE`** |
| **代替** | **`READY_FOR_REPAIR_RUNNER_STATIC_REVIEW_GATE`**（追加静的レビュー要のとき） |

**推奨：** **`READY_FOR_DRY_RUN_REPAIR_RUNNER_EXECUTION_GATE`**

---

## 10. 未実行事項

- **本条での dry-run 実行**（**別途明示・別 checkpoint `5Z-I-O-A` を推奨**）
- **repair 実行**
- **Production DB write／RPC／schema／migration**
- **手動 entitlement／wallet／ticket**
- **Events API／webhook／CLI／Dashboard resend**
- **新規決済／Checkout／返金 rollback**
- **Stripe 設定／env／whsec／redeploy**
- **package／npm script 変更**
- **フル IDs／secrets の記録**

---

## 11. Next

| 推奨 | Gate |
|------|------|
| **第一** | **`Phase 5-6H-5Z-I-O-A` — Dry-run repair runner execution checkpoint**（**write なし**） |
| **repair** | **`Phase 5-6H-5Z-I-P`** — dry-run が **論理 READY** かつ **別途 explicit GO** のみ |

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_O_DRY_RUN_REPAIR_RUNNER_EXECUTION_PLANNING_2026-05-16.md`
