/**
 * M55 Phase 3 Wiring Contract v1.1 (Async + Meta Strict)
 * SSOT: M55_Purchase_Key_SSOT_v1_0_1, M55_Monetization_SSOT_v1_0
 *
 * Rules:
 * - Persist rights atomically (TrustedStorage).
 * - Weekly/Daily MUST supply meta (weekKey/dateKey + expiresAt).
 * - Thanks View is STATIC DOM only (no creation, no HTML_injection).
 * - Silence: no auto-chat; wait for user tap.
 */

import { PurchaseCache } from './m55_purchase_cache.js';
import { systemHalt } from './system_halt.js';

/**
 * @param {Document} doc
 * @param {Object} args
 * @param {string} args.productId
 * @param {string} args.userHash
 * @param {Object} args.meta Meta object. REQUIRED for time-bounded purchases (weekly/daily + back-compat identifiers). For static purchases, pass {}.
 * @param {Function} [args.jumpToCore]
 * @param {Function} [args.onNavigateChat]
 * @param {Function} [args.onNavigateHome]
 */
export async function runPurchaseSuccessFlow(
  doc,
  { productId, userHash, meta = {}, jumpToCore, onNavigateChat, onNavigateHome }
) {
  // 0) Validate
  if (!doc || !productId || !userHash) {
    systemHalt({ code: "M55_WIRING_MISSING_ARGS", message: "[M55 Wiring] Missing required args: doc/productId/userHash" });
  }

  // 1) Persist Right (Atomic) with Meta Strictness
  try {
    const isWeekly = productId === 'dtr_weekly_tide';
    const isDailyCanonical = productId === 'dtr_daily_spot';
    const isDailyCompat = productId.startsWith('dtr_daily_spot_');

    if (isWeekly) {
      if (!meta.weekKey || !meta.expiresAt) {
        throw new Error('[M55 Wiring] Weekly requires meta.weekKey & meta.expiresAt');
      }
      await PurchaseCache.registerPurchase(productId, userHash, meta);
    } else if (isDailyCanonical) {
      if (!meta.dateKey || !meta.expiresAt) {
        throw new Error('[M55 Wiring] Daily requires meta.dateKey & meta.expiresAt');
      }
      await PurchaseCache.registerPurchase(productId, userHash, meta);
    } else if (isDailyCompat) {
      // Back-compat path; meta.expiresAt REQUIRED (fail-closed; no inference).
      await PurchaseCache.registerPurchase(productId, userHash, meta);
    } else {
      await PurchaseCache.registerPurchase(productId, userHash);
    }
  } catch (e) {
    systemHalt({ code: "M55_PURCHASE_PERSIST_FAIL", message: "[M55 Wiring] Purchase persistence failed (fail-closed)", detail: String(e?.message || e) });
  }

  // 2) Map Product to Context (Static Mapping)
  let contextKey = null;
  let contextTitle = '';
  let rightsText = '';
  let dateKey = meta.dateKey || null;
  let weekKey = meta.weekKey || null;

  if (productId === 'dtr_core_origin') {
    contextKey = 'CTX_CORE';
    contextTitle = '本質レポート';
    rightsText = '・詳細レポート（永続）\n・棚に残り、再訪できます';
  } else if (productId.startsWith('dtr_synastry_')) {
    const partnerHash = productId.replace('dtr_synastry_', '');
    contextKey = `CTX_SYNASTRY_${partnerHash}`;
    contextTitle = '相性レポート';
    rightsText = '・詳細レポート（永続）\n・棚に残り、再訪できます';
  } else if (productId === 'dtr_weekly_tide') {
    contextKey = weekKey ? `CTX_WEEKLY_${weekKey}` : 'CTX_WEEKLY';
    contextTitle = '週間予報';
    rightsText = '・今週のレポート閲覧';
  } else if (productId === 'dtr_daily_spot') {
    contextKey = dateKey ? `CTX_CALENDAR_${dateKey}` : 'CTX_CALENDAR';
    contextTitle = '日運詳細';
    rightsText = '・当日の詳細閲覧';
  } else if (productId.startsWith('dtr_daily_spot_')) {
    const dk = productId.replace('dtr_daily_spot_', '');
    contextKey = `CTX_CALENDAR_${dk}`;
    contextTitle = '日運詳細';
    rightsText = '・当日の詳細閲覧';
  }

  // 3) Jump to Core (Once) - behind modal
  if (productId === 'dtr_core_origin' && typeof jumpToCore === 'function') {
    try {
    jumpToCore();
  } catch (e) {
    systemHalt({ code: 'M55_POST_PURCHASE_JUMP_FAILED', message: '[M55 Wiring] Post-purchase jump failed (fail-closed).', detail: String(e?.message || e) });
  }
  }

  // 4) Show Thanks View (Static DOM Only)
  const thanksView = doc.getElementById('dtr-thanks-view');
  if (!thanksView) {
    systemHalt({ code: "M55_WIRING_MISSING_DOM", message: "[M55 Wiring] Missing required DOM: #dtr-thanks-view" });
  }

  // 4-A) Update Text (textContent only)
  const elTitle = thanksView.querySelector('[data-testid="thanks-title"]');
  const elRights = thanksView.querySelector('[data-testid="thanks-rights"]');
  if (elTitle) elTitle.textContent = '受け取りました';
  if (elRights) elRights.textContent = rightsText || '';

  // 4-B) Bind Buttons
  const btnChat = thanksView.querySelector('[data-testid="btn-thanks-chat"]');
  const btnHome = thanksView.querySelector('[data-testid="btn-thanks-home"]');

  if (btnChat) {
    btnChat.onclick = () => {
      thanksView.classList.add('is-hidden');
      thanksView.setAttribute('aria-hidden', 'true');
      if (typeof onNavigateChat === 'function') {
        onNavigateChat({ contextKey, contextTitle, meta });
      }
    };
  }

  if (btnHome) {
    btnHome.onclick = () => {
      thanksView.classList.add('is-hidden');
      thanksView.setAttribute('aria-hidden', 'true');
      if (typeof onNavigateHome === 'function') onNavigateHome();
    };
  }

  // 5) Reveal View
  thanksView.classList.remove('is-hidden');
  thanksView.setAttribute('aria-hidden', 'false');

  console.log('[M55 Wiring] Flow complete. Waiting for user action.');
}
