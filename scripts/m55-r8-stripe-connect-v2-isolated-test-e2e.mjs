#!/usr/bin/env node
/**
 * Stripe Connect Accounts v2 **API smoke** (test mode only). Not onboarding/webhook E2E GREEN.
 * Reuses one isolated test account; onboarding URL written to gitignored local file only.
 */
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import {
  listIsolatedStripeConnectPreflightMissingV1,
  resolveIsolatedAppOriginV1,
  resolveIsolatedSmokeEconomicIdentityIdV1,
  stableIsolatedSmokeCreateIdempotencyKeyV1,
} from '../lib/m55/creatorProvider/stripeConnectV2IsolatedSmokePreflight.ts';
import {
  applyIsolatedStripeSmokeEnvToProcessV1,
  assertIsolatedSupabaseMutationPermittedLiveV1,
  createDefaultLocalStackDockerBindingInspectorV1,
  isolatedEnvFileTargetsLocalStackV1,
  listIsolatedStripeSmokeCredentialsFileMissingV1,
  listIsolatedStripeSmokeShellBlockedChecklistV1,
  loadM55R8IsolatedAlignmentEnvV1,
  M55_R8_ISOLATED_ALIGNMENT_ENV_FILE_DEFAULT_V1,
  parseEnvFileLinesV1,
} from '../lib/m55/creatorProvider/r8IsolatedSupabaseAlignment.ts';
import {
  loadIsolatedSmokeStateV1,
  saveIsolatedSmokeStateV1,
  writeIsolatedSmokeOnboardingUrlForHumanV1,
  isolatedSmokeOnboardingUrlPathV1,
} from '../lib/m55/creatorProvider/stripeConnectV2IsolatedSmokeState.ts';

function humanChecklist(missing) {
  console.error('M55_R8_STRIPE_CONNECT_E2E_INCOMPLETE');
  for (const line of missing) console.error(`- ${line}`);
  process.exit(2);
}

function humanIsolatedEnvChecklist(lines) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of lines) console.error(`- ${line}`);
  process.exit(2);
}

function humanLocalStackMutationChecklist(lines) {
  console.error('M55_R8_ISOLATED_SUPABASE_LOCAL_STACK_MUTATION_FAILED');
  for (const line of lines) console.error(`- ${line}`);
  process.exit(2);
}

const shellBlocked = listIsolatedStripeSmokeShellBlockedChecklistV1(process.env);
if (shellBlocked.length > 0) humanIsolatedEnvChecklist(shellBlocked);

const envRel =
  process.env.M55_R8_ISOLATED_ENV_FILE?.trim() || M55_R8_ISOLATED_ALIGNMENT_ENV_FILE_DEFAULT_V1;
const envAbs = isAbsolute(envRel) ? envRel : join(process.cwd(), envRel);
if (!existsSync(envAbs)) {
  humanIsolatedEnvChecklist([
    `Create ${envRel} with isolated Supabase credentials (gitignored via .env.*.local)`,
  ]);
}
let envParsed;
try {
  envParsed = parseEnvFileLinesV1(readFileSync(envAbs, 'utf8'));
} catch {
  humanIsolatedEnvChecklist([`Cannot read isolated env file: ${envRel}`]);
}
const localStackTarget = isolatedEnvFileTargetsLocalStackV1(envParsed);

const loaded = loadM55R8IsolatedAlignmentEnvV1(process.cwd(), process.env, {
  projectRefOptionalV1: localStackTarget,
});
if (!loaded.ok) humanIsolatedEnvChecklist(loaded.checklist);

console.error(`M55_R8_ISOLATED_ENV: ${loaded.envFile}`);

const stripeFileMissing = listIsolatedStripeSmokeCredentialsFileMissingV1(
  loaded.parsed,
  loaded.envFile,
);
if (stripeFileMissing.length > 0) humanChecklist(stripeFileMissing);

const isolatedOnly = { ...loaded.env };

const missing = listIsolatedStripeConnectPreflightMissingV1(isolatedOnly);
if (missing.length > 0) humanChecklist(missing);

if (localStackTarget) {
  const mutationPermit = await assertIsolatedSupabaseMutationPermittedLiveV1(isolatedOnly, {
    inspectLocalStackDockerBindingImpl: createDefaultLocalStackDockerBindingInspectorV1(),
  });
  if (!mutationPermit.ok || mutationPermit.permitKind !== 'LOCAL_STACK_MUTATION_PROBE') {
    humanLocalStackMutationChecklist(
      mutationPermit.ok
        ? ['Local stack Stripe smoke requires fresh LOCAL_STACK_MUTATION_PROBE success']
        : mutationPermit.checklist,
    );
  }
  const mutation = mutationPermit.localStackProbe;
  console.error(
    JSON.stringify({
      localStackMutation: {
        verificationKind: mutation.verificationKind,
        projectRefIdentity: mutation.projectRefIdentity,
        humanProjectRefConfirmed: mutation.humanProjectRefConfirmed,
        localStackMutationPermitted: mutation.localStackMutationPermitted,
        foundationSchemaVerified: mutation.foundationSchemaVerified,
        supabaseProjectRefSuffix: mutation.supabaseProjectRefSuffix,
      },
    }),
  );
}

applyIsolatedStripeSmokeEnvToProcessV1(isolatedOnly);

const origin = resolveIsolatedAppOriginV1(isolatedOnly);
if (!origin) humanChecklist(['Set M55_PUBLIC_ORIGIN to the isolated app origin (e.g. http://localhost:3000)']);

const {
  assertSafeRedirectUrl,
  buildCreatorPortalProviderRefreshUrl,
  buildCreatorPortalProviderReturnUrlWithoutSessionV1,
  resolveStripeConnectAdapter,
} = await import('../lib/m55/creatorProvider/stripeConnectAdapter.ts');

const adapter = resolveStripeConnectAdapter();
if (adapter.mode !== 'TEST_SANDBOX') {
  console.error('M55_R8_STRIPE_CONNECT_E2E_ADAPTER_NOT_SANDBOX', adapter.mode);
  process.exit(2);
}

const economicIdentityId = resolveIsolatedSmokeEconomicIdentityIdV1();
const createIdempotencyKey = stableIsolatedSmokeCreateIdempotencyKeyV1(economicIdentityId);
let persisted = loadIsolatedSmokeStateV1();
let accountId = persisted?.stripeAccountId ?? null;
let accountReused = Boolean(accountId);

if (accountId) {
  try {
    await adapter.retrieveAccountSnapshot(accountId);
  } catch {
    if (process.env.M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_RESET !== 'true') {
      humanChecklist([
        'Persisted smoke account is not retrievable; fix Stripe test key/account or set M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_RESET=true once to replace',
      ]);
    }
    accountId = null;
    accountReused = false;
  }
}

if (!accountId) {
  const stub = await adapter.createConnectedAccountStub({
    economicIdentityId,
    idempotencyKey: createIdempotencyKey,
    contactEmail: 'creator-isolated-smoke@test.m55.local',
    payeeType: 'INDIVIDUAL',
  });
  accountId = stub.accountId;
  accountReused = false;
  saveIsolatedSmokeStateV1({
    economicIdentityId,
    stripeAccountId: accountId,
    createIdempotencyKey,
    updatedAtUtc: new Date().toISOString(),
  });
}

const refreshUrl = assertSafeRedirectUrl(buildCreatorPortalProviderRefreshUrl(), origin);
const returnUrl = assertSafeRedirectUrl(buildCreatorPortalProviderReturnUrlWithoutSessionV1(), origin);
if (!refreshUrl || !returnUrl) {
  humanChecklist(['M55_PUBLIC_ORIGIN must allow /creator/portal redirect URLs (check port and protocol)']);
}

const link = await adapter.createAccountOnboardingLink({
  accountId,
  refreshUrl,
  returnUrl,
});

const onboardingUrlPath = writeIsolatedSmokeOnboardingUrlForHumanV1(link.url);
const snapshot = await adapter.retrieveAccountSnapshot(accountId);

console.log(
  JSON.stringify({
    ok: true,
    classification: 'STRIPE_CONNECT_V2_API_SMOKE',
    adapterMode: adapter.mode,
    accountIdSuffix: accountId.slice(-8),
    accountReused,
    onboardingUrlWrittenToRelativePath: '.m55_r8_stripe_connect_isolated/onboarding.url',
    openLocallyCommand: 'npx tsx scripts/m55-r8-open-isolated-stripe-onboarding-url.mjs',
    snapshotPresent: Boolean(snapshot),
    requirementsCurrentlyDueCount: snapshot.requirementsCurrentlyDueCount,
    browserReturnPath:
      'Sign in to isolated app → POST /api/creator/provider/onboarding with owned session → complete hosted onboarding → return with DB session id',
    notProven: [
      'hosted_onboarding_completion',
      'return_url_handling_with_owned_session',
      'receive_state_sync',
      'webhook_ingestion',
    ],
  }),
);
