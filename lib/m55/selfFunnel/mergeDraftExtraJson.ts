/**
 * Draft extra_json is a bag of independent carry-over keys.
 * Profile saves and answer saves must not wipe each other.
 */
export function mergeDraftExtraJson(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return {
    ...(existing && typeof existing === 'object' ? existing : {}),
    ...(incoming && typeof incoming === 'object' ? incoming : {}),
  };
}
