import type { Metadata } from 'next';
import SharedEntryPanel from '../../../components/share/SharedEntryPanel';
import {
  CANONICAL_PRODUCTION_ORIGIN,
  resolveSharedEntryFromToken,
} from '../../../lib/m55/freeResult/privacySafeShareCardV1';

type Props = {
  params: Promise<{ token: string }>;
};

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
        images: [{ url: '/icons/m55-core-logo.png', alt: 'M55' }],
      },
    };
  }

  const title = `M55 | ${card.traitNameJa}`;
  const description = `${card.traitPhraseJa} — ${card.inviteJa}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${CANONICAL_PRODUCTION_ORIGIN}${card.sharePath}`,
      images: [{ url: card.imagePath, alt: card.traitNameJa }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [card.imagePath],
    },
  };
}

export default async function SharedEntryPage({ params }: Props) {
  const { token } = await params;
  const card = resolveSharedEntryFromToken(token);
  return <SharedEntryPanel card={card} />;
}
