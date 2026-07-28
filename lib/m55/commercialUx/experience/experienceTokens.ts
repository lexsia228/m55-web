/**
 * M55 Experience Control Plane v2 — visual roles and limited design tokens.
 * CSS variables in experienceControlPlane.css mirror these values.
 */

export const EXPERIENCE_COLOR = {
  deepNavy: '#1a2a4a',
  deepNavySoft: 'rgba(26, 42, 74, 0.06)',
  mutedPurple: '#6b5fa8',
  mutedPurpleSoft: 'rgba(107, 95, 168, 0.12)',
  warmIvory: '#f9f7f4',
  white: '#ffffff',
  textMain: '#3d3d3d',
  textStrong: '#1a1a1a',
  textMeta: 'rgba(60, 60, 60, 0.7)',
  borderSoft: 'rgba(40, 40, 40, 0.12)',
  borderStrong: 'rgba(26, 42, 74, 0.22)',
} as const;

export const EXPERIENCE_TYPE = {
  fontSerif: '"Hiragino Mincho ProN", "Noto Serif JP", "Iowan Old Style", Palatino, serif',
  fontSans: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif',
  scale: {
    display: 'clamp(1.55rem, 3.6vw, 2.05rem)',
    title: 'clamp(1.2rem, 2.4vw, 1.45rem)',
    body: '0.98rem',
    meta: '0.82rem',
    price: '1.15rem',
  },
  lineHeight: {
    display: 1.35,
    title: 1.4,
    body: 1.7,
    meta: 1.55,
  },
} as const;

export const EXPERIENCE_SPACE = {
  xs: '0.35rem',
  sm: '0.65rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2.25rem',
} as const;

export const EXPERIENCE_READING_WIDTH = {
  narrow: '36rem',
  standard: '48rem',
  wide: '56rem',
  full: '100%',
} as const;

/** Two principal radii only. */
export const EXPERIENCE_RADIUS = {
  card: '0.85rem',
  control: '0.7rem',
  pill: '999px',
} as const;

/** Three card prominence levels: 0 flat / 1 soft / 2 decision. */
export const EXPERIENCE_CARD_PROMINENCE = {
  0: { shadow: 'none', border: EXPERIENCE_COLOR.borderSoft, bg: 'transparent' },
  1: { shadow: '0 1px 0 rgba(20, 16, 40, 0.04)', border: EXPERIENCE_COLOR.borderSoft, bg: EXPERIENCE_COLOR.white },
  2: {
    shadow: '0 8px 24px rgba(20, 16, 40, 0.08)',
    border: EXPERIENCE_COLOR.borderStrong,
    bg: EXPERIENCE_COLOR.white,
  },
} as const;

export const EXPERIENCE_BUTTON = {
  commercial: {
    bg: EXPERIENCE_COLOR.deepNavy,
    color: '#fffaf1',
    radius: EXPERIENCE_RADIUS.pill,
  },
  workflow: {
    bg: EXPERIENCE_COLOR.mutedPurple,
    color: '#fffaf1',
    radius: EXPERIENCE_RADIUS.control,
  },
  secondary: {
    bg: 'transparent',
    color: EXPERIENCE_COLOR.deepNavy,
    radius: EXPERIENCE_RADIUS.control,
  },
} as const;

export const EXPERIENCE_IMAGE_ASPECT = {
  resultHero: '4 / 3',
  shareMark: '1 / 1',
  poster: 'auto',
} as const;

export const EXPERIENCE_Z_INDEX = {
  header: 40,
  sticky: 30,
  floatControl: 25,
  modal: 50,
} as const;

export const EXPERIENCE_TRANSITION = {
  none: '0ms',
  quick: '120ms',
  standard: '200ms',
} as const;

/** CSS custom properties that count as approved token references. */
export const EXPERIENCE_CSS_VAR_ALLOWLIST = [
  '--m55-navy',
  '--m55-navy-soft',
  '--m55-purple',
  '--m55-purple-soft',
  '--m55-ivory',
  '--m55-white',
  '--m55-text',
  '--m55-text-strong',
  '--m55-text-meta',
  '--m55-border',
  '--m55-border-strong',
  '--m55-font-serif',
  '--m55-font-sans',
  '--m55-radius-card',
  '--m55-radius-control',
  '--m55-radius-pill',
  '--m55-space-sm',
  '--m55-space-md',
  '--m55-space-lg',
  '--m55-read-width',
  '--m55-card-shadow',
  '--m55-sticky-height',
] as const;
