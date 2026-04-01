/**
 * M55 Data Core (SSOT v1.1 Compliant)
 * Includes: TrustedStorage (tamper-evident), LogVault (plan-aware retention), MeterEngine (pure calc)
 *
 * NOTE:
 * - This module is ESM. If your runtime is non-module, wrap it or bundle it.
 */

import { systemHalt } from "./system_halt.js";

// Layer1 ONLY: retention is defined in policies/m55_retention_v1_0.json
const RETENTION_URL = new URL("../policies/m55_retention_v1_0.json", import.meta.url).toString();
let _retPolicyCache = null;
let _retPolicyError = false;

async function loadRetentionPolicyOrHalt() {
  if (_retPolicyCache) return _retPolicyCache;
  if (_retPolicyError) {
    systemHalt("M55_POLICY_MISSING");
    throw new Error("M55_POLICY_MISSING");
  }
  try {
    const res = await fetch(RETENTION_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("M55_POLICY_FETCH_FAILED");
    const json = await res.json();
    const logs = json && typeof json === "object" ? json.logs : null;
    if (!logs || typeof logs !== "object") throw new Error("M55_POLICY_INVALID");
    _retPolicyCache = json;
    return _retPolicyCache;
  } catch {
    _retPolicyError = true;
    systemHalt("M55_POLICY_MISSING");
    throw new Error("M55_POLICY_MISSING");
  }
}

function retentionDaysForTierOrHalt(retPolicy, tier) {
  const logs = retPolicy?.logs;
  if (!logs) {
    systemHalt("M55_POLICY_MISSING");
    throw new Error("M55_POLICY_MISSING");
  }
  const key = tier === "premium" ? "premium_days" : tier === "standard" ? "standard_days" : "free_days";
  const days = logs[key];
  if (!Number.isFinite(days) || days < 0) {
    systemHalt("M55_POLICY_INVALID");
    throw new Error("M55_POLICY_INVALID");
  }
  return days;
}

function nowMs() { return Date.now(); }
function daysToMs(d) { return d * 24 * 60 * 60 * 1000; }

function toUint8(str) {
  return new TextEncoder().encode(str);
}
function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, "0")).join("");
}


function requireUserHash(userHash) {
  if (!userHash || typeof userHash !== "string" || !userHash.trim()) {
    // Fail-closed: identity is mandatory.
    systemHalt("M55_USER_HASH_MISSING");
  }
  return userHash.trim();
}

async function hmacSha256(message, userHash) {
  if (!userHash || typeof userHash !== "string" || !userHash.trim()) {
    throw new Error("M55_USER_HASH_MISSING");
  }
  const keyBytes = toUint8(userHash.trim());
  const msgBytes = toUint8(message);
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) {
    systemHalt("M55_CRYPTO_UNAVAILABLE");
    throw new Error("M55_CRYPTO_UNAVAILABLE");
  }
  const key = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await subtle.sign("HMAC", key, msgBytes);
  return bytesToHex(sig);
}

async function signPayload(payload, userHash) {
  const uh = requireUserHash(userHash);
  const sig = await hmacSha256(payload, uh);
  if (!sig) {
    // crypto.subtle unavailable => treat as integrity inability (fail-closed).
    systemHalt("M55_CRYPTO_UNAVAILABLE");
  }
  return sig;
}


const SECURE_NS = "m55_secure:";

export const TrustedStorage = {
  /**
   * @param {string} key
   * @param {any} value
   * @param {string} userHash
   */
  async setItem(key, value, userHash) {
    const payload = JSON.stringify(value);
    const packet = {
      v: payload,
      s: await signPayload(payload, userHash),
      t: Date.now(),
    };
    try {
      localStorage.setItem(`${SECURE_NS}${key}`, JSON.stringify(packet));
    } catch (e) {
      systemHalt("M55_STORAGE_WRITE_FAILED");
    }
  },

  /**
   * @param {string} key
   * @param {string} userHash
   * @returns {Promise<any>} (fails closed on missing/tamper)
   */
  async getItem(key, userHash) {
    let raw = null;
    try {
      raw = localStorage.getItem(`${SECURE_NS}${key}`);
    } catch (e) {
      systemHalt("M55_STORAGE_READ_FAILED");
    }
    if (!raw) systemHalt({ code: 'M55_STORAGE_PACKET_MISSING', message: 'TrustedStorage packet missing (fail-closed).', detail: String(key) });
    try {
      const packet = JSON.parse(raw);
      const checkSig = await signPayload(packet.v, userHash);
      if (checkSig !== packet.s) {
        console.warn(`[M55 Security] Tamper detected for ${key}. Discarding.`);
        systemHalt({ code: 'M55_STORAGE_TAMPER_DETECTED', message: 'TrustedStorage tamper detected (fail-closed).', detail: String(key) });
      }
      return JSON.parse(packet.v);
    } catch (e) {
      systemHalt({ code: 'M55_STORAGE_PACKET_INVALID', message: 'TrustedStorage packet invalid (fail-closed).', detail: String(e?.message || e) });
    }
  }
};

const LOG_KEY = "m55_logs_v1";
const MAX_LOGS = 10000;

function daysToMs(d) {
  return Math.floor(d) * 24 * 60 * 60 * 1000;
}

function keepNotExpired(items, now) {
  const arr = Array.isArray(items) ? items : [];
  return arr.filter((x) => {
    if (!x || typeof x !== "object") return false;
    const exp = x.expires_at;
    // STRICT: expires_at must exist and be a finite UTC-ms number.
    if (!Number.isFinite(exp)) return false;
    return now < exp;
  });
}

export const LogVault = {
  /**
   * Append a log entry and prune by expires_at/capacity.
   * Layer0 rule: cache adoption condition is ALWAYS now < expires_at.
   * @param {Object} log
   * @param {string} log.type
   * @param {string} log.body
   * @param {string[]} [log.tags]
   * @param {string} [log.dayKey] YYYY-MM-DD in user TZ (preferred)
   * @param {Object} [opt]
   * @param {"free"|"standard"|"premium"} opt.tier
   * @param {number} [opt.now] timestamp ms
   * @returns {Array} updated list
   */
  async pushLog(log, opt = {}) {
    const now = Number.isFinite(opt.now) ? opt.now : Date.now();
    const tier = opt.tier;
    if (tier !== "free" && tier !== "standard" && tier !== "premium") {
      systemHalt({
        code: "M55_POLICY_MISSING",
        message: "LogVault requires opt.tier (fail-closed).",
        detail: String(tier),
      });
    }

    // Ensure policy is available; do not infer.
    await loadRetentionPolicy();
    if (!_retPolicyCache) {
      systemHalt({
        code: "M55_POLICY_MISSING",
        message: "Retention policy missing/invalid (fail-closed).",
        detail: "m55_retention_v1_0.json",
      });
    }

    const retentionDays = getLogRetentionDaysOrHalt(_retPolicyCache, tier);
    if (!(retentionDays > 0)) {
      // No retention => do not persist (fail-closed).
      return this.getAllLogs();
    }

    // NOTE(FROZEN): random-based fallback is forbidden. If crypto.randomUUID is unavailable,
    // use a deterministic runtime sequence (no randomness; no storage dependency).
    const __m55SeqKey = "__m55_seq_runtime";
    const __m55Seq = (globalThis[__m55SeqKey] = (Number(globalThis[__m55SeqKey]) || 0) + 1);

    const entry = {
      id: globalThis.crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `m55_${now}_${__m55Seq}`,
      ts: now,
      // UTC ms (required). Adopt rule: now < expires_at
      expires_at: now + daysToMs(retentionDays),
      type: log.type || "generic",
      body: String(log.body || ""),
      tags: Array.isArray(log.tags) ? log.tags : [],
      dayKey: log.dayKey || null,
    };

    let logs = this.getAllLogs();
    logs.push(entry);

    // STRICT retention: now < expires_at only
    logs = keepNotExpired(logs, now);

    if (logs.length > MAX_LOGS) logs = logs.slice(logs.length - MAX_LOGS);
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      systemHalt("M55_LOG_WRITE_FAILED");
    }

    return logs;
  },

  /**
   * Prune logs only (no write).
   * @param {Object} opt
   * @param {number} opt.retentionDays
   * @param {number} [opt.now]
   * @returns {Array} pruned list
   */
  vacuum(opt) {
    const now = Number.isFinite(opt?.now) ? opt.now : Date.now();
    let logs = this.getAllLogs();
    logs = keepNotExpired(logs, now);
    if (logs.length > MAX_LOGS) logs = logs.slice(logs.length - MAX_LOGS);
    return logs;
  },

  getAllLogs() {
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
} catch (e) {
      systemHalt({ code: "M55_LOGS_PACKET_INVALID", message: "LogVault packet invalid (fail-closed)", detail: String(e?.message || e) });
      throw e;
    }
  }
};

function toDayKey(ts, tz = "Asia/Tokyo") {
  // Uses Intl formatting to avoid timezone math bugs.
  const d = new Date(ts);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // YYYY-MM-DD
}

export function computeMeterState(logs, opt = {}) {
  const now = Number.isFinite(opt.now) ? opt.now : Date.now();
  const tz = opt.tz || "Asia/Tokyo";
  const windowDays = 90;
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;

  const recent = (Array.isArray(logs) ? logs : []).filter(l => typeof l.ts === "number" && l.ts >= cutoff && l.ts <= now);

  const daySet = new Set();
  for (const l of recent) {
    const dk = l.dayKey || toDayKey(l.ts, tz);
    if (dk) daySet.add(dk);
  }
  const days = daySet.size;

  const threeDotStatus = days >= 90 ? 3 : days >= 30 ? 2 : days >= 7 ? 1 : 0;

  const zoneShort = days >= 30 ? "澄み" : days >= 7 ? "育ち" : "芽吹き";
  const zoneLong = days >= 90 ? "結晶" : days >= 30 ? "深まり" : "積もり";

  return {
    days90: days,
    fill01: Math.max(0, Math.min(1, days / 90)),
    threeDotStatus,
    zoneShort,
    zoneLong,
    milestones: { d7: days >= 7, d30: days >= 30, d90: days >= 90 }
  };
}

// Profile (nickname, birthDate) — plain localStorage, no TrustedStorage (no userHash at onboarding)
const PROFILE_KEY = "m55_profile_v1";
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const M55Profile = {
  save(obj) {
    const nickname = typeof obj?.nickname === "string" ? obj.nickname.trim() : "";
    const birthDateISO = typeof obj?.birthDateISO === "string" && ISO_DATE_REGEX.test(obj.birthDateISO) ? obj.birthDateISO : null;
    const payload = { nickname, birthDateISO };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(payload));
    } catch (e) {
      systemHalt({ code: "M55_PROFILE_WRITE_FAILED", message: "Profile save failed (fail-closed).", detail: String(e?.message || e) });
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      return {
        nickname: typeof obj.nickname === "string" ? obj.nickname : "",
        birthDateISO: typeof obj.birthDateISO === "string" ? obj.birthDateISO : null
      };
    } catch {
      return null;
    }
  },
  has() {
    const p = this.load();
    return !!p && (!!p.nickname || !!p.birthDateISO);
  },
  clear() {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      /* no-op */
    }
  }
};

export const DataCore = {
  storage: TrustedStorage,
  logs: LogVault,
  meter: { computeMeterState }
};
