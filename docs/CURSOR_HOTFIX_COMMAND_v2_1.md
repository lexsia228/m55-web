# Cursor への緊急修正命令 (Copy & Paste / v2.1)

## ROLE
You are the Builder (Cursor). Execute a **Hotfix-only** synchronization.

## ABSOLUTE RULES
- No new specs. Hotfix is for **audit compliance only**.
- Layer1: policies are the ONLY source of entitlement/retention numbers.
- Fail-Closed: missing policy / missing required meta / missing userHash => halt.
- Layer0: NoTouch background / NoLoop / NoBadge / NoScore(No %/gauge) / now < expires_at.
- BottomNav 5 tabs remain; 3rd tab stays PAGE_AI_CHAT (frozen sanctuary).

## TARGETS
1) `public/legacy/js/binding_inventory.js`
- Remove any hardcoded daily caps.
- Read `public/legacy/policies/m55_entitlements_v1_0.json` and use `ai_chat_send_per_day`.
- Missing/invalid policy => systemHalt (no 0 fallback).

2) `public/legacy/js/m55_data_core.js`
- Remove rolling-days pruning.
- Require per-log `expires_at` (UTC ms) and adopt condition **now < expires_at** everywhere.
- Legacy logs missing expires_at => drop (fail-closed; no extension).
- When saving, compute expires_at using `public/legacy/policies/m55_retention_v1_0.json` and the caller-provided tier.

3) Assets
- Ensure `public/legacy/css/m55_global.css` exists if referenced by legacy HTML.
- Must NOT set html/body background.

4) Audit Gate
- Ensure `scripts/audit_gate.mjs` enforces the above (trace checks allowed).

## OUTPUT (STRICT)
- Print: `ALL GREEN` only if audit passes.
- If any issue remains, print file:line and minimal diff only.
