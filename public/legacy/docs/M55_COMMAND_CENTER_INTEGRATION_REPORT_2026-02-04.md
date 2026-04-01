# M55 Command Center Integration Report
**Date:** 2026-02-04  
**Status:** GOVERNED / HARDENED  
**Audience:** All teams (Logic, UI/UX, Wiring, Ops, QA)

---

## 1. What is "Command Center"?

Command Center is the **single governance layer** that resolves conflicts between old assets and speculative implementations.
From this point onward, every change must be justified by, and subordinate to, the HQ SSOT.

### 1.1 Canonical artifacts (authoritative)

1) **HQ SSOT**: `M55_COMMAND_CENTER_HQ_SSOT_v1_0_2026-02-04.md`
2) **Logic Core (read-only)**: `data/m55_name_analysis_81_sanitized.json`
   - SHA-256: `94d58be9bc925103235ace9f06f9363cf82ecdc46c3bf4370809486b9bfe6918`
3) **Territory (legal working tree)**: `M55_STEP1_RECONCILED_RC1_2026-02-04_PATCH2.zip`
   - This contains `js/integrity_guard.js`, `js/system_halt.js`, `.gitattributes`, and `ci/prebuild_guard.sh`.

> Anything not in the above is **reference-only** at best. Anything conflicting is **banned**.

---

## 2. Governance hierarchy (誰が何を決めるか)

### Level 0 — Constitution (最高法規)

- Background **NoTouch**
- No badges / no notification UI / no ranking / no numbers-as-CTA
- Fail-Closed (no demo mode, no anon fallback)
- Integrity-first (hash mismatch => SystemHalt)

### Level 1 — Ministries (領域法)

| Ministry | Domain | Truth | Non-negotiables |
| --- | --- | --- | --- |
| Logic & Data | 占術/ロジック | `data/m55_name_analysis_81_sanitized.json` | 推測で増やさない。改竄しない。ハッシュ一致が正義。 |
| UI/UX | 見た目/体験 | `index.html`, `page_chat.html`, `page_mypage.html` + UI SSOT docs | 静寂、NoTouch、アテンション奪取UI禁止 |
| Wiring / Money | 遷移/課金 | `js/routes_manifest.js`, `js/m55_purchase_cache.js` | Fail-Closed、権利の曖昧さ禁止 |
| Integrity / Ops | 監査/CI | `.gitattributes`, `ci/prebuild_guard.sh`, runtime guards | すり抜けを許さない |

### Level 2 — Territory (現場)

- 実装・検証・デプロイに使う **唯一の作業ツリー**。
- Command Centerは仕様の司令部、Territoryはコードの司令部。

---

## 3. Resolved contradictions (今回ここで潰した矛盾)

### 3.1 Hash value drift
- Old: `79a76c...` (deprecated)
- Now: `94d58b...` (authoritative; matches actual JSON)

**Rule:** ドキュメント・CI・コードのハッシュ参照は `94d58b...` 以外を禁止。

### 3.2 Identity ambiguity
- Banned: `anon_fallback`, 自動生成の userHash
- Now: `m55_user_hash` が存在しない場合は **SystemHalt**

### 3.3 Halt UX vs background policy
- Banned: 背景塗りつぶし、背景画像の差し替え
- Now: **Overlay Film only** + **Reload only**

---

## 4. Newly frozen UI laws added today

- `docs/M55_TOPTABS_SSOT.md`
- `docs/M55_BOTTOMTABS_SSOT.md`

These documents extend governance to navigation and prevent “silent drift” of the UI skeleton.

---

## 5. Remaining holes (次に埋める順序)

1) **Chat**: `js/m55_chat_bridge.js` (or equivalent) — SSOT準拠の対話入出力。
2) **Purchase Flow**: `m55_purchase_cache.js` と routes の整合 + post-purchase jump。
3) **Missing pages**: `page_tarot.html`, `page_dtr_shelf.html`（最小スタブから凍結）。
4) **Per-page SSOT**: Home / Chat / Tarot / DTR Shelf / MyPage / Calendar Modal。

> 原則: **穴埋めは“最小スタブ→凍結→拡張”**。推測で一気に作り込まない。

---

## 6. Team operating rule (全チーム共通)

- 仕様議論は **HQ SSOTに追記**。コード変更はTerritoryへ。
- 迷ったら **Fail-Closed**（壊れたまま動かさない）。
- 追加する前に、**禁止事項（NoTouch/NoBadge/NoRank/NoLoop）**を自動検査で落とす。