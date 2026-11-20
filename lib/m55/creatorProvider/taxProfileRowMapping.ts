import {
  R8_A_PAYEE_TYPES,
  R8_A_TAX_PROFILE_SCHEMA_VERSION,
  R8_A_V1_TAX_RESIDENCY,
  R8_A_WITHHOLDING_CLASSIFICATIONS,
  type R8PayeeTypeV1,
  type R8TaxProfileRecordV1,
  type R8WithholdingClassificationV1,
  validateTaxProfileInputV1,
} from './contract';

export type TaxProfileRowV1 = {
  creator_economic_identity_id: string;
  schema_version: string;
  tax_residency: string;
  payee_type: string;
  invoice_registration_status: string;
  invoice_registration_number: string | null;
  withholding_classification: string;
  tax_profile_effective_at: string;
  v1_japan_resident_attested: boolean;
  v1_age_18_plus_attested: boolean;
};

/** Fail-closed DB row mapping — never coerces invalid persisted rows into eligible records. */
export function parseTaxProfileRowV1(row: TaxProfileRowV1): R8TaxProfileRecordV1 | null {
  if (row.schema_version !== R8_A_TAX_PROFILE_SCHEMA_VERSION) return null;
  if (row.tax_residency !== R8_A_V1_TAX_RESIDENCY[0]) return null;
  if (!R8_A_WITHHOLDING_CLASSIFICATIONS.includes(row.withholding_classification as R8WithholdingClassificationV1)) {
    return null;
  }
  if (row.v1_japan_resident_attested !== true || row.v1_age_18_plus_attested !== true) return null;
  if (!R8_A_PAYEE_TYPES.includes(row.payee_type as R8PayeeTypeV1)) return null;

  const record: R8TaxProfileRecordV1 = {
    schemaVersion: R8_A_TAX_PROFILE_SCHEMA_VERSION,
    taxResidency: 'JAPAN_RESIDENT',
    payeeType: row.payee_type as R8PayeeTypeV1,
    invoiceRegistrationStatus: row.invoice_registration_status as R8TaxProfileRecordV1['invoiceRegistrationStatus'],
    invoiceRegistrationNumberIfAny: row.invoice_registration_number,
    withholdingClassification: row.withholding_classification as R8WithholdingClassificationV1,
    taxProfileEffectiveAt: row.tax_profile_effective_at,
    v1JapanResidentAttested: row.v1_japan_resident_attested,
    v1Age18PlusAttested: row.v1_age_18_plus_attested,
  };
  if (validateTaxProfileInputV1(record).ok !== true) return null;
  return record;
}
