/**
 * js/m55_home_bind.js
 * Home binder (SSOT-safe / Safe-Guard Edition)
 */
import { DataCore, M55Profile } from "./m55_data_core.js";
import { navigateTo } from "./routes_manifest.js";
import "./m55_onboarding_v1.js";

// Safe haptics: bridgeが無くてもエラーを出さない no-op 化
const hSel = globalThis.M55Haptics?.hSel?.bind(globalThis.M55Haptics) || (() => {});

function tzGuess() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
  } catch {
    return "Asia/Tokyo";
  }
}

function setDots(rootEl, status0123) {
  const dots = rootEl?.querySelectorAll?.(".dots .dot");
  if (!dots || dots.length < 3) return;
  dots.forEach((d) => d.classList.remove("active"));
  const n = Math.max(0, Math.min(3, Number(status0123) || 0));
  for (let i = 0; i < n; i++) dots[i].classList.add("active");
}

function setMeterFill(rootEl, fill01) {
  const bar = rootEl?.querySelector?.(".meter-bar");
  if (!bar) return;
  const pct = Math.round(Math.max(0, Math.min(1, Number(fill01) || 0)) * 100);
  bar.style.setProperty("--meter-fill-pct", String(pct));
}

function bindMeterOnce() {
  const meterCard = document.querySelector(".meter-card");
  if (!meterCard) return;
  try {
    const tz = tzGuess();
    const logs = DataCore.logs.getAllLogs();
    const st = DataCore.meter.computeMeterState(logs, { tz });
    const daysEl = document.getElementById("meter-days-count");
    if (daysEl) daysEl.textContent = String(st.days90 ?? "--");
    setMeterFill(meterCard, st.fill01);
    setDots(meterCard, st.threeDotStatus);
  } catch {
    /* no-op: DataCore not ready or policy missing; leave default -- and 0 fill */
  }
}

function installInteractions(doc = document) {
  const topTabs = doc.querySelectorAll(".top-tabs .top-tab");
  const navItems = doc.querySelectorAll(".bottom-nav .nav-item");

  const hasFullNav = doc.querySelector(".bottom-nav");
  if (!topTabs || topTabs.length < 5) {
    throw new Error("[M55 fail-closed] index.html DOM mismatch: expected 5 .top-tab in .top-tabs");
  }
  if (hasFullNav && (!navItems || navItems.length < 5)) {
    throw new Error("[M55 fail-closed] index.html DOM mismatch: expected 5 .nav-item in .bottom-nav");
  }

  topTabs.forEach((el, i) => {
    if (i === 0) {
      el.addEventListener("click", () => navigateTo("PAGE_CORE"));
    } else if (i === 1) {
      el.addEventListener("click", () => navigateTo("PAGE_SYNASTRY"));
    } else if (i === 2) {
      el.addEventListener("click", () => navigateTo("PAGE_TODAY"));
    } else if (i === 3) {
      el.addEventListener("click", () => navigateTo("PAGE_WEEKLY"));
    } else if (i === 4) {
      el.addEventListener("click", () => navigateTo("PAGE_CALENDAR"));
    }
  });

  navItems.forEach((el, i) => {
    if (i === 1 || i === 3) {
      el.classList.add("is-disabled");
      el.setAttribute("aria-disabled", "true");
    }
    if (i === 0) {
      el.addEventListener("click", () => navigateTo("PAGE_HOME"));
    } else if (i === 2) {
      el.addEventListener("click", () => navigateTo("PAGE_AI_CHAT", { chatCtx: "general" }));
    } else if (i === 4) {
      el.addEventListener("click", () => navigateTo("PAGE_MYPAGE"));
    }
  });

  const meterCard = doc.querySelector(".meter-card");
  if (meterCard) {
    meterCard.addEventListener("click", () => {
      hSel();
      meterCard.classList.add("is-pressed");
      window.setTimeout(() => meterCard.classList.remove("is-pressed"), 140);
      navigateTo("PAGE_METER");
    });
  }
}

function injectNickname(doc = document) {
  const profile = M55Profile.load();
  const headerRight = doc.querySelector(".header-right");
  if (!headerRight) return;
  const existing = headerRight.querySelector(".profile-nickname");
  if (existing) existing.remove();
  if (!profile?.nickname) return;
  const span = doc.createElement("span");
  span.className = "profile-nickname";
  span.style.cssText = "font-size:12px;color:var(--text-sub);";
  span.textContent = profile.nickname;
  headerRight.appendChild(span);
}

document.addEventListener("DOMContentLoaded", () => {
  bindMeterOnce();
  installInteractions();
  injectNickname();
  document.addEventListener("m55-profile-saved", injectNickname);
});