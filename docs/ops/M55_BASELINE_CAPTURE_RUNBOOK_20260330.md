# M55 Baseline Capture Runbook — 20260330

**誰向け:** リポジトリオーナー（エンジニアでなくても、順に実行できるように書いています）  
**何のため:** 2026-03-30 baseline のコミットを、**あとから同じ状態に戻せる「保存点」**にするための**作業手順書**です。

**セットで使うもの**

- チェックリスト（何を揃えたか確認用）: [M55_RECOVERY_BUNDLE_CHECKLIST_20260330.md](./M55_RECOVERY_BUNDLE_CHECKLIST_20260330.md)  
- green の定義（何が「baseline 合格」か）: リポジトリ内の `docs/ssot/M55_BASELINE_FREEZE_20260330.md`（内容はこの runbook では繰り返しません）

---

## 始める前に（2 つだけ決める）

1. **Baseline コミットの SHA**  
   - GitHub の該当コミット画面に表示されている **7 文字以上の英数字**（例: `a1b2c3d4e5`）をメモする。

2. **バンドル用フォルダ（保存場所）**  
   - 社内の共有ドライブや、自分の PC の専用フォルダなど、**バックアップが取れる場所**に、空のフォルダを 1 つ作る。  
   - 例: `M55_recovery_bundle_2026-03-30`  
   - **この runbook では、このフォルダを「バンドルフォルダ」と呼びます。**

---

## 1. Git タグの切り方

**目的:** あとで `git checkout タグ名` だけで、同じコミットに戻れるようにする。

1. パソコンで、いつもこのリポジトリを操作しているターミナルを開く。  
2. リポジトリのルートに移動する（`package.json` があるフォルダ）。  
3. 次を実行する（`<SHA>` をメモしたコミットに置き換える。タグ名は社内で決めた名前でもよいが、例として `m55-baseline-2026-03-30` を使います）。

```bash
git tag m55-baseline-2026-03-30 <SHA>
git push origin m55-baseline-2026-03-30
```

4. GitHub のリポジトリページで **Tags** に同じ名前が見えるか確認する。  
5. **バンドルフォルダ**に、メモ帳で `tag.txt` を作り、中に次だけ書いて保存する。  
   - 1 行目: タグ名（例: `m55-baseline-2026-03-30`）  
   - 2 行目: コミット SHA（フル）

**うまくいかないとき:** `git push` で権限エラーが出る場合は、リポジトリの管理者に「このタグを push してほしい」と依頼し、代わりに **ZIP だけ**でもバンドルは成立します（次の節）。

---

## 2. リポジトリ ZIP の保存場所と作り方

**目的:** ネットが不安定でも、**その時点のソース一式**を手元に残す。

**おすすめの保存場所:** 上で作った **バンドルフォルダの中**（例: `M55_recovery_bundle_2026-03-30/source/` に ZIP を入れる）。

**作り方 A（GitHub が使える場合）**

1. ブラウザで該当 **コミット**のページを開く。  
2. 右上付近の **Browse files** などから、そのコミット時点のツリーを表示する。  
3. 緑色の **Code** ボタン → **Download ZIP** で ZIP を落とす。  
4. ファイル名を分かりやすく変える（例: `m55-repo-20260330-a1b2c3d.zip`）して、**バンドルフォルダ**に入れる。

**作り方 B（ターミナルで `git archive`）**

リポジトリのルートで:

```bash
git archive --format=zip --output m55-repo-20260330.zip m55-baseline-2026-03-30
```

（タグ名は実際に付けた名前に合わせる。）  
生成された ZIP を **バンドルフォルダ**に移す。

---

## 3. 監査 JSON の保存方法

**目的:** 「その時点で SSOT 監査が空だった」ことを**ファイルで証明**する。

1. ターミナルで、**baseline のコミット**を checkout した状態にする（タグを付けたなら `git checkout m55-baseline-2026-03-30`）。  
2. 依存関係を入れる: `npm ci`  
3. **バンドルフォルダ**の中に `evidence` というサブフォルダを作る。  
4. 次を実行する。

**public 用（標準出力をファイルへ）**

- macOS / Linux の例:

```bash
node scripts/run-sonnet-audit.js > evidence/ssot-public-20260330.json
```

- Windows（PowerShell）の例:

```powershell
node scripts/run-sonnet-audit.js | Out-File -Encoding utf8 evidence/ssot-public-20260330.json
```

5. 同様に **reserve** 用:

```bash
node scripts/run-sonnet-audit.js --reserve-scan > evidence/ssot-reserve-20260330.json
```

6. 両方の JSON をテキストエディタで開き、`"violations": []`（中身が空の配列）になっているか目で確認する。  
7. **`evidence` フォルダごと**、バンドルフォルダの定位置に置く（または ZIP にまとめる）。

**補足:** コマンドがエラーで終了した場合は、そのコミットは baseline として保存しないでください。先に green を満たすコミットを選び直します。

---

## 4. CI が緑だった証跡の保存方法

**目的:** 「リモートの自動チェックも通っていた」と後から示す。

1. GitHub で **Actions** タブを開く。  
2. **baseline コミットの SHA** に紐づく実行一覧から、該当のワークフロー実行を開く。  
3. 次のどちらか（または両方）を **バンドルフォルダ**に残す。  
   - **スクリーンショット:** 実行一覧がすべて緑の画面を PNG で保存（ファイル名例: `ci-green-20260330.png`）。  
   - **URL メモ:** 各実行のブラウザのアドレスを、`ci-runs-urls.txt` に 1 行 1 URL でコピペする。

4. リポジトリにある workflow が複数ある場合は、**そのコミットで動いた分**だけでよいですが、**失敗が 1 つもない**行に注目して保存してください。

---

## 5. 主要画面スクリーンショットの取得対象

**目的:** 「見た目の基準もこの時点だった」と分かるようにする。

**撮る環境:** 本番 URL かステージング URL か、**どちらで撮ったか**をファイル名かメモに必ず書く。

**最低限、次の画面を撮影してください。**

| 順番 | 画面の目安 | ファイル名の例 |
|------|------------|------------------|
| 1 | ユーザーが最初に land する **シェル上の Home**（`/home`、ロゴから入る画面） | `shell-home-20260330.png` |
| 2 | `/support` | `support-20260330.png` |
| 3 | `/legal/terms`（または代表する法務ページ 1 枚） | `legal-terms-20260330.png` |
| 4 | 可能なら `/purchase/success`（テスト決済で開ける環境のみ） | `purchase-success-20260330.png` |

**あるとよい追加（任意）**

- `/how-m55-works`  
- `/ten-views`  

撮った画像はすべて **バンドルフォルダ**の `screenshots/` などに入れると整理しやすいです。

---

## 6. ローカル監査ログ（推奨）

**バンドルフォルダ**に `local-audit-log.txt` を作り、次を実行した結果をそのまま貼り付けてもよいです（成功したことが分かれば十分です）。

```bash
npm run audit
npm run lint:ssot
```

（終了コードが 0 であることも、ターミナルによっては最後に表示されます。）

---

## 7. 復元時の手順（別の PC でも）

**目的:** バンドルから「同じ baseline に戻る」最短ルート。

1. Git が入った PCで、リポジトリを **clone** する（または既存の clone を使う）。  
2. `git fetch --tags`  
3. `git checkout m55-baseline-2026-03-30`（タグ名は `tag.txt` のとおり）  
4. `npm ci`  
5. 次を順に実行し、**すべて成功**することを確認する。  
   - `npm run audit`  
   - `npm run lint:ssot`  
   - `node scripts/run-sonnet-audit.js`（`violations` が空）  
   - `node scripts/run-sonnet-audit.js --reserve-scan`（同様）  
6. （任意）`npm run build`  
7. 保存しておいた **CI のスクリーンショット／URL** と突き合わせ、同じコミットであることを確認する。

ZIP しかない場合は、ZIP を展開して別フォルダで上記 4〜6 を実行しても構いません（その場合は `git checkout` の代わりに展開フォルダで作業します）。

---

## バンドルフォルダの中身（完成イメージ）

完成すると、だいたい次のような構成になります（名前は例です）。

```text
M55_recovery_bundle_2026-03-30/
  tag.txt
  m55-repo-20260330-xxxx.zip   （または source/ 以下に展開）
  evidence/
    ssot-public-20260330.json
    ssot-reserve-20260330.json
  local-audit-log.txt            （任意）
  ci-green-20260330.png
  ci-runs-urls.txt               （任意・URL メモ）
  screenshots/
    shell-home-20260330.png
    support-20260330.png
    ...
```

---

## 最後に

- チェックリスト [M55_RECOVERY_BUNDLE_CHECKLIST_20260330.md](./M55_RECOVERY_BUNDLE_CHECKLIST_20260330.md) のチェックボックスと、**このフォルダの中身**が一致しているか、オーナーが一度だけ見直してください。  
- バンドルフォルダは、**社内ルールに従いバックアップ**してください（USB だけなど単一保管は避ける）。

**一行サマリ:** タグ → ZIP → evidence の JSON → CI の緑の証跡 → スクショ → 復元手順を、**1 フォルダに揃えれば** baseline の実体化は完了です。
