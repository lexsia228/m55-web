/**
 * M55 Experience Control Plane v2 — single facade for archetypes, CTA, tokens, editorial.
 */

import {
  EXPERIENCE_ARCHETYPE_CONTRACTS,
  experienceArchetypeContract,
  resolveExperienceArchetype,
  type ExperienceResolveInput,
  type M55ExperienceArchetype,
} from './experienceArchetypes';
import {
  M55_CTA_FORBIDDEN_PHRASES,
  M55_CTA_LABELS,
  resolveExperienceCtaLabel,
  resolveExperienceCtaState,
  type ExperienceCtaResolveInput,
} from './experienceCtaState';
import {
  EXPERIENCE_EDITORIAL_RULES,
  EXPERIENCE_PAGE_BEATS,
  EXPERIENCE_PRODUCT_BEATS,
  EXPERIENCE_RESULT_BEATS,
  EXPERIENCE_TRAIT_FIELDS,
} from './experienceEditorial';
import {
  EXPERIENCE_BUTTON,
  EXPERIENCE_CARD_PROMINENCE,
  EXPERIENCE_COLOR,
  EXPERIENCE_RADIUS,
  EXPERIENCE_READING_WIDTH,
  EXPERIENCE_SPACE,
  EXPERIENCE_TYPE,
  EXPERIENCE_Z_INDEX,
  EXPERIENCE_TRANSITION,
} from './experienceTokens';
import { M55_ECP_CONSTITUTION } from './experienceConstitution';
import { M55_EXPERIENCE_ROUTE_REGISTRY } from './experienceRouteRegistry';
import { M55_COPY_AUTHORITY_DOMAINS } from './copyAuthorityDomains';
import { M55_ECP_OWNERSHIP } from './ownershipBoundaries';

export const M55_EXPERIENCE_CONTROL_PLANE_VERSION = 'm55-ecp-v2' as const;

export function resolveExperience(input: ExperienceResolveInput) {
  const archetype = resolveExperienceArchetype(input);
  const contract = experienceArchetypeContract(archetype);
  return {
    version: M55_EXPERIENCE_CONTROL_PLANE_VERSION,
    archetype,
    contract,
    readingWidth: EXPERIENCE_READING_WIDTH[contract.readingWidth],
    stickyPolicy: M55_ECP_CONSTITUTION.stickyPolicyFor(archetype),
  };
}

export const M55_EXPERIENCE_CONTROL_PLANE = {
  version: M55_EXPERIENCE_CONTROL_PLANE_VERSION,
  archetypes: EXPERIENCE_ARCHETYPE_CONTRACTS,
  colors: EXPERIENCE_COLOR,
  type: EXPERIENCE_TYPE,
  space: EXPERIENCE_SPACE,
  readingWidth: EXPERIENCE_READING_WIDTH,
  radius: EXPERIENCE_RADIUS,
  cardProminence: EXPERIENCE_CARD_PROMINENCE,
  buttons: EXPERIENCE_BUTTON,
  zIndex: EXPERIENCE_Z_INDEX,
  transition: EXPERIENCE_TRANSITION,
  ctaLabels: M55_CTA_LABELS,
  ctaForbidden: M55_CTA_FORBIDDEN_PHRASES,
  constitution: M55_ECP_CONSTITUTION,
  routeRegistry: M55_EXPERIENCE_ROUTE_REGISTRY,
  copyDomains: M55_COPY_AUTHORITY_DOMAINS,
  ownership: M55_ECP_OWNERSHIP,
  editorial: {
    pageBeats: EXPERIENCE_PAGE_BEATS,
    resultBeats: EXPERIENCE_RESULT_BEATS,
    productBeats: EXPERIENCE_PRODUCT_BEATS,
    rules: EXPERIENCE_EDITORIAL_RULES,
    traitFields: EXPERIENCE_TRAIT_FIELDS,
  },
  resolveExperience,
  resolveExperienceArchetype,
  resolveExperienceCtaState,
  resolveExperienceCtaLabel,
} as const;

export type { M55ExperienceArchetype, ExperienceResolveInput, ExperienceCtaResolveInput };
