/**
 * Deterministic user-export image renderer for an existing PublicShareSpecV1.
 * OG remains fixed at 1200×630 via opengraph-image; this module serves selected aspects only.
 */
import { ImageResponse } from 'next/og';
import type { ShareCandidateVariant } from './m55NarrativeSpecV1';
import { parsePublicCardDisplayV1, posterHeroLinesJa } from './publicCardDisplayV1';
import type { PublicShareSpecV1 } from './publicShareSpecV1';

export const SHARE_EXPORT_ASPECTS = ['1:1', '4:5', '9:16'] as const;
export type ShareExportAspectRatio = (typeof SHARE_EXPORT_ASPECTS)[number];

const EXPORT_WIDTH = 1080;

export function parseShareExportAspectRatio(
  input: string | null | undefined,
): ShareExportAspectRatio | null {
  if (!input) return null;
  return (SHARE_EXPORT_ASPECTS as readonly string[]).includes(input)
    ? (input as ShareExportAspectRatio)
    : null;
}

export function shareExportDimensions(
  aspect: ShareExportAspectRatio,
): { width: number; height: number } {
  switch (aspect) {
    case '1:1':
      return { width: EXPORT_WIDTH, height: EXPORT_WIDTH };
    case '4:5':
      return { width: EXPORT_WIDTH, height: 1350 };
    case '9:16':
      return { width: EXPORT_WIDTH, height: 1920 };
    default: {
      const _exhaustive: never = aspect;
      return _exhaustive;
    }
  }
}

export function resolveShareSubsystemFromVariant(
  variant: ShareCandidateVariant,
): 'self' | 'pair' {
  return variant === 'pair_manual' || variant === 'pair_generic' ? 'pair' : 'self';
}

export function buildUserShareImagePath(
  sharePath: string,
  aspect: ShareExportAspectRatio,
): string {
  return `${sharePath}/share-image?aspect=${encodeURIComponent(aspect)}`;
}

export type PublicShareImageExportModel = {
  subsystem: 'self' | 'pair';
  aspect: ShareExportAspectRatio;
  dimensions: { width: number; height: number };
  spec: PublicShareSpecV1;
  display: ReturnType<typeof parsePublicCardDisplayV1>;
};

export function buildPublicShareImageExportModel(
  spec: PublicShareSpecV1,
  aspect: ShareExportAspectRatio,
): PublicShareImageExportModel {
  return {
    subsystem: resolveShareSubsystemFromVariant(spec.variant),
    aspect,
    dimensions: shareExportDimensions(aspect),
    spec,
    display: parsePublicCardDisplayV1(spec),
  };
}

function artBandHeight(aspect: ShareExportAspectRatio, totalHeight: number): number {
  const ratio = aspect === '9:16' ? 0.4 : aspect === '4:5' ? 0.36 : 0.34;
  return Math.round(totalHeight * ratio);
}

function variantPalette(variant: ShareCandidateVariant): {
  bg: string;
  ink: string;
  muted: string;
} {
  const isPoster = variant === 'hidden_spec' || variant === 'premium_takeaway';
  const isMirror = variant === 'seen_vs_actual';
  if (isPoster) {
    return {
      bg: 'linear-gradient(165deg, #1c1830 0%, #4e4480 100%)',
      ink: '#fffaf1',
      muted: 'rgba(255,250,241,0.82)',
    };
  }
  if (isMirror) {
    return {
      bg: 'linear-gradient(180deg, #f7f2ff 0%, #fffaf1 100%)',
      ink: '#1c1830',
      muted: 'rgba(55,48,82,0.72)',
    };
  }
  return {
    bg: 'linear-gradient(180deg, #fffaf1 0%, #eee8f6 100%)',
    ink: '#1c1830',
    muted: 'rgba(55,48,82,0.72)',
  };
}

function scaleFont(totalHeight: number, base: number): number {
  return Math.round(base * (totalHeight / 1350));
}

export function renderPublicShareExportImage(
  spec: PublicShareSpecV1,
  aspect: ShareExportAspectRatio,
  artUrl: string | null,
): ImageResponse {
  const model = buildPublicShareImageExportModel(spec, aspect);
  const { width, height } = model.dimensions;
  const display = model.display;
  const palette = variantPalette(spec.variant);
  const artHeight = artUrl ? artBandHeight(aspect, height) : 0;
  const padX = scaleFont(height, 56);
  const padY = scaleFont(height, 48);
  const headlineSize = scaleFont(height, 34);
  const bodySize = scaleFont(height, 24);
  const labelSize = scaleFont(height, 20);
  const brandSize = scaleFont(height, 26);

  const isPoster = spec.variant === 'hidden_spec' || spec.variant === 'premium_takeaway';
  const isMirror = spec.variant === 'seen_vs_actual';
  const isPair = spec.variant === 'pair_manual';
  const isPairGeneric = spec.variant === 'pair_generic';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: palette.bg,
          color: palette.ink,
          fontFamily: 'sans-serif',
        }}
      >
        {artUrl ? (
          <img
            src={artUrl}
            width={width}
            height={artHeight}
            alt=""
            style={{ width, height: artHeight, objectFit: 'cover' }}
          />
        ) : null}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: `${padY}px ${padX}px`,
            gap: scaleFont(height, 16),
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: brandSize,
              letterSpacing: '0.22em',
              fontWeight: 700,
            }}
          >
            M55
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: scaleFont(height, 14),
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', fontSize: headlineSize, fontWeight: 700, lineHeight: 1.2 }}>
              {spec.headline}
            </div>
            {isPoster
              ? posterHeroLinesJa(display.heroJa).map((line) => (
                  <div
                    key={line}
                    style={{
                      display: 'flex',
                      fontSize: scaleFont(height, 30),
                      fontWeight: 700,
                      lineHeight: 1.35,
                    }}
                  >
                    {line}
                  </div>
                ))
              : null}
            {isPoster && display.supportJa ? (
              <div style={{ display: 'flex', fontSize: bodySize, lineHeight: 1.4, opacity: 0.88 }}>
                {display.supportJa}
              </div>
            ) : null}
            {isMirror && display.seenJa && display.actualJa ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: scaleFont(height, 10) }}>
                <div style={{ display: 'flex', fontSize: bodySize, fontWeight: 700, lineHeight: 1.4 }}>
                  「{display.seenJa}」
                </div>
                <div style={{ display: 'flex', fontSize: labelSize }}>vs</div>
                <div style={{ display: 'flex', fontSize: bodySize, fontWeight: 700, lineHeight: 1.4 }}>
                  「{display.actualJa}」
                </div>
              </div>
            ) : null}
            {spec.variant === 'manual' && display.rows.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: scaleFont(height, 8) }}>
                {display.rows.map((row) => (
                  <div key={row.label} style={{ display: 'flex', fontSize: labelSize, lineHeight: 1.35 }}>
                    {row.label}　{row.body}
                  </div>
                ))}
              </div>
            ) : null}
            {isPair ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: scaleFont(height, 10),
                  fontSize: bodySize,
                  lineHeight: 1.4,
                }}
              >
                {display.sideAJa ? (
                  <div style={{ display: 'flex' }}>一方　{display.sideAJa}</div>
                ) : (
                  <div style={{ display: 'flex' }}>{display.entryJa}</div>
                )}
                {display.sideBJa ? (
                  <div style={{ display: 'flex' }}>もう一方　{display.sideBJa}</div>
                ) : null}
                {display.returnJa ? (
                  <div style={{ display: 'flex' }}>戻り　{display.returnJa}</div>
                ) : null}
              </div>
            ) : null}
            {isPairGeneric ? (
              <div style={{ display: 'flex', fontSize: bodySize, lineHeight: 1.45 }}>
                {spec.body}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', fontSize: bodySize, color: palette.muted }}>
            <span>{display.cta || 'あなたはどう出る？'}</span>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
