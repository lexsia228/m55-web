# 必須スクリーンショット

`npm run test:e2e:visual` 実行で `e2e/home-core-visual.spec.ts` がここへ PNG を出力します。

| ファイル | 状態 |
|----------|------|
| `01-home-before-profile.png` | `/home` 鑑定前 |
| `02-home-after-profile.png` | `/home` 鑑定後（個人結果なし） |
| `03-core-locked.png` | `/core` 未保存・ロックカード |
| `04-analyzing-overlay.png` | 「保存して開く」直後の解析中 |
| `05-core-after-save.png` | `/core` 保存後・先頭 |

手動手順・確認観点: `docs/visual-regression/HOME_CORE_REQUIRED_SCREENSHOTS.md`
