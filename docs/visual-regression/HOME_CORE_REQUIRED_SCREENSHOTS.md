# Home / Core 必須スクリーンショット確認

完了前に、次の **5 枚**を必ず確認してください（Playwright または手動）。

## 自動取得（Playwright）

1. 初回のみ: `npm run test:e2e:install` または `npx playwright install chromium`
2. 実行: `npm run test:e2e:visual`  
   既に `next dev` 起動済みの場合:  
   `PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e:visual`（Windows PowerShell: `$env:PLAYWRIGHT_SKIP_WEBSERVER="1"`）
3. 出力: `e2e/screenshots/required/*.png`

> ゲストの localStorage のみ使用（Clerk ログイン不要）。

> **Git**: `e2e/screenshots/required/*.png` は既定で `.gitignore` です。共有時はルールを調整するか `git add -f` で追加。

## 必須 5 状態と確認観点

| # | ファイル | 状態 | 確認観点 |
|---|----------|------|----------|
| 1 | `01-home-before-profile.png` | `/home` 鑑定前 | ヒーロー・無料/有料3行・探索・5軸教育・Entry Report が揃っているか |
| 2 | `02-home-after-profile.png` | `/home` 鑑定後 | 上記価値提示が**残っている**か。`今の焦点`・`今日`・`今週`・個人5軸リング・要約カードが**出ていない**か |
| 3 | `03-core-locked.png` | `/core` 未保存 | 常時入力フォームが**ない**か。短い案内＋主CTA「プロフィールを保存して開く」＋副CTA「マイページで入力・保存する」のみか（入力は Home と同じ `BirthProfileIntakeLayer` をボタンで開く） |
| 4 | `04-analyzing-overlay.png` | 解析中 | 円環/軌道の**静かな**解析感。3文言が読めるか。単一スピナーのみになっていないか |
| 5 | `05-core-after-save.png` | `/core` 保存後先頭 | 凍結候補の本質ページ（ヒーロー〜先頭セクション）が維持されているか |

## 手動撮影ポイント

1. **鑑定前の Home**: Local Storage クリア → `/home` → フルページ。
2. **鑑定後の Home**: プロフィール保存済み → `/home` → フルページ（個人ブロックが無いこと）。
3. **`/core` 未保存**: ストレージクリア → `/core` → 案内＋CTA のみ。主CTAでモーダルが開き Home と同じ保存 UI になること（SoulBirthGate が勝手に被さっていないこと）。
4. **解析中**: Home から「保存して開く」直後。
5. **`/core` 保存後**: 上記フロー完了後、または保存済みで `/core`。

## 合格ライン（チェックリスト）

- [ ] Home の既存価値提示が鑑定前後で欠けていない
- [ ] Home に個人結果（焦点・今日・今週・個人5軸展開・要約カード）が**一切**出ていない
- [ ] 解析中オーバーレイが上品で、約3秒後に `/core` に遷移する
- [ ] `/core` 未保存は案内＋CTA のみ（常時フォームなし。保存 UI は Home と共通モーダル）
- [ ] `/core` 保存後は凍結候補 UI のまま
