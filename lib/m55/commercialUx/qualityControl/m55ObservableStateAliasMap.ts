/**
 * Closed registration → canonical observable presentation-state mapping.
 *
 * One authoritative resolver classifies every executable registration as
 * either the canonical owner of a presentation state, or an alias of one.
 * Dual-registration aliases and observation projections are both aliases
 * when their resolved canonical ID differs from the registration ID.
 *
 * Recomputed from shared presentation selectors, excluding genuinely different
 * states (shared-entry valid vs invalid; questionnaire vs answer_edit).
 */
export type ObservableStateRole = 'canonical' | 'alias';

export type RegistrationCanonicalMapping = {
  registrationRuntimeStateId: string;
  canonicalObservableStateId: string;
  role: ObservableStateRole;
  justification: string;
};

export type CanonicalAliasCounts = {
  executable: number;
  canonical: number;
  alias: number;
  mapping: number;
};

/**
 * Dual-registration aliases (same rendered presentation, distinct registration IDs).
 * Intro/prerequisite setups land on the paid questionnaire presentation after
 * establishCoreResult, so they alias six_questions (not a separate intro DOM).
 */
export const M55_OBSERVABLE_STATE_ALIASES: Readonly<
  Record<string, { canonicalObservableStateId: string; justification: string }>
> = {
  'ecp:public.root_redirect:default': {
    canonicalObservableStateId: 'ecp:public.home:default',
    justification: 'root redirects to the same HOME hero presentation',
  },
  'visual:home': {
    canonicalObservableStateId: 'ecp:public.home:default',
    justification: 'visual HOME captures the same HOME hero presentation',
  },
  'visual:core-prerequisite': {
    canonicalObservableStateId: 'ecp:free.core.empty:empty',
    justification: 'visual core-prerequisite is the locked /core empty presentation',
  },
  'visual:core-free-result': {
    canonicalObservableStateId: 'ecp:free.core.answer_review:answer_review',
    justification: 'visual core-free-result is the RESULT essence presentation',
  },
  'ecp:premium.lp.intro:introduction': {
    canonicalObservableStateId: 'ecp:premium.lp.questions:six_questions',
    justification:
      'LP introduction setup after free result lands on the paid questionnaire presentation',
  },
  'premium:premium.lp.prerequisite': {
    canonicalObservableStateId: 'ecp:premium.lp.questions:six_questions',
    justification:
      'premium prerequisite setup after free result lands on the paid questionnaire presentation',
  },
  'premium:premium.lp.questions': {
    canonicalObservableStateId: 'ecp:premium.lp.questions:six_questions',
    justification: 'premium questions state is the paid questionnaire presentation',
  },
  'visual:premium-questionnaire': {
    canonicalObservableStateId: 'ecp:premium.lp.questions:six_questions',
    justification: 'visual premium-questionnaire captures the paid questionnaire presentation',
  },
  'premium:premium.lp.answer_review': {
    canonicalObservableStateId: 'ecp:premium.lp.answer_review:answer_review',
    justification: 'premium answer_review is the paid complete-phase presentation',
  },
  'ecp:premium.lp.upgrade:upgrade_explanation': {
    canonicalObservableStateId: 'ecp:premium.lp.plans:plan_selection',
    justification: 'upgrade explanation is rendered inside plan selection',
  },
  'premium:premium.lp.plans': {
    canonicalObservableStateId: 'ecp:premium.lp.plans:plan_selection',
    justification: 'premium plans state is the plan-selection presentation',
  },
  'visual:premium-plans': {
    canonicalObservableStateId: 'ecp:premium.lp.plans:plan_selection',
    justification: 'visual premium-plans captures the plan-selection presentation',
  },
  'visual:premium-checkout': {
    canonicalObservableStateId: 'ecp:premium.lp.checkout:payment_preparation',
    justification: 'visual premium-checkout captures the payment-preparation presentation',
  },
  'premium:premium.lp.checkout': {
    canonicalObservableStateId: 'ecp:premium.lp.checkout:payment_preparation',
    justification: 'premium checkout is the payment-preparation presentation',
  },
};

/**
 * Optional projection metadata (method placements, legacy reply, RESULT sections).
 * Does not alter resolver arithmetic — counted as aliases when IDs differ.
 */
export const M55_OBSERVABLE_STATE_PROJECTIONS: Readonly<Record<string, string>> = {
  'method:home:default': 'ecp:public.home:default',
  'method:core_free_result:RESULT': 'ecp:free.core.answer_review:answer_review',
  'method:dtr_lp:plans': 'ecp:premium.lp.plans:plan_selection',
  'method:purchased_report:purchased_report_body': 'ecp:purchased.reader:default',
  'method:pricing:default': 'ecp:public.pricing:default',
  'method:checkout_prep:checkout': 'ecp:premium.lp.checkout:payment_preparation',
  'method:footer_nav:default': 'ecp:public.how_m55_works:default',
  'ecp:legacy.reply:default': 'ecp:premium.lp.need_free:need_free',
  'premium:premium.share.card': 'ecp:dev.premium_share_preview:default',
  'premium:purchased.report.body': 'ecp:purchased.reader:default',
  'premium:purchased.saved_reopen': 'ecp:purchased.reader:default',
  'visual:pricing': 'ecp:public.pricing:default',
  // Free RESULT page sections share one rendered presentation after establishCoreResult.
  'ecp:free.core.result:result': 'ecp:free.core.answer_review:answer_review',
  'ecp:free.core.save:save': 'ecp:free.core.answer_review:answer_review',
  'ecp:free.core.rerun:rerun': 'ecp:free.core.answer_review:answer_review',
  'ecp:free.core.share:share': 'ecp:free.core.answer_review:answer_review',
  'premium:premium.core.bridge': 'ecp:free.core.answer_review:answer_review',
};

/**
 * Authoritative registration → canonical observable state resolver.
 * Used by runtime measurement, DOM contracts, reconciliation, verifier, and counts.
 */
export function canonicalObservableStateIdFor(
  registrationRuntimeStateId: string,
): string {
  const dual = M55_OBSERVABLE_STATE_ALIASES[registrationRuntimeStateId];
  if (dual) return dual.canonicalObservableStateId;
  const projected = M55_OBSERVABLE_STATE_PROJECTIONS[registrationRuntimeStateId];
  if (projected) return projected;
  return registrationRuntimeStateId;
}

function justificationFor(registrationRuntimeStateId: string, role: ObservableStateRole): string {
  const alias = M55_OBSERVABLE_STATE_ALIASES[registrationRuntimeStateId];
  if (alias) return alias.justification;
  if (role === 'alias' && registrationRuntimeStateId in M55_OBSERVABLE_STATE_PROJECTIONS) {
    return 'projects to the same rendered page presentation as its canonical state';
  }
  return 'registration is the canonical owner of its presentation state';
}

export function buildRegistrationCanonicalMappings(
  registrationRuntimeStateIds: readonly string[],
): RegistrationCanonicalMapping[] {
  return registrationRuntimeStateIds.map((registrationRuntimeStateId) => {
    const canonicalObservableStateId = canonicalObservableStateIdFor(
      registrationRuntimeStateId,
    );
    const role: ObservableStateRole =
      canonicalObservableStateId === registrationRuntimeStateId ? 'canonical' : 'alias';
    return {
      registrationRuntimeStateId,
      canonicalObservableStateId,
      role,
      justification: justificationFor(registrationRuntimeStateId, role),
    };
  });
}

export function recomputeCanonicalAliasCounts(
  registrationRuntimeStateIds: readonly string[],
): CanonicalAliasCounts {
  const mappings = buildRegistrationCanonicalMappings(registrationRuntimeStateIds);
  const canonicalIds = new Set(mappings.map((m) => m.canonicalObservableStateId));
  const alias = mappings.filter((m) => m.role === 'alias').length;
  const executable = registrationRuntimeStateIds.length;
  if (canonicalIds.size + alias !== executable) {
    throw new Error(
      `STATE_CONTRACT_AMBIGUOUS: canonical(${canonicalIds.size})+alias(${alias})!=executable(${executable})`,
    );
  }
  return {
    executable,
    canonical: canonicalIds.size,
    alias,
    mapping: mappings.length,
  };
}

/** Counts projection registrations that resolve to a different canonical ID. */
export function countProjectionAliases(
  registrationRuntimeStateIds: readonly string[],
): { projectionRegistrations: number; projectionAliases: number } {
  let projectionRegistrations = 0;
  let projectionAliases = 0;
  for (const id of registrationRuntimeStateIds) {
    if (!(id in M55_OBSERVABLE_STATE_PROJECTIONS)) continue;
    projectionRegistrations += 1;
    if (canonicalObservableStateIdFor(id) !== id) projectionAliases += 1;
  }
  return { projectionRegistrations, projectionAliases };
}

export type ResolverParityFailure = {
  code: 'STATE_CONTRACT_AMBIGUOUS' | 'STATE_CONTRACT_MISSING';
  detail: string;
};

/** Allowed function exports from this module (non-resolver helpers + authority). */
export const ALLOWED_ALIAS_MAP_FUNCTION_EXPORTS = [
  'canonicalObservableStateIdFor',
  'buildRegistrationCanonicalMappings',
  'recomputeCanonicalAliasCounts',
  'countProjectionAliases',
  'reconcileResolverParity',
  'probeExcludedProjectionResolverNegative',
  'probeRenamedDivergentResolverNegative',
  'findDisallowedAliasMapFunctionExports',
  'findDivergentExportedStringResolvers',
  'assertAliasMapClosed',
] as const;

/**
 * Fail-closed: candidate resolver must deeply equal the authoritative resolver
 * for every executable registration.
 */
export function reconcileResolverParity(
  registrationRuntimeStateIds: readonly string[],
  candidateResolver: (registrationRuntimeStateId: string) => string,
): ResolverParityFailure[] {
  const failures: ResolverParityFailure[] = [];
  const seen = new Set<string>();
  for (const id of registrationRuntimeStateIds) {
    if (seen.has(id)) {
      failures.push({
        code: 'STATE_CONTRACT_AMBIGUOUS',
        detail: `registration ${id} mapped more than once`,
      });
      continue;
    }
    seen.add(id);
    const authoritative = canonicalObservableStateIdFor(id);
    const candidate = candidateResolver(id);
    if (!authoritative.trim()) {
      failures.push({
        code: 'STATE_CONTRACT_MISSING',
        detail: `missing canonical mapping for ${id}`,
      });
    }
    if (authoritative !== candidate) {
      failures.push({
        code: 'STATE_CONTRACT_AMBIGUOUS',
        detail: `resolver mismatch for ${id}: authoritative=${authoritative} candidate=${candidate}`,
      });
    }
  }
  for (const canonical of new Set(
    registrationRuntimeStateIds.map((id) => canonicalObservableStateIdFor(id)),
  )) {
    const owners = registrationRuntimeStateIds.filter(
      (id) => canonicalObservableStateIdFor(id) === canonical,
    );
    if (owners.length === 0) {
      failures.push({
        code: 'STATE_CONTRACT_MISSING',
        detail: `canonical ${canonical} has no registrations`,
      });
    }
  }
  return failures;
}

/**
 * Source-level detection: any exported function outside the allowlist is rejected.
 * Does not rely on a single prohibited symbol name. String/template literals are
 * stripped so embedded negative-fixture source text cannot false-positive.
 */
export function findDisallowedAliasMapFunctionExports(source: string): string[] {
  const withoutLiterals = source
    .replace(/`(?:\\.|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const found = [...withoutLiterals.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(
    (match) => match[1]!,
  );
  const allowed = new Set<string>(ALLOWED_ALIAS_MAP_FUNCTION_EXPORTS);
  return [...new Set(found.filter((name) => !allowed.has(name)))];
}

/**
 * Runtime detection: exported arity-1 string→string functions must match the
 * authoritative resolver for every executable registration (or not be resolvers).
 */
export function findDivergentExportedStringResolvers(
  registrationRuntimeStateIds: readonly string[],
  moduleExports: Record<string, unknown>,
): string[] {
  const divergent: string[] = [];
  for (const [name, value] of Object.entries(moduleExports)) {
    if (typeof value !== 'function') continue;
    if (name === 'canonicalObservableStateIdFor') continue;
    if (value.length !== 1) continue;
    let behavesAsStringResolver = true;
    for (const id of registrationRuntimeStateIds) {
      try {
        const out = (value as (input: string) => unknown)(id);
        if (typeof out !== 'string') {
          behavesAsStringResolver = false;
          break;
        }
      } catch {
        behavesAsStringResolver = false;
        break;
      }
    }
    if (!behavesAsStringResolver) continue;
    const failures = reconcileResolverParity(
      registrationRuntimeStateIds,
      value as (registrationRuntimeStateId: string) => string,
    );
    if (failures.length > 0) divergent.push(name);
  }
  return divergent;
}

/**
 * Negative probe: excluding projections must fail parity.
 * Candidate exists only inside this probe and is not exported.
 */
export function probeExcludedProjectionResolverNegative(
  registrationRuntimeStateIds: readonly string[],
): ResolverParityFailure[] {
  const excludeProjectionsCandidate = (registrationRuntimeStateId: string): string =>
    M55_OBSERVABLE_STATE_ALIASES[registrationRuntimeStateId]?.canonicalObservableStateId ??
    registrationRuntimeStateId;
  return reconcileResolverParity(registrationRuntimeStateIds, excludeProjectionsCandidate);
}

/**
 * Negative probe: a differently named divergent resolver must be detected by
 * parity and by source/export scanning (not by one hard-coded symbol name).
 */
export function probeRenamedDivergentResolverNegative(
  registrationRuntimeStateIds: readonly string[],
): {
  parityFailures: ResolverParityFailure[];
  disallowedExports: string[];
  divergentExports: string[];
} {
  const sneakyAlternateCanonicalResolver = (
    registrationRuntimeStateId: string,
  ): string =>
    M55_OBSERVABLE_STATE_ALIASES[registrationRuntimeStateId]?.canonicalObservableStateId ??
    registrationRuntimeStateId;

  const parityFailures = reconcileResolverParity(
    registrationRuntimeStateIds,
    sneakyAlternateCanonicalResolver,
  );

  // Constructed at runtime so this module's source does not embed a second
  // live export; the scanner still sees a real export when fed this fixture.
  const exportKeyword = 'export';
  const fixtureSource = [
    `${exportKeyword} function canonicalObservableStateIdFor(id) { return id; }`,
    `${exportKeyword} function sneakyAlternateCanonicalResolver(id) {`,
    '  return id;',
    '}',
    `${exportKeyword} function buildRegistrationCanonicalMappings(ids) { return ids; }`,
  ].join('\n');

  const disallowedExports = findDisallowedAliasMapFunctionExports(fixtureSource);
  const divergentExports = findDivergentExportedStringResolvers(registrationRuntimeStateIds, {
    sneakyAlternateCanonicalResolver,
    canonicalObservableStateIdFor,
  });

  return { parityFailures, disallowedExports, divergentExports };
}

export function assertAliasMapClosed(registrationRuntimeStateIds: readonly string[]): void {
  const aliasTables: Array<{
    label: string;
    entries: Readonly<Record<string, { canonicalObservableStateId: string } | string>>;
  }> = [
    { label: 'alias', entries: M55_OBSERVABLE_STATE_ALIASES },
    {
      label: 'projection',
      entries: Object.fromEntries(
        Object.entries(M55_OBSERVABLE_STATE_PROJECTIONS).map(([k, v]) => [
          k,
          { canonicalObservableStateId: v },
        ]),
      ),
    },
  ];

  for (const table of aliasTables) {
    for (const aliasId of Object.keys(table.entries)) {
      if (!registrationRuntimeStateIds.includes(aliasId)) {
        throw new Error(`STOP_FIXTURE_SCOPE: unknown ${table.label} registration ${aliasId}`);
      }
      const entry = table.entries[aliasId]!;
      const canonical =
        typeof entry === 'string' ? entry : entry.canonicalObservableStateId;
      if (!registrationRuntimeStateIds.includes(canonical)) {
        throw new Error(
          `STOP_FIXTURE_SCOPE: ${table.label} ${aliasId} points at unknown canonical ${canonical}`,
        );
      }
      if (canonical === aliasId) {
        throw new Error(`STOP_FIXTURE_SCOPE: ${table.label} ${aliasId} maps to itself`);
      }
      // Conflicting tables must not disagree for the same registration.
      const resolved = canonicalObservableStateIdFor(aliasId);
      if (resolved !== canonical) {
        throw new Error(
          `STATE_CONTRACT_AMBIGUOUS: ${table.label} ${aliasId} maps to multiple canonical states`,
        );
      }
    }
  }

  const dualKeys = Object.keys(M55_OBSERVABLE_STATE_ALIASES);
  if (new Set(dualKeys).size !== dualKeys.length) {
    throw new Error('STATE_CONTRACT_AMBIGUOUS: duplicate alias keys');
  }
  const projectionKeys = Object.keys(M55_OBSERVABLE_STATE_PROJECTIONS);
  if (new Set(projectionKeys).size !== projectionKeys.length) {
    throw new Error('STATE_CONTRACT_AMBIGUOUS: duplicate projection keys');
  }
  for (const id of dualKeys) {
    if (id in M55_OBSERVABLE_STATE_PROJECTIONS) {
      throw new Error(
        `STATE_CONTRACT_AMBIGUOUS: registration ${id} listed as both alias and projection`,
      );
    }
  }
}
