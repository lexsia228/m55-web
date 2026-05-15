# M55 Webhook イベント分岐表 (2026-03-14)

**対象:** `/api/stripe/webhook` one-time fulfillment  
**合格条件:** POST 200 単体ではなく、stripe_events / one_time_fulfillments / entitlements / entitlement_rights の4表への反映確認

---

## 1. イベント別 レスポンス・DB反映 分岐表

| イベント種別 | 条件 | HTTP ステータス | stripe_events | one_time_fulfillments | entitlements | entitlement_rights | 備考 |
|-------------|------|----------------|----------------|----------------------|--------------|-------------------|------|
| **事前チェック** | event_id 既存（replay） | **200** | - | - | - | - | 冪等: 重複送信時は処理せず 200 |
| **事前チェック** | 署名不正 / ボディ不正 | 400 | - | - | - | - | |
| **事前チェック** | Webhook 未設定 | 503 | - | - | - | - | STRIPE_WEBHOOK_SECRET なし |
| **charge.updated** 等 | 非対象イベント | **200** | 挿入試行（成功/23505/他エラー問わず 200） | - | - | - | 本丸以外は常に 200 early return |
| **invoice.paid** | 各種（premium 以外 / out-of-band 等） | **200** | ✓ | - | - | - | invoice lane |
| **invoice.paid** | premium 月次 grant 成功 | **200** | ✓ | - | - | ✓ (m55_p:month:YYYY-MM) | invoice_dtr_grants |
| **invoice.paid** | 内部処理失敗 | **500** | - | - | - | - | 握りつぶさない |
| **checkout.session.completed** | subscription レーン成功 | **200** | ✓ | - | ✓ | - | |
| **checkout.session.completed** | subscription レーン失敗 | **500** | - | - | - | - | entitlements upsert 失敗等 |
| **checkout.session.completed** | one-time / missing_client_reference_id | **200** | ✓ | - | - | - | failed_fulfillments に記録 |
| **checkout.session.completed** | one-time / product_mismatch | **200** | ✓ | - | - | - | failed_fulfillments に記録 |
| **checkout.session.completed** | one-time / payment_status_not_paid | **200** | ✓ | - | - | - | failed_fulfillments に記録 |
| **checkout.session.completed** | one-time / 既存 fulfillment（冪等） | **200** | ✓ | - | - | - | |
| **checkout.session.completed** | one-time / 内部処理成功 | **200** | ✓ | ✓ | ✓ | ✓ | 4表すべて反映 |
| **checkout.session.completed** | one-time / 内部処理失敗 | **500** | - | - | - | - | failed_fulfillments に internal_processing_failed |
| **checkout.session.completed** | one-time / stripe_events insert 失敗 | **500** | - | ✓ | ✓ | ✓ | failed_fulfillments に stripe_events_insert_failed |
| **checkout.session.completed** | stripe_events insert 23505 | **200** | - | ✓ | ✓ | ✓ | 冪等で 200 |
| **charge.refunded** | partial / one_time_fulfillments に該当なし等 | **200** | ✓ | - | - | - | |
| **charge.refunded** | full refund / revoke 成功 | **200** | ✓ | - | revoked | 削除 | 4表のうち stripe_events + entitlements 反映 |
| **charge.refunded** | full refund / revoke 失敗 | **500** | - | - | - | - | failed_fulfillments に revoke_failed |
| **charge.refunded** | stripe_events insert 失敗 | **500** | - | - | - | - | failed_fulfillments に stripe_events_insert_failed |
| **charge.refunded** | stripe_events insert 23505 | **200** | - | - | revoked | 削除 | 冪等 |

---

## 2. 合格条件チェック（4表反映）

| ケース | stripe_events | one_time_fulfillments | entitlements | entitlement_rights |
|--------|---------------|----------------------|--------------|-------------------|
| **one-time 購入成功** | ✓ event_id, event_type | ✓ 1 件 | ✓ status=active | ✓ m55_p:core_origin |
| **one-time full refund 成功** | ✓ event_id, event_type | （既存のまま） | status=revoked | 該当 right 削除 |
| **非対象イベント（charge.updated 等）** | ✓ 挿入試行 | - | - | - |

---

## 3. 本丸イベントでの 500 返却ルール

- **checkout.session.completed / charge.refunded** の内部処理失敗: **500** + failed_fulfillments 記録
- **stripe_events insert 失敗**（23505 以外）: **500** + failed_fulfillments 記録
- **23505**（重複）: 常に **200**
- **非対象イベント**（charge.updated 等）: 常に **200**
