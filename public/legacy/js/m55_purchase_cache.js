/**
 * M55 Purchase Cache (SSOT v1.0.1)
 * Wraps TrustedStorage to enforce Purchase Key Schema.
 *
 * Canonical store product IDs:
 * - dtr_core_origin
 * - dtr_synastry_{partnerHash}
 * - dtr_weekly_tide (requires meta.weekKey + meta.expiresAt)
 * - dtr_daily_spot (requires meta.dateKey + meta.expiresAt)
 *
 * Back-compat accepted:
 * - dtr_daily_spot_{YYYY-MM-DD}
 */

import { DataCore } from './m55_data_core.js';
import { systemHalt } from './system_halt.js';

const { storage } = DataCore;

const KEY = {
  CORE: 'm55_p:core_origin',
  SYN_INDEX: 'm55_p:syn_index',
  SYN: (partnerHash) => `m55_p:syn:${partnerHash}`,
  WEEK: (weekKey) => `m55_p:week:${weekKey}`,
  DAY: (dateKey) => `m55_p:day:${dateKey}`,
};

function uniqPush(arr, v) {
  if (!Array.isArray(arr)) return [v];
  if (!arr.includes(v)) arr.push(v);
  return arr;
}

export const PurchaseCache = {
  /**
   * Save purchase record (Atomic) – Async because TrustedStorage uses HMAC.
   * @param {string} productId
   * @param {string} userHash
   * @param {Object} [meta]
   */
  async registerPurchase(productId, userHash, meta = {}) {
    if (!productId || !userHash) {
      systemHalt("M55_PURCHASE_INPUT_MISSING");
      throw new Error("[M55 PurchaseCache] productId & userHash are required (fail-closed).");
    }

    // 1) Core (Permanent)
    if (productId === 'dtr_core_origin') {
      await storage.setItem(KEY.CORE, true, userHash);
      return;
    }

    // 2) Synastry (Permanent + Index)
    if (productId.startsWith('dtr_synastry_')) {
      const partnerHash = productId.replace('dtr_synastry_', '');
      await this._registerSynastryIndex(partnerHash, userHash);
      return;
    }

    // 3) Weekly (Transient)
    if (productId === 'dtr_weekly_tide') {
      if (!meta.weekKey || !meta.expiresAt) {
        throw new Error('[M55 PurchaseCache] Weekly requires meta.weekKey & meta.expiresAt');
      }
      await storage.setItem(KEY.WEEK(meta.weekKey), Number(meta.expiresAt), userHash);
      return;
    }

    // 4) Daily (Transient) - Canonical: constant productId + meta
    if (productId === 'dtr_daily_spot') {
      if (!meta.dateKey || !meta.expiresAt) {
        throw new Error('[M55 PurchaseCache] Daily requires meta.dateKey & meta.expiresAt');
      }
      await storage.setItem(KEY.DAY(meta.dateKey), Number(meta.expiresAt), userHash);
      return;
    }

    // 4b) Daily (Back-compat): suffixed ID
    if (productId.startsWith('dtr_daily_spot_')) {
      const dateKey = productId.replace('dtr_daily_spot_', '');
      if (!meta.expiresAt) { throw new Error('expiresAt_missing'); }
      const exp = Number(meta.expiresAt);
      await storage.setItem(KEY.DAY(dateKey), exp, userHash);
      return;
    }
    systemHalt({ code: 'M55_UNKNOWN_PRODUCT_ID', message: 'Unknown productId (fail-closed)', detail: String(productId) });
    throw new Error(`[M55 PurchaseCache] Unknown productId (fail-closed): ${String(productId)}`);
  },

  /**
   * Ownership checks (Offline-first)
   * @param {'core'|'synastry'|'week'|'day'} type
   * @param {Object} arg
   * @param {string} userHash
   * @param {number} [now]
   */
  async hasRight(type, arg, userHash, now = Date.now()) {
    if (!userHash) systemHalt({ code: "M55_USER_HASH_MISSING", message: "userHash is required (fail-closed).", detail: "PurchaseCache.hasRight" });

    if (type === 'core') {
      return !!(await storage.getItem(KEY.CORE, userHash));
    }

    if (type === 'synastry' && arg?.partnerHash) {
      return !!(await storage.getItem(KEY.SYN(arg.partnerHash), userHash));
    }

    if (type === 'week' && arg?.weekKey) {
      const exp = await storage.getItem(KEY.WEEK(arg.weekKey), userHash);
      return typeof exp === 'number' && now < exp;
    }

    if (type === 'day' && arg?.dateKey) {
      const exp = await storage.getItem(KEY.DAY(arg.dateKey), userHash);
      return typeof exp === 'number' && now < exp;
    }

    return false;
  },

  /**
   * Membrane Generator: list purchased partner hashes.
   * @param {string} userHash
   * @returns {Promise<string[]>}
   */
  async getAllSynastryPartners(userHash) {
    const index = (await storage.getItem(KEY.SYN_INDEX, userHash)) || [];
    const result = [];
    for (const partnerHash of Array.isArray(index) ? index : []) {
      const ok = await storage.getItem(KEY.SYN(partnerHash), userHash);
      if (ok) result.push(partnerHash);
    }
    return result;
  },

  /**
   * Update synastry index and store individual marker (redundant but robust).
   */
  async _registerSynastryIndex(partnerHash, userHash) {
    const index = (await storage.getItem(KEY.SYN_INDEX, userHash)) || [];
    await storage.setItem(KEY.SYN_INDEX, uniqPush(index, partnerHash), userHash);
    await storage.setItem(KEY.SYN(partnerHash), true, userHash);
  }
};
