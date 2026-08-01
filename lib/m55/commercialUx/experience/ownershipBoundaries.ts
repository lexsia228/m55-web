/**
 * Component ownership / import boundaries for ECP v2.
 * Blocks duplicated ownership, not all local layout composition.
 */

export const M55_ECP_OWNERSHIP = {
  shell: {
    allowed: [
      'app/_components/PublicShell.tsx',
      'components/shell/ShellLayout.tsx',
      'app/dtr/core/layout.tsx',
    ],
    forbiddenSecondImplementations: [
      'PublicShell2',
      'AnotherPublicShell',
      'AppShell',
      'MarketingShell',
    ],
  },
  header: {
    allowed: ['components/shell/PublicHeader.tsx', 'components/shell/PublicHeaderContainer.tsx'],
    forbiddenPatterns: [/function\s+PublicHeader\b/, /export\s+function\s+SiteHeader\b/],
    maxPublicHeaderFiles: 2,
  },
  footer: {
    allowed: ['app/_components/PublicFooter.tsx'],
  },
  planArithmetic: {
    soleOwner: 'lib/m55/commercialUx/planComparison.ts',
    forbiddenLocalLiterals: ['¥1,000', '¥1,480', '¥600', '1,600円', '1480', '1000'],
    allowedImportSymbol: 'PLAN_COMPARISON',
  },
  traitCatalog: {
    soleOwner: 'lib/m55/commercialUx/traitIdentityCatalog.ts',
    forbiddenSecondCatalogs: ['SAFE_STATEMENT_BY_LANE', 'TRAIT_FALLBACK_CATALOG', 'LOCAL_TRAIT_MAP'],
  },
  ctaLabels: {
    soleOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts',
    terminologyOwner: 'lib/m55/commercialUx/terminology.ts',
  },
  sticky: {
    soleOwner: 'components/core/CorePremiumStickyCta.tsx',
    forbiddenLocalPositionSystems: ['position:\\s*sticky', 'premiumStickyBar'],
  },
  print: {
    soleOwner: 'lib/m55/commercialUx/publicPrint.css',
    forbiddenRoutePrintFrameworks: ['@media\\s+print'],
  },
  terminology: {
    soleOwner: 'lib/m55/commercialUx/terminology.ts',
  },
} as const;

/** Files allowed to contain @media print besides the sole print owner. */
export const M55_ECP_PRINT_CSS_ALLOWLIST = [
  'lib/m55/commercialUx/publicPrint.css',
  'lib/m55/commercialUx/experience/experienceControlPlane.css',
  'app/dtr/core/layout.module.css',
  'components/home/HomePrintSummary.module.css',
] as const;
