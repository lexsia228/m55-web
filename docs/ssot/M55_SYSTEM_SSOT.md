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
