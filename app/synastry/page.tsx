import type { Metadata } from 'next';
import { PublicShell } from '../_components/PublicShell';
import CompatibilityGuestExperience from '../../components/compatibility/CompatibilityGuestExperience';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { M55_PUBLIC_SHARE_IMAGE, M55_PUBLIC_SHARE_IMAGE_PATH } from '../../lib/m55/g4PublicShareImage';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';

const title = '二人の違いとすれ違いを読み解く | M55';
const description = TOP_FREE_ENTRY_PUBLIC_COPY.home.productMapPairBodyJa.replace(/\n/g, '');

const FREE_READING_ITEMS = [
  '二人に重なりやすいところと、違いが出やすいところ',
  '今の二人に表れやすい反応や距離の取り方',
  'すれ違いが続くとき、どんなズレとして表れやすいか',
] as const;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/synastry',
  },
  openGraph: {
    title,
    description,
    url: '/synastry',
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

export default function SynastryPage() {
  return (
    <PublicShell>
      <CompatibilityGuestExperience
        commerceEnabled={isCompatibilityCommerceEnabled()}
      />
      <div
        className="m55-exp-reading"
        data-m55-experience-surface="PUBLIC_EDITORIAL"
        data-testid="synastry-acquisition-content"
      >
        <section className="m55-exp-section" aria-labelledby="synastry-overlap-difference">
          <h2 id="synastry-overlap-difference" className="m55-exp-title">
            すれ違いは、合う・合わないだけでは決まりません
          </h2>
          <p className="m55-exp-body">
            二人の関係は、合う・合わないだけでは説明しきれません。重なりやすいところと、違いが出やすいところがあり、今の二人には、反応や距離の取り方にも表れ方があります。すれ違いが続くときも、一つの結果ではなく、流れとして見ていきます。
          </p>
        </section>

        <section className="m55-exp-section" aria-labelledby="synastry-free-reading">
          <h2 id="synastry-free-reading" className="m55-exp-title">
            この無料読み解きで見ること
          </h2>
          <ul className="m55-exp-body">
            {FREE_READING_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="m55-exp-section" aria-labelledby="synastry-boundary">
          <p id="synastry-boundary" className="m55-exp-meta">
            相手の本音や未来を断定したり、相性を点数で判定するものではありません。
          </p>
          <p className="m55-exp-body">
            二人分の生年月日と、今の二人に近い回答を使います。回答するのはあなた本人です。
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
