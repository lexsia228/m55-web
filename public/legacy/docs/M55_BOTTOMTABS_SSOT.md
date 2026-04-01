# M55 BottomTabs SSOT
**Authority:** Ministry of UI (Subordinate to `M55_COMMAND_CENTER_HQ_SSOT_v1_0_2026-02-04.md`)  
**Scope:** Bottom navigation visible on all non-modal pages  
**Date:** 2026-02-04  
**Status:** FROZEN (v2.1-compatible)

---

## 0.5 Inventory (Logical IDs)
> **Note:** These are **logical IDs** for spec readability.  
> **Do NOT add DOM IDs**; runtime must bind via existing selectors / `data-page`.

1. **Home** (`nav-home`): The Hub. Always accessible.
2. **Tarot** (`nav-tarot`): The Ritual. Single-session state.
3. **Chat** (`nav-chat`): The Center (Crystal). Silent Observer interface.
4. **Diagnosis** (`nav-dtr`): The Shelf. Archive of DTRs.
5. **MyPage** (`nav-mypage`): The Profile. Settings & History.

---
## 0. Canonical DOM Anchors (No new IDs)

- **Container selector:** `.bottom-nav`
- **Item selector:** `.bottom-nav .nav-item`
- **Active marker:** `.nav-item.active`
- **Label selector:** `.nav-item .label`
- **Icon selector:** `.nav-item .icon`

> NOTE: **ID追加は禁止**。判定はセレクタ＋順序（index）で行う。

---

## 1. Inventory (Order is the law)

| Order | Label (UI) | `data-page` | Route (file) | Status in RC1 |
| ---: | --- | --- | --- | --- |
| 0 | ホーム | `home` | `index.html` | Enabled |
| 1 | タロット | `tarot` | `page_tarot.html` | Not shipped → keep visible but disabled *or* provide stub page |
| 2 | チャット | `chat` | `page_chat.html` | Enabled (ALWAYS) |
| 3 | 鑑定 | `diagnosis` | `page_dtr_shelf.html` (future) / `DTR_TEMPLATE.html` (template only) | Not shipped → keep visible but disabled *or* provide stub page |
| 4 | マイページ | `mypage` | `page_mypage.html` | Enabled |

---

## 2. The Crystal Rule (Center Tab / Order 2)

- **Behavior:** タップは必ず `page_chat.html` へ遷移（NOOP禁止）。
- **Visual:** 追加強調（バッジ/点滅/拡大/色替え）は禁止。
- **Tap feedback:** `opacity` の単発変化のみ（継続アニメ/ループ禁止）。
- **No linkage:** BottomTabs と Third Eye（三連ドット）は連動禁止。

---

## 3. Global Interaction Rules

1. **Always 5 tabs:** 5タブのDOMは常に保持し、削除禁止。
2. **No badge / No unread:** 🔔、赤点、未読数、ランキング、数字バッジを一切表示しない。
3. **Opacity only:** Active=1.0 / Inactive=0.30 を基本。タップ時のdimも `opacity` のみ。
4. **Motion policy:** Reduce Motion では transition/animation を停止。
5. **Z-index:** BottomNav は基本 `z-index: 100` 相当で最前面（`SystemHalt` を除く）。
6. **No dead-end:** 未実装ページが存在しない場合、
   - **A案（推奨）:** `page_tarot.html` / `page_dtr_shelf.html` の**静かなスタブ**を用意し、遷移先を保証。
   - **B案（暫定）:** Visibleのまま `aria-disabled` + `pointer-events: none` で無効化（誤遷移防止）。

---

## 4. Routing Contract

- ルーティングは `js/routes_manifest.js` を唯一の参照とする（ハードコード禁止）。
- `userHash` 不在・整合性失敗時は `SystemHalt` が優先（BottomTabs独自のフォールバック禁止）。

---

## 5. RC1 Status (2026-02-04)

- **Enabled:** Home / Chat / MyPage
- **Holes:** Tarot / DTR Shelf はページSSOT未凍結につき、スタブ（A案）または無効化（B案）で運用。