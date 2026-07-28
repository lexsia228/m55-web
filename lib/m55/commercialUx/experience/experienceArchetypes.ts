/**
 * M55 Experience Control Plane v2 — route/state → archetype mapping.
 * Pages consume shared tokens via data-m55-archetype; they do not invent local visual systems.
 */

export const M55_EXPERIENCE_ARCHETYPES = [
  'PUBLIC_POSTER',
  'PUBLIC_EDITORIAL',
  'GUIDED_FREE_FLOW',
  'EDITORIAL_FREE_RESULT',
  'SHARED_SOCIAL_ENTRY',
  'PREMIUM_GUIDED_FLOW',
  'PRODUCT_DECISION',
  'PURCHASE_CONFIRMATION',
  'DIGITAL_PUBLICATION',
] as const;

export type M55ExperienceArchetype = (typeof M55_EXPERIENCE_ARCHETYPES)[number];

export type ExperiencePrintMode =
  | 'brochure_2page'
  | 'single_summary'
  | 'editorial_result'
  | 'product_fact'
  | 'privacy_safe';

export type ExperienceArchetypeContract = {
  id: M55ExperienceArchetype;
  shell: 'public';
  /** Desktop >=960: full nav; below 960: brand + contextual CTA + menu (auth in menu). */
  header: 'full_public' | 'contextual_public';
  background: 'ivory' | 'white' | 'navySoft' | 'transparent';
  readingWidth: 'narrow' | 'standard' | 'wide' | 'full';
  typographyLead: 'serif' | 'sans';
  sectionRhythm: 'poster' | 'editorial' | 'guided' | 'decision' | 'publication';
  imageRole: 'poster' | 'editorial' | 'result_identity' | 'none';
  footer: 'quiet_public' | 'minimal';
  stickyAllowed: boolean;
  printMode: ExperiencePrintMode;
  cardProminenceDefault: 0 | 1 | 2;
  primaryCtaTone: 'commercial' | 'workflow' | 'recipient';
};

export const EXPERIENCE_ARCHETYPE_CONTRACTS: Record<
  M55ExperienceArchetype,
  ExperienceArchetypeContract
> = {
  PUBLIC_POSTER: {
    id: 'PUBLIC_POSTER',
    shell: 'public',
    header: 'full_public',
    background: 'ivory',
    readingWidth: 'full',
    typographyLead: 'serif',
    sectionRhythm: 'poster',
    imageRole: 'poster',
    footer: 'quiet_public',
    stickyAllowed: false,
    printMode: 'brochure_2page',
    cardProminenceDefault: 1,
    primaryCtaTone: 'commercial',
  },
  PUBLIC_EDITORIAL: {
    id: 'PUBLIC_EDITORIAL',
    shell: 'public',
    header: 'full_public',
    background: 'ivory',
    readingWidth: 'standard',
    typographyLead: 'serif',
    sectionRhythm: 'editorial',
    imageRole: 'editorial',
    footer: 'quiet_public',
    stickyAllowed: false,
    printMode: 'editorial_result',
    cardProminenceDefault: 0,
    primaryCtaTone: 'commercial',
  },
  GUIDED_FREE_FLOW: {
    id: 'GUIDED_FREE_FLOW',
    shell: 'public',
    header: 'contextual_public',
    background: 'ivory',
    readingWidth: 'narrow',
    typographyLead: 'sans',
    sectionRhythm: 'guided',
    imageRole: 'none',
    footer: 'quiet_public',
    stickyAllowed: false,
    printMode: 'single_summary',
    cardProminenceDefault: 1,
    primaryCtaTone: 'workflow',
  },
  EDITORIAL_FREE_RESULT: {
    id: 'EDITORIAL_FREE_RESULT',
    shell: 'public',
    header: 'contextual_public',
    background: 'ivory',
    readingWidth: 'standard',
    typographyLead: 'serif',
    sectionRhythm: 'editorial',
    imageRole: 'result_identity',
    footer: 'quiet_public',
    stickyAllowed: true,
    printMode: 'editorial_result',
    cardProminenceDefault: 1,
    primaryCtaTone: 'commercial',
  },
  SHARED_SOCIAL_ENTRY: {
    id: 'SHARED_SOCIAL_ENTRY',
    shell: 'public',
    header: 'contextual_public',
    background: 'ivory',
    readingWidth: 'narrow',
    typographyLead: 'serif',
    sectionRhythm: 'editorial',
    imageRole: 'result_identity',
    footer: 'quiet_public',
    stickyAllowed: false,
    printMode: 'privacy_safe',
    cardProminenceDefault: 1,
    primaryCtaTone: 'recipient',
  },
  PREMIUM_GUIDED_FLOW: {
    id: 'PREMIUM_GUIDED_FLOW',
    shell: 'public',
    header: 'contextual_public',
    background: 'white',
    readingWidth: 'narrow',
    typographyLead: 'sans',
    sectionRhythm: 'guided',
    imageRole: 'none',
    footer: 'quiet_public',
    stickyAllowed: false,
    printMode: 'product_fact',
    cardProminenceDefault: 1,
    primaryCtaTone: 'workflow',
  },
  PRODUCT_DECISION: {
    id: 'PRODUCT_DECISION',
    shell: 'public',
    header: 'full_public',
    background: 'ivory',
    readingWidth: 'standard',
    typographyLead: 'sans',
    sectionRhythm: 'decision',
    imageRole: 'none',
    footer: 'quiet_public',
    stickyAllowed: false,
    printMode: 'product_fact',
    cardProminenceDefault: 2,
    primaryCtaTone: 'commercial',
  },
  PURCHASE_CONFIRMATION: {
    id: 'PURCHASE_CONFIRMATION',
    shell: 'public',
    header: 'contextual_public',
    background: 'white',
    readingWidth: 'narrow',
    typographyLead: 'sans',
    sectionRhythm: 'decision',
    imageRole: 'none',
    footer: 'minimal',
    stickyAllowed: false,
    printMode: 'product_fact',
    cardProminenceDefault: 2,
    primaryCtaTone: 'commercial',
  },
  DIGITAL_PUBLICATION: {
    id: 'DIGITAL_PUBLICATION',
    shell: 'public',
    header: 'contextual_public',
    background: 'ivory',
    readingWidth: 'wide',
    typographyLead: 'serif',
    sectionRhythm: 'publication',
    imageRole: 'editorial',
    footer: 'minimal',
    stickyAllowed: false,
    printMode: 'editorial_result',
    cardProminenceDefault: 0,
    primaryCtaTone: 'commercial',
  },
};

export type ExperienceResolveInput = {
  pathname: string;
  /** /core free UX phase when known (client). */
  coreUxPhase?: 'INTAKE' | 'QUESTIONNAIRE' | 'RESULT' | 'OTHER';
  /** /dtr/lp paid phase when known (client). */
  paidPhase?: 'need_free' | 'questionnaire' | 'complete' | 'plans' | 'checkout' | 'other';
};

/**
 * Path-first archetype resolution. Optional phase overrides refine /core and /dtr/lp.
 */
export function resolveExperienceArchetype(input: ExperienceResolveInput): M55ExperienceArchetype {
  const path = input.pathname || '/';

  if (path === '/home' || path === '/') return 'PUBLIC_POSTER';
  if (path === '/how-m55-works' || path === '/ten-views' || path === '/support') {
    return 'PUBLIC_EDITORIAL';
  }
  if (path.startsWith('/r/')) return 'SHARED_SOCIAL_ENTRY';
  if (path === '/pricing') return 'PRODUCT_DECISION';
  if (path.startsWith('/legal/')) return 'PUBLIC_EDITORIAL';

  if (path === '/core' || path.startsWith('/core/')) {
    if (input.coreUxPhase === 'RESULT') return 'EDITORIAL_FREE_RESULT';
    if (input.coreUxPhase === 'QUESTIONNAIRE' || input.coreUxPhase === 'INTAKE') {
      return 'GUIDED_FREE_FLOW';
    }
    return 'GUIDED_FREE_FLOW';
  }

  if (path === '/dtr/lp' || path.startsWith('/dtr/lp/')) {
    if (input.paidPhase === 'checkout') return 'PURCHASE_CONFIRMATION';
    if (input.paidPhase === 'questionnaire' || input.paidPhase === 'complete') {
      return 'PREMIUM_GUIDED_FLOW';
    }
    // Default LP + plan selection: product decision surface (wider)
    return 'PRODUCT_DECISION';
  }

  if (path === '/dtr' || path.startsWith('/dtr/core') || path.startsWith('/dtr/processing')) {
    return 'DIGITAL_PUBLICATION';
  }

  if (path.startsWith('/purchase') || path.includes('/purchase/confirm')) {
    return 'PURCHASE_CONFIRMATION';
  }

  if (path.startsWith('/sign-in') || path.startsWith('/sign-up') || path === '/my') {
    return 'PUBLIC_EDITORIAL';
  }

  return 'PUBLIC_EDITORIAL';
}

export function experienceArchetypeContract(
  archetype: M55ExperienceArchetype,
): ExperienceArchetypeContract {
  return EXPERIENCE_ARCHETYPE_CONTRACTS[archetype];
}
