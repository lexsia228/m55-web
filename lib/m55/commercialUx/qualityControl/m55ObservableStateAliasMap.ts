/**
 * Closed registration → canonical observable presentation-state mapping.
 *
 * Dual registrations that share one rendered presentation are aliases of one
 * canonicalObservableStateId. Method / legacy projections observe the page
 * presentation without expanding the dual-alias table.
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

/**
 * Closed dual-registration aliases.
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
  'premium:premium.lp.checkout': {
    canonicalObservableStateId: 'ecp:premium.lp.checkout:payment_preparation',
    justification: 'premium checkout is the payment-preparation presentation',
  },
};

/**
 * Observation projections (method placements + legacy reply landing).
 * Not counted in the dual-alias table (keeps dual recomputation at 13/63).
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

/** Dual-alias resolution only (for 63/13 recomputation). */
export function dualCanonicalObservableStateIdFor(
  registrationRuntimeStateId: string,
): string {
  return (
    M55_OBSERVABLE_STATE_ALIASES[registrationRuntimeStateId]
      ?.canonicalObservableStateId ?? registrationRuntimeStateId
  );
}

/** Observation resolution: dual aliases + page projections. */
export function canonicalObservableStateIdFor(
  registrationRuntimeStateId: string,
): string {
  const dual = M55_OBSERVABLE_STATE_ALIASES[registrationRuntimeStateId];
  if (dual) return dual.canonicalObservableStateId;
  const projected = M55_OBSERVABLE_STATE_PROJECTIONS[registrationRuntimeStateId];
  if (projected) return projected;
  return registrationRuntimeStateId;
}

export function buildRegistrationCanonicalMappings(
  registrationRuntimeStateIds: readonly string[],
): RegistrationCanonicalMapping[] {
  return registrationRuntimeStateIds.map((registrationRuntimeStateId) => {
    const canonicalObservableStateId = dualCanonicalObservableStateIdFor(
      registrationRuntimeStateId,
    );
    const role: ObservableStateRole =
      canonicalObservableStateId === registrationRuntimeStateId ? 'canonical' : 'alias';
    const alias = M55_OBSERVABLE_STATE_ALIASES[registrationRuntimeStateId];
    return {
      registrationRuntimeStateId,
      canonicalObservableStateId,
      role,
      justification:
        alias?.justification ??
        'registration is the canonical owner of its presentation state',
    };
  });
}

export function recomputeCanonicalAliasCounts(
  registrationRuntimeStateIds: readonly string[],
): {
  executable: number;
  canonical: number;
  alias: number;
  mapping: number;
} {
  const mappings = buildRegistrationCanonicalMappings(registrationRuntimeStateIds);
  const canonicalIds = new Set(mappings.map((m) => m.canonicalObservableStateId));
  return {
    executable: registrationRuntimeStateIds.length,
    canonical: canonicalIds.size,
    alias: mappings.filter((m) => m.role === 'alias').length,
    mapping: mappings.length,
  };
}

export function assertAliasMapClosed(registrationRuntimeStateIds: readonly string[]): void {
  for (const aliasId of Object.keys(M55_OBSERVABLE_STATE_ALIASES)) {
    if (!registrationRuntimeStateIds.includes(aliasId)) {
      throw new Error(`STOP_FIXTURE_SCOPE: unknown alias registration ${aliasId}`);
    }
    const canonical = M55_OBSERVABLE_STATE_ALIASES[aliasId]!.canonicalObservableStateId;
    if (!registrationRuntimeStateIds.includes(canonical)) {
      throw new Error(
        `STOP_FIXTURE_SCOPE: alias ${aliasId} points at unknown canonical ${canonical}`,
      );
    }
    if (canonical === aliasId) {
      throw new Error(`STOP_FIXTURE_SCOPE: alias ${aliasId} maps to itself`);
    }
  }
  const keys = Object.keys(M55_OBSERVABLE_STATE_ALIASES);
  if (new Set(keys).size !== keys.length) {
    throw new Error('STATE_CONTRACT_AMBIGUOUS: duplicate alias keys');
  }
}
