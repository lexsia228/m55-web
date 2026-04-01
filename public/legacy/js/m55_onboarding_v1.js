/**
 * m55_onboarding_v1.js
 * Profile onboarding overlay (SSOT-safe / Non-destructive)
 * - Runtime DOM only; no static HTML edits.
 * - No badge/loop/diagnosis wording.
 */
import { M55Profile } from "./m55_data_core.js";

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "プロファイル入力");
  overlay.className = "m55-onboarding-overlay";

  const style = document.createElement("style");
  style.textContent = `
    .m55-onboarding-overlay {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: rgba(249, 245, 255, 0.97);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
    }
    .m55-onboarding-overlay.is-visible { opacity: 1; }
    .m55-onboarding-overlay.is-hidden { opacity: 0; pointer-events: none; }
    .m55-onboarding-overlay:not(.prefers-reduced-motion) { transition: opacity 0.25s ease; }
    .m55-onboarding-panel {
      background: #fff;
      border-radius: 18px;
      padding: 24px;
      max-width: 360px;
      width: 100%;
      box-shadow: 0 12px 30px rgba(40, 18, 77, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.8);
    }
    .m55-onboarding-panel h2 { font-size: 16px; margin: 0 0 16px; color: #2f2640; }
    .m55-onboarding-panel label { display: block; font-size: 12px; color: #756a8a; margin-bottom: 4px; }
    .m55-onboarding-panel input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(188, 165, 255, 0.5); margin-bottom: 12px; }
    .m55-onboarding-panel button {
      width: 100%; padding: 12px; border-radius: 999px;
      background: linear-gradient(135deg, #e3d5ff, #f9efff);
      border: 1px solid rgba(188, 165, 255, 0.6);
      font-weight: 600; color: #2f2640; cursor: pointer;
    }
  `;
  overlay.appendChild(style);

  if (prefersReducedMotion()) overlay.classList.add("prefers-reduced-motion");

  const panel = document.createElement("div");
  panel.className = "m55-onboarding-panel";

  const heading = document.createElement("h2");
  heading.textContent = "はじめに";

  const labelNick = document.createElement("label");
  labelNick.textContent = "ニックネーム";
  const inputNick = document.createElement("input");
  inputNick.type = "text";
  inputNick.placeholder = "任意";
  inputNick.setAttribute("autocomplete", "off");

  const labelBirth = document.createElement("label");
  labelBirth.textContent = "生年月日";
  const inputBirth = document.createElement("input");
  inputBirth.type = "date";
  inputBirth.setAttribute("autocomplete", "off");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "保存して進む";

  panel.appendChild(heading);
  panel.appendChild(labelNick);
  panel.appendChild(inputNick);
  panel.appendChild(labelBirth);
  panel.appendChild(inputBirth);
  panel.appendChild(btn);
  overlay.appendChild(panel);

  btn.addEventListener("click", () => {
    const nickname = inputNick.value.trim();
    const raw = inputBirth.value;
    const birthDateISO = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    M55Profile.save({ nickname, birthDateISO });
    overlay.classList.add("is-hidden");
    overlay.classList.remove("is-visible");
    const t = prefersReducedMotion() ? 0 : 260;
    setTimeout(() => {
      overlay.remove();
      const ev = new CustomEvent("m55-profile-saved");
      document.dispatchEvent(ev);
    }, t);
  });

  return overlay;
}

function runOnboarding() {
  if (M55Profile.has()) return;
  const overlay = createOverlay();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runOnboarding);
} else {
  runOnboarding();
}
