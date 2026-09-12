/**
 * Deterministic user-export image renderer for an existing PublicShareSpecV1.
 * OG remains fixed at 1200×630 via opengraph-image; this module serves selected aspects only.
 */
import { ImageResponse } from 'next/og';
import { CANONICAL_PRODUCTION_ORIGIN } from '../freeResult/privacySafeShareCardV1';
import type { ShareCandidateVariant } from './m55NarrativeSpecV1';
import { buildPairSharePresentationV1, type PairSharePresentationV1 } from './pairSharePresentationV1';
import { parsePublicCardDisplayV1, posterHeroLinesJa } from './publicCardDisplayV1';
import type { PublicShareSpecV1 } from './publicShareSpecV1';
import { resolvePublicShareArtworkPathsFromToken } from './resolvePublicShareArtworkV1';

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
  pairPresentation: PairSharePresentationV1 | null;
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
    pairPresentation: buildPairSharePresentationV1(spec, aspect),
  };
}

export function exportArtBandHeight(
  aspect: ShareExportAspectRatio,
  totalHeight: number,
  variant: ShareCandidateVariant,
): number {
  const isPoster = variant === 'hidden_spec' || variant === 'premium_takeaway';
  if (isPoster) {
    const ratio = aspect === '9:16' ? 0.4 : aspect === '4:5' ? 0.36 : 0.34;
    return Math.round(totalHeight * ratio);
  }
  if (variant === 'manual') {
    const ratio = aspect === '1:1' ? 0.34 : aspect === '9:16' ? 0.36 : 0.34;
    return Math.round(totalHeight * ratio);
  }
  const ratio = aspect === '1:1' ? 0.22 : aspect === '9:16' ? 0.26 : 0.28;
  return Math.round(totalHeight * ratio);
}

function isManualVariant(variant: ShareCandidateVariant): boolean {
  return variant === 'manual';
}

function isSelfEditorialVariant(variant: ShareCandidateVariant): boolean {
  return variant === 'manual' || variant === 'seen_vs_actual';
}

export function shareExportArtOrigin(): string {
  if (process.env.M55_E2E_CLEAN_CAPTURE === '1') {
    const port = process.env.PORT || '3000';
    return `http://127.0.0.1:${port}`;
  }
  return CANONICAL_PRODUCTION_ORIGIN;
}

export function resolveExportArtUrls(
  spec: PublicShareSpecV1,
  artUrl: string | readonly string[] | null,
): readonly string[] {
  const paths = resolvePublicShareArtworkPathsFromToken(spec.token);
  const origin = shareExportArtOrigin();
  if (paths.length > 0) {
    return paths.map((path) => `${origin}${path}`);
  }
  const explicit = normalizeArtUrls(artUrl);
  if (explicit.length === 0) return [];
  if (origin !== CANONICAL_PRODUCTION_ORIGIN) {
    return explicit.map((url) => url.replace(CANONICAL_PRODUCTION_ORIGIN, origin));
  }
  return explicit;
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

/** Side-row Japanese wrap — matches in-browser Pair side contract. */
const PAIR_JA_SIDE_WRAP_STYLE = {
  wordBreak: 'keep-all',
  overflowWrap: 'normal',
} as const;

function normalizeArtUrls(artUrl: string | readonly string[] | null): readonly string[] {
  if (!artUrl) return [];
  return Array.isArray(artUrl) ? artUrl : [artUrl];
}

export function renderPublicShareExportImage(
  spec: PublicShareSpecV1,
  aspect: ShareExportAspectRatio,
  artUrl: string | readonly string[] | null,
): ImageResponse {
  const model = buildPublicShareImageExportModel(spec, aspect);
  const { width, height } = model.dimensions;
  const display = model.display;
  const palette = variantPalette(spec.variant);
  const artUrls = resolveExportArtUrls(spec, artUrl);
  const artHeight =
    artUrls.length > 0 ? exportArtBandHeight(aspect, height, spec.variant) : 0;
  const pairPresentation = model.pairPresentation;
  const padX = scaleFont(height, 56);
  const isManual = isManualVariant(spec.variant);
  const isSelfEditorial = isSelfEditorialVariant(spec.variant);
  const padY =
    artUrls.length > 0 && isManual
      ? scaleFont(height, 20)
      : artUrls.length > 0 && isSelfEditorial
        ? scaleFont(height, 18)
        : scaleFont(height, 48);
  const contentGap = scaleFont(
    height,
    isManual ? 10 : isSelfEditorial ? 8 : 16,
  );
  const manualHeadlineSize = scaleFont(height, 38);
  const manualRowSize = scaleFont(height, 21);
  const manualRowGap = scaleFont(height, 6);
  const manualBrandSize = scaleFont(height, 24);
  const manualCueSize = scaleFont(height, 18);
  const manualCtaSize = scaleFont(height, 22);
  const manualHeroOverlayPad = scaleFont(height, 16);
  const manualHeroHeadlinePad = scaleFont(height, 72);
  const headlineSize = scaleFont(height, 34);
  const bodySize = scaleFont(height, 24);
  const labelSize = scaleFont(height, 20);
  const brandSize = scaleFont(height, 26);
  const mirrorPaneBg = 'rgba(255,255,255,0.72)';
  const mirrorPaneBorder = 'rgba(28,24,48,0.08)';

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
        {isManual && artUrls.length === 1 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width,
              height: artHeight + manualHeroHeadlinePad,
              backgroundImage: `url(${artUrls[0]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'flex-end',
                padding: `${manualHeroOverlayPad}px ${padX}px`,
                background:
                  'linear-gradient(180deg, rgba(28,24,48,0.08) 0%, rgba(28,24,48,0.72) 62%, rgba(28,24,48,0.9) 100%)',
                gap: scaleFont(height, 6),
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: manualBrandSize,
                  letterSpacing: '0.22em',
                  fontWeight: 700,
                  color: '#fffaf1',
                }}
              >
                M55
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: manualHeadlineSize,
                  fontWeight: 700,
                  lineHeight: 1.18,
                  color: '#fffaf1',
                }}
              >
                {spec.headline}
              </div>
            </div>
          </div>
        ) : artUrls.length === 2 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              width,
              height: artHeight,
            }}
          >
            <img
              src={artUrls[0]}
              width={Math.round(width / 2)}
              height={artHeight}
              alt=""
              style={{ width: Math.round(width / 2), height: artHeight, objectFit: 'cover' }}
            />
            <img
              src={artUrls[1]}
              width={Math.round(width / 2)}
              height={artHeight}
              alt=""
              style={{ width: Math.round(width / 2), height: artHeight, objectFit: 'cover' }}
            />
          </div>
        ) : artUrls.length === 1 ? (
          <div
            style={{
              display: 'flex',
              width,
              height: artHeight,
              overflow: 'hidden',
            }}
          >
            <img
              src={artUrls[0]}
              width={width}
              height={artHeight}
              alt=""
              style={{ width, height: artHeight, objectFit: 'cover' }}
            />
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isSelfEditorial ? 'flex-start' : 'space-between',
            flex: isManual ? 0 : 1,
            padding: isManual
              ? `${scaleFont(height, 14)}px ${padX}px ${scaleFont(height, 24)}px`
              : `${padY}px ${padX}px ${isManual ? scaleFont(height, 28) : padY}px`,
            gap: contentGap,
          }}
        >
          {!isManual ? (
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
          ) : null}
          {isManual ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: contentGap,
              }}
            >
              {artUrls.length === 0 ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: manualBrandSize,
                      letterSpacing: '0.22em',
                      fontWeight: 700,
                    }}
                  >
                    M55
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: manualHeadlineSize,
                      fontWeight: 700,
                      lineHeight: 1.18,
                    }}
                  >
                    {spec.headline}
                  </div>
                </>
              ) : null}
              {display.rows.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: manualRowGap,
                    padding: `${scaleFont(height, 8)}px ${scaleFont(height, 10)}px`,
                    borderRadius: scaleFont(height, 10),
                    background: 'rgba(255,255,255,0.62)',
                    border: `1px solid ${mirrorPaneBorder}`,
                  }}
                >
                  {display.rows.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: 'flex',
                        fontSize: manualRowSize,
                        lineHeight: 1.28,
                      }}
                    >
                      {row.label}　{row.body}
                    </div>
                  ))}
                </div>
              ) : null}
              {display.cueJa ? (
                <div
                  style={{
                    display: 'flex',
                    fontSize: manualCueSize,
                    lineHeight: 1.32,
                    color: palette.muted,
                  }}
                >
                  {display.cueJa}
                </div>
              ) : null}
              <div style={{ display: 'flex', fontSize: manualCtaSize, color: palette.muted }}>
                <span>{display.cta || 'あなたはどう出る？'}</span>
              </div>
            </div>
          ) : isSelfEditorial ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: contentGap,
              }}
            >
              <div style={{ display: 'flex', fontSize: headlineSize, fontWeight: 700, lineHeight: 1.2 }}>
                {spec.headline}
              </div>
              {isMirror && display.seenJa && display.actualJa ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: scaleFont(height, 8),
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: scaleFont(height, 6),
                      padding: `${scaleFont(height, 10)}px ${scaleFont(height, 12)}px`,
                      borderRadius: scaleFont(height, 10),
                      background: mirrorPaneBg,
                      border: `1px solid ${mirrorPaneBorder}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontSize: labelSize,
                        letterSpacing: '0.08em',
                        color: palette.muted,
                      }}
                    >
                      外から見えやすい動き
                    </div>
                    <div style={{ display: 'flex', fontSize: bodySize, fontWeight: 700, lineHeight: 1.4 }}>
                      「{display.seenJa}」
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: labelSize,
                      justifyContent: 'center',
                      color: palette.muted,
                    }}
                  >
                    vs
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: scaleFont(height, 6),
                      padding: `${scaleFont(height, 10)}px ${scaleFont(height, 12)}px`,
                      borderRadius: scaleFont(height, 10),
                      background: mirrorPaneBg,
                      border: `1px solid ${mirrorPaneBorder}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontSize: labelSize,
                        letterSpacing: '0.08em',
                        color: palette.muted,
                      }}
                    >
                      自分に出やすい傾向
                    </div>
                    <div style={{ display: 'flex', fontSize: bodySize, fontWeight: 700, lineHeight: 1.4 }}>
                      「{display.actualJa}」
                    </div>
                  </div>
                </div>
              ) : null}
              {display.cueJa ? (
                <div style={{ display: 'flex', fontSize: labelSize, lineHeight: 1.35, color: palette.muted }}>
                  {display.cueJa}
                </div>
              ) : null}
              <div style={{ display: 'flex', fontSize: bodySize, color: palette.muted }}>
                <span>{display.cta || 'あなたはどう出る？'}</span>
              </div>
            </div>
          ) : (
            <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: scaleFont(height, 14),
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {(!isPair || pairPresentation?.showGenericHeadline) ? (
              <div style={{ display: 'flex', fontSize: headlineSize, fontWeight: 700, lineHeight: 1.2 }}>
                {spec.headline}
              </div>
            ) : null}
            {isPair && pairPresentation ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: Math.max(40, scaleFont(height, 28)),
                  fontWeight: 700,
                  lineHeight: 1.25,
                }}
              >
                {pairPresentation.pairLabel}
              </div>
            ) : null}
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
            {isPair && pairPresentation ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: scaleFont(height, 10),
                  fontSize: bodySize,
                  lineHeight: 1.4,
                  width: '100%',
                }}
              >
                {pairPresentation.relationshipConclusionJa ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: scaleFont(height, 4) }}>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: labelSize,
                        letterSpacing: '0.08em',
                        color: palette.muted,
                      }}
                    >
                      二人の間で起きやすいこと
                    </div>
                    <div
                      style={{
                        width: '100%',
                        fontSize: Math.max(bodySize + 2, scaleFont(height, 22)),
                        fontWeight: 700,
                        lineHeight: 1.45,
                        textWrap: 'balance',
                      }}
                    >
                      {pairPresentation.relationshipConclusionJa}
                    </div>
                  </div>
                ) : null}
                {pairPresentation.overlapJa ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: scaleFont(height, 4),
                      padding: `${scaleFont(height, 10)}px ${scaleFont(height, 12)}px`,
                      borderRadius: scaleFont(height, 10),
                      background: 'rgba(255,255,255,0.88)',
                      border: '1px solid rgba(101,79,137,0.16)',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: labelSize, color: palette.muted }}>重なり</div>
                    <div style={{ display: 'flex', fontSize: bodySize, lineHeight: 1.45, wordBreak: 'keep-all' }}>
                      {pairPresentation.overlapJa}
                    </div>
                  </div>
                ) : null}
                {pairPresentation.differenceJa ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: scaleFont(height, 4),
                      padding: `${scaleFont(height, 10)}px ${scaleFont(height, 12)}px`,
                      borderRadius: scaleFont(height, 10),
                      background: 'rgba(255,255,255,0.88)',
                      border: '1px solid rgba(101,79,137,0.16)',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: labelSize, color: palette.muted }}>違い</div>
                    <div style={{ display: 'flex', fontSize: bodySize, lineHeight: 1.45, wordBreak: 'keep-all' }}>
                      {pairPresentation.differenceJa}
                    </div>
                  </div>
                ) : null}
                {pairPresentation.usConclusionJa ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: scaleFont(height, 4),
                      padding: `${scaleFont(height, 10)}px ${scaleFont(height, 12)}px`,
                      borderRadius: scaleFont(height, 10),
                      background: 'rgba(244,238,250,0.72)',
                      border: '1px solid rgba(75,59,96,0.22)',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: labelSize, color: palette.muted }}>ふたりについて</div>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: Math.max(bodySize, scaleFont(height, 20)),
                        fontWeight: 650,
                        lineHeight: 1.45,
                        wordBreak: 'normal',
                        lineBreak: 'strict',
                        overflowWrap: 'normal',
                        maxWidth: '100%',
                      }}
                    >
                      {pairPresentation.usConclusionJa}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isPairGeneric ? (
              <div style={{ display: 'flex', fontSize: bodySize, lineHeight: 1.45 }}>
                {spec.body}
              </div>
            ) : null}
          </div>
          <div
            style={{
              width: '100%',
              fontSize: bodySize,
              color: palette.muted,
              ...(isPair ? PAIR_JA_SIDE_WRAP_STYLE : {}),
            }}
          >
            <span>{pairPresentation?.ctaJa || display.cta || 'あなたはどう出る？'}</span>
          </div>
            </>
          )}
        </div>
      </div>
    ),
    { width, height },
  );
}
