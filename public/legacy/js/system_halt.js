/**
 * M55 System Halt (Fail-Closed UI)
 *
 * SSOT alignment:
 * - Background NoTouch: does NOT rewrite html/body background.
 * - Overlay Only: dimmed film that blocks interaction.
 * - Allowed Action: Reload only.
 * - UI is intentionally non-diagnostic (no reason displayed).
 */

let HALTED = false;

function renderOverlay() {
  if (document.getElementById('m55-halt-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'm55-halt-overlay';

  const rt = window.matchMedia?.('(prefers-reduced-transparency: reduce)')?.matches;

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    backgroundColor: rt ? 'rgba(0, 0, 0, 0.92)' : 'rgba(0, 0, 0, 0.78)',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    backdropFilter: rt ? 'none' : 'blur(10px)',
    WebkitBackdropFilter: rt ? 'none' : 'blur(10px)',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  });

  const title = document.createElement('div');
  title.textContent = 'The stars are silent.';
  Object.assign(title.style, {
    fontSize: '14px',
    letterSpacing: '0.12em',
    fontWeight: '300',
    marginBottom: '10px',
  });

  const sub = document.createElement('div');
  sub.textContent = '星々は静寂の中にあります。';
  Object.assign(sub.style, {
    fontSize: '12px',
    opacity: '0.65',
    marginBottom: '22px',
  });

  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.textContent = 'Reload';
  Object.assign(reloadBtn.style, {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.28)',
    color: 'rgba(255,255,255,0.92)',
    padding: '10px 22px',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '10px',
  });
  reloadBtn.onclick = () => window.location.reload();

  panel.appendChild(title);
  panel.appendChild(sub);
  panel.appendChild(reloadBtn);
  overlay.appendChild(panel);

  const attach = () => {
    if (document.getElementById('m55-halt-overlay')) return;
    document.body.appendChild(overlay);
  };

  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach, { once: true });
}

// Required by binding_inventory.js (SSOT: global error trap must converge to halt).
// Any unhandled error must call systemHalt() (fail-closed). No silent handling.
export function installGlobalErrorTrap() {
  try {
    if (typeof window === "undefined") return;

    window.addEventListener("error", (ev) => {
      systemHalt({
        code: "M55_RUNTIME_ERROR",
        message: "Unhandled error",
        detail: String(ev?.message || ev)
      });
    });

    window.addEventListener("unhandledrejection", (ev) => {
      systemHalt({
        code: "M55_UNHANDLED_REJECTION",
        message: "Unhandled rejection",
        detail: String(ev?.reason || ev)
      });
    });
  } catch (e) {
    // fail-closed: if the trap cannot be installed, execution must not continue.
    systemHalt({
      code: "M55_ERROR_TRAP_INSTALL_FAILED",
      message: "Failed to install global error trap",
      detail: String(e?.message || e)
    });
  }
}

export function systemHalt(reason = "System integrity protection active") {
  // Debug info is console-only.
  try {
    if (typeof reason === "string") {
      console.error("[M55 HALT]", reason);
    } else {
      console.error("[M55 HALT]", JSON.stringify(reason));
    }
  } catch (e) {
    // ignore
  }

  // Idempotent: render overlay once.
  if (!HALTED) {
    HALTED = true;
    renderOverlay();
  }

  // Stop subsequent execution (best-effort).
  throw new Error("M55_SYSTEM_HALT");
}
