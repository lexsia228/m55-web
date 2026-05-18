# Phase 5-6H-5Z-I-V-B — Non-canonical environment/build purge planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-B Non-canonical environment/build purge planning gate**

本条は **canonical／quarantine／purge 候補の分類計画のみ**。**削除・env 変更・redeploy・DB write は行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V`** | **`UI_UNLOCK_DB_READONLY_DIAGNOSTIC_INCONCLUSIVE`** — **UI user §B `row_count` 未提出** |
| **`5Z-I-V-A`** | **`IDENTITY_ENVIRONMENT_ALIGNMENT_RISK_DETECTED`** — **Clerk 2 apps／Vercel↔Clerk app 未確定** |
| **本条** | **purge／quarantine 計画の SSOT 固定** — **human-only 実行は後続 Gate** |

**Work anchor（inventory）：** **`2f31c11ecb0172e783dbae1b9cef0b17e6638bb1`** — **`docs: record identity environment inventory`**（**`5Z-I-V-A`**）。

**Safe labels（参照のみ）：** **`cs_live_JSRW`**／**`user_36xz`**（repair）／**`human-ui-current-user`**（UI）

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-B-NON-CANONICAL-ENV-BUILD-PURGE-PLAN-001`** | **本条：** purge planning |
| **`M55-EVID-20260518-5Z-I-V-A-IDENTITY-ENVIRONMENT-INVENTORY-001`** | identity inventory |
| **`M55-EVID-20260516-5Z-I-V-HUMAN-LOCAL-DB-READONLY-UI-UNLOCK-DIAGNOSTIC-001`** | DB diagnostic |
| **`M55-EVID-20260516-5Z-I-S-UI-REPORT-UNLOCK-VERIFICATION-001`** | UI blocked |

**Full secret／full user_id／full env 値：** **記録しない**。

---

## 4. Canonical environment map（KEEP — 削除禁止）

| Layer | Canonical target | **status** | 備考 |
|-------|------------------|------------|------|
| **Vercel project** | **`m55-webv2`** | **confirmed** | **`5Z-I-V-A`／`5Z-E`–`5Z-F` SSOT** |
| **Vercel team（display）** | **`m55-official`** | **suspected** | Human 観測 |
| **Production domain（primary UI）** | **`m55-webv2.vercel.app`** | **confirmed** | **`5Z-I-S`** |
| **Production domain（assigned）** | **`m55-web.vercel.app`** | **confirmed** | deploy 履歴 |
| **Deploy branch** | **`main`** | **confirmed** | **`5Z-F`** |
| **Clerk app（Production-bound）** | **exactly one of `M55-core` \| `M55-Official`** | **unclear** | **blocking — `5Z-I-V-C` で確定** |
| **Clerk env var names** | **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**／**`CLERK_SECRET_KEY`** | **confirmed** | repo |
| **Supabase project** | **`m55-soul-core`** | **confirmed** | **`5Z-I-V-A`** |
| **Supabase branch／env** | **`main`／`PRODUCTION`** | **confirmed** | |
| **Supabase `user_id` source** | **Clerk userId（text）in app tables** | **confirmed** | **not Supabase Auth Users** |
| **Stripe account** | **`M55WEB`（live）** | **confirmed** | prior SSOT |
| **Stripe product lane** | **`DTR_CORE_STATIC_V1`** | **confirmed** | |
| **Stripe webhook URL（intent）** | **`https://m55-webv2.vercel.app/api/stripe/webhook`** | **confirmed** | **`5Z-D`** |
| **Repair checkout label** | **`cs_live_JSRW`** | **reference** | |
| **Repair user label** | **`user_36xz`** | **reference** | |
| **UI user label** | **`human-ui-current-user`** | **reference** | |

---

## 5. Required confirmations（§5Z-I-V-A 続き — 本条では未完了）

| # | 確認項目 | 記録（redacted） | **status** |
|---|----------|------------------|------------|
| **1** | **Vercel Production `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → Clerk app** | **prefix/suffix match only — not yet recorded** | **unclear** |
| **2** | **Vercel Production `CLERK_SECRET_KEY` → same Clerk app** | **not yet recorded** | **unclear** |
| **3** | **UI login user exists in that Clerk app** | **yes/no — not yet recorded** | **unclear** |
| **4** | **`user_36xz` exists in same Clerk app** | **yes/no/unclear — not yet recorded** | **unclear** |
| **5** | **Supabase tables use Clerk user_id** | **confirmed（code／policy）** | **confirmed** |
| **6** | **Non-canonical resources → purge candidate only** | **本条で分類済み** | **confirmed** |

---

## 6. Quarantine list（HOLD — 今すぐ削除しない）

| ID | Resource | Reason | Action before purge |
|----|----------|--------|---------------------|
| **Q-01** | **Clerk app not bound to Vercel Production**（**`M55-core` or `M55-Official` — loser TBD**） | **二重 app 混線リスク** | **Vercel key 照合後に「非 canonical」ラベル／アクセス停止メモ** |
| **Q-02** | **Clerk app not used by Production（winner 確定後の loser）** | 同上 | **Users 移行有無を確認（full id なし）** |
| **Q-03** | **Non-Production Vercel deployments**（Preview／旧 Ready デプロイ） | **誤デプロイ参照リスク** | **domain 未割当のみリスト化** |
| **Q-04** | **`m55-web.vercel.app` vs `m55-webv2.vercel.app` 二重ドメイン** | **canonical は webv2 UI 検証** | **どちらが Primary Production URL か Human 確認** |
| **Q-05** | **Supabase Shadow／Test project**（例：**shadow bootstrap SSOT 参照**） | **Production と取り違え禁止** | **project ref 目視照合のみ** |
| **Q-06** | **Stripe test-mode keys／old price refs**（**`price_****` redacted のみ**） | **過去 checkout 障害** | **Production env に test key 無しを再確認** |
| **Q-07** | **Unused Stripe webhook endpoints**（**`m55-web` 候補 URL 等**） | **delivery 混線** | **active endpoint 1 本に整理計画（削除は後続）** |
| **Q-08** | **旧 SSOT checkpoint 文書**（**latest 以外の Phase 履歴**） | **誤参照** | **archive ラベルのみ — ファイル削除は別判断** |

---

## 7. Purge candidate list（DELETE LATER — 別 Gate・explicit GO）

| ID | Candidate | Preconditions | Dependency check |
|----|-----------|---------------|------------------|
| **P-01** | **Duplicate unused Clerk app** | **Vercel Production publishable+secret が **winner app** と一致確定** | **UI user／`user_36xz` が winner にのみ存在** |
| **P-02** | **Unused Vercel deployments**（domain 未割当・非 Current） | **Production Current が `m55-webv2` 系と確認** | **rollback 不要の履歴のみ** |
| **P-03** | **Obsolete Stripe webhook endpoint**（非 canonical URL） | **canonical endpoint が delivery 正常** | **Stripe Dashboard read-only** |
| **P-04** | **Scratch／obsolete Vercel projects**（**`m55-web` 単体 project 等 — 存在する場合**） | **`m55-webv2` が唯一 Production** | **team dashboard 照合** |
| **P-05** | **Shadow-only SQL／bootstrap artifacts misuse** | **Production に未適用確認** | **SSOT 上 Shadow 専用タグ** |

**本条ではいずれも削除しない。**

---

## 8. DO NOT TOUCH list（UNKNOWN — 削除禁止）

| ID | Resource | Why |
|----|----------|-----|
| **D-01** | **`M55-core` Clerk app** | **Vercel Production key 未照合** |
| **D-02** | **`M55-Official` Clerk app** | **同上** |
| **D-03** | **`content-snake-42.clerk.accounts.dev`** | **app 対応未確定** |
| **D-04** | **`whole-halibut-25.clerk.accounts.dev`** | **同上** |
| **D-05** | **Vercel `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` 値** | **変更・ローテーション禁止（本条）** |
| **D-06** | **`m55-soul-core` Production data** | **repair artifact 想定** |
| **D-07** | **Stripe live account／`DTR_CORE_STATIC_V1` price lane** | **paid repair 文脈** |
| **D-08** | **Any unmapped Supabase project** | **取り違え防止** |
| **D-09** | **`human-ui-current-user` / `user_36xz` full identifiers** | **redacted label のみ** |

---

## 9. Risk classification

| Field | Value |
|--------|--------|
| **Planning classification** | **`PURGE_PLANNING_BLOCKED_CLERK_APP_MAPPING_UNCLEAR`** |

**未採用：**

| Token | 理由 |
|-------|------|
| **`PURGE_PLANNING_READY_CANONICAL_MAP_CONFIRMED`** | **Clerk Production-bound app が **unclear**** |
| **`PURGE_PLANNING_BLOCKED_ENV_ALIGNMENT_UNCLEAR`** | **Clerk が主 blocker（Vercel project は confirmed）** |

---

## 10. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`NON_CANONICAL_ENV_PURGE_PLANNING_BLOCKED_CLERK_MAPPING`** |

---

## 11. 未実行事項

- **Clerk app／Vercel project／deployment／Supabase project／Stripe object の削除**
- **env 変更／secret ローテーション**
- **Vercel redeploy**
- **Production DB write／runner／二回目 repair**
- **code／runtime／UI 変更**
- **full IDs／secrets／session 記録**
- **`5Z-I-V` §B SELECT 再開**（**Clerk app 確定後**）

---

## 12. Next

**採用（Clerk mapping unclear）：**

- **`Phase 5-6H-5Z-I-V-C` Vercel Production Clerk app alignment confirmation gate**
  - **publishable key prefix/suffix match（M55-core vs M55-Official）**
  - **secret key same-app yes/no（値なし）**
  - **UI user exists yes/no**
  - **`user_36xz` exists yes/no**
  - **no env change／no deletion**

**canonical map 確定後の分岐（未採用・後続）：**

- **`5Z-I-V-D` Human-only quarantine execution planning gate**
- **`5Z-I-V-E` Human-only purge execution gate**（**explicit GO のみ**）
- **`5Z-I-V` §B resume**（**UI user `row_count`**）

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_B_NON_CANONICAL_ENVIRONMENT_BUILD_PURGE_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-B-NON-CANONICAL-ENV-BUILD-PURGE-PLAN-001`** |
| **Classification** | **`PURGE_PLANNING_BLOCKED_CLERK_APP_MAPPING_UNCLEAR`** |
| **Canonical（確定分）** | **Vercel `m55-webv2`／domains／Supabase `m55-soul-core`／Stripe live DTR** |
| **Blocking** | **Production Clerk app winner unclear** |
| **Next** | **`5Z-I-V-C` Clerk alignment confirmation** |
