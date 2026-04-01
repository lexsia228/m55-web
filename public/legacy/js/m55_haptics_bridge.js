/**
 * M55 Haptics Bridge (SSOT-safe)
 * - No loops / no continuous vibration
 * - Rate-limited single pulses only
 * - Avoids using any API surface that contains banned UI keywords
 *
 * NOTE:
 *  - Uses @capacitor/haptics when available.
 *  - Falls back silently on web/unsupported environments.
 */

let lastFireAt = 0;
const MIN_INTERVAL_MS = 120; // prevent rapid-fire patterns

function now() { return Date.now(); }

function isUserHapticsOff() {
  try {
    return localStorage.getItem('m55_haptics_off') === '1';
  } catch (e) {
    return false;
  }
}

async function getHaptics() {
  try {
    const mod = await import('@capacitor/haptics');
    return mod?.Haptics ?? null;
  } catch (e) {
    return null;
  }
}

async function fireOnce(fn) {
  if (isUserHapticsOff()) return;
  const t = now();
  if (t - lastFireAt < MIN_INTERVAL_MS) return;
  lastFireAt = t;

  try {
    await fn();
  } catch (e) {
    // non-critical no-op
  }
}

/**
 * Subtle: selection pulse.
 */
export async function hSel() {
  const H = await getHaptics();
  if (!H?.selectionChanged) return;
  return fireOnce(() => H.selectionChanged());
}

/**
 * "Digital Weight" pulse: slightly heavier than selection, still single.
 * Uses impact() only (does not call any API method names that include banned keywords).
 */
export async function hWeight() {
  const H = await getHaptics();
  if (!H?.impact) return;
  return fireOnce(() => H.impact({ style: 'medium' }));
}

/**
 * Error pulse (single, light).
 */
export async function hErr() {
  const H = await getHaptics();
  if (!H?.impact) return;
  return fireOnce(() => H.impact({ style: 'light' }));
}

// Expose minimal hooks (optional)
const g = globalThis;
if (!g.M55Haptics) {
  g.M55Haptics = { hSel, hWeight, hErr };
}
