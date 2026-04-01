/**
 * js/binding_inventory.js
 * M55 GLOBAL BRIDGE (SSOT-compliant / Gate-oriented)
 * - Exposes runPurchaseSuccessFlow globally for routes_manifest
 * - Aligns PAGE_DTR_SHELF
 * - No URL context injection
 */

import { DataCore, M55Profile } from "./m55_data_core.js";
import { PurchaseCache } from "./m55_purchase_cache.js";
import { runPurchaseSuccessFlow } from "./phase3_wiring_async.js";
import { consumeNavMeta, navigateTo } from "./routes_manifest.js";
import { M55ChatEngine } from "./m55_chat_engine.js";
import "./integrity_guard.js";
import { systemHalt, installGlobalErrorTrap } from "./system_halt.js";

// Core experience add-ons (SSOT-safe)
import "./m55_haptics_bridge.js";
import "./m55_widget_snapshot.js";
import "./m55_artifact_export.js";

const g = globalThis;
installGlobalErrorTrap();

// --- 1) Global Exposure (minimal) ---
if (!g.LogVault) g.LogVault = DataCore.logs;
if (!g.TrustedStorage) g.TrustedStorage = DataCore.storage;
if (!g.PurchaseCache) g.PurchaseCache = PurchaseCache;

// Contract: routes_manifest calls window.runPurchaseSuccessFlow(document, payload)
g.runPurchaseSuccessFlow = runPurchaseSuccessFlow;

// --- 1b) M55Purchase: entitlementKey API (delegates to PurchaseCache SSOT) ---
g.M55Purchase = {
  async has(entitlementKey) {
    const pc = g.PurchaseCache;
    if (!pc?.hasRight) return false;
    const userHash = ensureUserHash();
    if (entitlementKey === "CTX_CORE") {
      return !!(await pc.hasRight("core", {}, userHash));
    }
    if (String(entitlementKey || "").startsWith("CTX_SYNASTRY_")) {
      const partnerHash = entitlementKey.replace("CTX_SYNASTRY_", "");
      return !!(await pc.hasRight("synastry", { partnerHash }, userHash));
    }
    return false;
  },
  async grant(entitlementKey) {
    const pc = g.PurchaseCache;
    if (!pc?.registerPurchase) {
      systemHalt({ code: "M55_PURCHASE_GRANT_FAIL", message: "PurchaseCache.registerPurchase missing (fail-closed)", detail: String(entitlementKey) });
    }
    const userHash = ensureUserHash();
    if (entitlementKey === "CTX_CORE") {
      await pc.registerPurchase("dtr_core_origin", userHash, {});
      return;
    }
    if (String(entitlementKey || "").startsWith("CTX_SYNASTRY_")) {
      const partnerHash = entitlementKey.replace("CTX_SYNASTRY_", "");
      await pc.registerPurchase(`dtr_synastry_${partnerHash}`, userHash, {});
      return;
    }
    systemHalt({ code: "M55_UNKNOWN_ENTITLEMENT", message: "Unknown entitlementKey (fail-closed)", detail: String(entitlementKey) });
  }
};

// --- 2) User Hash Strategy (Persistence) ---
function ensureUserHash() {
  // Strict: user hash must be provided by host (window.M55_USER_HASH) or pre-seeded storage.
  const direct = typeof g.M55_USER_HASH === "string" ? g.M55_USER_HASH.trim() : "";
  if (direct) return direct;

  let stored = "";
  try {
    stored = localStorage.getItem("m55_user_hash") || "";
  } catch (e) {
    systemHalt({ code: "M55_STORAGE_READ_FAILED", message: "Unable to read local state (fail-closed)", detail: String(e?.message || e) });
  }

  stored = typeof stored === "string" ? stored.trim() : "";
  if (stored) {
    g.M55_USER_HASH = stored;
    return stored;
  }

  systemHalt({
    code: "M55_USER_HASH_MISSING",
    message: "User context is missing.",
    detail: "Provide window.M55_USER_HASH or pre-seed localStorage key 'm55_user_hash' before boot.",
  });
}
ensureUserHash();

// --- 3) Plan Normalize ---
const normalizePlan = (p) => {
  const raw = (p ?? g.M55_USER_PLAN ?? "free");
  const s = String(raw).toLowerCase();
  if (s === "premium") return "premium";
  if (s === "standard") return "standard";
  return "free";
};
g.M55_USER_PLAN = normalizePlan(g.M55_USER_PLAN);

// --- 4) Helpers: TrustedStorage.getItem(key, userHash) ---
async function tsGet(key) {
  const userHash = ensureUserHash();
  try {
    const v = g.TrustedStorage?.getItem ? g.TrustedStorage.getItem(key, userHash) : localStorage.getItem(key);
    return (v && typeof v.then === "function") ? await v : v;
  } catch (e) {
    systemHalt({ code: "M55_STORAGE_READ_FAILED", message: "Unable to read timestamp (fail-closed)", detail: String(e?.message || e) });
  }
}

// --- 5) Chat Limit Logic ---
function localDayKey(prefix) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${prefix}_${yyyy}-${mm}-${dd}`;
}
function nextLocalMidnightTs() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
const isExclusiveSlotContext = (contextKey) => String(contextKey || "").startsWith("CTX_");

// Layer1 ONLY: caps are defined in policies/m55_entitlements_v1_0.json
const ENTITLEMENTS_URL = new URL("../policies/m55_entitlements_v1_0.json", import.meta.url).toString();
let _entCache = null;
let _entError = false;

async function loadEntitlementsPolicy() {
  if (_entCache) return _entCache;
  if (_entError) return null;
  try {
    const res = await fetch(ENTITLEMENTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`PolicyFetchFailed:${res.status}`);
    const json = await res.json();
    // Minimal shape check (Fail-Closed)
    if (!json || typeof json !== "object" || !json.plans || typeof json.plans !== "object") {
      throw new Error("PolicyInvalidShape");
    }
    _entCache = json;
    return _entCache;
  } catch (e) {
    _entError = true;
    systemHalt({
      code: "M55_POLICY_MISSING",
      message: "Policy is missing or invalid.",
      detail: String(e?.message || e),
    });
  }
}

function getAiChatCapOrHalt(ent, plan) {
  const raw = ent?.plans?.[plan]?.ai_chat_send_per_day;
  if (raw === undefined || raw === null) {
    systemHalt({
      code: "M55_POLICY_MISSING",
      message: "Policy key is missing.",
      detail: `Missing ai_chat_send_per_day for plan=${plan}`,
    });
  }
  if (raw === -1) return Infinity; // policy-defined unlimited
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    systemHalt({
      code: "M55_POLICY_INVALID",
      message: "Policy value is invalid.",
      detail: `ai_chat_send_per_day must be -1 or >=0 (plan=${plan}, value=${String(raw)})`,
    });
  }
  return n;
}

g.checkChatLimit = async function checkChatLimit(userPlan, contextKey) {
  if (isExclusiveSlotContext(contextKey)) {
    return { ok: true, reason: "DTR_RIGHT" };
  }
  const plan = normalizePlan(userPlan);
  const ent = await loadEntitlementsPolicy();
  const cap = getAiChatCapOrHalt(ent, plan);
  if (cap === Infinity) return { ok: true, reason: "UNLIMITED" };

  const key = localDayKey("m55_chat_usage");
  const usedRaw = await tsGet(key);
  const used = Number(usedRaw || "0");
  const remaining = Math.max(0, cap - used);
  const ok = remaining > 0;

  return {
    ok,
    reason: ok ? "WITHIN_LIMIT" : "DAILY_LIMIT",
    remaining,
    resetAt: nextLocalMidnightTs(),
    message: ok ? "" : "今日はここまで。明日また、続きましょう。"
  };
};

// --- 6) Chat Wiring (ctx from Nav Meta only, no URL injection) ---
// SSOT: consumeNavMeta() is ONLY consumed here. ChatEngine never reads meta.
// Reload resilience: m55_chat_last_ctx_v1, m55_dtr_last_context_v1 in sessionStorage.
const SSOT_LAST_CTX = "m55_chat_last_ctx_v1";
const SSOT_DTR_CONTEXT = "m55_dtr_last_context_v1";
const SSOT_DTR_TITLE = "m55_dtr_last_title_v1";

function mountPageAIChatIfPresent() {
  const historyEl = document.getElementById("chat-history");
  if (!historyEl) return;

  const meta = consumeNavMeta();

  let chatCtx = meta?.chatCtx === "dtr" ? "dtr" : "general";
  if (!meta) {
    try {
      const last = sessionStorage.getItem(SSOT_LAST_CTX);
      if (last === "dtr" || last === "general") chatCtx = last;
    } catch (_) { /* no-op */ }
  }

  let contextKey = null;
  let contextTitle = "AIチャット";
  if (chatCtx === "dtr") {
    contextKey = meta?.contextKey || null;
    if (!contextKey) {
      try {
        const last = sessionStorage.getItem(SSOT_DTR_CONTEXT);
        if (last && typeof last === "string" && last.trim()) contextKey = last.trim();
      } catch (_) { /* no-op */ }
    }
    if (!contextKey) contextKey = "CTX_DTR_UNKNOWN";
    contextTitle = meta?.title && typeof meta.title === "string" ? meta.title : "DTRチャット";
    if (!meta) {
      try {
        const lastTitle = sessionStorage.getItem(SSOT_DTR_TITLE);
        if (lastTitle) contextTitle = lastTitle;
      } catch (_) { /* no-op */ }
    }
  }

  try {
    sessionStorage.setItem(SSOT_LAST_CTX, chatCtx);
    if (chatCtx === "dtr") {
      sessionStorage.setItem(SSOT_DTR_CONTEXT, contextKey);
      sessionStorage.setItem(SSOT_DTR_TITLE, contextTitle);
    }
  } catch (_) { /* no-op */ }

  document.documentElement.setAttribute("data-m55-chat-ctx", chatCtx);
  if (chatCtx === "dtr") {
    document.documentElement.setAttribute("data-m55-dtr-key", String(contextKey));
  } else {
    document.documentElement.removeAttribute("data-m55-dtr-key");
  }

  const chatEngine = new M55ChatEngine({
    LogVault: g.LogVault,
    TrustedStorage: g.TrustedStorage,
    checkChatLimit: g.checkChatLimit,
    getUserPlan: () => (g.M55_USER_PLAN ? String(g.M55_USER_PLAN) : "free"),
    getUserHash: ensureUserHash,
    chatCtx
  });

  chatEngine.setChatContext(chatCtx === "dtr" ? contextKey : null, contextTitle);

  chatEngine.mount({
    historyEl,
    inputEl: document.getElementById("chat-input"),
    sendBtnEl: document.getElementById("chat-send"),
    contextEl: document.getElementById("context-indicator"),
    emptyEl: document.getElementById("chat-empty"),
    toastEl: document.getElementById("chat-toast"),
    jumpLatestBtnEl: document.getElementById("chat-jump-latest"),
    bottomSentinelEl: document.getElementById("chat-bottom-sentinel"),
    msgTemplateEl: document.getElementById("chat-bubble-template")
  });

  g.M55ClearChatHistory = () => chatEngine.clearHistory();
}

// --- 7) DTR Gatekeeper: core / synastry → DTR flow (JS injection only) ---
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}
function getPartnerHashFromStorage() {
  const PARTNER_KEY = "m55_partner_v1";
  try {
    const raw = localStorage.getItem(PARTNER_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const nick = (obj?.nickname || "").trim();
    const dateVal = (obj?.birthDateISO || "").trim();
    if (!nick && !dateVal) return null;
    const profile = M55Profile?.load?.();
    const selfStr = [profile?.nickname || "", profile?.birthDateISO || ""].join("|");
    const comb = selfStr + "|" + nick + "|" + dateVal;
    const h = (Math.abs(simpleHash(comb)) >>> 0).toString(16);
    return `ph${h}`;
  } catch {
    return null;
  }
}

function contextKeyToProductId(contextKey) {
  if (contextKey === "CTX_CORE") return "dtr_core_origin";
  if (String(contextKey || "").startsWith("CTX_SYNASTRY_")) {
    const ph = contextKey.replace("CTX_SYNASTRY_", "");
    return `dtr_synastry_${ph}`;
  }
  return null;
}

function runDtrGatekeeper() {
  const coreEl = document.getElementById("core-content");
  if (coreEl && !coreEl.querySelector("[data-m55-dtr-gate]")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "button-primary";
    btn.setAttribute("data-m55-dtr-gate", "core");
    btn.textContent = "深い記録へ進む";
    btn.onclick = async () => {
      const entitlementKey = "CTX_CORE";
      const has = await g.M55Purchase?.has?.(entitlementKey);
      if (has) {
        navigateTo("PAGE_AI_CHAT", { chatCtx: "dtr", contextKey: entitlementKey });
      } else {
        navigateTo("PAGE_DTR_TEMPLATE", { contextKey: entitlementKey, returnTo: "PAGE_CORE" });
      }
    };
    coreEl.appendChild(btn);
  }

  const resultEl = document.getElementById("result-area");
  if (resultEl) {
    const parent = resultEl.closest(".card-hero-inner") || resultEl.parentElement || resultEl;
    const injectSynastryBtn = () => {
      const existing = parent?.querySelector("[data-m55-dtr-gate]");
      if (existing) existing.remove();
      if (!parent) return;
      const partnerHash = getPartnerHashFromStorage();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "button-primary";
      btn.setAttribute("data-m55-dtr-gate", "synastry");
      btn.style.marginTop = "8px";
      if (!partnerHash) {
        btn.disabled = true;
        btn.textContent = "相性を確認してから利用できます";
      } else {
        btn.textContent = "この相性を深く残す";
        btn.onclick = async () => {
          const ph = getPartnerHashFromStorage();
          const entKey = ph ? `CTX_SYNASTRY_${ph}` : null;
          if (!entKey) return;
          const has = await g.M55Purchase?.has?.(entKey);
          if (has) navigateTo("PAGE_AI_CHAT", { chatCtx: "dtr", contextKey: entKey });
          else navigateTo("PAGE_DTR_TEMPLATE", { contextKey: entKey, partnerHash: ph, returnTo: "PAGE_SYNASTRY" });
        };
      }
      parent.appendChild(btn);
    };
    injectSynastryBtn();
    if (typeof MutationObserver !== "undefined" && resultEl) {
      const mo = new MutationObserver(() => { injectSynastryBtn(); });
      mo.observe(resultEl, { childList: true, subtree: true });
    }
  }
}

// --- 8) DTR_TEMPLATE: minimal purchase flow ---
function mountPageDtrTemplateIfPresent() {
  const mainEl = document.querySelector("main");
  if (!mainEl || !document.getElementById("dtr-thanks-view")) return;

  const meta = consumeNavMeta();
  const contextKey = meta?.contextKey;
  if (!contextKey || (contextKey !== "CTX_CORE" && !String(contextKey).startsWith("CTX_SYNASTRY_"))) return;

  const productId = contextKeyToProductId(contextKey);
  if (!productId) return;

  const wrapper = document.createElement("div");
  wrapper.className = "dtr-template-purchase";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "button-primary";
  btn.textContent = "この記録を追加する";
  btn.onclick = async () => {
    const ok = window.confirm && window.confirm("記録を追加しますか？");
    if (!ok) return;
    const doc = document;
    const userHash = ensureUserHash();
    const h = g.M55?.handlePurchaseSuccess;
    const rpf = g.runPurchaseSuccessFlow;
    try {
      if (typeof h === "function") {
        await h(doc, { productId, userHash, meta: { ...meta, contextKey }, onNavigateChat: (m) => {
          navigateTo("PAGE_AI_CHAT", { chatCtx: "dtr", contextKey: m?.contextKey || contextKey });
        }, onNavigateHome: () => navigateTo("PAGE_HOME") });
      } else if (typeof rpf === "function") {
        await rpf(doc, { productId, userHash, meta: { ...meta, contextKey }, onNavigateChat: (m) => {
          navigateTo("PAGE_AI_CHAT", { chatCtx: "dtr", contextKey: m?.contextKey || contextKey });
        }, onNavigateHome: () => navigateTo("PAGE_HOME") });
      } else {
        await g.M55Purchase.grant(contextKey);
        navigateTo("PAGE_AI_CHAT", { chatCtx: "dtr", contextKey });
      }
    } catch (e) {
      systemHalt({ code: "M55_DTR_PURCHASE_FAIL", message: "Purchase flow failed (fail-closed)", detail: String(e?.message || e) });
    }
  };
  wrapper.appendChild(btn);
  mainEl.appendChild(wrapper);
}

if (typeof window.registerPage === "function") {
  window.registerPage("PAGE_AI_CHAT", mountPageAIChatIfPresent);
  window.registerPage("PAGE_HOME", () => {});
  window.registerPage("PAGE_TAROT", () => {});
  window.registerPage("PAGE_DTR_SHELF", () => {});
  window.registerPage("PAGE_MY_PAGE", () => {});
  window.registerPage("PAGE_DTR_TEMPLATE", mountPageDtrTemplateIfPresent);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    mountPageAIChatIfPresent();
  });
}
function runGatekeeperAndDtrTemplate() {
  runDtrGatekeeper();
  if (document.getElementById("dtr-thanks-view") && document.querySelector("main")) {
    mountPageDtrTemplateIfPresent();
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runGatekeeperAndDtrTemplate);
} else {
  runGatekeeperAndDtrTemplate();
}
