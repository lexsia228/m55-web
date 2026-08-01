import { ImageResponse } from 'next/og';
import { resolveSharedEntryFromToken } from '../../../lib/m55/freeResult/privacySafeShareCardV1';
import { resolveTraitIdentity } from '../../../lib/m55/commercialUx/traitIdentityCatalog';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = {
  params: Promise<{ token: string }>;
};

export default async function Image({ params }: Props) {
  const { token } = await params;
  const card = resolveSharedEntryFromToken(token);
  const identity = card ? resolveTraitIdentity(card.stemLaneIndex) : null;
  const trait = identity?.traitName ?? card?.traitNameJa ?? 'M55';
  const phrase = identity?.canonicalTagline ?? card?.traitPhraseJa ?? '自分の動き方を、無料で見てみる';
  const invite = card?.inviteJa ?? 'M55で無料結果を見る';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(145deg, #1c1630 0%, #3d3560 48%, #6b5fa8 100%)',
          color: '#fffaf1',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 36, letterSpacing: '0.22em', fontWeight: 700 }}>M55</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.15 }}>{trait}</div>
          <div style={{ fontSize: 34, lineHeight: 1.45, opacity: 0.92, maxWidth: 900 }}>{phrase}</div>
        </div>
        <div style={{ fontSize: 30, opacity: 0.9 }}>{invite}</div>
      </div>
    ),
    size,
  );
}
