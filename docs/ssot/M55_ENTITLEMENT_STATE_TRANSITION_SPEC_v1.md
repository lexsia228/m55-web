\# M55 状態遷移図と Entitlement 仕様 v1



\## 1. 目的



無料 core、本質の読み解き、相談返書、追加返書を、UI ではなくサーバー側の権利状態で一貫して管理する。  

表示は常に権利状態の結果であり、権利そのものの真実は DB 側に置く。  

本仕様は、返書権利の付与、消費、保存、再閲覧、追加購入を矛盾なく実装するための SSOT である。



\---



\## 2. 権利の原則



\- core 閲覧権と paid 権利は分離する。

\- `本質の読み解き` の購入で、初回返書 1 本を含む。

\- 追加返書はチケットで管理する。

\- 残数の減算はサーバー側のみで行う。

\- UI は残数を表示するだけで、減算判定をしてはならない。

\- 保存済み返書の再閲覧は、消費済み返書であっても常に可能とする。

\- 返書消費は「生成成功し、保存成功したとき」にのみ成立する。

\- Entitlement と Wallet の変更は、必ず監査可能でなければならない。



\---



\## 3. 不変条件（Invariants）



以下は常に満たされなければならない。



\- `consumed\_count` は 0 未満にならない。

\- `initial\_included\_count` は 0 以上。

\- `purchased\_count` は 0 以上。

\- `available\_count` は負になってはならない。

\- `available\_count = initial\_included\_count + purchased\_count - consumed\_count`

\- 同一 `ReplySession` は二重消費されてはならない。

\- 同一 `ReplyDocument` は一度保存されたら不変とする。

\- Entitlement が無効な状態で返書生成を開始してはならない。

\- UI 表示と DB 状態が不整合な場合、DB 状態を正本とする。



注記:  

`available\_count` は導出値を正とする。DB に保存する場合も、真実は  

`initial\_included\_count + purchased\_count - consumed\_count`  

であり、必要に応じて再計算・再同期できるものとする。



\---



\## 4. エンティティ



最低限必要な権利系エンティティは以下とする。



\### 4.1 AccessEntitlement

ユーザーが何にアクセスできるかを表す。



最低項目:

\- `user\_id`

\- `can\_view\_core`

\- `can\_view\_paid\_reading`

\- `can\_generate\_reply`

\- `status`

\- `granted\_at`

\- `updated\_at`



例:

\- core閲覧

\- 本質の読み解き閲覧

\- 返書生成可否



\### 4.2 ReplyTicketWallet

返書チケット残数の真実。



最低項目:

\- `user\_id`

\- `initial\_included\_count`

\- `purchased\_count`

\- `consumed\_count`

\- `available\_count`（導出値または再計算可能な値）

\- `status`

\- `updated\_at`



\### 4.3 ReplySession

1回の返書生成要求。



最低項目:

\- `id`

\- `user\_id`

\- `theme`

\- `input\_mode`

\- `selected\_subquestions`

\- `free\_text`

\- `status`

\- `idempotency\_key`

\- `created\_at`

\- `updated\_at`



\### 4.4 ReplyDocument

生成された返書本体。



最低項目:

\- `id`

\- `reply\_session\_id`

\- `user\_id`

\- `theme`

\- `version`

\- `payload\_json`

\- `created\_at`



\### 4.5 WalletLedger

Wallet 変動の監査台帳。  

実装上は required とする。



最低項目:

\- `id`

\- `user\_id`

\- `wallet\_id`

\- `delta`

\- `balance\_after`

\- `event\_type`

\- `source\_of\_grant`

\- `reply\_session\_id`（該当時）

\- `created\_at`



目的:

\- 加算 / 減算の出所を追跡する

\- 返金 / 補填 / 調整 / 障害復旧の監査を可能にする



\---



\## 5. 状態一覧



ユーザー状態の read model は、少なくとも次を持つ。



\### `FREE\_CORE\_ONLY`

無料 core のみ閲覧可能。返書生成不可。



\### `PAID\_READING\_UNLOCKED`

本質の読み解き閲覧可能。初回返書未使用。



\### `PAID\_READING\_WITH\_REPLY\_AVAILABLE`

本質の読み解き閲覧可能。返書残数あり。



\### `REPLY\_GENERATING`

返書生成中。



\### `REPLY\_AVAILABLE\_TO\_VIEW`

生成済み返書あり。再閲覧可能。



\### `REPLY\_TICKETS\_EXHAUSTED`

返書残数なし。追加購入待ち。



\### `ACCESS\_SUSPENDED`

何らかの整合不良または制限状態。通常運用では例外。



\---



\## 6. 状態遷移



基本遷移は以下とする。



\### `FREE\_CORE\_ONLY` → `PAID\_READING\_UNLOCKED`

条件:

\- 本質の読み解き購入成功

\- entitlement 付与成功



\### `PAID\_READING\_UNLOCKED` → `PAID\_READING\_WITH\_REPLY\_AVAILABLE`

条件:

\- 初回返書 1 本を wallet に反映



\### `PAID\_READING\_WITH\_REPLY\_AVAILABLE` → `REPLY\_GENERATING`

条件:

\- theme 選択

\- 入力完了

\- wallet 残数 > 0

\- 生成要求受理



\### `REPLY\_GENERATING` → `REPLY\_AVAILABLE\_TO\_VIEW`

条件:

\- 返書生成成功

\- ReplyDocument 保存成功

\- wallet 減算成功



\### `REPLY\_AVAILABLE\_TO\_VIEW` → `PAID\_READING\_WITH\_REPLY\_AVAILABLE`

条件:

\- 残数がまだある



\### `REPLY\_AVAILABLE\_TO\_VIEW` → `REPLY\_TICKETS\_EXHAUSTED`

条件:

\- 残数が 0



\### `REPLY\_TICKETS\_EXHAUSTED` → `PAID\_READING\_WITH\_REPLY\_AVAILABLE`

条件:

\- 追加返書購入成功

\- wallet 加算成功



\### 任意状態 → `ACCESS\_SUSPENDED`

条件例:

\- wallet 残数と ledger が不整合

\- 同一 session に対して複数 document が存在

\- entitlement と purchase state が論理矛盾

\- 障害復旧中または運営制御



\---



\## 7. 消費ルール



\- 消費タイミング: 返書は「生成成功時」にのみ 1 本消費する。

\- 非消費のケース: 入力途中、テーマ選択途中、生成失敗、タイムアウト、API 障害で保存失敗した場合には消費しない。

\- 二重送信防止: `ReplySession` ごとに `idempotency\_key` を持ち、同じ session の再実行で二重消費されることを防ぐ。

\- アトミック性の保証: `POST /api/reply/generate` における「ReplyTicketWallet の減算」と「ReplyDocument の保存」は、必ず同一のデータベーストランザクション内で実行されなければならない。

\- 排他制御: 同一ユーザーによる並列リクエストでの二重消費を防ぐため、処理開始時に ReplyTicketWallet レコードに対して適切な行ロック（`SELECT FOR UPDATE` 等）をかけるか、Idempotency Key による厳格なガードを行うこと。

\- 部分成功禁止: document 保存だけ成功し wallet 減算だけ失敗、またはその逆を許可してはならない。

\- 再試行安全性: 同一 `idempotency\_key` に対しては、成功済み結果を再返却するか、冪等に失敗を返すこと。



\---



\## 8. 初回同梱返書



`本質の読み解き` に同梱される初回返書 1 本は、追加券と同じ wallet に入れて管理する。  

ただし、区別できるよう以下は分ける。



\- `initial\_included\_count`

\- `purchased\_count`



UI 上は  

`残り返書 5本`  

のように見せてもよいが、DB 上は内訳を保持する。



\---



\## 9. 追加返書チケット



\- 追加返書は wallet に加算される。

\- 返書テーマごとに別財布にする必要はまだない。

\- まずは共通 wallet でよい。

\- テーマ制限は session 作成時に行い、消費は共通 wallet から行う。

\- 後日テーマ別制限を導入する場合でも、wallet の source of truth は共通財布のままとする。



\---



\## 10. 返書生成の入力制約



ここで文字数制約はまだ主戦場ではないが、SSOT 制約として保持する。  

現段階では schema に少なくとも以下を持たせる。



\- `theme`

\- `input\_mode`

\- `selected\_subquestions`

\- `free\_text`



文字数や補助質問数の厳密値は、既存の文字数SSOT・入力制約SSOTに従い、次の JSON schema と prompt 設計で投入する。



\---



\## 11. UI 表示ルール



UI は権利の結果だけを見る。



\### 無料状態

\- `本質の読み解き` CTA を表示

\- 返書ボタンは disabled またはフェンス



\### paid だが返書未使用

\- `初回返書を使う` を表示



\### 残数あり

\- `返書チケット残り N 本` を表示



\### 残数なし

\- `追加返書を購入` を表示



\### 保存済み返書あり

\- `過去の返書を見る` を表示



UI は wallet を直接更新してはならない。  

表示は必ずサーバー返却値に従う。



\---



\## 12. API の責務



\### `GET /api/reply/wallet`

残数と状態を返す read API



\### `POST /api/reply/generate`

以下を行う command API:

\- 生成可否判定

\- session 作成または再利用

\- 返書生成実行

\- document 保存

\- wallet 消費

\- ledger 記録

\- 最終状態返却



\### `GET /api/reply/history`

保存済み返書一覧



\### `GET /api/reply/{id}`

返書詳細



\---



\## 13. `POST /api/reply/generate` の処理順



`POST /api/reply/generate` は少なくとも次の順序を守る。



1\. entitlement / wallet / session 重複可否を事前確認  

2\. `idempotency\_key` の重複を確認  

3\. ReplySession を作成または再利用  

4\. 返書生成を実行  

5\. DB transaction を開始  

6\. ReplyTicketWallet に対して行ロックを取得  

7\. entitlement / wallet 残数 / session 状態を再確認  

8\. ReplyDocument を保存  

9\. wallet を減算  

10\. WalletLedger を記録  

11\. ReplySession を完了状態に更新  

12\. transaction を commit  

13\. 最終結果を返却



失敗時:

\- commit 前に失敗した場合、wallet 減算は成立してはならない

\- document 保存失敗時は consume 不成立

\- wallet 減算失敗時は document 保存もロールバック

\- retry は `idempotency\_key` 単位で扱う


\---



\## 14. 監査ログ



最低限ログに残すべきものは以下とする。



\- entitlement 付与

\- wallet 加算 / 減算（`source\_of\_grant` を含む）

\- reply generate 要求 / 成功 / 失敗

\- document 保存成功 / 失敗



付与ソースの記録 (`source\_of\_grant`):

ReplyTicketWallet および AccessEntitlement の各変更ログには、必ず `source\_of\_grant` を記録する。



`source\_of\_grant` の許可値:

\- `PURCHASE`: 実決済による付与

\- `INCLUDED`: `本質の読み解き` 同梱分

\- `RECOVERY`: 障害復旧・補填による手動付与

\- `ADMIN\_ADJUST`: 運営による調整



これにより、返金処理やトラブルシューティング時の「権利の出所」を追跡可能にする。



\---



\## 15. 整合性チェックと復旧



最低限、以下の整合性チェックを持つ。



\- `available\_count` と導出値の一致

\- ReplyDocument と wallet 消費件数の整合

\- 同一 session の複数消費がないこと

\- ledger と wallet 残高の一致



不整合が見つかった場合:

\- `ACCESS\_SUSPENDED` に遷移可能

\- `RECOVERY` または `ADMIN\_ADJUST` で補正可能

\- 補正は必ず ledger と audit log に残す



\---



\## 16. ここでまだ確定しないもの



\- 価格表示の最終 UI

\- 追加券バンドルの見せ方

\- 文字数制約の prompt 反映

\- テーマ数の最終固定

\- 追加券の販売棚

\- 返書チケットの商品名の最終文言



これらは別 SSOT で管理し、本仕様では権利・消費・整合性の骨格のみを固定する。

