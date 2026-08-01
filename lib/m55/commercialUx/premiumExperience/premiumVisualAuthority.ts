/**
 * Canonical Premium visual authority — promoted from Home editorial sample.
 * Source reference: components/home/HomePanel.module.css (.premiumDarkStage, .premiumPreviewProductSheet)
 */

export const PREMIUM_VISUAL_AUTHORITY_KEY =
  'premium.experience.home_editorial_sample_v1' as const;

export const PREMIUM_EDITORIAL_AUTHORITY_KEY = 'premium.funnel' as const;

/** Machine-verifiable tokens — must stay aligned with Home premium dark stage. */
export const PREMIUM_VISUAL_TOKENS = {
  ink: '#0b1a2b',
  inkSoft: 'rgba(13, 11, 21, 0.72)',
  ivory: '#f1e8d6',
  ivoryMuted: 'rgba(241, 232, 214, 0.88)',
  warmStage: '#f3ede2',
  copper: '#c46e5a',
  copperRule: 'rgba(196, 110, 90, 0.72)',
  copperSoft: 'rgba(196, 110, 90, 0.14)',
  accentTeal: '#7da8a4',
  serif: "'Shippori Mincho', 'Noto Serif JP', serif",
  sans: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif",
  publicationGap: '1.75rem',
  sheetBorder: 'rgba(241, 232, 214, 0.16)',
} as const;

export const PREMIUM_VISUAL_SOURCE = {
  assetKey: PREMIUM_VISUAL_AUTHORITY_KEY,
  ownerFiles: [
    'components/home/HomePremiumPreviewSlice.tsx',
    'components/home/HomePremiumValueBridge.tsx',
    'components/home/HomePanel.module.css',
  ] as const,
  fixtureSymbol: 'HOME_PREMIUM_PREVIEW_FIXTURE',
  fixturePath: 'lib/m55/homePreviewFixtures.ts',
} as const;

export type PremiumExperienceTier = 'FREE' | 'PREMIUM';

export type PremiumExperienceVariant = 'editorial_stage' | 'editorial_sheet' | 'decision_surface';
