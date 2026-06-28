/**
 * Paid DTR DOB personalization v2 fulfillment gate.
 * Fulfillment-only: display must use stored engine_context_json version.
 */
export function isDobPersonalizationV2FulfillmentEnabled(): boolean {
  return process.env.M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED === 'true';
}
