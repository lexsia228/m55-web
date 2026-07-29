/**
 * Copy authority domains — not one giant constants file.
 * Each domain points at typed owner modules; verifier harvests Japanese strings from these paths.
 */

export type CopyAuthorityDomainId =
  | 'terminology'
  | 'cta_state'
  | 'public_navigation'
  | 'product_pricing'
  | 'free_funnel'
  | 'premium_funnel'
  | 'trait_identity'
  | 'sharing'
  | 'legal_support'
  | 'transactional_trust'
  | 'home_public'
  | 'core_public'
  | 'method_authority'
  | 'page_content_registered';

export type CopyAuthorityDomain = {
  id: CopyAuthorityDomainId;
  /** Semantic purpose. */
  use: string;
  ownerFiles: readonly string[];
};

export const M55_COPY_AUTHORITY_DOMAINS: readonly CopyAuthorityDomain[] = [
  {
    id: 'terminology',
    use: 'Canonical Growth UI terms (無料で見る, プレミアムレポート, …)',
    ownerFiles: ['lib/m55/commercialUx/terminology.ts'],
  },
  {
    id: 'cta_state',
    use: 'Principal CTA labels by funnel state',
    ownerFiles: ['lib/m55/commercialUx/experience/experienceCtaState.ts'],
  },
  {
    id: 'public_navigation',
    use: 'Header/menu labels and contextual actions',
    ownerFiles: ['lib/m55/commercialUx/publicHeaderState.ts'],
  },
  {
    id: 'product_pricing',
    use: 'Plan names, prices, upgrade arithmetic copy',
    ownerFiles: ['lib/m55/commercialUx/planComparison.ts'],
  },
  {
    id: 'free_funnel',
    use: 'Guest intake, free questions, save/rerun copy',
    ownerFiles: [
      'lib/m55/freeResult/guestFreeJourneyCopyV1.ts',
      'components/core/corePublicCopy.ts',
    ],
  },
  {
    id: 'premium_funnel',
    use: 'Premium LP continuity and paid questionnaire framing',
    ownerFiles: [
      'components/dtr/DtrLpPremiumContinuityIntro.tsx',
      'lib/m55/commercialUx/planComparison.ts',
    ],
  },
  {
    id: 'trait_identity',
    use: 'All-ten trait identity / recognition / share / premium continuation',
    ownerFiles: ['lib/m55/commercialUx/traitIdentityCatalog.ts'],
  },
  {
    id: 'sharing',
    use: 'Privacy-safe share card and shared-entry copy',
    ownerFiles: ['lib/m55/freeResult/privacySafeShareCardV1.ts'],
  },
  {
    id: 'legal_support',
    use: 'Support and legal page owned copy',
    ownerFiles: ['app/support', 'app/legal'],
  },
  {
    id: 'transactional_trust',
    use: 'Checkout trust and payment preparation framing',
    ownerFiles: ['lib/m55/commercialUx/planComparison.ts'],
  },
  {
    id: 'home_public',
    use: 'HOME poster and public campaign copy',
    ownerFiles: ['lib/m55/topFreeEntryPublicCopy.ts', 'lib/m55/homeProductStory.ts'],
  },
  {
    id: 'core_public',
    use: 'Free result bridge and result section titles',
    ownerFiles: ['components/core/corePublicCopy.ts'],
  },
  {
    id: 'method_authority',
    use: 'M55 複合読み解きモデル public explanation, authority levels and placements',
    ownerFiles: ['lib/m55/method/m55MethodAuthority.ts'],
  },
  {
    id: 'page_content_registered',
    use: 'Typed page-content objects registered to archetypes',
    ownerFiles: ['lib/m55/commercialUx/experience/pageContent'],
  },
] as const;

/** Governed UI roots scanned for unmanaged user-visible literals. */
export const M55_COPY_GOVERNED_GLOBS = [
  'app/home',
  'app/how-m55-works',
  'app/ten-views',
  'app/pricing',
  'app/core',
  'app/dtr',
  'app/r',
  'app/support',
  'app/legal',
  'app/purchase',
  'components/home',
  'components/core',
  'components/dtr',
  'components/share',
  'components/shell',
  'components/experience',
  'components/profile',
  'components/pages',
] as const;

export const M55_COPY_IGNORED_ATTRS = new Set([
  'className',
  'class',
  'id',
  'href',
  'src',
  'srcSet',
  'alt', // alt may be content; still harvested if Japanese — checked separately as exception-friendly
  'data-testid',
  'data-m55-archetype',
  'data-m55-ecp',
  'data-m55-pathname',
  'data-m55-print-mode',
  'data-m55-experience-surface',
  'data-m55-paid-phase',
  'data-m55-print-hide',
  'data-m55-public-shell',
  'data-m55-ux-phase',
  'data-m55-generation-count',
  'data-m55-home-print-summary',
  'data-m55-print-page',
  'data-m55-dtr-reader-shell',
  'data-m55-editorial-beat',
  'data-m55-trust-summary',
  'data-m55-print-frame',
  'aria-controls',
  'aria-labelledby',
  'aria-describedby',
  'htmlFor',
  'role',
  'type',
  'name',
  'method',
  'action',
  'target',
  'rel',
  'decoding',
  'loading',
  'fetchPriority',
]);
