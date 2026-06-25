/**
 * Lane B (/reply, /api/reply/generate) is not a product surface in production.
 * Paid consult replies use Lane A: /dtr/core → ConsultRoom → /api/room/core/send.
 */

export const LANE_B_CONSULT_REDIRECT_PATH = '/dtr/core#consultation-room' as const;

export const LANE_B_DISABLED_ERROR_CODE = 'LANE_B_DISABLED' as const;

export const LANE_B_DISABLED_USER_MESSAGE_JA =
  '相談返書は保存版内からご利用いただけます。保存版を開いてお試しください。';

/** Non-production only: preserves dev/e2e smoke for /api/reply/generate. */
export function isLaneBReplySurfaceEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}
