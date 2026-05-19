# Phase 5-6H-5Z-I-P — Exactly-one repair execution planning gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-P Exactly-one repair execution planning gate**

本条は **`5Z-I-O-D` の Human-side dry-run READY** を前提に、**次 Gate（`5Z-I-Q`）で許可される exactly-one repair 実行**のための **docs-only 実行計画**を固定する。**本条では runner 本実行も Production DB write も行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-N`** | **`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`** 作成済み（コード参照は read-only）。 |
| **`5Z-I-O-C`（統合シェル正式）** | **`REPAIR_EXECUTION_BLOCKED_BY_DRY_RUN_RESULT`** のまま（**missing env**）。**本条で改訂しない**。 |
| **`5Z-I-O-D` Human-side** | **`HUMAN_SIDE_DRY_RUN_READY_RECORDED_FOR_REPAIR_PLANNING`**。Stripe 検証 **all matched**／Supabase **all 0**／**final** `DRY_RUN_READY_FOR_EXACTLY_ONE_REPAIR_EXECUTION_PLANNING`／**DB write なし**／**repair なし**／**full IDs なし**（詳細は O-D SSOT）。 |
| **本条** | **実行計画の SSOT 化のみ**。**実行なし**／**write なし**。 |

**Planning anchor：** **`3b13dbacc60b412b967cf7f5730eb1745d824d85`** — **`docs: update human side dry run ready attestation`**。

**O-D Evidence（参照）：** **`M55-EVID-20260516-5Z-I-O-D-HUMAN-SIDE-DRY-RUN-READY-ATTESTATION-001`**。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-P-EXACTLY-ONE-REPAIR-EXECUTION-PLAN-001`** | **本条：** Exactly-one repair **実行計画** |
| **`M55-EVID-20260516-5Z-I-O-D-HUMAN-SIDE-DRY-RUN-READY-ATTESTATION-001`** | Human-side dry-run **READY attestation** |
| **`M55-EVID-20260516-5Z-I-N-MINIMAL-REPAIR-RUNNER-CODE-CREATED-001`** | Minimal repair runner **コード作成** |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | Human Supabase mapping（read-only 前提の整合） |

**Full IDs／secrets：** **SSOT に記録しない**。

---

## 4. Execution preconditions（次 Gate `5Z-I-Q` で実行可能にする条件）

`5Z-I-Q` に進み **exactly-one 実行**を許可する前に、次をすべて満たすこと。

- **`5Z-I-O-D` READY attestation** が SSOT 上存在する（上記 Evidence）。
- **Checkout Session ID／User ID／Stripe `event.id`／秘密鍵等の full values** は **Human ローカル端末のみ**（SSOT・AI・共有チャットに出さない）。
- **`M55_REPAIR_DRY_RUN=false`** は **`5Z-I-Q` のみ**で許可（本条・それ以前の Gate では誤設定禁止）。
- **`M55_REPAIR_CONFIRM`** の設定は **`5Z-I-Q` のみ**で許可。
- **確認フレーズ**は **一字一句**次と一致すること（runner ソースの **`M55_EXECUTE_CONFIRM_PHRASE`** と同一）:  
  **`M55_CONFIRM_ONE_SHOT_DTR_CORE_MANUAL_REPAIR_20260516`**
- **実行回数は exactly one**（自動再試行・ループ・広範囲 repair 禁止）。
- **第二回決済・refund・webhook／CLI／Dashboard の replay** は **別 SSOT gate なしに行わない**。

---

## 5. Human-local execution env plan（`5Z-I-Q` のみ・値は SSOT に書かない）

**環境変数「名」のみ**を列挙する。**右辺の値・printenv・スクリーンショットは禁止**。

| Env name | 備考 |
|----------|------|
| `M55_REPAIR_CHECKOUT_SESSION_ID` | `=<FULL_CHECKOUT_SESSION_ID_LOCAL_ONLY>` |
| `M55_REPAIR_EXPECTED_USER_ID` | `=<FULL_USER_ID_LOCAL_ONLY>` |
| `M55_REPAIR_STRIPE_EVENT_ID` | `=<FULL_EVENT_ID_LOCAL_ONLY>`（**実在する Stripe `event.id`**） |
| `M55_REPAIR_PRODUCT_ID` | **`DTR_CORE_STATIC_V1`**（SSOT 上は product 定数として明示可） |
| `M55_REPAIR_DRY_RUN` | **`false`**（**`5Z-I-Q` のみ**） |
| `M55_REPAIR_CONFIRM` | **上記確認フレーズと完全一致**（**`5Z-I-Q` のみ**） |
| `STRIPE_SECRET_KEY` | `=<HUMAN_LOCAL_ONLY_LIVE_SECRET>`（値は記録禁止） |
| `NEXT_PUBLIC_SUPABASE_URL` | runner が要求（値は記録禁止） |
| `SUPABASE_SERVICE_ROLE_KEY` | runner が要求（値は記録禁止） |

**Safe labels（参照ラベルのみ・DB リテラルではない）：** **`cs_live_JSRW`**／**`user_36xz`** — **SQL や row 比較の値として使わない**。

---

## 6. Redacted execution command shape

SSOT に許可されるのは **形のみ**（**full env をコマンドラインに埋め込まない**）。

```text
npx tsx scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts
```

**禁止：** SSOT への **値付き one-liner**／**ターミナルスクショ**／**full ID を含む raw 出力**／**printenv**／**npm script／dependency 追加**。

---

## 7. Expected execution behavior（runner ソース read-only 要約）

- **CLI エントリ時のみ** `main()` が dry-run または execute フローを実行（import 時副作用なし）。
- **入力検証**後、Stripe から **Checkout Session を retrieve**。
- **dry-run と同系の boolean 検証**（実装名は runner 内 `validations`）:
  - `livemode === true`
  - `mode === payment`
  - `status === complete`
  - `payment_status === paid`
  - `amount_total === 1000`
  - `currency === jpy`（小文字比較）
  - `metadata.productId` が期待 product と一致（期待は **`DTR_CORE_STATIC_V1`**）
  - success/cancel URL に **`m55-webv2.vercel.app`** を含む
  - `client_reference_id === expectedUserId`
- **execute  path** では **実 `event.id` 必須**（欠如・不整合なら STOP）。
- **`stripe_events` を pre-insert 前に SELECT** — **既存行があれば STOP**（`STRIPE_EVENT_ALREADY_EXISTS_NO_FULFILL`）。
- **INSERT が unique 違反 `23505` なら STOP**（`STRIPE_EVENT_INSERT_DUP_STOP`）。
- **`fulfillDtrCoreFromCheckoutSessionId` を一度だけ呼ぶ**（二層目 idempotency は **`one_time_fulfillments.checkout_session_id`** 側の既存ロジックに依存）。
- **ログは redacted JSON**（full ID／secret を出力しない方針）。
- **自動再試行なし**。

### 7.1 `5Z-I-Q` 実行後に SSOT に記録してよい項目（redacted のみ）

| 項目 | 許可される記録形態 |
|------|---------------------|
| execution count | `1` |
| dry-run mode | `false` |
| confirmation phrase matched | `yes` / `no` |
| safe labels | `cs_live_JSRW`／`user_36xz`（参照のみ） |
| validation summary | **matched／failed／unclear** 等の redacted 要約 |
| pre-insert `stripe_events` | `inserted`／`stopped`／`unclear` |
| fulfillment function result | `success`／`failed`／`stopped` |
| DB write occurred by runner | `yes`／`no` |
| final token | **`EXECUTED_ONCE`**／**`STOP`**／**`FAILED`**（runner の exit `0`／`2`／`3` と対応付けて Human が redacted で記録） |

**記録禁止：** full Event ID／Checkout Session ID／PaymentIntent／Customer ID／email／`client_reference_id`／`user_id`／Request ID／Price ID／secret／`whsec`／**raw terminal**。

---

## 8. Expected artifacts（**後続 `5Z-I-R` 以降**の read-only 検証で期待する「見つかる／期待整合」）

**本条（`5Z-I-P`）では post-repair 検証を実施しない**。`5Z-I-Q` 成功後の検証設計用の期待一覧。

| 対象 | 期待（成功経路） |
|------|------------------|
| `stripe_events` | 期待行が **存在**（pre-insert 方針と整合） |
| `one_time_fulfillments` | 期待行が **存在**（session id  idempotency） |
| `entitlements`（product **`DTR_CORE_STATIC_V1`**） | 期待行が **存在** |
| `entitlement_rights` | 期待行が **存在** |
| `reply_ticket_wallets` | 期待行が **存在** |
| `reply_wallet_ledgers` | 期待行が **存在** |
| `dtr_report_snapshots`（product **`DTR_CORE_STATIC_V1`**） | 期待行が **存在** |
| `failed_fulfillments` | **無い**、または **非ブロッキングのみ**（Human が O-D dry-run 時点で 0 を確認済みの前提を踏まえ、`5Z-I-Q` 後に再評価） |

---

## 9. STOP conditions（`5Z-I-Q` で実行前・実行中に STOP すべき例）

- **full ID／secret** を **AI／Cursor／SSOT／共有ログ**に晒す必要が出る。
- **`M55_REPAIR_DRY_RUN` が explicit `false` でない**（未設定は dry-run 扱い）。
- **`M55_REPAIR_CONFIRM` が確認フレーズと完全一致しない**。
- **`event.id` 欠如・不正**。
- **Stripe 上の session が §7 の boolean と一致しない**。
- **product／金額／通貨／status／user-client_reference 不一致**。
- **実行前に「期待では empty の artifact」が非ゼロ**（runner の `unexpected_existing_artifacts` 系）。
- **`stripe_events` に同一 `event_id` が既存**。
- **`stripe_events` INSERT が `23505`**。
- **runner 出力に full ID／secret が含まれる**（ポリシー違反として中止）。
- **端末／env の不確実**（混入・共有シェルの疑い）。
- **package／dependency 変更が必要**と判明した場合。
- **refund／rollback 判断が必要**に見える場合（別途 `5Z-I-U` 等）。

---

## 10. 判定（本条）

| Field | Value |
|--------|--------|
| **Planning verdict** | **`READY_FOR_EXACTLY_ONE_REPAIR_EXECUTION_GATE`** |

**代替（追加の Human 確認が SSOT 上必要な場合のみ）：** **`REPAIR_EXECUTION_PLANNING_BLOCKED_NEEDS_CONFIRMATION`** — **本条では採用しない**。

---

## 11. 未実行事項（本条）

- **repair runner 本実行なし**
- **Production DB INSERT／UPDATE／DELETE／UPSERT なし**
- **write 系 RPC／schema／migration なし**
- **manual entitlement／wallet／ticket 付与なし**
- **Events API／webhook／CLI／Dashboard replay／再送なし**
- **新規決済／checkout 再試行／refund／rollback なし**
- **Stripe webhook 設定変更なし**
- **`STRIPE_WEBHOOK_SECRET`／whsec／env／secret 変更なし**
- **Vercel redeploy なし**
- **package／dependency／npm script 変更なし**
- **runner・runtime／UI 変更なし**
- **full IDs／secrets／raw 出力の SSOT 記録なし**
- **safe labels を DB 値として扱わない**

---

## 12. Next

- **`Phase 5-6H-5Z-I-Q` Exactly-one repair execution gate** — **Human explicit GO 必須**。**runner は exactly once のみ**。**`M55_REPAIR_DRY_RUN=false` と `M55_REPAIR_CONFIRM` は `5Z-I-Q` でのみ設定可**。
- **成功時：** **`Phase 5-6H-5Z-I-R`** Post-repair Production DB **read-only** verification。
- **STOP／失敗時：** **別 gate／診断**まで **無断再試行しない**。
- **以降の順序（設計のみ・本条では未実行）：**

| Gate | 内容 |
|------|------|
| **`5Z-I-Q`** | Exactly-one repair execution |
| **`5Z-I-R`** | Post-repair Production DB read-only verification |
| **`5Z-I-S`** | UI report unlock verification |
| **`5Z-I-T`** | Reply-ticket verification（スコープに含む場合） |
| **`5Z-I-U`** | refund／rollback **判断**（**repair が失敗した場合のみ**） |

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_P_EXACTLY_ONE_REPAIR_EXECUTION_PLANNING_2026-05-16.md`
