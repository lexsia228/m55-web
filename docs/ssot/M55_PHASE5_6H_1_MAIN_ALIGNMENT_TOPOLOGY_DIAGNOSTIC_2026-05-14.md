# M55 Phase 5-6H-1 — Main alignment topology diagnostic (2026-05-14)

Status: **Evidence / traceability only** — **証跡のみ。** Git 履歴トポロジの **read-only 診断結果**を記録する。**merge / rebase / cherry-pick / Production deploy / `main` merge / live smoke / 本番決済は実行していない。**

---

## Preconditions（診断時点）

- **Phase 5-6G:** Production migration + postflight **GREEN**（別 SSOT）。
- **Phase 5-6H** app/main alignment readiness: **APPROVE_WITH_FIXES**（別レビュー）。
- **App ↔ Production RPC:** **PASS**（下記「RPC 整合」）。

---

## Git topology — key facts

| Observation | Result |
|-------------|--------|
| `git merge-base origin/main HEAD` | **失敗** — **共通祖先なし**（no merge base） |
| `git diff origin/main...HEAD` | **失敗** — **merge base が無いため三点 diff 不可** |
| Shallow repository | **`false`**（浅い clone ではない） |
| `git rev-list --left-right --count origin/main...HEAD` | **`66`**（`origin/main` のみ） / **`338`**（`work/home-cluster` のみ） |

**解釈:** `origin/main` と `work/home-cluster` は **履歴上つながっていない（unrelated histories 相当）**。

---

## Commit line characterisation（要約）

### `origin/main` のみ（66 commits — 主な性質）

- **Gate R / 公開面** — legal / support / `/dtr/lp`、価格表記、禁止語回避。
- **ビルド・middleware** — デプロイ阻害の除去、edge 関連の調整。
- **追加返書 RPC 本線**のコミット列としては、`work` 側とは **別系統**。

### `work/home-cluster` のみ（338 commits — 主な性質）

- **Phase 2〜5-6G** — wallet / `report_instance_id`、追加返書 checkout・webhook・RPC 呼び出し、Production SQL パッケージ、SSOT 証跡。
- **Production DB/RPC** と整合する **runtime / docs / scripts** の本線。

---

## App ↔ Production RPC alignment（PASS）

- **RPC 名:** `m55_reply_ticket_fulfill_checkout_event`
- **引数（8）** — Production postflight の **identity args** と一致するアプリ呼び出し:
  - `p_stripe_event_id` (text)
  - `p_checkout_session_id` (text)
  - `p_payment_intent_id` (text)
  - `p_product_key` (text)
  - `p_report_instance_id` (uuid)
  - `p_wallet_scope_user_id` (text)
  - `p_user_ref_hash` (text)
  - `p_quantity` (integer)
- **レーン:** `additional_reply_ticket` は **DTR 本丸 one-time レーンと分離**。
- **`report_instance_id`:** アプリ経路で **一貫利用**。

---

## Verdict

**READY_FOR_MAIN_ALIGNMENT_PLAN**

（**計画・証跡フェーズは進められる**が、**通常 merge だけでは合流できない**可能性が高い。**即時 merge は禁止。**）

---

## Immediate merge

**禁止（NO）。**

**理由:** **共通祖先がない**ため、**標準の `merge-base` / 三点 diff が成立せず**、**無確認の fast-forward / 単純 merge はリスクが高い**。**別承認のもと**、**試験用 integration ブランチ**で取り込みと検証を行う。

---

## Recommended next — Phase 5-6H-2

1. **`work/home-cluster` から `integration/main-align-*`（名称はチームで固定）を作成**する。  
2. **その試験ブランチ上でのみ** `origin/main` を merge する。**Git が **unrelated histories** を要求する場合は、その指示に従い **`--allow-unrelated-histories` 等を検討**する（**本線 `main` では先に試さない**）。  
3. **両方を失わない**ことを最優先して衝突を解消する:  
   - **(1)** `origin/main` 由来 — **Gate R / public / legal / support / `/dtr/lp` 表面**  
   - **(2)** `work/home-cluster` 由来 — **Phase 2〜5-6G の runtime / DB・RPC 呼び出し / SQL / SSOT 資産**  
4. **`npm run build` または `npm run build:strict`** 等で壊れを検証する。  
5. **`main` merge と Production deploy** は **別ゲート・別承認**まで **保留**。

---

## Hard stop（維持）

- **`main` merge しない**（本 SSOT の記録だけでは開始しない）
- **Production deploy しない**
- **Production env / `whsec` / secret を変更・露出しない**
- **Stripe Production webhook を変更しない**
- **live smoke / 本番ライブ決済をしない**

---

## Related

- `docs/ssot/M55_PHASE5_6G_PRODUCTION_MIGRATION_POSTFLIGHT_GREEN_2026-05-14.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
