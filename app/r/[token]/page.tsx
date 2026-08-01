import type { Metadata } from 'next';
import { PublicShell } from '../../_components/PublicShell';
import SharedEntryPanel from '../../../components/share/SharedEntryPanel';
import {
  CANONICAL_PRODUCTION_ORIGIN,
  resolveSharedEntryFromToken,
} from '../../../lib/m55/freeResult/privacySafeShareCardV1';

type Props = {
  params: Promise<{ token: string }>;
};

function ogImageUrl(token: string): string {
  return `${CANONICAL_PRODUCTION_ORIGIN}/r/${token}/opengraph-image`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const card = resolveSharedEntryFromToken(token);
  if (!card) {
    return {
      title: 'M55 | 無料結果を見る',
      description: '自分の動き方を、無料で確認できます。',
      openGraph: {
        title: 'M55 | 無料結果を見る',
        description: '自分の動き方を、無料で確認できます。',
        url: `${CANONICAL_PRODUCTION_ORIGIN}/core`,
        images: [{ url: `${CANONICAL_PRODUCTION_ORIGIN}/r/invalid/opengraph-image`, alt: 'M55' }],
      },
    };
  }

  const title = `M55 | ${card.traitNameJa}`;
  const description = `${card.traitPhraseJa} — ${card.inviteJa}`;
  const ogUrl = ogImageUrl(card.token);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${CANONICAL_PRODUCTION_ORIGIN}${card.sharePath}`,
      images: [{ url: ogUrl, alt: card.traitNameJa }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function SharedEntryPage({ params }: Props) {
  const { token } = await params;
  const card = resolveSharedEntryFromToken(token);
  return (
    <PublicShell>
      <SharedEntryPanel card={card} />
    </PublicShell>
  );
}
