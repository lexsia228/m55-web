/**
 * js/m55_chat_engine.js
 * M55 Chat Engine (Hardened for Gate Compliance)
 * - NO doc_createElAPI / timerAPI (Gate)
 * - Uses static <template> clones (DOM exists in HTML)
 * - No draft auto-save (silence; avoids timers/storage churn)
 * - TrustedStorage API: getItem/setItem(key, userHash)
 */

const STORAGE_KEY_GENERAL = "m55_chat_history_general_v1";
const STORAGE_KEY_DTR = "m55_chat_history_dtr_v1";
const STORAGE_KEY_DTR_UNKNOWN = "m55_chat_history_dtr_unknown_v1";

function sanitizeForStorageKey(raw) {
  const s = String(raw || "");
  return s.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

function strHash32(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export class M55ChatEngine {
  constructor(opts) {
    this.LogVault = opts.LogVault;
    this.TrustedStorage = opts.TrustedStorage;
    this.checkChatLimit = opts.checkChatLimit;
    this.getUserPlan = opts.getUserPlan;
    this.getUserHash = opts.getUserHash || (() => (window.M55_USER_HASH || localStorage.getItem("m55_user_hash") || null));

    this.contextKey = null;
    this.contextTitle = null;
    this.chatCtx = opts.chatCtx === "dtr" ? "dtr" : "general";

    this._els = null;
    this._msgTpl = null;
  }

  _storageKey() {
    if (this.chatCtx !== "dtr") return STORAGE_KEY_GENERAL;
    const ck = this.contextKey;
    if (ck === "CTX_DTR_UNKNOWN") return STORAGE_KEY_DTR_UNKNOWN;
    if (ck && typeof ck === "string" && ck.trim()) {
      const safe = sanitizeForStorageKey(ck);
      const suffix = strHash32(ck);
      return `m55_chat_history_dtr_${safe}_${suffix}_v1`;
    }
    return STORAGE_KEY_DTR;
  }

  _loadHistory() {
    try {
      const raw = localStorage.getItem(this._storageKey());
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  _saveHistory(messages) {
    try {
      localStorage.setItem(this._storageKey(), JSON.stringify(messages));
    } catch {
      /* no-op */
    }
  }

  clearHistory() {
    try {
      localStorage.removeItem(this._storageKey());
    } catch {
      /* no-op */
    }
    const { historyEl } = this._els || {};
    if (historyEl) {
      historyEl.innerHTML = "";
      this._renderEmptyIfNeeded();
    }
  }

  setChatContext(contextKey, contextTitle) {
    this.contextKey = contextKey || null;
    this.contextTitle = contextTitle || "AIチャット";
    const bar = this._els?.contextEl;
    if (bar) {
      bar.textContent = this.contextTitle;
      bar.dataset.status = this.contextKey ? "context" : "idle";
      bar.setAttribute("aria-label", this.contextTitle);
    }
  }

  mount({ historyEl, inputEl, sendBtnEl, contextEl, emptyEl, toastEl, jumpLatestBtnEl, bottomSentinelEl, msgTemplateEl }) {
    if (!historyEl || !inputEl || !sendBtnEl || !contextEl) return;

    this._els = { historyEl, inputEl, sendBtnEl, contextEl, emptyEl, toastEl, jumpLatestBtnEl, bottomSentinelEl };
    this._msgTpl = msgTemplateEl || document.getElementById("chat-bubble-template");

    // default context label (no URL injection)
    if (!this.contextTitle) this.setChatContext(null, "AIチャット");

    const saved = this._loadHistory();
    for (const m of saved) {
      if (m && typeof m === "object" && (m.role === "user" || m.role === "assistant")) {
        this._appendMessage({ role: m.role, text: String(m.text || "") });
      }
    }

    sendBtnEl.addEventListener("click", () => this._onSend());
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this._onSend();
      }
    });

    this._renderEmptyIfNeeded();
    this._scrollToBottom();
  }

  async _onSend() {
    const { inputEl } = this._els;
    const text = String(inputEl.value || "").trim();
    if (!text) return;

    // limit check
    const plan = this.getUserPlan ? this.getUserPlan() : "free";
    const lim = this.checkChatLimit ? await this.checkChatLimit(plan, this.contextKey) : { ok: true };

    if (!lim.ok) {
      this._toast(lim.message || "今日はここまで。");
      return;
    }

    inputEl.value = "";

    this._appendMessage({ role: "user", text });

    // NOTE: actual LLM call is out-of-scope in this patch.
    // Keep it silent and deterministic (no timers). Provide placeholder response.
    this._appendMessage({ role: "assistant", text: "……" });

    this._renderEmptyIfNeeded();
    this._scrollToBottom();
  }

  _appendMessage({ role, text }) {
    const { historyEl } = this._els;
    if (!historyEl || !this._msgTpl) return;

    const node = this._msgTpl.content.firstElementChild.cloneNode(true);
    node.dataset.role = role;

    const bubble = node.querySelector("[data-part='bubble']");
    const body = node.querySelector("[data-part='text']");
    if (bubble) bubble.classList.toggle("is-user", role === "user");
    if (body) body.textContent = text;

    historyEl.appendChild(node);
    this._persistFromDOM();
  }

  _persistFromDOM() {
    const { historyEl } = this._els;
    if (!historyEl) return;
    const messages = [];
    for (const row of historyEl.children) {
      const role = row.dataset?.role;
      if (role !== "user" && role !== "assistant") continue;
      const body = row.querySelector("[data-part='text']");
      const text = body ? (body.textContent || "").trim() : "";
      messages.push({ role, text });
    }
    this._saveHistory(messages);
  }

  _renderEmptyIfNeeded() {
    const { historyEl, emptyEl } = this._els;
    if (!emptyEl || !historyEl) return;
    const hasMsgs = historyEl.children.length > 0;
    emptyEl.style.display = hasMsgs ? "none" : "";
  }

  _scrollToBottom() {
    const { historyEl } = this._els;
    if (!historyEl) return;
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  _toast(message) {
    const { toastEl } = this._els;
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.dataset.state = "show";
    // No timers; auto-hide handled by CSS (or user action) if desired.
  }
}
