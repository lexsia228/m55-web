import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  R8_A_TAX_PROFILE_SCHEMA_VERSION,
  type R8TaxProfileInputV1,
  type R8TaxProfileRecordV1,
  normalizeInvoiceRegistrationNumber,
  validateTaxProfileInputV1,
} from './contract';

type TaxRow = {
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

function rowToRecord(row: TaxRow): R8TaxProfileRecordV1 {
  return {
    schemaVersion: R8_A_TAX_PROFILE_SCHEMA_VERSION,
    taxResidency: 'JAPAN_RESIDENT',
    payeeType: row.payee_type as R8TaxProfileRecordV1['payeeType'],
    invoiceRegistrationStatus: row.invoice_registration_status as R8TaxProfileRecordV1['invoiceRegistrationStatus'],
    invoiceRegistrationNumberIfAny: row.invoice_registration_number,
    withholdingClassification: 'ORDINARY_JP_AFFILIATE_V1_ZERO',
    taxProfileEffectiveAt: row.tax_profile_effective_at,
    v1JapanResidentAttested: true,
    v1Age18PlusAttested: true,
  };
}

export async function loadTaxProfileV1(
  creatorEconomicIdentityId: string,
): Promise<R8TaxProfileRecordV1 | null> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_creator_tax_profiles_v1')
    .select(
      'creator_economic_identity_id,schema_version,tax_residency,payee_type,invoice_registration_status,invoice_registration_number,withholding_classification,tax_profile_effective_at,v1_japan_resident_attested,v1_age_18_plus_attested',
    )
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .maybeSingle();
  if (error) throw new Error('TAX_PROFILE_UNAVAILABLE');
  if (!data) return null;
  return rowToRecord(data as TaxRow);
}

async function loadV1EligibilityAttestations(creatorEconomicIdentityId: string): Promise<{
  japanResident: boolean;
  age18Plus: boolean;
}> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_creator_profiles')
    .select('originating_application_id')
    .eq('economic_identity_id', creatorEconomicIdentityId)
    .maybeSingle();
  if (error || !data?.originating_application_id) {
    throw new Error('TAX_PROFILE_UNAVAILABLE');
  }
  const { data: app, error: appErr } = await db
    .from('m55_creator_applications')
    .select('japan_resident_attested,age_18_plus_attested')
    .eq('id', data.originating_application_id)
    .maybeSingle();
  if (appErr || !app) throw new Error('TAX_PROFILE_UNAVAILABLE');
  return {
    japanResident: app.japan_resident_attested === true,
    age18Plus: app.age_18_plus_attested === true,
  };
}

export async function upsertTaxProfileV1(
  creatorEconomicIdentityId: string,
  input: R8TaxProfileInputV1,
): Promise<R8TaxProfileRecordV1> {
  const validated = validateTaxProfileInputV1(input);
  if (!validated.ok) throw new Error('TAX_PROFILE_INVALID');

  const attest = await loadV1EligibilityAttestations(creatorEconomicIdentityId);
  if (!attest.japanResident || !attest.age18Plus) {
    throw new Error('V1_ELIGIBILITY_BLOCKED');
  }

  const invoiceNumber = normalizeInvoiceRegistrationNumber(input.invoiceRegistrationNumberIfAny ?? null);
  const effectiveAt = new Date().toISOString();
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_creator_tax_profiles_v1')
    .upsert(
      {
        creator_economic_identity_id: creatorEconomicIdentityId,
        schema_version: R8_A_TAX_PROFILE_SCHEMA_VERSION,
        tax_residency: 'JAPAN_RESIDENT',
        payee_type: input.payeeType,
        invoice_registration_status: input.invoiceRegistrationStatus,
        invoice_registration_number: invoiceNumber,
        withholding_classification: 'ORDINARY_JP_AFFILIATE_V1_ZERO',
        tax_profile_effective_at: effectiveAt,
        v1_japan_resident_attested: true,
        v1_age_18_plus_attested: true,
        updated_at: effectiveAt,
      },
      { onConflict: 'creator_economic_identity_id' },
    )
    .select(
      'creator_economic_identity_id,schema_version,tax_residency,payee_type,invoice_registration_status,invoice_registration_number,withholding_classification,tax_profile_effective_at,v1_japan_resident_attested,v1_age_18_plus_attested',
    )
    .single();
  if (error || !data) throw new Error('TAX_PROFILE_UNAVAILABLE');
  return rowToRecord(data as TaxRow);
}
