# M55 Implementation Pre-Instruction Skeleton v0.1

> **位置づけ:** 本書は **実装前レビュー統合成果物（骨子）** です。  
> **実装指示ではありません。** 本書単体を理由にコード・DB・API・決済・認証・webhook・prompt の変更を行ってはなりません。

## 0. 文書メタ

| 項目 | 内容 |
|------|------|
| 版 | v0.1（骨子） |
| 種別 | docs/review 統合レビュー成果物 |
| 統合元（参照のみ・本作成では未改変） | `M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md` / `M55_FINAL_HUMAN_COPY_REVIEW_PACKET_v1.md` / `M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` |
| SSOT 本体への反映 | **未実施**（反映先候補のみ列挙） |
| 次アクション | 人間レビュー印の確定 → SSOT反映 planning → 最小実装 → visual 確認 |

---

## 1. この文書は実装指示ではない

- 本書は、Storyflow 人間レビュー・§14 参考技術採否・Anti-sycophancy 安全方針・My page 機能 UI 方針・後回し項目・実装禁止事項・確認条件を **1 か所に集約した実装前の合意メモ** である。
- 商品仕様（価格・上限・権利付与）を変更する文書ではない。
- engine / snapshot / result-label を変える根拠にはしない。
- **追加返書購入の UI 方針** は記載してよいが、Stripe checkout・価格 ID・webhook・wallet ledger・entitlement 付与処理は **本書のスコープ外かつ変更禁止** とする。

---

## 2. Product truth 固定事項

以下はレビュー・コピー調整・将来実装のいずれでも **維持する不変前提** とする。

| 区分 | 固定値 |
|------|--------|
| 主名称 | **本質の読み解き** |
| 有料保存レポート | **保存版** |
| レポート構成 | **4章**（Ⅰ 輪郭を見る / Ⅱ 構造を読む / Ⅲ 無理を知る / Ⅳ 楽に扱う） |
| 相談機能主名称 | **相談返書** |
| 付属回数 | **付属1** |
| 追加回数 | **追加最大4** |
| 合計上限 | **合計5**（レポート単位） |
| 追加料金 | **500円** / 件 |
| プロフィール | 保存版は **購入時点** のプロフィールに基づく |
| 相談の紐づき | **購入済み保存版に紐づく** 相談（汎用チャットではない） |
| 禁止約束 | 汎用チャット化 / 無制限相談 / なんでも答える / 通知・メール約束 / 医療・治療的約束 |
| 技術不変 | 本パケット群では **engine / snapshot / result-label を変更しない** |

**旧真実への逆戻り禁止（例）:** max3、700円、返書チケット主名称（visible UI）、Entry Report 主ラベル（`/my` active UI）など。

---

## 3. 全体トーン方針

### 3.1 目指す読み心地

- **あたたかいが、甘やかしすぎない**
- **日常・人間関係の語彙** で着地する（仕事/キャリアをデフォルト軸にしない）
- **非断定・非運命** — 構造と傾向の説明に留める
- **小さな安心と小さな一手** で各シーンを閉じる
- **説明過多・販売口調・汎用アドバイス調** を避ける

### 3.2 強弱の順序（画面共通）

1. 短いフック（お題）
2. 具体的な日常場面（あるある）
3. 非責めの転換
4. M55 の読み解き
5. 小さな一手

### 3.3 画面リズム

- **1画面 = 1シーン**（1画面で全部を説明しない）
- **1見出し = 1トピック**
- **1ブロックは短く:** 見出し 1行 / 本文 2〜3行 / 次の一手 1行

### 3.4 人間レビューで見る懸念フラグ

`冷たい` / `抽象的` / `営業っぽい` / `決めつけが強い` / `説明が長い` / `動画っぽくない`

---

## 4. Storyflow 構造

### 4.1 M55 版 起承転結

| 段 | 役割 |
|----|------|
| 起 | お題 |
| 承 | あるある |
| 転 | 転換（非責め再定義） |
| 結 | 読み解き → 次の一手 |

### 4.2 フロー別レビュー領域（Storyflow パケット準拠）

| ID帯 | 領域 | 主な対象ファイル |
|------|------|------------------|
| A | Free/core → paid bridge | `app/dtr/core/page.tsx`, `lib/m55/dtrReportBridgeCopy.ts` |
| B | LP / 商品説明 | `app/dtr/lp/page.tsx`, `lib/m55/paidDtrProductCopy.ts` |
| C | Paid DTR reader / 保存版 | `components/dtr/DtrFullReader.tsx` |
| D | 相談返書ルーム | `components/dtr/ConsultRoom.tsx`, `components/reply/*`, `lib/m55/paidDtrProductCopy.ts` |
| E | My page | `components/my/MyPanel.tsx`, `components/dtr/DtrCatalogStrip.tsx`, `lib/m55/dtrProductCatalog.ts`, `lib/m55/dtrProductLabels.ts` |

### 4.3 Storyflow 禁止構図

- 長い平坦な説明ブロック
- 仕事/キャリアをデフォルト軸にする構図
- 汎用アドバイス調・運命断定・医療/治療の約束
- 汎用チャット約束・無制限相談・通知メール約束

---

## 5. 採用する変換ルール

### 5.1 Before → After の型（例）

| Before 傾向 | After 方向 |
|-------------|------------|
| 抽象・構造語のみ | 日常場面 + 「どこで無理がたまるか」 |
| 仕事・役割語優位 | 近い人・距離・疲れ・回復 |
| 取扱説明書調 | 起承転結の短いシーン |
| 数字の冷たい列挙 | purpose → 付属1 → 追加最大4 → 合計5 → 500円 の順 |

### 5.2 人間マーキング → 実装判断（将来）

| マーク | 扱いの目安 |
|--------|------------|
| OK | 維持 |
| 柔らかくする / もっと人間関係へ | 語彙・比喩のソフト化（真実は不変） |
| 削る / 説明が長い | ブロック分割または削除候補 |
| 流れが悪い / お題が弱い / あるある不足 / 転換弱 / 次の一手弱 | Storyflow 再構成候補 |
| 仕事っぽい | 生活語へ置換候補 |

---

## 6. ユーモア運用ルール

> Storyflow パケットに独立節はないが、M55 トーン整合のため **運用ルールとして採用** する。

### 6.1 許容する「軽さ」

- **共感の一言**（「そうそう」が自然に出る短いあるある）
- **日常比喩**（近い人とのやりとり、夜にしんどさが戻る、など）
- **負荷を下げる言い回し**（1つだけ / 1行だけ / 今の場面だけ）

### 6.2 使わないユーモア

- 皮肉・煽り・販売ギャグ（ワンコイン等）
- ユーザーを笑わせることが目的の冗談
- 相手や第三者を貶めるユーモア
- 深刻な関係悩みを軽く扱いすぎる茶化し

### 6.3 境界

- ユーモアは **安心の補助** であり、**商品約束の代替ではない**
- 返書・ルーム intro では、ユーモアより **境界の明確さ** を優先する

---

## 7. §14 採用技術（参考例から吸収）

> 出典: Storyflow パケット §14。レビュー補助であり **単独では実装根拠にしない**。

### 7.1 採用する技術

| # | 技法 | 使い方 |
|---|------|--------|
| 1 | **Not A, But B** | 先に責めを外す → その後に構造を説明 |
| 2 | **数字のフレーミング** | purpose → 付属1 → 追加最大4 → 合計5 → 追加500円 の順（冷たい仕様列挙にしない） |
| 3 | **マイクロ・コミットメント** | 1つだけ / 1行だけ / 今の場面だけ / 近いものを選ぶ |

### 7.2 弱める表現（トーン調整候補）

- 重すぎる心理描写
- 救済感が強すぎる表現
- 依存感が出る表現
- 販売口語が軽すぎる表現

### 7.3 SF-D（相談返書ルーム）への反映メモ（レビュー候補）

- room intro / use-case chips / helper questions / send note / cap・remaining  
- 各ブロックに起承転結を当て、**保存版に紐づく相談**・**合計5・500円** を平易に伝える

---

## 8. Anti-sycophancy 方針

> 出典: `M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md`（安全監査メモ。実装指示ではない）

### 8.1 守る姿勢

- 感情は受け止める。**ただし正誤判定はしない**
- ユーザーを常に正しいとは扱わない
- 相手を悪者にしない
- 保存版の該当章へ接続する
- 対立/関係テーマでは、**相手側または状況側の見え方を最低1つ** 置く
- ずれは **言葉・距離・タイミング・疲労・期待** で整理する
- 最後は **小さな一手**（1つ / 1行 / 今の場面）

### 8.2 禁止する返書の型

- 「あなたは悪くない」で終わる
- 「相手が悪い」と断定する
- 別れろ/辞めろ/絶対距離を置け等の絶対助言
- 医療/治療/法律/投資判断の代替
- 汎用チャット化・なんでも答える含意・無制限相談含意・通知/メール約束
- 自己正当化だけを綺麗に補強する返書

### 8.3 推奨返書構造（5段）

1. 受け止め（正しいとは言わない）
2. 保存版との接続（4章のどこか）
3. 別視点（非断罪）
4. ずれの整理（言葉/距離/タイミング/疲労/期待）
5. 小さな一手

### 8.4 将来 prompt/code 反映時の前提

- 監査メモを先にレビュー → implementation planning → **最小差分**
- 触ってよい候補（将来・別ゲート）: `m55AiSafetyPolicy.ts`, reply generate 系 prompt、UI 境界文言  
- **触らない（本骨子時点）:** DB / API / payment / auth / env / webhook

---

## 9. My page 方針

### 9.1 目的

- 不安を増やさず **「次に何をすればいいか」** を明確にする
- 購入時プロフィール注記を **やさしく** 伝える
- 保存版再開と状態確認の **ハブ** として機能させる

### 9.2 Storyflow 候補（レビュー用）

| ID | テーマ | 次の一手の例 |
|----|--------|--------------|
| SF-E-001 | 保存版はここから再開 | まず「開く/準備中」表示だけ確認 |
| SF-E-002 | 購入時点プロフィール固定 | 必要なら新状態は次回保存版で |
| SF-E-003 | 相談返書ルーム CTA | 気になる1場面だけ持ってルームを開く |

### 9.3 ラベル・表示ルール

- **`/my` では Entry Report を主ラベルに戻さない**
- レポート棚・CTA は **保存版 / 相談返書** の現行商品語彙に統一
- サポート・法務導線は過不足なく（煽らない）

### 9.4 追加返書購入 UI（方針のみ）

- **記載可:** 残数・上限・追加購入の説明コピー、CTA ラベル、安心のフレーミング（§14 数字順）
- **変更不可（本骨子）:** Stripe Checkout 実装、価格 ID、webhook、wallet ledger、entitlement 付与、DB 上限ロジック

---

## 10. 相談返書ルーム方針

### 10.1 体験目標

- **あたたかさと安全境界の両立**
- 保存版の続きとして読める（汎用チャット誤認を起こさない）
- Anti-sycophancy 構造を返書品質に反映（将来・別ゲート）

### 10.2 UI ブロック別（Storyflow + §14）

| ブロック | お題の方向 | 必ず伝える真実 |
|----------|------------|----------------|
| room intro | 引っかかりを保存版文脈で整理 | 保存版に紐づく相談 |
| use-case chips | 近いテーマを1つ選ぶ | 論点を狭める補助 |
| helper questions | 今の場面だけ | 4章と生活場面のガイド |
| send note / cap | 境界を先に共有 | 付属1 + 追加最大4 = 合計5、追加500円 |
| wallet / remaining | 安心の順で回数 | 制限の印象ではなく目安 |

### 10.3 入力・行動（既存 product 制約の再確認）

- テーマは **1つ**、自由入力は **短く1件から** 推奨
- 保存版に沿わない相談・医療/法律/投資・緊急対応の約束はしない
- visible で旧「返書チケット」主名称を出さない

---

## 11. 採用しない表現

### 11.1 語彙リスト（Storyflow §14）

カルテ / メンタル / 心の反応 / 胸の奥が苦しい / 心の避難所 / フラッシュバック / 私たちに預けて / きっと見つかる / 傷つかないため / ワンコイン

### 11.2 構文・約束

- 運命断定・成功/最適/おすすめ系の最適化語
- 無制限・なんでも・即答・通知/メール
- スコア・%・ランキング・バッジ・未読（M55 全体 Hard Rule 準拠）
- 占い/鑑定/運勢等（公開面禁止語彙 — 既存 POST_REVIEW SSOT 参照）

### 11.3 返書（Anti-sycophancy）

- 無条件肯定で終わる文
- 相手断罪・絶対行動指示
- 自己正当化の補強のみ

---

## 12. 実装対象画面候補

> **候補** である。人間レビュー印と SSOT planning 完了まで着手しない。

| 優先 | 画面/flow | 主ファイル | 主な作業種別 |
|------|-----------|------------|--------------|
| P1 | Free/core → paid bridge | `app/dtr/core/page.tsx`, `lib/m55/dtrReportBridgeCopy.ts` | コピー・Storyflow |
| P1 | LP / 商品説明 | `app/dtr/lp/page.tsx`, `lib/m55/paidDtrProductCopy.ts` | コピー・導線文言 |
| P1 | 保存版 reader | `components/dtr/DtrFullReader.tsx` | 章見出し・導入・生活語 |
| P1 | 相談返書ルーム | `ConsultRoom.tsx`, `ConsultationRoomInput.tsx`, `consultation-ticket-wallet.tsx` | intro・chips・cap 文言 |
| P1 | My page | `MyPanel.tsx`, `DtrCatalogStrip.tsx`, catalog/labels | 再開・注記・CTA |
| P2 | 語尾・リズム全体 | 複数画面 | スタイル polish（別波） |
| defer | public Entry Report 整合 | `/how-m55-works`, `/support`, `/purchase/success` 等 | `/my` 外・別実装波 |

**凍結・触らない候補（明示例外なし）:**

- `/home/**`, `components/home/**`（Home No-Touch Rule）
- `/core` ポスターヒーロー（Core Hero Freeze）
- ストアフロント凍結ページ: `/`, `/dtr/lp`（ユーザー指示・SSOT による例外時のみ）
- `html/body` 背景・ページ全体グラデーション（Background NoTouch）

---

## 13. 変更禁止範囲

| カテゴリ | 禁止内容 |
|----------|----------|
| インフラ・決済 | Stripe checkout / 価格 ID / webhook / wallet ledger / entitlement 付与 |
| データ・API | DB スキーマ、RPC、権利判定ロジック、`/api/me/entitlements` キャッシュ方針 |
| 認証 | Clerk 設定・session 契約 |
| エンジン | engine / snapshot / result-label 正規化 |
| 外部連携 | Supabase 本番設定、メール/通知アーキテクチャ |
| 凍結 UI | `/home`、core ポスターヒーロー、Background NoTouch |
| プロトタイプ隔離 | `/prototype` 以外への header 注入、公開 storefront の無断変更 |
| この文書 | 本書単体を理由にした実装着手 |

---

## 14. 採用コピーの扱い

1. Storyflow パケット内の **SF-* 候補文** は **review candidate** であり、確定文案ではない。
2. 人間マークが **OK** になった項目のみ、SSOT または copy モジュールへの転記候補とする。
3. 転記時も Product truth（§2）を変更しない。
4. §14 技法は **文体ガイド** として適用し、数値・上限・価格の意味を変えない。
5. Anti-sycophancy は **返書品質・prompt 方針** に分離して反映（UI コピーと混同しない）。

---

## 15. 確認条件（実装着手前）

- [ ] Storyflow パケットで対象 SF-* に人間印（OK / 修正指示）が付いている
- [ ] Product truth（§2）に矛盾する文案が残っていない
- [ ] 採用しない表現（§11）スキャン方針が合意されている
- [ ] Anti-sycophancy 監査メモがレビュー済み（返書 scope）
- [ ] 実装対象が §12 の候補に限定されている
- [ ] `/home`・core ヒーロー・storefront 凍結への抵触がない
- [ ] SSOT 反映 planning が完了している（§17 候補から選定）
- [ ] **明示的な実装 GO**（本書以外のゲート含む）がある

---

## 16. 実装後 visual 確認条件

### 16.1 コピー・トーン

- [ ] 各画面で **1画面1シーン** が保たれ、長文平坦ブロックがない
- [ ] 仕事語がデフォルト軸になっていない（生活・距離・疲れへ着地）
- [ ] 保存版・相談返書・合計5・500円・購入時プロフィールが **visible で正しい**
- [ ] 旧ラベル（Entry Report 主表示、`/my`）、返書チケット主名称が **出ていない**
- [ ] 禁止語彙・§11 リストが **HTML 上にない**

### 16.2 M55 Hard Rules

- [ ] Background NoTouch（ページ背景未変更）
- [ ] 通知 UI なし（bell / badge / unread / カウンタ）
- [ ] スコア・%・ランキングなし
- [ ] 無限ループアニメなし / `prefers-reduced-motion` 尊重
- [ ] A-plan ルーティング破壊なし（Tarot/DTR quiet-disabled）

### 16.3 相談返書ルーム（該当時）

- [ ] intro・chips・send note・残数表示が Storyflow + §14 順序で読める
- [ ] 汎用チャットに見えない
- [ ] 追加購入 UI は **表示のみ** 変更で、決済フローが意図せず変わっていない

### 16.4 回帰

- [ ] 購入・再開・ルーム遷移の **既存動作** が壊れていない（手動 smoke）
- [ ] entitlements は引き続き non-cacheable / Fail-Closed

---

## 17. SSOT 反映先候補（未反映）

> **docs/ssot 本体には v0.1 時点で反映しない。**  planning 時に選定する。

| 候補 SSOT | 反映しうる内容 |
|-----------|----------------|
| `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | 商品語彙・章名・相談返書境界 |
| `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` | 回数・価格・権利（真実の正本 — コピーは追従のみ） |
| `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md` | 1000/500 レーン分離（変更ではなく整合確認） |
| `docs/ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md` | 公開面禁止語・段階移行（storefront 触る場合） |
| 新規: Anti-sycophancy 方針節 | 監査メモ §4–§6 の抜粋 |
| 新規: Storyflow / コピー実装チェックリスト | §15–§16 の operational 化 |

---

## 18. 後回し項目

- `/my` 以外 public route の Entry Report 表記整合
- optional `/reply` standalone wallet の追加目視
- 仕事/キャリア寄り語彙の段階的ソフト化（P2）
- comments/docs/compat の旧ラベル（active UI でなければ非ブロッカー）
- 内部「返書チケット」命名（visible でなければ非ブロッカー）
- v0 / visual storytelling の後続
- snapshot v2 / legacy inventory
- engine audit trail
- notification / email architecture
- result-label 正規化（本パケット群の対象外）

---

## 19. 実装禁止事項

1. 本書 **単体** を実装 GO とみなすこと
2. Product truth（価格・上限・付属/追加回数）の変更
3. engine / snapshot / result-label の変更
4. DB / API / payment / auth / webhook / env の変更
5. Stripe / Clerk / Supabase 設定変更
6. prompt の無審査一括差し替え
7. `/home`・core ポスターヒーロー・Background NoTouch の抵触変更
8. ストアフロント凍結ページの無断変更（`/` `/dtr/lp` `/support` `/legal/*`）
9. 通知・バッジ・スコア・%・ランキング UI の追加
10. 無限アニメーションの追加
11. URL による prototype コンテキスト注入
12. entitlements のクライアント権威化・キャッシュ化
13. 追加返書の **決済・ledger・webhook** を UI コピー作業に巻き込むこと

---

## 20. 次工程

```text
[現在] docs/review 統合骨子 v0.1（本書）
    ↓
人間: Storyflow / v1 パケットへ印付け確定
    ↓
SSOT 反映 planning（§17 から選定・差分設計のみ）
    ↓
明示 GO 後: 画面ごと最小コピー実装（§12 候補・§13 禁止遵守）
    ↓
visual / smoke 確認（§16）
    ↓
必要なら Anti-sycophancy → prompt 最小差分（別 PR・別ゲート）
```

---

## Appendix A. 参照ドキュメント（改変なし）

| 文書 | 役割 |
|------|------|
| `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md` | Storyflow・§14・画面別候補 |
| `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_v1.md` | 監査型・リスク inventory |
| `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` | 返書安全・推奨構造 |

## Appendix B. 変更履歴

| 版 | 日付 | 内容 |
|----|------|------|
| v0.1 | 2026-05-29 | 初版骨子。review 3件統合。SSOT/コード未反映 |
