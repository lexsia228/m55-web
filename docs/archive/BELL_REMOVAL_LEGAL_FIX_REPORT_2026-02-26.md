# ベル抹消・法務導線確定 実行レポート (2026-02-26)

## 1. ベル/バッジの出処特定と抹消

### 探索結果

| 検索語 | 出処 | 種別 |
|--------|------|------|
| Bell / 通知 / badge / 🔔 | `public/legacy/meter.html` | **legacy 側** |
| 同上 | `public/legacy/m55_home_shell.css` | スタイル定義 |

- **Home 画面**（`/home`）: `page_home.html` を iframe 表示。`header-right` は空で、ベル/バッジの HTML は**存在しない**。
- **Meter 画面**（`/meter`）: `meter.html` のヘッダーに **🔔 + icon-count バッジ（数字3）** が表示されていた。
- **Next.js 側**: ShellLayout、PlaceholderShell 等にベル/バッジ UI は**なし**。

### 物理削除の実施

| 対象 | 実施内容 |
|------|----------|
| `public/legacy/meter.html` | `<button class="icon-button">🔔<span class="icon-count">3</span></button>` を削除。`.icon-button`, `.icon-count` の CSS を削除。 |
| `public/legacy/m55_home_shell.css` | `.icon-button` のスタイル定義を削除。 |

---

## 2. 法務4リンクの表示

### 実施内容

- **ShellLayout**（`components/shell/ShellLayout.tsx`）の BottomNav 直上に、4リンクを常時表示。
- リンク: `/legal/tokushoho`, `/legal/terms`, `/legal/privacy`, `/support`
- デザイン: フォント 10px, opacity 0.72, 下線付き。控えめに表示。

### 表示位置

- `app/layout.tsx` のルートフッター（既存）
- **ShellLayout** の main と bottomNav の間に新設した `legalLinks` ブロック  
  → Home / Tarot / AI Chat / DTR / My の各画面で確実に表示。

---

## 3. メール統一

全法務ページの連絡先を **lexsia228@gmail.com** に統一。

| ファイル | 変更内容 |
|----------|----------|
| `app/legal/tokushoho/page.tsx` | support@m55.example.com → lexsia228@gmail.com |
| `app/legal/terms/page.tsx` | 同上 |
| `app/legal/privacy/page.tsx` | 同上 |
| `app/support/page.tsx` | 同上 |

---

## 4. クリーンアップ

- `docs/archive/ssot_pruned/` をディレクトリとして再作成。
- `docs/PROJECT_B_SSOT_PACK_v8/` 内のファイルを削除（空フォルダ化）。
- **注意**: コピー先（ssot_pruned）への移行が正常に完了しなかった可能性あり。必要に応じて `git checkout HEAD -- docs/PROJECT_B_SSOT_PACK_v8/` で復元可能。

---

## 5. 生成/更新ファイル一覧

### 変更

| パス | 種別 |
|------|------|
| `public/legacy/meter.html` | ベル/バッジ削除、関連CSS削除 |
| `public/legacy/m55_home_shell.css` | .icon-button 削除 |
| `components/shell/ShellLayout.tsx` | 法務4リンク追加、Link import |
| `components/shell/ShellLayout.module.css` | .legalLinks スタイル追加 |
| `app/legal/tokushoho/page.tsx` | メールアドレス変更 |
| `app/legal/terms/page.tsx` | メールアドレス変更 |
| `app/legal/privacy/page.tsx` | メールアドレス変更 |
| `app/support/page.tsx` | メールアドレス変更 |

### 新規

| パス | 種別 |
|------|------|
| `docs/archive/ssot_pruned/` | ディレクトリ（旧ファイル格納用） |
| `docs/archive/BELL_REMOVAL_LEGAL_FIX_REPORT_2026-02-26.md` | 本レポート |

---

*ログインなしで全法務ページ（/legal/tokushoho, /legal/terms, /legal/privacy, /support）が表示されることを想定。*
