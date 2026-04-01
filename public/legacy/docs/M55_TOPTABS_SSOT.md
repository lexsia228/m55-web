# M55 TopTabs SSOT
**Authority:** Ministry of UI (Subordinate to `M55_COMMAND_CENTER_HQ_SSOT_v1_0_2026-02-04.md`)  
**Scope:** `index.html` TopTabs row only (Home)  
**Date:** 2026-02-04  
**Status:** FROZEN (v1.0)

---

## 0. Inventory & Definitions (Logical IDs / No DOM ID add)
> **Note:** The “ID” below is a **logical ID** used only in docs/spec.  
> **DOM IDs must NOT be added**. Runtime binding must use the existing DOM anchors described in this SSOT.

| Tab Name | Logical ID | Type | Behavior |
| :--- | :--- | :--- | :--- |
| **本質 (Core)** | `tab-core` | Static | Displays name-analysis (`m55_name_analysis`) results. Permanent. |
| **相性 (Synastry)** | `tab-synastry` | Static | Requires `partnerHash`. If missing, show “Invite” placeholder. |
| **今日 (Daily)** | `tab-daily` | Dynamic | Updates at 00:00 UserTZ. Shows Daily content (no fetch on tap). |
| **週間 (Weekly)** | `tab-weekly` | Dynamic | Updates Mon 00:00 UserTZ (ISO week). Shows Weekly content (no fetch on tap). |
| **暦 (Calendar)** | `tab-calendar` | Modal | Opens AI Calendar as modal (no page transition). |

---

## 0. Canonical DOM Anchors (No new IDs)

- **Container selector:** `.top-tabs`
- **Tab selector:** `.top-tabs .top-tab`
- **Active marker:** `.top-tab.active`

> NOTE: **ID追加は禁止**。選択・判定は上記セレクタ＋順序（index）で行う。

---

## 1. Inventory (Order is the law)

| Order | Label (UI) | Type | Source of truth (data) | Notes |
| ---: | --- | --- | --- | --- |
| 0 | 本質 | Static | `data/m55_name_analysis_81_sanitized.json` (read-only) | 表示は「言語蒸留フィルター」を必須適用（命令形・断定・煽りを除去）。 |
| 1 | 相性 | Static | Same as above + `partnerHash` (future) | `partnerHash` 不在時は静かな「未定」表示（CTA/招待語禁止）。 |
| 2 | 今日 | Dynamic | `DataCore` (UserTZ day boundary) | 00:00(UserTZ)で切替。タップでfetch禁止。 |
| 3 | 週間 | Dynamic | `DataCore` (Mon 00:00 UserTZ / ISO week) | ISO週キー（week-year含む）を唯一の週次キーとする。 |
| 4 | AIカレンダー | Modal | `PAGE_AI_CALENDAR` (future modal) | **ページ遷移なし**。実装まで `hidden` or `aria-disabled`。 |

---

## 2. Hard Constraints (Fail-Closed)

1. **NoTouch:** 背景・全体トーン・body/html背景は変更禁止。
2. **No badges / No ranking / No numbers:** 未読・🔔・赤点・順位・%・点数・ゲージ要素の追加は禁止。
3. **No spinner on tab switch:** タブ切替でネットワーク fetch / 再計算 / スピナー表示をしてはいけない。
4. **Single active:** 常に `.top-tab.active` は **1つだけ**。
5. **Motion:** 変化は `opacity` のみ（スライド/スワイプ/スクロール追従禁止）。
6. **Ghost Protocol:** 未実装・欠損・権限不足の場合は **DOM保持 + hidden/無効化**、もしくは静かな **Ghost Card** に落とす（エラー語・謝罪・強い誘導は禁止）。
7. **Integrity:** データ欠損/整合性失敗時は `SystemHalt` が優先（TopTabs側の独自フォールバック禁止）。

---

## 3. Interaction Contract

### 3.1 Tap
- タップ時は `active` を付け替える（**1フレームで完了**）。
- タップ反応は `opacity` の単発変化のみ。
- **タップ起点のデータ取得は禁止**（fetch / await / spinner / toast 禁止）。

### 3.2 Render
- 表示文章は必ず「言語蒸留フィルター」を通す。
  - 断定（当たる/必ず/絶対）
  - 命令（〜しろ/〜せよ/〜すると良い）
  - 最適化/行動計画/次の一手
  - 煽り（今すぐ/急いで/逃すな）

> 例：元データが強めでも、**UI出力は観測として静かに整える**。

---

## 4. RC1 Status (2026-02-04)

- **必須:** 「今日」は有効。
- **推奨:** 「本質/相性/週間/AIカレンダー」は、対応ページ・データ・権限が未凍結の間は **無効化（aria-disabled）または hidden**。
- ただし、**DOM自体は保持**する（削除禁止）。
