/**
 * M55 Experience Control Plane v2 — enforceable constitution.
 * Archetypes resolve to complete contracts; routes do not invent local defaults.
 */

import {
  EXPERIENCE_ARCHETYPE_CONTRACTS,
  type ExperienceArchetypeContract,
  type M55ExperienceArchetype,
} from './experienceArchetypes';
import { EXPERIENCE_BUTTON, EXPERIENCE_COLOR, EXPERIENCE_RADIUS, EXPERIENCE_READING_WIDTH } from './experienceTokens';

export const M55_ECP_SHELL_OWNERS = {
  publicShell: 'app/_components/PublicShell',
  coreShell: 'components/shell/ShellLayout',
  readerShell: 'app/dtr/core/layout',
  header: 'components/shell/PublicHeaderContainer',
  footer: 'app/_components/PublicFooter',
  printCss: 'lib/m55/commercialUx/publicPrint.css',
  ecpCss: 'lib/m55/commercialUx/experience/experienceControlPlane.css',
} as const;

export const M55_ECP_TYPOGRAPHY_ROLES = ['display', 'title', 'body', 'meta', 'price', 'control'] as const;
export const M55_ECP_SURFACE_ROLES = ['ivory', 'white', 'navySoft', 'transparent'] as const;
export const M55_ECP_CTA_ROLES = ['primary', 'secondary', 'sticky', 'header_contextual'] as const;

export type ExperienceStickyPolicy = 'forbidden' | 'allowed_result_only' | 'allowed';
export type ExperienceResponsivePolicy = {
  matrixWidths: readonly number[];
  zoomPercents: readonly number[];
  headerBreakpointPx: 960;
  loginInMenuBelowBreakpoint: true;
  onePrimaryCtaPerViewport: true;
  noHorizontalOverflow: true;
};

export const M55_ECP_RESPONSIVE_POLICY: ExperienceResponsivePolicy = {
  matrixWidths: [320, 390, 768, 959, 960, 1024, 1280, 1440],
  zoomPercents: [125, 150, 200],
  headerBreakpointPx: 960,
  loginInMenuBelowBreakpoint: true,
  onePrimaryCtaPerViewport: true,
  noHorizontalOverflow: true,
};

/** Complete constitution fields every archetype contract must satisfy. */
export const M55_ECP_REQUIRED_CONTRACT_KEYS = [
  'id',
  'shell',
  'header',
  'footer',
  'background',
  'readingWidth',
  'typographyLead',
  'sectionRhythm',
  'imageRole',
  'stickyAllowed',
  'printMode',
  'cardProminenceDefault',
  'primaryCtaTone',
] as const;

export function assertArchetypeContractComplete(
  archetype: M55ExperienceArchetype,
  contract: ExperienceArchetypeContract = EXPERIENCE_ARCHETYPE_CONTRACTS[archetype],
): void {
  for (const key of M55_ECP_REQUIRED_CONTRACT_KEYS) {
    if (contract[key] === undefined || contract[key] === null) {
      throw new Error(`ECP constitution: archetype ${archetype} missing ${key}`);
    }
  }
  if (!(contract.readingWidth in EXPERIENCE_READING_WIDTH)) {
    throw new Error(`ECP constitution: ${archetype} invalid readingWidth`);
  }
  if (contract.cardProminenceDefault < 0 || contract.cardProminenceDefault > 2) {
    throw new Error(`ECP constitution: ${archetype} invalid cardProminenceDefault`);
  }
}

export function stickyPolicyFor(archetype: M55ExperienceArchetype): ExperienceStickyPolicy {
  const c = EXPERIENCE_ARCHETYPE_CONTRACTS[archetype];
  if (!c.stickyAllowed) return 'forbidden';
  if (archetype === 'EDITORIAL_FREE_RESULT') return 'allowed_result_only';
  return 'allowed';
}

export const M55_ECP_CONSTITUTION = {
  version: 'm55-ecp-v2',
  shellOwners: M55_ECP_SHELL_OWNERS,
  typographyRoles: M55_ECP_TYPOGRAPHY_ROLES,
  surfaceRoles: M55_ECP_SURFACE_ROLES,
  ctaRoles: M55_ECP_CTA_ROLES,
  responsive: M55_ECP_RESPONSIVE_POLICY,
  colors: EXPERIENCE_COLOR,
  radius: EXPERIENCE_RADIUS,
  buttons: EXPERIENCE_BUTTON,
  requiredContractKeys: M55_ECP_REQUIRED_CONTRACT_KEYS,
  assertArchetypeContractComplete,
  stickyPolicyFor,
} as const;
