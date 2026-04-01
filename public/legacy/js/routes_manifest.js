// M55 Routes Manifest
// Lightweight router helpers (no framework). No URL query injection.

import { systemHalt } from "./system_halt.js";


// =============================================================================
// Time helpers (FROZEN / Unique Route)
// - The following helpers are the ONLY allowed route for daily/weekly keys and boundaries.
// - Boundary rules: daily = local civil day (user TZ); weekly = ISO week with boundary Monday 00:00 (user TZ).
// - Implementation note: this is a pure helper; callers must supply the correct user TZ offset handling
//   at the integration layer when a full timezone library is not available.
// =============================================================================

export function civilDateKey(date) {
  // date: Date (already representing user-local time)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoWeekYearAndNumber(date) {
  // date: Date (already representing user-local time)
  // ISO week date algorithm (local)
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const weekYear = tmp.getFullYear();
  // Jan 4 is always in week 1.
  const week1 = new Date(weekYear, 0, 4);
  week1.setHours(0, 0, 0, 0);
  // Calculate full weeks to tmp.
  const diff = tmp.getTime() - week1.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNumber = 1 + Math.round(diff / oneWeek);
  return { weekYear, weekNumber };
}

export function isoWeekKeyFromCivilDate(date) {
  const { weekYear, weekNumber } = isoWeekYearAndNumber(date);
  const ww = String(weekNumber).padStart(2, "0");
  return `${weekYear}-W${ww}`;
}

export function weekBoundaryStartMonday00(date) {
  // Returns Monday 00:00 (local) of the week containing `date`
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  const day = (tmp.getDay() + 6) % 7; // Mon=0..Sun=6
  tmp.setDate(tmp.getDate() - day);
  return tmp;
}

export const M55_ROUTES = Object.freeze({
  PAGE_HOME: "index.html",
  PAGE_TODAY: "today.html",
  PAGE_WEEKLY: "weekly.html",
  PAGE_METER: "meter.html",
  PAGE_CALENDAR: "calendar.html",
  PAGE_AI_CHAT: "page_chat.html",
  PAGE_MYPAGE: "page_mypage.html",
  PAGE_CORE: "core.html",
  PAGE_SYNASTRY: "synastry.html",
  PAGE_DTR_TEMPLATE: "DTR_TEMPLATE.html",
});

export function getRouteUserHash() {
  // Strict: must be supplied by host app or already stored.
  const g = globalThis;
  const direct = g.M55_USER_HASH;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  try {
    const v = localStorage.getItem("m55_user_hash");
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch (e) {
    systemHalt({ code: "M55_STORAGE_READ_FAILED", message: "Unable to read route user hash (fail-closed)", detail: String(e?.message || e) });
  }

  return null;
}

export function requireRouteUserHash() {
  const h = getRouteUserHash();
  if (!h) {
    systemHalt({
      code: "M55_USER_HASH_MISSING",
      message: "User hash is required but missing.",
      detail: "Provide window.M55_USER_HASH or localStorage key 'm55_user_hash' (pre-seeded by host).",
    });
  }
  return h;
}

export function navigateTo(pageKey, opts = {}) {
  const href = M55_ROUTES[pageKey] || pageKey;
  const replace = !!opts.replace;
  if (!href) {
    systemHalt({ code: "M55_ROUTE_MISSING", message: "Unknown route.", detail: String(pageKey) });
  }
  try {
    if (opts && typeof opts === "object") {
      const hasNavContext = opts.chatCtx !== undefined || opts.contextKey !== undefined || opts.partnerHash !== undefined || opts.returnTo !== undefined;
      if (hasNavContext) {
        const meta = {};
        if (opts.chatCtx !== undefined) meta.chatCtx = opts.chatCtx;
        if (opts.contextKey !== undefined) meta.contextKey = opts.contextKey;
        if (opts.partnerHash !== undefined) meta.partnerHash = opts.partnerHash;
        if (opts.returnTo !== undefined) meta.returnTo = opts.returnTo;
        sessionStorage.setItem("m55_nav_meta_v1", JSON.stringify(meta));
      }
    }
    if (replace) window.location.replace(href);
    else window.location.href = href;
  } catch (e) {
    systemHalt({ code: "M55_NAV_FAILED", message: "Navigation failed.", detail: String(e?.message || e) });
  }
}

const NAV_META_KEY = "m55_nav_meta_v1";

export function consumeNavMeta() {
  try {
    const raw = sessionStorage.getItem(NAV_META_KEY);
    sessionStorage.removeItem(NAV_META_KEY);
    if (!raw || typeof raw !== "string") return null;
    const meta = JSON.parse(raw);
    return meta && typeof meta === "object" ? meta : null;
  } catch (e) {
    if (typeof process !== "undefined" && process?.env?.NODE_ENV === "development") {
      console.warn("[M55] consumeNavMeta parse failed:", e);
    }
    return null;
  }
}

export async function handlePurchaseSuccess(docOrMeta = null, maybeArgs = undefined) {
  // Avoid hard dependency in case route manifest is imported early.
  const mod = await import("./phase3_wiring_async.js");
  if (!mod?.runPurchaseSuccessFlow) {
    systemHalt({ code: "M55_PURCHASE_FLOW_MISSING", message: "Purchase success flow is missing." });
  }

  // Strict bridge: prefer (doc, args). For legacy single-arg calls, require meta.doc.
  let doc = docOrMeta;
  let args = maybeArgs;
  if (args === undefined) {
    const meta = docOrMeta;
    if (!meta || typeof meta !== "object") {
      systemHalt({ code: "M55_PURCHASE_ARGS_MISSING", message: "handlePurchaseSuccess requires (doc, args) or meta.doc." });
    }
    if (!meta.doc || typeof meta.doc !== "object") {
      systemHalt({ code: "M55_PURCHASE_DOC_MISSING", message: "meta.doc is required (fail-closed)." });
    }
    doc = meta.doc;
    args = meta;
  }

  if (!doc || typeof doc !== "object" || !args || typeof args !== "object") {
    systemHalt({ code: "M55_PURCHASE_ARGS_INVALID", message: "Invalid purchase success args (fail-closed)." });
  }
  return await mod.runPurchaseSuccessFlow(doc, args);
}


// Expose minimal globals (debug-friendly)
(() => {
  const g = globalThis;
  g.M55 = g.M55 || {};
  g.M55.ROUTES = M55_ROUTES;
  g.M55.navigateTo = navigateTo;
  g.M55.requireUserHash = requireRouteUserHash;
  g.M55.handlePurchaseSuccess = handlePurchaseSuccess;
  g.M55Nav = g.M55Nav || { consumeNavMeta };
  g.onNavigateChat = (meta) => {
    const m = meta && typeof meta === "object" ? meta : {};
    const chatCtx = m.chatCtx ?? (String(m.contextKey || "").startsWith("CTX_") ? "dtr" : "general");
    navigateTo("PAGE_AI_CHAT", { chatCtx });
  };
})();
