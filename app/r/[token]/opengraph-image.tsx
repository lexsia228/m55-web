import { ImageResponse } from 'next/og';
import { CANONICAL_PRODUCTION_ORIGIN, resolveSharedEntryFromToken } from '../../../lib/m55/freeResult/privacySafeShareCardV1';
import { resolveTraitIdentity } from '../../../lib/m55/commercialUx/traitIdentityCatalog';
import { resolvePublicShareSpecFromToken } from '../../../lib/m55/narrative/projectPublicShareV1';
import { parsePublicCardDisplayV1, posterHeroLinesJa } from '../../../lib/m55/narrative/publicCardDisplayV1';
import { resolvePublicShareArtworkPathsFromToken } from '../../../lib/m55/narrative/resolvePublicShareArtworkV1';
import { decodePublicShareToken } from '../../../lib/m55/narrative/publicShareTokenV1';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = {
  params: Promise<{ token: string }>;
};

const SHELL = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '56px 64px',
  fontFamily: 'sans-serif',
} as const;

export default async function Image({ params }: Props) {
  const { token } = await params;
  const artPaths = resolvePublicShareArtworkPathsFromToken(token);
  const artUrls = artPaths.map((path) => `${CANONICAL_PRODUCTION_ORIGIN}${path}`);
  const narrative = resolvePublicShareSpecFromToken(token);
  if (narrative) {
    const display = parsePublicCardDisplayV1(narrative);
    const isPoster =
      narrative.variant === 'hidden_spec' || narrative.variant === 'premium_takeaway';
    const isMirror = narrative.variant === 'seen_vs_actual';
    const isPair = narrative.variant === 'pair_manual';
    const pairKey = decodePublicShareToken(token);
    const pairTraitLabel =
      isPair &&
      pairKey?.kind === 'pair' &&
      typeof pairKey.personAStemLaneIndex === 'number' &&
      typeof pairKey.personBStemLaneIndex === 'number'
        ? (() => {
            const traitA = resolveTraitIdentity(pairKey.personAStemLaneIndex);
            const traitB = resolveTraitIdentity(pairKey.personBStemLaneIndex);
            return traitA && traitB ? `${traitA.traitName} × ${traitB.traitName}` : null;
          })()
        : null;
    const bg = isPoster
      ? 'linear-gradient(165deg, #1c1830 0%, #4e4480 100%)'
      : isMirror
        ? 'linear-gradient(180deg, #f7f2ff 0%, #fffaf1 100%)'
        : 'linear-gradient(180deg, #fffaf1 0%, #eee8f6 100%)';
    const ink = isPoster ? '#fffaf1' : '#1c1830';
    const muted = isPoster ? 'rgba(255,250,241,0.82)' : 'rgba(55,48,82,0.72)';

    return new ImageResponse(
      (
        <div style={{ ...SHELL, flexDirection: 'row', padding: 0, background: bg, color: ink }}>
          {artUrls.length === 2 ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: 520, height: 630 }}>
              <img
                src={artUrls[0]}
                width={520}
                height={315}
                alt=""
                style={{ width: 520, height: 315, objectFit: 'cover' }}
              />
              <img
                src={artUrls[1]}
                width={520}
                height={315}
                alt=""
                style={{ width: 520, height: 315, objectFit: 'cover' }}
              />
            </div>
          ) : artUrls.length === 1 ? (
            <img
              src={artUrls[0]}
              width={520}
              height={630}
              alt=""
              style={{ width: 520, height: 630, objectFit: 'cover' }}
            />
          ) : null}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '56px 48px',
              flex: 1,
              height: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 28,
                letterSpacing: '0.22em',
                fontWeight: 700,
              }}
            >
              M55
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, justifyContent: 'center' }}>
              <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
                {narrative.headline}
              </div>
              {isPair && pairTraitLabel ? (
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, lineHeight: 1.25 }}>
                  {pairTraitLabel}
                </div>
              ) : null}
              {isPoster
                ? posterHeroLinesJa(display.heroJa).map((line) => (
                    <div
                      key={line}
                      style={{ display: 'flex', fontSize: 34, fontWeight: 700, lineHeight: 1.35, maxWidth: 600 }}
                    >
                      {line}
                    </div>
                  ))
                : null}
              {isPoster && display.supportJa ? (
                <div style={{ display: 'flex', fontSize: 24, lineHeight: 1.4, opacity: 0.88 }}>
                  {display.supportJa}
                </div>
              ) : null}
              {isMirror && display.seenJa && display.actualJa ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, lineHeight: 1.4 }}>
                    「{display.seenJa}」
                  </div>
                  <div style={{ display: 'flex', fontSize: 22 }}>vs</div>
                  <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, lineHeight: 1.4 }}>
                    「{display.actualJa}」
                  </div>
                </div>
              ) : null}
              {narrative.variant === 'manual' && display.rows.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {display.rows.slice(0, 4).map((row) => (
                    <div key={row.label} style={{ display: 'flex', fontSize: 22, lineHeight: 1.35 }}>
                      {row.label}　{row.body}
                    </div>
                  ))}
                </div>
              ) : null}
              {isPair ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 24, lineHeight: 1.4 }}>
                  {display.sideAJa ? <div style={{ display: 'flex' }}>一方　{display.sideAJa}</div> : (
                    <div style={{ display: 'flex' }}>{display.entryJa}</div>
                  )}
                  {display.sideBJa ? <div style={{ display: 'flex' }}>もう一方　{display.sideBJa}</div> : null}
                  {display.returnJa ? <div style={{ display: 'flex' }}>戻り　{display.returnJa}</div> : null}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: muted }}>
              <span>{display.cta || 'あなたはどう出る？'}</span>
            </div>
          </div>
        </div>
      ),
      size,
    );
  }

  const card = resolveSharedEntryFromToken(token);
  const identity = card ? resolveTraitIdentity(card.stemLaneIndex) : null;
  const trait = identity?.traitName ?? card?.traitNameJa ?? 'M55';
  const phrase = identity?.canonicalTagline ?? card?.traitPhraseJa ?? '自分の動き方を、無料で見てみる';
  const invite = card?.inviteJa ?? '無料で自分の取扱説明書を見る';
  const legacyArtUrl = artUrls[0] ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          ...SHELL,
          flexDirection: 'row',
          padding: 0,
          background: 'linear-gradient(145deg, #1c1630 0%, #3d3560 48%, #6b5fa8 100%)',
          color: '#fffaf1',
        }}
      >
        {legacyArtUrl ? (
          <img
            src={legacyArtUrl}
            width={520}
            height={630}
            alt=""
            style={{ width: 520, height: 630, objectFit: 'cover' }}
          />
        ) : null}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 48px',
            flex: 1,
            height: '100%',
          }}
        >
          <div style={{ fontSize: 36, letterSpacing: '0.22em', fontWeight: 700 }}>M55</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{trait}</div>
            <div style={{ fontSize: 28, lineHeight: 1.45, opacity: 0.92, maxWidth: 560 }}>{phrase}</div>
          </div>
          <div style={{ fontSize: 26, opacity: 0.9 }}>{invite}</div>
        </div>
      </div>
    ),
    size,
  );
}
