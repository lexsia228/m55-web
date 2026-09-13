import type { Metadata } from 'next';
import { M55_PUBLIC_SHARE_IMAGE, M55_PUBLIC_SHARE_IMAGE_PATH } from '../../lib/m55/g4PublicShareImage';

const title = 'M55｜生年月日から自分の傾向を読み解く自己理解サービス';
const description =
  'M55は、生年月日と今の回答から、自分に出やすい反応や傾向、整え方の入口を言葉にする自己理解サービスです。無料・ログイン不要で始められます。';

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://m-55.jp/home#webpage',
  url: 'https://m-55.jp/home',
  name: title,
  description,
  isPartOf: { '@id': 'https://m-55.jp/#website' },
  inLanguage: 'ja-JP',
};

const webPageJsonLdString = JSON.stringify(webPageJsonLd).replace(/</g, '\\u003c');

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/home',
  },
  openGraph: {
    title,
    description,
    url: '/home',
    type: 'website',
    images: [M55_PUBLIC_SHARE_IMAGE],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: [M55_PUBLIC_SHARE_IMAGE_PATH],
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: webPageJsonLdString }}
      />
      {children}
    </>
  );
}
