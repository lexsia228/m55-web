/**
 * M55 Silent Widget Snapshot
 * - Stores a tiny "fog density" snapshot for OS widgets to read.
 * - No numbers, no prompts.
 * - Safe fallback: localStorage.
 */

import { systemHalt } from "./system_halt.js";


const KEY = 'm55_widget_snapshot_v1';

async function getPrefs() {
  try {
    const mod = await import('@capacitor/preferences');
    return mod?.Preferences ?? null;
  } catch (e) {
    return null;
  }
}

function clampText(s, max) {
  const t = String(s ?? '').trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

/**
 * density: "thin" | "mid" | "dense" (strings only)
 * shortText: <=80 chars (language distillation rule)
 */
export async function publishWidgetSnapshot({ density = 'mid', shortText = '' } = {}) {
  const payload = {
    v: 1,
    at: Date.now(),
    density: String(density || 'mid').slice(0, 12),
    shortText: clampText(shortText, 80)
  };

  const prefs = await getPrefs();
  const value = JSON.stringify(payload);

  if (prefs?.set) {
    try {
      await prefs.set({ key: KEY, value });
      return;
    } catch (e) {
      // fall through
    }
  }

  try {
    localStorage.setItem(KEY, value);
  } catch (e) {
    systemHalt({ code: "M55_WIDGET_SNAPSHOT_WRITE_FAILED", message: "Unable to persist widget snapshot (fail-closed).", detail: String(e?.message || e) });
  }
}

// Optional: expose for native host triggers
const g = globalThis;
if (!g.M55Widget) {
  g.M55Widget = { publishWidgetSnapshot };
}
