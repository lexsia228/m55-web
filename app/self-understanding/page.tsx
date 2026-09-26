import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '../_components/PublicShell';
import { M55_PUBLIC_SHARE_IMAGE, M55_PUBLIC_SHARE_IMAGE_PATH } from '../../lib/m55/g4PublicShareImage';
import {
  M55_METHOD_CANONICAL_COPY,
  M55_METHOD_CANONICAL_ROUTE,
  M55_METHOD_ROUTE_LINK_LABEL_JA,
  M55_METHOD_SECTIONS,
} from '../../lib/m55/method/m55MethodAuthority';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import styles from './self-understanding.module.css';

const title = '自己理解とは？自分を知るために整理したい3つのこと | M55';
const description =
  '自己理解を深めるときに見直したい「繰り返す場面」「反応の順番」「戻りやすい条件」を、3分でできる振り返りとともに整理します。';

const boundaryCopy =
  M55_METHOD_SECTIONS.find((section) => section.id === 'what_m55_does_not_do')?.bodyJa ?? [];

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/self-understanding',
  },
  openGraph: {
    title,
    description,
    url: '/self-understanding',
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

const exercisePrompts = [
  '最近、何度か繰り返した場面は何だったか',
  'そのとき、最初に何を感じ・考え・したか',
  'どの段階で重くなったか',
  '少し戻れたとき、何が違っていたか',
] as const;

export default function SelfUnderstandingPage() {
  return (
    <PublicShell>
      <div
        className={`${styles.page} m55-exp-reading`}
        data-m55-experience-surface="PUBLIC_EDITORIAL"
      >
        <header className={styles.intro}>
          <h1 className={`${styles.title} m55-exp-display`}>
            自己理解とは？自分を知るために整理したい3つのこと
          </h1>
          <p className={`${styles.copy} m55-exp-body`}>
            自分を知るために、自分を一つの呼び名へ固定する必要はありません。自己理解は、繰り返している場面と、そのときに反応が出る順番、そして戻りやすくなる条件に気づいていくことです。
          </p>
        </header>

        <section className="m55-exp-section" aria-labelledby="self-understanding-what">
          <h2 id="self-understanding-what" className="m55-exp-title">
            自己理解とは
          </h2>
          <p className={`${styles.copy} m55-exp-body`}>
            ここでいう自己理解は、反応、選び方、負担、戻り方に表れるパターンを、場面をまたいで見ていくことです。一度の出来事だけで「自分はこういう人だ」と決めず、似た場面が重なったときに何が繰り返されているかを見ます。
          </p>
          <p className={`${styles.copy} m55-exp-body`}>
            これは、学問のうえで一つに固定された定義を示すページではありません。
          </p>
        </section>

        <section className="m55-exp-section" aria-labelledby="self-understanding-three">
          <h2 id="self-understanding-three" className="m55-exp-title">
            自分を知るために整理したい3つのこと
          </h2>

          <h3 className={styles.subhead}>何度も繰り返す場面</h3>
          <p className={`${styles.copy} m55-exp-body`}>
            似たような引っかかり、ためらい、やりすぎ、あるいは楽に進めたことが、いつ繰り返しているかを見ます。呼び名よりも、そのときの具体的な場面を思い出します。
          </p>

          <h3 className={styles.subhead}>そのときに出る反応の順番</h3>
          <p className={`${styles.copy} m55-exp-body`}>
            その場面で、最初に何が起き、次に何が続き、どこから重くなったか、あるいは楽になったかを見ます。
          </p>

          <h3 className={styles.subhead}>戻りやすい条件</h3>
          <p className={`${styles.copy} m55-exp-body`}>
            少し戻れたときに、距離、時間、順番、場所、会話、休みの取り方のどれが違っていたかを見ます。ここで書くのは、自分で試せる振り返りの手がかりです。
          </p>
        </section>

        <section className="m55-exp-section" aria-labelledby="self-understanding-exercise">
          <h2 id="self-understanding-exercise" className="m55-exp-title">
            3分でできる振り返り
          </h2>
          <div className={`${styles.exercise} m55-exp-card`}>
            <p className={`${styles.copy} m55-exp-body`}>
              いま、紙やメモに短く書いてみてください。うまく言葉にならなくても、場面が一つ思い出せれば十分です。
            </p>
            <ol className={`${styles.list} m55-exp-body`}>
              {exercisePrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="m55-exp-section" aria-labelledby="self-understanding-difference">
          <h2 id="self-understanding-difference" className="m55-exp-title">
            自己分析と自己理解の違い
          </h2>
          <p className={`${styles.copy} m55-exp-body`}>
            自己分析と自己理解は、重なって使われる言葉です。両者の境界が、どこでも同じように一つに決まっているわけではありません。ここでは、振り返りに使いやすい見方として分けています。
          </p>
          <p className={`${styles.copy} m55-exp-body`}>
            自己分析は、経験、強み、価値観などを要素に分けて整理する見方です。
          </p>
          <p className={`${styles.copy} m55-exp-body`}>
            自己理解は、場面の中で、自分に出やすい反応や選び方を広く見ていく見方です。
          </p>
        </section>

        <section className="m55-exp-section" aria-labelledby="self-understanding-bridge">
          <h2 id="self-understanding-bridge" className="m55-exp-title">
            一人では言葉にしにくいとき
          </h2>
          <p className={`${styles.copy} m55-exp-body`}>
            パターンを一人で言葉にしにくいときは、M55を入口にできます。
          </p>
          <p className={`${styles.copy} ${styles.preserveLines} m55-exp-body`}>
            {TOP_FREE_ENTRY_PUBLIC_COPY.m55Definition.principleJa}
          </p>
          <p className={`${styles.copy} m55-exp-body`}>{M55_METHOD_CANONICAL_COPY.explanationJa}</p>
          {boundaryCopy.map((sentence) => (
            <p key={sentence} className={`${styles.copy} m55-exp-body`}>
              {sentence}
            </p>
          ))}
          <nav className={styles.links} aria-label="関連ページ">
            <Link href="/home" className={styles.link}>
              M55で無料の見取り図を見る
            </Link>
            <Link href={M55_METHOD_CANONICAL_ROUTE} className={styles.link}>
              {M55_METHOD_ROUTE_LINK_LABEL_JA}
            </Link>
          </nav>
        </section>
      </div>
    </PublicShell>
  );
}
