# Phase 5-6H-5Z-I-V-A — Identity and environment inventory checkpoint（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-A Identity and environment inventory checkpoint**

本条は **Identity／Environment 対応関係の docs-only inventory**。**DB write／runner／env 変更／code 変更なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V`** | **`UI_UNLOCK_DB_READONLY_DIAGNOSTIC_INCONCLUSIVE`** — repair user artifact は **`5Z-I-R` 引用**／**UI user §B `row_count` 未提出** |
| **`5Z-I-U`** | primary candidate **`OWNERSHIP_GATE_USER_ID_MISMATCH`**（**DB 未確定**） |
| **本条** | **`human-ui-current-user` 向け DB 照合の前**に **Clerk／Vercel／Supabase／Stripe の対応を整理** |

**Work anchor（直前）：** **`dc74464f15ae57b9ed6e88f0d2c7e6d39a06046e`** — **`docs: record human local db readonly ui unlock diagnostic`**（**`5Z-I-V`**）。

**Safe labels（参照のみ・DB 値禁止）：** **`cs_live_JSRW`**／**`user_36xz`**（repair）／**`human-ui-current-user`**（UI session）

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-A-IDENTITY-ENVIRONMENT-INVENTORY-001`** | **本条：** identity／environment inventory |
| **`M55-EVID-20260516-5Z-I-V-HUMAN-LOCAL-DB-READONLY-UI-UNLOCK-DIAGNOSTIC-001`** | Human-local DB diagnostic（inconclusive） |
| **`M55-EVID-20260516-5Z-I-U-UI-UNLOCK-TYPE-MISMATCH-READONLY-DIAGNOSTIC-001`** | repo 診断 |
| **`M55-EVID-20260516-5Z-I-S-UI-REPORT-UNLOCK-VERIFICATION-001`** | UI blocked |

**Full Clerk secret／publishable key 全文／user_id／email／session：** **記録しない**。

---

## 4. Interpretation policy（固定）

| 観測 | 解釈 |
|------|------|
| **Supabase Auth Users が空** | **異常の自動断定しない** — **M55 は Clerk が auth SSOT**。**app tables の `user_id` は Clerk userId 文字列** |
| **Clerk アプリが複数** | **identity／environment mismatch の高リスク候補** |
| **Clerk「No Production Environment」** | **リスクシグナル** — **単独では証明にならない**（Development instance の UI 表示の可能性） |
| **未確定事項** | **Vercel Production がどの Clerk app の key を使うか**／**現行 UI session の Clerk userId がどの app か** |

---

## 5. Inventory（redacted）

### A. Production web / Vercel

| 項目 | 記録 | **status** |
|------|------|------------|
| **Vercel team（Human 観測）** | **`m55-official`**（表示名） | **suspected** |
| **Vercel project（SSOT 実績）** | **`m55-webv2`** | **confirmed**（**`5Z-E`／`5Z-F` 等**） |
| **Production domain（UI 検証）** | **`m55-webv2.vercel.app`** | **confirmed**（**`5Z-I-S`**） |
| **Production domain（併記・SSOT）** | **`m55-web.vercel.app`** | **confirmed**（**deploy 履歴に割当**） |
| **Branch／source（直近 redeploy 記録）** | **`main`** | **confirmed**（**`5Z-F`**） |
| **Clerk env 名（repo）** | **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**／**`CLERK_SECRET_KEY`** | **confirmed**（**`app/api/diagnostics/env/route.ts`**） |
| **publishable key が M55-core vs M55-Official どちらか** | **unclear**（**Human：Vercel Production env 画面で prefix/suffix のみ照合要**） |
| **env 値全文** | **記録しない** | — |

### B. Clerk（Human dashboard read-only）

| 項目 | 記録 | **status** |
|------|------|------------|
| **Visible apps** | **`M55-core`**／**`M55-Official`** | **confirmed** |
| **Frontend API domains（観測）** | **`content-snake-42.clerk.accounts.dev`**／**`whole-halibut-25.clerk.accounts.dev`** | **confirmed** |
| **App ↔ domain 1:1** | **unclear**（**2 apps・2 domains — Human が Dashboard で対応付け要**） |
| **Production environment 表示** | **両カードで `No Production Environment` 観測** | **confirmed**（**risk signal**） |
| **Vercel Production が使用する app** | **unclear** | **blocking for §B SELECT** |
| **UI session user が属する app** | **unclear** | **blocking** |
| **`user_36xz` が存在する app** | **unclear** | **blocking** |
| **full userId／email** | **記録しない** | — |

### C. Supabase（Human dashboard read-only）

| 項目 | 記録 | **status** |
|------|------|------------|
| **Project** | **`m55-soul-core`** | **confirmed** |
| **Branch** | **`main`** | **confirmed** |
| **Environment label** | **`PRODUCTION`** | **confirmed** |
| **Supabase Auth → Users** | **no users observed** | **confirmed** |
| **解釈** | **Clerk auth のため Auth Users 空は conclusive ではない** | **policy** |
| **DB `user_id` source** | **Clerk userId（text）を app tables に保存** | **confirmed**（**code／prior SSOT**） |

### D. Stripe（redacted）

| 項目 | 記録 | **status** |
|------|------|------------|
| **Account display** | **`M55WEB`**（**acct redacted**） | **confirmed**（**prior payment SSOT**） |
| **Mode** | **live**（repair／`5Y-A` 文脈） | **confirmed** |
| **Checkout safe label** | **`cs_live_JSRW`** | **reference only** |
| **Product** | **`DTR_CORE_STATIC_V1`** | **confirmed** |

---

## 6. Canonical identity mapping table（E）

| Dimension | Value（redacted） | **status** |
|-----------|-------------------|------------|
| **Production web domain（primary UI test）** | **`m55-webv2.vercel.app`** | **confirmed** |
| **Production web domain（alternate）** | **`m55-web.vercel.app`** | **confirmed** |
| **Vercel project** | **`m55-webv2`** | **confirmed** |
| **Vercel team（display）** | **`m55-official`** | **suspected** |
| **Clerk app used by Production** | **unclear**（**`M55-core` vs `M55-Official`**） | **unclear** |
| **Clerk frontend domain（Production-bound）** | **unclear** | **unclear** |
| **Supabase project** | **`m55-soul-core`** | **confirmed** |
| **Supabase branch／env** | **`main`／`PRODUCTION`** | **confirmed** |
| **Stripe account** | **`M55WEB`（acct redacted）** | **confirmed** |
| **Target repair user** | **`user_36xz`** | **safe label only** |
| **Current UI user** | **`human-ui-current-user`** | **safe label only** |
| **Repair user ∈ Production Clerk app** | **unclear** | **unclear** |
| **UI user ∈ Production Clerk app** | **unclear** | **unclear** |

---

## 7. Risk classification（F）

**`IDENTITY_ENVIRONMENT_ALIGNMENT_RISK_DETECTED`**

**根拠（redacted）：**

1. **Clerk apps が 2 つ可視**（**`M55-core`**／**`M55-Official`**）— **Production がどちらの key か未確定**。
2. **両 Clerk cards で `No Production Environment`** — **Development／instance 表示の可能性**（**単独確定不可**）。
3. **`5Z-I-V` §B 未実施** — **UI login user の DB artifact 未確認**。
4. **Supabase Auth empty** — **policy 上 conclusive ではない**。

**未採用：** **`IDENTITY_ENVIRONMENT_ALIGNMENT_CONFIRMED`**（**Clerk app 未確定**）。

---

## 8. Recommended next action（G）

**Clerk／Vercel read-only alignment confirmation を先に実施** — **その後 `5Z-I-V` §B を再開**。

| Step | Human-local（redacted のみ SSOT 化） |
|------|--------------------------------------|
| **1** | **Vercel `m55-webv2` Production** — **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` の prefix/suffix のみ**（例：`pk_live_…` 先頭数文字＋末尾数文字）をメモし、**Clerk `M55-core` vs `M55-Official` のどちらの Publishable key と一致するか照合** |
| **2** | **Production UI ログイン中** — **Clerk Dashboard の Users（該当 app のみ）**で **`human-ui-current-user` 相当の行が存在するか**（**full id なし・存在 yes/no のみ**） |
| **3** | **repair safe label `user_36xz`** — **同一 Clerk app 内に存在するか**（**存在 yes/no のみ**） |
| **4** | **一致 app が確定したら** — **`5Z-I-V` §B** の **`human-ui-current-user` `row_count` SELECT** を **その app の user_id で**実施 |

**採用しない（本条）：** **env 変更**／**Clerk app 作り直し**／**Supabase Auth への手動 user 作成**。

---

## 9. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`IDENTITY_ENVIRONMENT_INVENTORY_RISK_DETECTED`** |

---

## 10. 未実行事項

- **Production DB write／runner／二回目 repair**
- **Events API／replay／決済／refund**
- **Stripe／Vercel／Clerk／Supabase env 変更**
- **Vercel redeploy**
- **package／code／runtime／UI 変更**
- **`5Z-I-V` §B SELECT（本条では未再開）**
- **full IDs／secrets／session 記録**

---

## 11. Next

1. **`Phase 5-6H-5Z-I-V-B`（推奨ラベル）Clerk／Vercel Production key alignment read-only confirmation** — **app 確定まで §B 保留**。
2. **app 確定後：** **`5Z-I-V` §B** — **`human-ui-current-user` artifact `row_count` SELECT**（**redacted のみ**）。
3. **user mismatch DB 確定後：** **`5Z-I-W` User ID mapping repair planning** または **ownership gate planning**（**explicit GO まで実装なし**）。

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_A_IDENTITY_ENVIRONMENT_INVENTORY_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-A-IDENTITY-ENVIRONMENT-INVENTORY-001`** |
| **Risk classification** | **`IDENTITY_ENVIRONMENT_ALIGNMENT_RISK_DETECTED`** |
| **Clerk** | **2 apps**／**2 frontend domains**／**Production env warning on both** |
| **Supabase Auth** | **empty — not conclusive for missing M55 user** |
| **Next** | **Clerk↔Vercel key alignment → resume `5Z-I-V` §B** |
