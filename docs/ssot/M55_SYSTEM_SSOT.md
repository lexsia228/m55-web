## 2026-05-12 — Phase 5-2 Production DB/RPC migration package prepared for review

Status: **Review-only** — Phase 1〜5-1 **GREEN** 前提で、**Production 向け DB/RPC マイグレーション候補パッケージを repo に整理済み**。**Production DB への適用なし**、**`main` merge なし**、**Production env / `whsec` / ライブ決済なし**。

Work anchor:

- Branch `work/home-cluster`, Preview/Shadow 検証済み、`DTR_CORE_STATIC_V1` + `additional_reply_ticket`。

Package paths（レビュー用）:

- `docs/ssot/M55_PHASE5_2_PRODUCTION_DB_RPC_MIGRATION_PACKAGE_REVIEW_2026-05-12.md`
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`（**明示承認まで実行禁止**）
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`（read-only; 適用後検証用）

Next:

- **Phase 5-3** — パッケージの **レビュー承認**（**明示 GO なしに Production 適用しない**）。

Hard stop:

- **No** Production DB apply / **no** `main` merge / **no** env / **no** `whsec` / **no** live payment until Phase 5-3 approval.

## 2026-05-12 — Phase 5 Production promotion readiness gate started

Status: **Gate artifact started** — Phase 1〜4 は **GREEN**（証跡化済み）。**Phase 5（Production 昇格前ゲート／リリース強化）に着手**。これは **Production リリースではない**。**本記録時点: Production / `main` merge なし、Production DB/env/`whsec` 変更なし、ライブ決済なし。**

Work anchor:

- Branch `work/home-cluster`, Preview/Shadow 検証済み、`DTR_CORE_STATIC_V1` + `additional_reply_ticket` レーン。

Core risk:

- Preview/Shadow Phase 4 で **Shadow 上に後追い修復した RPC / DDL**（`m55_reply_ticket_fulfill_checkout_event`、`stripe_processed_events`、ledger 参照列、`service_role` EXECUTE、schema reload）が **`supabase/migrations` にまだ一式で載っていない**。**Production へはパッケージ化後にのみ昇格すること。**

Evidence:

- `docs/ssot/M55_PHASE5_PRODUCTION_PROMOTION_READINESS_GATE_2026-05-12.md`
- `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql`（read-only; **明示承認後の Production preflight 用**）
- Phase 5-2 パッケージ（レビュー用）: `docs/ssot/M55_PHASE5_2_PRODUCTION_DB_RPC_MIGRATION_PACKAGE_REVIEW_2026-05-12.md`

Next:

- **Phase 5-3** — パッケージ **レビュー承認**（**明示 GO なしに Production 適用しない**）。準備済みパッケージ: **Phase 5-2** セクション参照。

## 2026-05-12 — Phase 4 additional reply ¥500 Preview E2E GREEN

Status: **Checkpoint evidence** — Phase 4（追加返書 **¥500** Checkout〜Webhook〜wallet〜購入分返書送信〜UI）**GREEN**。**Preview / Shadow のみ**。Production / `main` **未承認**。リリース昇格の根拠単体ではない。**本チェックポイントではアプリロジックは変更しない。**

Work anchor:

- Branch `work/home-cluster`, Vercel Preview, Supabase Shadow/Test（`m55-soul-shadow` / `jonlynrbfveaprncyrmv`）, Stripe Sandbox, webhook endpoint M55-Vercel-Preview-HomeCluster, product lane additional reply ticket ¥500（`additional_reply_ticket`）。

Verified GREEN summary:

- **Checkout:** `POST /api/reply-tickets/checkout` → **200**.
- **初回 Webhook:** **500** → **root cause:** `public.m55_reply_ticket_fulfill_checkout_event` **RPC missing** on Shadow.
- **Repair:** Shadow に **RPC 作成**、`service_role` **EXECUTE** 確認。
- **Stripe:** **自動再送**で過去 `checkout.session.completed` が回復。
- **Wallet:** `initial_included_count` **1**, `purchased_count` **1**, `consumed_count` **2**, `available_count` **0**, `status` **`active`**.
- **Ledger:** `purchase_grant` / `PURCHASE` / `delta` **1** / `balance_after` **1** / `product_key` **`additional_reply_ticket`**, Stripe 参照あり。
- **Send:** `POST /api/room/core/send` **200**; `consult_messages` **4** 行（user/assistant ×2）; thread **`read_only`**.
- **UI:** 残り **0**、**追加返書 CTA** 再表示。

Root cause / repair（証跡）:

- RPC 欠落 → **Shadow で RPC 作成** → **Stripe 自動再送で回復**。

Next required phase:

- **Phase 5** — **Production promotion readiness gate** / release hardening（RPC・DDL を **Production マイグレーション計画に含める**こと。**合計 5 件 cap** はコード／read-only ゲートで確認し、**繰り返し有料購入のみで cap を叩く検証はしない**。）。

Hard stop:

- **No** Production **`main`** until Phase 5 gate / team approval.
- **No** Vercel env / **`whsec`** / secret edits; **no** additional purchase loop for testing; **no** UI polish until **Phase 4 evidence is committed**（チーム手順に従う）。

Evidence:

- `docs/ssot/M55_DTR_BASE_PREVIEW_PHASE4_ADDITIONAL_REPLY_E2E_GREEN_2026-05-12.md`
- `scripts/sql/staging/m55_phase4_additional_reply_e2e_verification_v1.sql`（read-only; `<CLERK_USER_ID>` placeholder）

## 2026-05-12 — Phase 3 included reply 1-ticket E2E GREEN

Status: **Checkpoint evidence** — Phase 3（同梱返書 **1 チケット**の送信〜DB 消費〜UI 整合）**GREEN**。後続の Phase 4（追加返書 ¥500）は **上位チェックポイントで証跡化済み**。リリース昇格の根拠単体ではない。**本チェックポイントではアプリロジックは変更しない。**

Work anchor:

- Branch `work/home-cluster`, Vercel Preview, Supabase Shadow/Test（`m55-soul-shadow` / `jonlynrbfveaprncyrmv`）, Stripe Sandbox, webhook endpoint M55-Vercel-Preview-HomeCluster, product lane DTR base ¥1,000 + included reply ticket（`DTR_CORE_STATIC_V1`）.

Verified GREEN summary:

- **Before send:** remaining **1**（同梱チケット未消費状態）。
- **After send:** `reply_ticket_wallets.available_count` = **0**, `consumed_count` = **1**; `consult_threads.credits_remaining` = **0**, `state` = **`read_only`**; `consult_messages` **2 行**; UI リロードで残り **0**; **追加相談返書 1件 500円** CTA 表示。
- **検証範囲:** 同梱 1 件フローのみ（`POST /api/room/core/send` 経路）。

Next required phase:

- **Phase 5** — Production promotion readiness（上位の Phase 4 証跡を参照）。

Hard stop:

- **No** Production **`main`** / **no** Vercel env / **no** **`whsec`** rotation / **no** UI polish yet（チームの現在ゲートに従う）。

Evidence:

- `docs/ssot/M55_DTR_BASE_PREVIEW_PHASE3_INCLUDED_REPLY_E2E_GREEN_2026-05-12.md`
- `scripts/sql/staging/m55_phase3_included_reply_e2e_verification_v1.sql`（read-only; `<CLERK_USER_ID>` placeholder）

## 2026-05-12 — Phase 2 wallet report_instance_id permanent fix GREEN

Status: **Checkpoint evidence** — Phase 2（`reply_ticket_wallets.report_instance_id` ↔ `dtr_report_snapshots.id` 自動リンク）**GREEN**。リリース昇格の根拠単体ではない。

Work anchor:

- Branch `work/home-cluster`, Vercel Preview, Supabase Shadow/Test（`m55-soul-shadow` / `jonlynrbfveaprncyrmv`）, Stripe Sandbox, webhook endpoint M55-Vercel-Preview-HomeCluster, product lane DTR base ¥1,000 + included reply ticket（`DTR_CORE_STATIC_V1`）.

Implementation commit:

- `c5b46f0` — `fix: link DTR reply wallet to report snapshot`

Verified GREEN summary:

- New Preview/Sandbox DTR purchase: **no manual backfill**; `dtr_report_snapshots.id` = `reply_ticket_wallets.report_instance_id`; wallet counts match included-ticket path; webhook **200**; `/dtr/processing` reached; `/dtr/core` **200**; `GET /api/room/core` **200**; `dtrOwnershipGate` owned from `dtr_report_snapshots`.

Next required phase:

- **Phase 3** — included reply **1-ticket E2E**（generate/consume lane; separate gate).

Hard stop:

- **No** additional reply **¥500** / **no** Production **`main`** / **no** env **`whsec`** / **no** new payment verification loop / **no** UI polish yet.

Evidence:

- `docs/ssot/M55_DTR_BASE_PREVIEW_PHASE2_WALLET_LINK_GREEN_2026-05-12.md`
- `scripts/sql/staging/m55_phase2_wallet_report_instance_link_verification_v1.sql`（read-only; `<CLERK_USER_ID>` placeholder）

## 2026-05-12 — DTR base report ¥1,000 Preview purchase-after flow GREEN

Status: **Checkpoint evidence** — **Phase 1 GREEN の証跡**。Preview + Shadow で購入後フロー検証済み。リリース昇格の根拠ではない。**本チェックポイントではアプリロジックは変更しない。**

Verified GREEN (Preview + Shadow / Sandbox):

- Stripe `checkout.session.completed` → webhook **HTTP 200**
- `entitlements`, `entitlement_rights`, `one_time_fulfillments` — DTR base lane
- `reply_ticket_wallets`, `dtr_guest_drafts`, `dtr_report_snapshots` (`snapshot_rows = 1`)
- `/dtr/core` paid report unlock
- `consult_threads` / `consult_messages` schema; `GET /api/room/core` **200**
- Consultation room UI: remaining count **「残り1件（合計5件まで）」** after wallet linkage

Caveat:

- `reply_ticket_wallets.report_instance_id` を `dtr_report_snapshots.id` に揃えたのは **Shadow のみ**の **手動 SQL backfill**。**恒久修正ではない**（正規 fulfillment / migration への置換が次フェーズ）。

Next required phase:

- **恒久:** wallet の `report_instance_id` を canonical fulfillment / migration（または合意 SSOT）で付与し、手動 backfill に依存しないこと。

Hard stop:

- **追加返書 ¥500** に進まない。
- **Production / `main`** に進まない（本証跡のみでの昇格・マージ禁止）。
- **Vercel env / `whsec` / 新規決済** は当面禁止（別途合意した次ブロッカーでない限り）。

Evidence:

- `docs/ssot/M55_DTR_BASE_PREVIEW_GREEN_CHECKPOINT_2026-05-12.md`
- `scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql`（`<CLERK_USER_ID>` を置換後に Shadow のみ実行。Production 禁止）

## 2026-05-11 — Stripe / Vercel / Supabase Shadow incident recovery protocol

Status: APPROVED SSOT / REQUIRED DEVELOPMENT PROTOCOL

Applies to:
- Payment
- Webhook
- Vercel Preview
- Supabase Shadow/Test
- DB schema repair
- Release promotion
- Any work where AI may lose the mainline context

Mandatory sequence:
work anchor -> current snapshot -> read-only diagnosis -> minimal repair -> verification -> evidence commit -> return-to-mainline decision.

Last GREEN:
- DTR base report ¥1,000 / DTR_CORE_STATIC_V1
- Stripe Sandbox checkout.session.completed
- M55-Vercel-Preview-HomeCluster
- Vercel Preview / work-home-cluster
- Supabase Shadow/Test = m55-soul-shadow / jonlynrbfveaprncyrmv
- Webhook delivery recovered to HTTP 200

Core rule:
Shadow DB is not safe merely because it exists. Shadow safety requires URL/key/project/schema/columns/types/UNIQUE/PK/PostgREST visibility/current code contract alignt.

Hard locks during DTR base report payment work:
- Do not touch Production/main.
- Do not touch additional reply ticket ¥500.
- Do not rotate whsec.
- Do not create a new Stripe endpoint.
- Do not change Vercel env unless that layer is proven to be the current blocker.
- Do not start a new payment or resend Stripe before current-layer verification is GREEN.

Runbook:
docs/ssot/M55_2026-05_STRIPE_SUPABASE_SHADOW_INCIDENT_RUNBOOK.md

Evidence SQL:
scripts/sql/staging/m55_shadow_schema_contract_repair_execute_v1.sql
scripts/sql/staging/m55_shadow_one_time_fulfillment_contract_repair_v1.sql

## 2026-03-07 Checkpoint: Relationship reflection pivot
- Relationship reflection SSOT triad registered as canonical law for product direction.
- Canonical docs: `M55_RELATIONSHIP_REFLECTION_SYSTEM_SSOT_v1_2026-03-07.md`, `M55_USER_DATA_AND_MARKETING_BOUNDARY_SSOT_v1_2026-03-07.md`, `M55_DAILY_DIGEST_AND_HABIT_LOOP_SSOT_v1_2026-03-07.md`.
- Product pivot: non-divinatory relationship reflection, daily check-in signals, weekly light summary, DTR as paid deep layer. Legacy tarot references remain for interaction quality only, not as semantic engine.
- Storefront, webhook, assets, migrations, analytics code unchanged.

## 2026-03-07 Checkpoint: Team current-position checkpoint formalized
- Team-shared current position is now formalized in `docs/audit/M55_TEAM_CHECKPOINT_2026-03-07_CURRENT_POSITION.md`.
- Real Step5 contracts and real bottom-nav SVG assets are imported and frozen for web identity.
- Web prototype identity remains primary: AI chat, Tarot, ai_meter, Today, Weekly, Prime/DTR, and My remain first-class surfaces.
- Webhook Task 1 remains a separate implementation/review lane; do not mix unfinished webhook code with docs-only or UI-asset commits.

## 2026-03-06 Checkpoint: Task 2 guard and observability aligned
- Task 2 remains isolated to `/prototype/hub` only; storefront/public routes remain frozen.
- Annual/value-difference UI is approved as display-only comparison (0/30/90 retention), with annual purchase disabled or feature-flagged until annual entitlement semantics are defined.
- Observability is required for webhook settlement failures; at minimum, structured `console.error` logging must capture event type, invoice id, user resolution, and DB persistence failure point.
- Database migration application/verification must use official Supabase migration flow (`supabase db push` / local migration verification), not ad-hoc schema changes.

## 2026-03-06 Checkpoint: Phase 1 foundation verified
- Latest preview for `521c1b4` is Ready.
- Local `/prototype` token-gated access verified with `HTTP/1.1 200 OK`.
- Automation operating system, audit assets, workflows, and scripts are imported and pushed.
- Phase 1 foundation is complete; next implementation phase starts from Premium monthly DTR grant, then annual plan / value-difference UI.

## 2026-03-06 Checkpoint: Automation operating system imported
- Added automation guardrails/workflows/scripts for asset extraction and SSOT enforcement.
- Added retrospective and checkpoint template for reusable team operations.
- Previous 2026-03-05 ingest artifacts remain canonical; no raw re-import of yesterday bundles.

## 2026-03-06 Checkpoint: JP Revenue Acceleration SSOT registered
- Canonical doc: `docs/ssot/M55_WEB_JP_REVENUE_ACCELERATION_SSOT_v1_2026-03-06.md`
- Scope: Phase 1 (isolated UI only). Storefront (`/`, `/dtr/lp`, `/support`, `/legal/*`) remains frozen.
- Guards: Prototype entry gate=`302 -> /` (token/headers), entitlement decision gate=Silent Free, DB is SSOT, no forbidden terms in public HTML.

## 2026-03-06 Checkpoint: Post-Review Harvest Strategy (Finalized)
- **Policy**: "Done is better than perfect." Activate monetization post-review via Phase 1 (isolated UI only; storefront unchanged). [cite: 2026-02-28]
- **Ingest**: `01_BIZ_Monetization_Logic_v1.0` (hash: `80C83F...`) integrated via secure manifest (index+sha256; no raw vault committed).
- **Logic**: Prototype *entry* gate = `302 -> /` (token/headers); Entitlement *decision* gate = Silent Free (no errors/no pressure).
- **Structure**: `ai_meter_detail` is adopted as the connection hub for DTR shelving + subscription value (30d/90d retention comparison shown in isolated UI only).





## 2026-03-06 Checkpoint: Monetization Implementation Plan Web v1 registered
- Canonical doc: `docs/ssot/M55_MONETIZATION_IMPLEMENTATION_PLAN_WEB_v1.md`
- Scope: Next.js + Supabase + Clerk + Stripe での収益化実装。Post-Review UI Switch に従属。
- Key: DB/entitlements SSOT、productId/rightsKey 正規化、Stripe Webhook 唯一の真実化、禁止語彙0 CI。

## 2026-03-05 Checkpoint: /prototype Isolation Hub Postmortem as SSOT Seed
- Canonical runbook frozen at: `docs/audit/M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md`
- Operational directive frozen at: `docs/audit/M55_Prototype_Gate_Master_Usage_2026-03-05.md`
- Key invariants: header-only access (`x-m55-proto`), Fail-Closed (`302 -> /`), no URL-based context injection, no public page edits during review, no secrets in logs/chats.
- Triage model: status codes map to Gate A (401), Gate B (302), Gate C (404), all-pass (200 + X-Matched-Path:/prototype).

## 2026-03-05 Checkpoint: Post-Review UI Switch SSOT registered
- Canonical doc: `docs/ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md`
- Priority: Do not increase (1) payment/refund/support/legal consistency risk, (2) misrepresentation risk (forbidden terms).
- Rollout: Phase 0 keep storefront (`/`, `/dtr/lp`), Phase 1 isolate UI (`/app` or `/prototype`), Phase 2 gated switch with fixed price/refund/support block.

## 2026-03-05: Ingest of local bundles completed
- Ingest 索引: `docs/audit/sources/ingest_2026-03-05/` (MANIFEST.md, INDEX.md, NOTES.md)
- 新規 ssot: `M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md`, `POST_REVIEW_UI_SWITCH_SSOT_v1.md`（機密除去注記付与）
- 新規 audit: `M55_AUDIT_CHECKLIST_FINAL.md`, `M55_IMPLEMENTATION_COMMANDS_FOR_CURSOR.md`
- PROTOTYPE_ISOLATION_BUNDLE（middleware/layout/page）はアプリコードのため repo 非収録。実装時はローカルから一時展開して配置。

# M55 SYSTEM SSOT & AUDIT LOG (2026)

## 【CURRENT: 2026-03-03】
- **Gate R Status**: PASS (Stripe審査用ページ隔離済み)
- **Public Pages**: / , /dtr/lp , /support , /legal/* (これらは一切書き換えない)
- **Development**: 新機能(Hub)は /app/prototype 配下でのみ進める

## 【NEXT】
- [ ] /app/prototype 配下に最強のハブ画面を実装する

<details>
<summary>HISTORY (過去の記録)</summary>

### 2026-03-02 (旧チェックポイント)
- Stripe審査：提出直前。Gate R GREEN 判定 = PASS
- 商品価格：¥1,000（税込）
- サポート：/support にメール＋電話を明記
- 禁止語彙：占い/鑑定 等は公開HTMLから排除済み
</details>
