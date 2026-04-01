# M55 Step 1（憲法整理）・Step 2（実体監査）レポート

**作成日:** 2026-03-15  
**従属:** CHECKPOINT_2026-03-08_APPENDED_..._2026-03-15, SSOT 補助 6 ファイル  
**状態:** ACTIVE

---

## 読込済み SSOT 補助ファイル一覧

| ファイル | 状態 |
|----------|------|
| stripe_review_recovery_ssot_2026_03_08.md | ✅ 読込済 |
| ai_dialogue_product_axis_ssot_2026_03_08.md | ✅ 読込済 |
| naming_ssot_reflect_report_2026_03_08.md | ✅ 読込済 |
| ssot_gap_patch_text_2026_03_08.md | ✅ 読込済 |
| ssot_report_adjudication_template_2026_03_08.md | ✅ 読込済 |
| Reflect_Report_by_M55_2026_03_08.md | ✅ 読込済（P0 PUBLIC ALIGNMENT / STRIPE_PUBLIC_DETAILS / TOKUSHOHO_PATCH を含む） |

---

## Step 1: 憲法整理（Constitutional Organization）

### 1-1. レーン構成（確定）

| レーン | 範囲 | 凍結 / 可触 |
|--------|------|-------------|
| **public / storefront** | `/`, `/dtr/lp`, `/support`, `/legal/*` | **凍結**（大規模変更禁止） |
| **isolated prototype** | `/prototype/hub` | 価値訴求・DTR 棚・Prime 棚。public を汚染しない |
| **webhook / payment core** | `checkout.session.completed`, `charge.refunded`, `invoice.paid` | 本丸。truth-source。別 lane と混ぜない |
| **analytics** | PostHog | sell-surface reaction only |
| **docs / spec** | SSOT, audit, checkpoint | 実装と分離 |
| **entitlement bridge** | success page, purchased surface | Phase 2 対象。truth は webhook |

### 1-2. 凍結対象

- **public routes:** `/`, `/dtr/lp`, `/support`, `/legal/*`  
  - 大規模名称変更・コピー刷新・新売り文句追加 **禁止**
- **Bottom nav:** 5 固定 SVG glyphs、opacity-only、no emoji
- **Prime shelf:** no-rank UI
- **Home image:** image-in-card / abstract-only / max-2-prominent-blocks

### 1-3. 破ってはいけない Laws（要約）

#### Payment / DB Law
- `entitlements.stripe_session_id` 保持必須
- `entitlement_rights` の `(user_id, right_key)` 一意維持
- `user_id` は TEXT
- `one_time_fulfillments.checkout_session_id` 冪等 key
- webhook を truth-source、success page は truth-source にしない
- webhook route を古い不完全版へ戻さない
- event recording を劣化させない

#### Public / Compliance Law
- 占い・鑑定・運勢・予言・霊感・開運・当たる を主要面で前面化しない
- 事業表現は **オンライン提供のデジタルコンテンツ（レポート）販売** に固定
- statement descriptor を勝手に動かさない
- generic trust-badge clutter を足さない
- 未公開機能・誇張コピーを足さない

#### Analytics Law
- free-text / AI chat content / email / raw sensitive identifiers を送らない
- heavy analytics にしない
- `identify()` を勝手に追加しない

#### Lane Separation Law
- webhook settlement / analytics / public / storefront / docs を同一コミットに混ぜない

### 1-4. 次フェーズの正しい順序

1. **Phase 1:** proof / evidence hardening（one-time lane formal proof、TC 証跡再取得）
2. **Phase 2:** entitlement bridge（DB → purchased access surface 即時反映）
3. **Phase 3:** visual migration（M55 app visual language の web 移植、フロント中心・settlement 不触）
4. **Phase 4:** controlled optimization（PostHog 最小 reaction-only）

### 1-5. Naming / Compliance Boundary（SSOT 補助から統合）

| 軸 | 正本（naming_ssot_reflect_report による override 適用後） |
|----|-----------------------------------------------------------|
| **merchant-facing（審査中）** | M55-aligned 維持。Stripe / Public details / statement descriptor は M55 軸 |
| **product-facing** | Reflect Report by M55（旧 Reflect Note / Reflection Report は superseded） |
| **paid artifact** | Reflect Report |
| **internal platform** | M55 |

**注意:** stripe_review_recovery / P0 PUBLIC ALIGNMENT は「Reflect Note」「Reflection Report」を含むが、naming_ssot_reflect_report が override として優先。読替: Reflect Note → Reflect Report、Reflection Report → Reflect Report。

### 1-6. One-time Lane Business Truth

- **truth source:** webhook + DB write
- **target events:** `checkout.session.completed`, `charge.refunded`
- **non-target:** 安全に 200、business failure にしない
- **冪等:** `stripe_events`, `one_time_fulfillments.checkout_session_id`、23505 は 200
- **4 表:** `stripe_events`, `one_time_fulfillments`, `entitlements`, `entitlement_rights` の反映が合格条件

### 1-7. Analytics Boundary

- product analytics = sell-surface reaction only
- free-text / AI chat content / email / raw sensitive identifiers 禁止
- success page / purchase flow の最小 reaction event のみ許可
- `identify()` 勝手追加禁止

---

## Step 2: 実体監査（Entity Audit）

### 2-1. 現在ブランチ

- **`proto/hub-isolated-20260304`**

### 2-2. 変更候補ファイル（git status 要約）

| 種別 | 代表ファイル |
|------|--------------|
| **M** | `app/api/purchase/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/legal/tokushoho/page.tsx`, `app/purchase/success/page.tsx`, `components/QuietPolling.tsx`, `middleware.ts` |
| **??** | `docs/audit/`, `docs/ssot/`（新規）、`lib/oneTimeCheckout.ts`, `supabase/migrations/20260308000000_one_time_checkout_fulfillment.sql` |

### 2-3. SSOT との整合 / Drift 判定

| 項目 | 判定 | 備考 |
|------|------|------|
| **TOKUSHOHO 支払時期** | ✅ 整合 | `app/legal/tokushoho/page.tsx` に「代金の支払時期」本文あり（第一候補正本準拠） |
| **naming（Reflect Report）** | ✅ 整合 | success page / QuietPolling / checkout `description` が Reflect Report 軸 |
| **webhook one-time lane** | ✅ 整合 | `event_type` 保存、非対象 200、本丸失敗 500、failed_fulfillments 記録 |
| **public freeze** | ✅ 維持 | `/`, `/dtr/lp`, `/support`, `/legal/*` 大規模変更なし |
| **P0 PUBLIC ALIGNMENT** | ⚠️ 人間作業待ち | Stripe Branding / Public details / Checkout policies は Stripe Dashboard 操作。repo は整合準備済み |
| **ssot_gap_patch 5 文** | ⚠️ 未適用 | retention loop / Quick Entry / Reminder / export / mobile auth backlog の追記は docs-only。今回スコープ外可 |

### 2-4. 触ってよい / 触ってはいけないファイル（Phase 別）

| Phase | 触ってよい | 触ってはいけない |
|-------|------------|------------------|
| **Phase 1** | `docs/audit/`, TC 証跡, `P1_TC_EXECUTION_RUNBOOK`, `docs/audit/evidence/` | webhook, checkout, public routes, middleware |
| **Phase 2** | `app/purchase/success/page.tsx`, `app/prototype/hub/page.tsx`, `app/api/me/entitlements/route.ts`, purchased surface 表示制御 | webhook, checkout, public storefront |
| **Phase 3** | `/prototype` スタイル, コンポーネント, 視覚仕様 | settlement, webhook, analytics, legal |
| **Phase 4** | PostHog 最小イベント, CTA / checkout 周辺 | lane 混在コミット |

### 2-5. 実体との衝突候補（要監視）

| 箇所 | 内容 | 推奨対応 |
|------|------|----------|
| **naming 文書間** | P0 / stripe_review_recovery の Reflect Note / Reflection Report 表記 | naming_ssot_reflect_report を override として解釈。新規ドキュメントは Reflect Report 軸で記述 |
| **ssot_report_adjudication 3-3** | 「paid artifact 名称は Reflection Report」 | naming override により Reflect Report と読替 |
| **ssot_gap_patch** | 5 文の「Reflect Note」「Reflection Report」 | 転記時は Reflect Report 軸に読替可。docs-only、実装混入禁止 |

### 2-6. Phase 1 / 2 / 3 の実装分割

| Phase | 内容 |
|-------|------|
| **Phase 1** | TC-02〜TC-07 再実行、証跡記録、DB 4 表確認、`docs/audit/evidence/` 更新 |
| **Phase 2** | `entitlements` / `entitlement_rights` のクライアント参照、purchased surface 表示制御、success page 表示分岐 |
| **Phase 3** | visual migration は Phase 2 完了後。`/prototype` および purchase-adjacent を中心、public freeze 不触 |

---

## 判定サマリー（ssot_report_adjudication_template 適用）

### 3 秒トリアージ

- [x] public lane に implementation 混入なし
- [x] merchant-facing M55-aligned 維持
- [x] 危険語・過剰表現なし
- [x] 支払時期明記済み（tokushoho）
- [x] payment lane 分離、truth-source あり、refund / replay / failed_fulfillment 対応済み

### 即断

- **Status:** CONDITIONAL GREEN（P0 Stripe Dashboard 人間作業待ち）
- **Summary:** repo 実体は SSOT と整合。Phase 1 proof/evidence 再取得後 ALL GREEN へ昇格可。
- **直近の次手:**
  1. Phase 1: TC-02〜TC-07 実行、証跡保存
  2. Phase 2: entitlement bridge 実装（success page は表示分岐のみ、truth は webhook）
  3. P0 Stripe Branding / Public details 人間側完了確認

---

## 付録: SSOT 補助ファイル従属関係

```
CHECKPOINT_2026-03-15 (最上位)
├── stripe_review_recovery_ssot_2026_03_08
│   ├── STRIPE_PUBLIC_DETAILS_CHECKLIST (P0)
│   ├── TOKUSHOHO_PATCH_TEXT (P0)
│   ├── PAYMENT_FULFILLMENT_SSOT (P1)
│   └── STRIPE_GO_LIVE_TEST_CHECKLIST (P1)
├── naming_ssot_reflect_report_2026_03_08 (override: Reflect Report 軸)
├── ai_dialogue_product_axis_ssot_2026_03_08 (内部戦略、対外 freeze 維持)
├── ssot_gap_patch_text_2026_03_08 (docs-only 5 文)
├── ssot_report_adjudication_template_2026_03_08 (判定テンプレート)
└── Reflect_Report_by_M55_2026_03_08 (P0 PUBLIC ALIGNMENT 等)
```
