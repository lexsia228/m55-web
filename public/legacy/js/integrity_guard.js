// M55 Integrity Guard
// Validates the single allowed logic data file at runtime (fail-closed).

import { systemHalt } from "./system_halt.js";

export const M55_NAME_ANALYSIS_PATH = "data/m55_name_analysis_81_sanitized.json";
export const M55_NAME_ANALYSIS_EXPECTED_SHA256 = "94d58be9bc925103235ace9f06f9363cf82ecdc46c3bf4370809486b9bfe6918";

function bufToHex(buf) {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function sha256Hex(arrayBuffer) {
  if (!globalThis.crypto?.subtle?.digest) {
    systemHalt({
      code: "M55_CRYPTO_MISSING",
      message: "crypto.subtle is required for integrity validation.",
    });
  }
  const hash = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return bufToHex(hash);
}

export async function verifyNameAnalysisIntegrity() {
  // Skip if already verified in this session.
  if (globalThis.__M55_NAME_ANALYSIS_VERIFIED) return true;

  let res;
  try {
    res = await fetch(M55_NAME_ANALYSIS_PATH, { cache: "no-store" });
  } catch (e) {
    systemHalt({
      code: "M55_DATA_FETCH_FAILED",
      message: "Unable to load required data file.",
      detail: String(e?.message || e),
    });
  }

  if (!res || !res.ok) {
    systemHalt({
      code: "M55_DATA_MISSING",
      message: "Required data file is missing.",
      detail: `${M55_NAME_ANALYSIS_PATH} (HTTP ${res?.status})`,
    });
  }

  const buf = await res.arrayBuffer();
  const got = await sha256Hex(buf);

  if (got !== M55_NAME_ANALYSIS_EXPECTED_SHA256) {
    systemHalt({
      code: "M55_DATA_HASH_MISMATCH",
      message: "Required data file hash mismatch.",
      detail: `expected=${M55_NAME_ANALYSIS_EXPECTED_SHA256}\nactual=${got}`,
    });
  }

  globalThis.__M55_NAME_ANALYSIS_VERIFIED = true;
  return true;
}

// Auto-run as early as possible
(async () => {
  await verifyNameAnalysisIntegrity();
})();
