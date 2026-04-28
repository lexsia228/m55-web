# M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.1

Status: Frozen SSOT for Implementation / Audit Patch Applied  
Date: 2026-04-28  
Scope: M55 本質レポート購入者限定・追加相談返書・Stripe追加課金・誤入力時の復元運用  
Owner: M55 / Reflect Note by M55  
Priority: This document extends `追加相談返書チケット_v1.3_SSOT` and must be treated as the implementation gate before DB / Stripe / E2E work.
Audit Patch: `gemin.GPT(35).txt` の監査3点を反映済み（保存版表現の置換、削除/匿名化の例外の明文化、転職等の範囲外相談の扱いを章紐づけ可能に補正）。

---

## 0. このSSOTの目的

このSSOTは、M55の「本質レポート購入者限定の追加相談返書」において、以下を破綻させないための実装憲法である。

1. 収益と権利付与の整合性
2. Stripe決済・Webhook・DB反映の復元可能性
3. 購入後の入力ミス、作り直し、無効化、削除依頼への対応
4. 追加相談返書チケットの上限・紐づき・他レポート併用不可の保証
5. 返書生成失敗、二重Webhook、通信断、決済後離脱、問い合わせ、チャージバック時の監査証跡
6. 将来的な「過去の自分との比較」「変化ログ」「成長確認」への拡張余地

このSSOTが固定されるまで、追加課金UI、Stripe Checkout、本番Webhook、商品棚の表示は実装してはならない。

---

## 1. 上位SSOTとの関係

### 1.1 継承する正本

本SSOTは、`追加相談返書チケット_v1.3_SSOT` を上位仕様として継承する。

継承する確定事項：

- 追加相談返書は、本質レポートに紐づく深掘り専用の追加コンテンツ。
- 本質レポート本文の要約ではない。
- 一般的なAIチャットではない。
- 他話題・別レポート領域には広げない。
- 当該本質レポートはアーカイブしない。
- レポート本文と返書履歴は、過去の自分との比較対象として保持する。
- 価格は1件500円。
- 1レポートあたり相談返書は合計5件まで。
- 内訳は付属1件 + 追加購入4件まで。
- 返書は4章の深掘り専用。
- 実装順序は「付属1件E2E → プロンプト調整 → 章選択 → 追加課金DB/Stripe/Webhook → 決済反映 → 商品棚表示」。
- DBをSSOTにする。
- PurchaseCacheなどクライアント側キャッシュを第二の所有状態にしない。
- Webhook未反映でチケット付与済みにしない。
- Checkout作成前とWebhook反映時の両方で上限5件を確認する。
- Webhook再送に備えて冪等性を持たせる。

### 1.2 本SSOTで追加固定する事項

本SSOTは、上位SSOTに不足していた以下を固定する。

- 購入後にユーザー入力ミスが判明した場合の対応
- 返金不可と、例外的なM55側起因トラブル対応の境界
- 旧レポートの無効化・新レポート作成・未使用チケット移管
- 生成済み返書の扱い
- Stripe決済イベント・DB権利台帳・返書生成台帳の復元原則
- 管理者対応ログ、監査ログ、問い合わせ対応証跡
- チャージバック・二重請求・Webhook失敗時の復旧手順
- 本番投入前E2Eゲート

### 1.3 明示的に上書きする旧仕様

過去生成物や古い文言に残る以下は廃止する。

- 「追加できる返書は合計3回まで」
- 「3ヶ月アーカイブ」
- 「期限付き保存版」
- 「追加相談返書は他のレポートや汎用相談にも使える」
- 「フロント側の状態で購入済み・チケット付与済みを判断する」
- 「success_url到達だけで権利付与する」

唯一の正は以下とする。

- 1レポート合計5件まで。
- 付属1件 + 追加購入4件まで。
- 当該本質レポートにのみ紐づく。
- 他レポートへ併用不可。
- DB上の権利台帳だけがSSOT。
- Webhook反映前にチケット付与済み表示をしない。
- アーカイブしない。比較資産として保持する。

---

## 2. 商品定義

### 2.1 商品名

内部名：
`essence_reply_addon`

表示名：
`追加相談返書`

補助表示：
`この本質レポートに紐づいて、今の相談をもう一度整理できます。`

価格：
`1件 500円`

### 2.2 商品の性質

追加相談返書は、購入済みの本質レポートを深掘りするための追加コンテンツである。  
これは、占いチャット、汎用AIチャット、人生相談、恋愛相談、相性診断、仕事特化レポート、未来予測サービスではない。

### 2.3 紐づき単位

追加相談返書は、必ず以下の単位に紐づく。

- `user_id`
- `report_instance_id`
- `report_type = essence`
- `product_scope = essence_report_reply`
- `chapter_scope = I / II / III / IV`

ユーザー単位のグローバル残高として扱ってはならない。  
別レポート、別ユーザー、別商品、将来の相性レポート、仕事特化レポートへ流用してはならない。

### 2.4 上限

1つの本質レポートに対して相談返書は合計5件まで。

内訳：

- 付属返書：1件
- 追加購入返書：最大4件

上限はUIではなくDB処理で保証する。  
UI上でボタンを隠しても、API直叩きで上限突破できる実装は禁止。

---

## 3. 金銭・権利付与の絶対原則

### 3.1 DBが唯一のSSOT

購入済み状態、チケット残数、返書消費状態、返書履歴、レポート有効状態は、すべてDBから算出する。

禁止：

- `localStorage` を権利判定に使う
- `sessionStorage` を権利判定に使う
- `PurchaseCache` を第二の所有状態にする
- Stripe success_url到達のみで権利付与する
- フロントの表示状態でチケット数を増やす
- クライアントから送られた `remainingCredits` を信用する

許可：

- フロントキャッシュは表示高速化に限る
- 最終判定は必ずサーバー/API/DBで行う
- キャッシュはDB結果と不一致なら破棄する

### 3.2 収益事故防止の基本不変条件

常に以下が成立しなければならない。

```txt
included_reply_credits_per_report <= 1
paid_reply_credits_per_report <= 4
total_reply_credits_per_report <= 5
consumed_credits <= granted_credits
available_credits = granted - reserved - consumed - voided - transferred_out
```

以下は即時ブロック対象。

- 合計5件を超える付与
- 追加購入4件を超える付与
- 未購入レポートへの追加返書付与
- 無効化済みレポートへの追加返書購入
- 他ユーザーのレポートへの購入
- Webhook重複による二重付与
- 生成失敗後のチケット消滅
- 決済未完了でのチケット付与
- 旧レポート無効化後の返書送信

---

## 4. 推奨DB台帳

実装上の名称は既存DBに合わせてよいが、概念は必ず保持する。

### 4.1 `report_instances`

本質レポート1件ごとの実体。

必須概念：

- `id`
- `user_id`
- `report_type`
- `input_snapshot`
- `result_snapshot`
- `status`
- `replaced_by_report_instance_id`
- `void_reason`
- `created_at`
- `updated_at`

推奨status：

- `active`
- `correction_pending`
- `voided_input_error`
- `replaced`
- `admin_hidden`
- `deleted_by_user_request`
- `legal_hold`

### 4.2 `reply_credit_ledger`

相談返書の権利台帳。残数カラムだけで管理してはならない。必ず台帳形式にする。

必須概念：

- `id`
- `user_id`
- `report_instance_id`
- `source_type`
- `source_order_id`
- `status`
- `chapter_scope`
- `reply_request_id`
- `transferred_from_credit_id`
- `transferred_to_credit_id`
- `created_at`
- `updated_at`

`source_type`：

- `included`
- `stripe_paid`
- `admin_adjustment`
- `support_transfer`

`status`：

- `available`
- `reserved`
- `consumed`
- `released`
- `voided`
- `transferred_out`
- `transferred_in`
- `refunded_or_reversed`

制約：

- 1レポートにつき `source_type = included` は最大1件。
- 1レポートにつき `source_type = stripe_paid` は最大4件。
- 同一 `source_order_id` から付与できるチケットは1件のみ。
- `consumed` は管理者でも通常は戻さない。
- 生成失敗時のみ `reserved → available` に戻す。

### 4.3 `reply_requests`

ユーザーが送った相談リクエスト。

必須概念：

- `id`
- `user_id`
- `report_instance_id`
- `chapter_scope`
- `user_message`
- `scope_check_status`
- `credit_id`
- `status`
- `created_at`

`status`：

- `draft`
- `submitted`
- `scope_rejected_no_credit_consumed`
- `credit_reserved`
- `generating`
- `completed`
- `generation_failed_credit_released`
- `generation_failed_support_required`
- `cancelled_by_support`

### 4.4 `reply_responses`

生成済み返書。

必須概念：

- `id`
- `reply_request_id`
- `user_id`
- `report_instance_id`
- `chapter_scope`
- `response_text`
- `prompt_version`
- `model`
- `status`
- `created_at`

`status`：

- `visible`
- `hidden_by_report_void`
- `hidden_by_user_request`
- `deleted_by_user_request`
- `legal_hold`

### 4.5 `stripe_orders`

Stripe Checkout SessionとM55内注文の照合台帳。

必須概念：

- `id`
- `user_id`
- `report_instance_id`
- `product_code`
- `amount_jpy`
- `currency`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `stripe_customer_id`
- `status`
- `fulfillment_status`
- `created_at`
- `updated_at`

`status`：

- `created`
- `checkout_opened`
- `paid_pending_webhook`
- `paid_fulfilled`
- `payment_failed`
- `expired`
- `disputed`
- `refunded`
- `support_review`

`fulfillment_status`：

- `not_started`
- `processing`
- `fulfilled`
- `duplicate_ignored`
- `failed_retryable`
- `failed_requires_support`

### 4.6 `stripe_event_ledger`

Webhookイベントの受信台帳。

必須概念：

- `stripe_event_id`
- `event_type`
- `stripe_object_id`
- `received_at`
- `processed_at`
- `processing_status`
- `raw_payload_hash`
- `error_message`

制約：

- `stripe_event_id` はunique。
- 同一イベントIDは再処理しない。
- 再送時は `duplicate_ignored` として安全に終了する。

### 4.7 `support_case_ledger`

誤入力、作り直し、二重請求、未反映、削除依頼の対応台帳。

必須概念：

- `id`
- `user_id`
- `case_type`
- `report_instance_id`
- `related_order_id`
- `related_credit_id`
- `status`
- `before_state`
- `after_state`
- `operator_note`
- `created_at`
- `resolved_at`

`case_type`：

- `input_error_correction`
- `paid_but_credit_missing`
- `duplicate_charge`
- `webhook_failed`
- `generation_failed`
- `credit_transfer`
- `refund_exception`
- `dispute_response`
- `privacy_delete_request`

---

## 5. Stripe設計原則

### 5.1 Checkout作成前チェック

Checkout Sessionを作る前に、サーバー側で必ず確認する。

- ユーザーがログイン済みである
- `report_instance_id` が存在する
- `report_instance_id.user_id` が現在ユーザーと一致する
- `report_type = essence`
- `report_instance.status = active`
- 既購入の本質レポートである
- 合計相談返書数が5未満
- 追加購入数が4未満
- 未処理の同一注文が重複していない
- 無効化・作り直し・削除依頼中ではない

失敗時はCheckoutを作成しない。

### 5.2 Stripe metadata

Checkout Sessionには必ず、M55側で復元できる情報を入れる。

必須metadata：

```txt
m55_order_id
user_id
report_instance_id
product_code=essence_reply_addon
product_scope=essence_report_reply
credit_quantity=1
schema_version=1
```

禁止：

- 秘密鍵
- 個人情報の過剰保存
- 解析本文全文
- 返書本文
- 生年月日など不要な詳細入力

### 5.3 Idempotency Key

Stripe Checkout作成時のPOSTには、M55側注文IDを含む一意のidempotency keyを使う。

推奨形式：

```txt
m55_essence_reply_addon_checkout_{m55_order_id}
```

同じ注文作成をリトライしても、Checkout Sessionが多重生成されないようにする。

### 5.4 Webhookが唯一の正式付与トリガー

正式なチケット付与はWebhook処理だけで行う。

success_urlは以下のみ許可：

- 決済処理中の表示
- DB反映状況のポーリング
- Webhook反映済みなら残数表示
- 未反映なら「反映確認中」
- 一定時間未反映ならサポート導線

success_url到達だけで `reply_credit_ledger` を増やしてはならない。

### 5.5 Webhook処理

処理対象イベント：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- 必要に応じて `charge.dispute.created`
- 必要に応じて `charge.refunded`

処理順：

1. Stripe署名検証
2. `stripe_event_ledger` にevent_idをinsert
3. 既存event_idなら `duplicate_ignored` で終了
4. metadataから `m55_order_id` / `user_id` / `report_instance_id` を取得
5. `stripe_orders` をロック
6. `report_instances` をロック
7. 所有者・商品・上限・状態を再確認
8. `reply_credit_ledger` に1件付与
9. `stripe_orders.fulfillment_status = fulfilled`
10. `stripe_event_ledger.processing_status = processed`

途中で失敗した場合は、`failed_retryable` または `failed_requires_support` にする。  
失敗イベントを握り潰してはならない。

---

## 6. 返書生成とチケット消費

### 6.1 消費タイミング

ユーザー送信時に即 `consumed` にしてはならない。

正しい状態遷移：

```txt
available
→ reserved
→ generating
→ consumed
```

生成または保存に失敗した場合：

```txt
reserved
→ available
```

返書が保存された場合のみ：

```txt
reserved
→ consumed
```

### 6.2 範囲外相談

範囲外相談はチケットを消費しない。

対象外：

- 恋人用・相性用そのものを判断する相談
- 仕事特化・転職そのものを判断する相談
- 未来予測
- 汎用人生相談
- 他レポート領域
- 本質レポートと関係しない悩み

ただし、恋愛・相性・仕事・転職などの悩みであっても、「その選択の正否を判定する」のではなく、悩みの中に出ている本質レポート4章の傾向・負荷・戻し方を整理する場合は、章に紐づけて扱える。

扱える例：

- 「転職するべきか」を断定するのではなく、「今の環境でなぜ力が出にくいのか」をⅢ 無理を知る／Ⅳ 楽に扱うに紐づけて整理する。
- 「相手との未来」を判断するのではなく、「自分が関係性の中でどこに負荷を感じやすいか」を本質レポート内の傾向として整理する。
- 「仕事運」を見るのではなく、「力が安定する条件」をⅡ 構造を読むに紐づけて整理する。

表示文言：

```txt
この相談は、現在の本質レポートの深掘り範囲を少し外れています。
この返書では、4章の中から今の相談に近いテーマへ絞って整理できます。
章を選び直すか、相談内容を本質レポートの範囲に寄せてもう一度送ってください。
```

この場合、チケットは消費しない。

---

## 7. 入力ミス・作り直し・無効化ポリシー

### 7.1 基本方針

購入後に生成された本質レポートは、原則として直接編集しない。  
生年月日、名前、入力値、解析結果を後から上書きすると、決済・返書・比較履歴・問い合わせ証跡が破壊されるため。

誤入力が判明した場合は、以下で対応する。

```txt
旧レポートを無効化
→ 新レポートを作成
→ 未使用権利のみ必要に応じて移管
→ 旧レポートと新レポートの関係をDBに残す
```

### 7.2 ユーザー自由削除は初期リリースでは出さない

初期リリースでは、ユーザーが自分で購入済みレポートを削除して作り直す機能は提供しない。

理由：

- 返金不可商品で無制限作り直しが発生する
- 決済証跡と生成物証跡が分断される
- 追加返書チケットの移管ミスが起きる
- チャージバック時の証拠が消える
- Stripe上の支払いとM55上の提供物の整合性が崩れる

対応はサポート経由とする。

### 7.3 誤入力対応の分類

#### A. レポート未生成・決済前

ユーザーが自由に入力を修正できる。  
金銭処理なし。

#### B. 決済完了・レポート未生成

原則として入力修正可能。  
ただし、決済済み注文IDと修正後入力を紐づけ、生成前の入力変更ログを残す。

#### C. レポート生成済み・返書未使用

サポート判断で旧レポートを `voided_input_error` にし、新レポートを作成できる。  
付属返書と未使用追加返書は、新レポートへ移管可能。

#### D. レポート生成済み・返書一部使用済み

旧レポートを `voided_input_error` にし、新レポートを作成できる。  
未使用チケットのみ移管可能。  
生成済み返書は旧入力に対して提供済みのため、原則として移管・再生成しない。

#### E. 返書全件使用済み

旧レポートを無効化し、新レポートを作成することは可能。  
ただし返書チケットは消費済みとして扱う。  
再付与する場合はM55側重大障害・運用判断・特別補填に限る。

### 7.4 旧レポートの扱い

通常表示：

- `active` のレポートのみ通常の購入済み棚に表示する。

無効化後：

- 旧レポートは通常棚から外す。
- 必要に応じて「入力誤りにより無効化済み」と表示する。
- 比較対象に使うかどうかは、将来UIで選択可能にする。
- 管理者・監査ログ・問い合わせ対応では参照可能にする。

完全削除・匿名化：

- ユーザーの明示的な削除依頼がある場合のみ、法務・プライバシーポリシーに従う。
- ただし、ユーザーの明示的削除依頼・法令・プライバシーポリシーに基づく削除/匿名化は、別途法務SSOTに従う。
- 決済・不正利用・チャージバック対応に必要な最小限の記録は、法務要件に沿って保持する可能性がある。
- 削除対応はサポートケースとして記録する。

---

## 8. 返金・補填・チャージバック方針

### 8.1 原則

ユーザー起因の入力ミスによる返金は原則不可。  
ただし、M55側起因の未提供・二重請求・重大な障害・決済だけ完了して権利が復旧不能な場合は、返金、再付与、手動補填、または再生成の対象とする。

### 8.2 返金不可の対象

原則返金不可：

- ユーザーが生年月日や入力内容を間違えた
- 生成後に内容の好みが合わなかった
- 本質レポートの範囲外相談をしたかった
- 追加返書を購入したが、別レポートに使いたくなった
- 生成済み返書を読んだ後でキャンセルしたくなった

### 8.3 例外対応の対象

返金または補填を検討する：

- 二重請求
- Stripe決済完了後、DBにもStripe台帳にも復元可能な付与記録が作れない
- Webhook障害で長時間権利が反映されず、手動復旧もできない
- M55側バグで他人のレポートに付与された
- M55側バグでチケットが消失した
- M55側バグで返書が保存されなかった
- 商品説明と実提供内容が明確に乖離した

### 8.4 チャージバック対策

以下の証跡を残す。

- 購入前に表示した商品名、価格、返金条件
- ユーザーID
- レポートID
- Checkout Session ID
- Payment Intent ID
- Webhook Event ID
- 権利付与時刻
- 返書送信時刻
- 返書生成完了時刻
- 返書表示・アクセス履歴
- 問い合わせ対応履歴
- 誤入力対応履歴
- サポート判断履歴

---

## 9. 復元・障害対応プレイブック

### 9.1 Webhook重複

症状：
同じStripe eventが複数回来る。

対応：
`stripe_event_ledger.stripe_event_id` のunique制約で2回目以降を `duplicate_ignored` にする。  
チケットは増やさない。

### 9.2 決済完了・DB未反映

症状：
ユーザーは支払い済みだが残数が増えない。

対応：

1. `stripe_orders` を確認
2. `stripe_event_ledger` を確認
3. Stripe Checkout Session / Payment Intent IDを照合
4. metadataの `m55_order_id` と `report_instance_id` を確認
5. 上限未満なら管理者が `support_case_ledger` 経由で1件付与
6. `source_type = admin_adjustment` ではなく、Stripe決済に紐づくなら `stripe_paid` とし、注文IDを保持する

### 9.3 DB付与済み・UI未反映

症状：
DB上は残数あり、フロントだけ表示されない。

対応：

- APIレスポンス確認
- キャッシュ破棄
- PurchaseCache不一致ならDBを正とする
- UI側の派生値を修正

金銭処理は不要。

### 9.4 生成失敗・チケット予約中

症状：
チケットが `reserved` のまま返書が出ない。

対応：

- 生成処理が失敗していれば `available` に戻す。
- 返書本文が保存済みなら `consumed` にする。
- どちらか不明なら `generation_failed_support_required` にして手動確認。

### 9.5 誤入力による作り直し

症状：
購入者が生年月日・名前・入力値の誤りを申告。

対応：

1. サポートケース作成
2. 旧レポート状態を確認
3. 使用済み返書数を確認
4. 未使用チケットを確認
5. 旧レポートを `voided_input_error`
6. 新レポートを作成
7. 未使用チケットのみ移管
8. 旧新レポートの関係を保存
9. ユーザーに返金不可・再作成完了を通知

### 9.6 二重請求

症状：
同一ユーザー・同一レポート・同一商品で短時間に複数決済。

対応：

- Stripe側Payment Intentを照合
- DB上の注文を照合
- 片方だけ未使用なら返金候補
- 既に2件ともチケット付与済みで上限内でも、ユーザー意図と異なる場合はサポート判断
- 重複決済防止としてCheckout作成前に未完了注文を再利用またはブロック

### 9.7 チャージバック発生

対応：

- 該当ユーザー・注文・レポート・返書の証跡をまとめる
- 提供済みコンテンツのアクセスログを確認
- 返金条件表示の証跡を確認
- サポート対応履歴を確認
- Stripe提出用の時系列資料を作成
- 該当注文の今後の追加購入を一時停止するか判断

---

## 10. UI文言

### 10.1 購入ボタン直前

```txt
追加相談返書 1件 500円

この本質レポートに紐づいて、今の相談をもう一度整理できます。
相談返書は、このレポートにつき合計5件まで利用できます。
現在の残り利用可能数：{remaining}件
追加購入可能数：{paid_remaining}件
```

### 10.2 返金不可・入力確認

```txt
購入前に、生年月日・入力内容・対象レポートをご確認ください。
デジタルコンテンツの性質上、生成・提供開始後の返金は原則できません。
入力内容に誤りがあった場合は、返金ではなく、サポートで再作成可否を確認します。
```

### 10.3 Webhook反映待ち

```txt
決済を確認しています。
Stripeでの支払い完了後、相談返書の残数へ反映されます。
画面を閉じても、決済が完了していればサーバー側で確認されます。
数分経っても反映されない場合は、サポートへお問い合わせください。
```

### 10.4 上限到達

```txt
このレポートで利用できる相談返書は上限に達しました。
別のテーマを深く扱う場合は、今後の専用レポートで整理できます。
```

### 10.5 誤入力対応

```txt
購入済みレポートの入力内容は、結果や返書履歴との整合性を守るため、直接上書きできません。
入力内容に誤りがある場合は、サポートで確認し、必要に応じて旧レポートを無効化したうえで再作成します。
返金ではなく、再作成・未使用権利の移管可否を個別に確認します。
```

---

## 11. 実装順序

### Phase 0: SSOT反映

- 本SSOTを `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` に保存
- `追加相談返書チケット_v1.3_SSOT` からリンク
- 古い「3回」表記を全検索
- 「3ヶ月アーカイブ」表記を全検索
- 「他レポートでも利用可能」系表記を全検索
- 実装前に差分確認

### Phase 1: 付属1件E2E

- 既購入本質レポートに付属1件を付与
- 章選択
- 範囲チェック
- チケット予約
- 返書生成
- 保存
- 消費確定
- 再表示
- リロード後再確認

### Phase 2: 台帳DB

- `reply_credit_ledger`
- `reply_requests`
- `reply_responses`
- `stripe_orders`
- `stripe_event_ledger`
- `support_case_ledger`
- RLS / service role境界確認
- API直叩き対策

### Phase 3: Stripe Checkout

- Checkout作成API
- サーバー側precheck
- metadata
- idempotency key
- pending order作成
- success_url反映待ち画面

### Phase 4: Webhook

- 署名検証
- event重複排除
- transaction
- 上限再確認
- チケット付与
- event処理結果保存
- 失敗時support review

### Phase 5: 商品棚UI

- 残数表示
- 追加購入可能数表示
- 上限到達表示
- 章別深掘り導線
- 未反映時の反映待ち
- サポート導線

### Phase 6: 誤入力対応

- サポートケース作成
- 旧レポート無効化
- 新レポート作成
- 未使用チケット移管
- 旧新レポート紐づけ
- 通常棚から旧レポート除外

### Phase 7: E2Eゲート

本番前に以下をPASSしない限りリリース不可。

- 未購入者は返書ルームに入れない
- 他人のreport_instance_idは403
- 別レポートには使えない
- 付属1件を使える
- 付属1件生成失敗時に戻る
- 追加購入で1件増える
- Webhook重複で増えない
- 上限5件で止まる
- 追加購入4件で止まる
- 決済後タブを閉じても反映される
- success_urlだけでは付与されない
- 無効化済みレポートでは購入不可
- 未使用チケットだけ移管できる
- 生成済み返書は勝手に再発行されない
- 返金不可文言が購入前に出る
- Stripe注文ID・Payment Intent・Webhook Event IDが追跡できる
- サポートケースから復旧履歴を追える

---

## 12. 実装禁止事項

以下は禁止。

- 商品棚UIを先に出す
- Webhookなしで本番決済を通す
- success_url到達でチケット付与する
- クライアント側で残数を増やす
- PurchaseCacheを所有状態にする
- グローバルチケット化する
- 他レポートと併用可能にする
- 生成済みレポートを上書き編集する
- ユーザー自由削除で作り直しを開放する
- 法務SSOTに基づく削除/匿名化を除き、旧レポート・旧返書・決済証跡を物理削除する
- Stripe event_id uniqueなしでWebhookを処理する
- 決済・返書生成・チケット消費を1つの曖昧な状態で管理する
- 上限チェックをUIだけに任せる
- 返金不可文言を購入後だけに表示する

---

## 13. 最終判定

このSSOTにより、M55の追加相談返書は以下の形で固定される。

- レポート購入者限定
- 本質レポート1件に紐づく
- 他レポート併用不可
- 合計5件まで
- 付属1件 + 追加購入4件
- 1件500円
- DBが唯一のSSOT
- Webhook正式反映まで権利付与しない
- 生成失敗時はチケットを戻す
- 誤入力時は返金ではなく、無効化・再作成・未使用権利移管で対応
- M55側起因の未提供・二重請求・復旧不能障害は補填または返金検討対象
- 旧データは比較資産・監査証跡として保持
- 明示的削除依頼・法令・プライバシーポリシーに基づく削除/匿名化は、別途法務SSOTに従う

Implementation GO condition:

```txt
DB ledger designed
+ included reply E2E passed
+ Stripe webhook idempotency passed
+ recovery playbooks passed
+ old 3回/3ヶ月 wording removed
+ refund/input correction policy displayed before purchase
= additional paid reply shelf may be implemented
```


---

## 14. Cursor実装前ハンドオフ

このSSOTをCursorへ渡す場合、最初の作業は実装ではなく、正本保存と旧文言撤去である。

保存先：

```txt
docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md
```

最初に実行する監査：

```txt
3回
3ヶ月
アーカイブ
期限付き保存版
保存版本文
無期限
追加できます
他レポート
グローバルチケット
success_url
PurchaseCache
```

上記の旧仕様・危険語がUI文言、返書文言、商品棚文言、SSOT、テスト、コメントに残っている場合、実装前に修正する。

実装GO条件は、以下すべてがPASSした場合のみとする。

```txt
SSOT saved
+ old wording removed
+ included reply E2E passed
+ DB ledger designed
+ Stripe checkout metadata designed
+ Stripe webhook idempotency passed
+ recovery playbooks passed
+ refund/input correction policy displayed before purchase
= additional paid reply shelf may be implemented
```
