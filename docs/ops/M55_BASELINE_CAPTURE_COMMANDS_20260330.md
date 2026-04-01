# M55 Baseline Capture — PowerShell 1 行コマンド集（20260330）

**誰向け:** オーナー（コピーしてそのまま実行できるように並べています）  
**前提:** 手元にリポジトリの clone があり、**baseline にしたいコミット**を checkout 済みであること。

**詳しい説明:** [M55_BASELINE_CAPTURE_RUNBOOK_20260330.md](./M55_BASELINE_CAPTURE_RUNBOOK_20260330.md)  
**補助スクリプト:** `scripts/capture-baseline-evidence.js`（JSON 2 本 + `manifest.json` を一括出力）

---

## 0. プロジェクトへ移動（毎回の先頭）

パスは自分の環境に合わせて変えてください。

```powershell
Set-Location "C:\Users\<あなたのユーザー>\OneDrive\デスクトップ\M55_ACTIVE_PROJECT"
```

---

## 1. いまのコミット SHA を確認（1 行）

```powershell
git rev-parse HEAD
```

短い形だけ欲しい場合:

```powershell
git rev-parse --short HEAD
```

---

## 2. SSOT 監査の evidence 出力（1 行）

バンドル用フォルダ（例: `.\bundle\evidence`）に JSON と manifest をまとめて書きます。

```powershell
node scripts/capture-baseline-evidence.js .\bundle\evidence
```

**終了コードの見方（直後に 1 行）:**

```powershell
echo $LASTEXITCODE
```

`0` なら public / reserve とも **violations 0** かつ監査コマンド成功です。`1` のときは JSON 内の `violations` を開いて原因を確認してください。

---

## 3. ソース ZIP を同じバンドルに保存（1 行）

**現在 checkout しているコミット**を ZIP にします（`HEAD`）。

```powershell
git archive --format=zip -o .\bundle\m55-src-HEAD.zip HEAD
```

タグを付け済みなら、タグ名に置き換え可能です。

```powershell
git archive --format=zip -o .\bundle\m55-baseline-tag.zip m55-baseline-2026-03-30
```

---

## 4. 実行後の確認（1 行ずつ）

manifest の中身:

```powershell
Get-Content .\bundle\evidence\manifest.json
```

public 監査の violations が空かざっと見る:

```powershell
Select-String -Path .\bundle\evidence\ssot-public.json -Pattern '"violations": \[\]'
```

reserve も同様:

```powershell
Select-String -Path .\bundle\evidence\ssot-reserve.json -Pattern '"violations": \[\]'
```

ZIP ができているか:

```powershell
Get-Item .\bundle\m55-src-HEAD.zip | Format-List Name, Length, LastWriteTime
```

---

## 5. ローカルゲート（任意・1 行ずつ）

```powershell
npm run audit
```

```powershell
npm run lint:ssot
```

それぞれの直後に `echo $LASTEXITCODE` で `0` を確認するとよいです。

---

## 6. タグ付けと push（参考・各 1 行）

```powershell
git tag m55-baseline-2026-03-30 $(git rev-parse HEAD)
```

```powershell
git push origin m55-baseline-2026-03-30
```

---

**一行サマリ:** `capture-baseline-evidence.js` で evidence 一式 → `git rev-parse HEAD` で SHA → `git archive` で ZIP → `manifest.json` と ZIP を同じ **bundle** フォルダに揃えると最短です。
