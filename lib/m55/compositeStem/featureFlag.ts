/**
 * v2 fulfillment write gate — default off (production-safe).
 * Env read only; no env mutation in code. Enable with M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED=true
 */
export function isCompositeV2FulfillmentWriteEnabled(): boolean {
  return process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED === 'true';
}
