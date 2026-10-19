import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '../../_components/PublicShell';
import { M55_PUBLIC_SHARE_IMAGE, M55_PUBLIC_SHARE_IMAGE_PATH } from '../../../lib/m55/g4PublicShareImage';
import styles from '../self-understanding.module.css';

const title = '人といると疲れるとき｜負担が増える流れを整理する | M55';
const description =
  '人といると疲れるとき、性格を決めつけるのではなく、「場面」「最初の反応」「続けた行動」「重くなった地点」「戻りやすい条件」の順に整理するためのページ。';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/self-understanding/people-fatigue',
  },
  openGraph: {
    title,
    description,
    url: '/self-understanding/people-fatigue',
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

const situationExamples = [
  '会話が続いたあと',
  '人数が多い場',
  '相手に合わせ続けたあと',
  '断りにくい場面',
  '一人になるまで緊張が続いたとき',
] as const;

const flowSteps = [
  {
    label: '場面',
    body: 'いつ、どこで、誰と、どんな状況だったか。呼び名より先に、具体的な場面を思い出します。',
  },
  {
    label: '最初の反応',
    body: 'その場面で、最初に気づいた感覚や考え、身体の変化など。ここは正解探しではなく、出てきた順を見ます。',
  },
  {
    label: '続けた行動',
    body: 'そのあと、自分は何を続けていたか。黙り続ける、相づちを重ねる、笑顔を保つ、話題を変えるなど、小さな行動も含めます。',
  },
  {
    label: '重くなった地点',
    body: 'どの段階から、余計な気を遣う感じや消耗が強くなったか。必ず同じ地点とは限りません。',
  },
  {
    label: '戻りやすい条件',
    body: '少し楽になったとき、距離、時間、休み方、一人になれたタイミングなど、何が違っていたかを見ます。',
  },
] as const;

const reflectionPrompts = [
  '直近で、人といたあとに強く疲れた場面は何だったか',
  '最初に気づいた反応は何だったか',
  'そのあと自分は何を続けていたか',
  'どこから負担が大きくなったか',
  '少し戻れたとき、何が違っていたか',
] as const;

export default function PeopleFatiguePage() {
  return (
    <PublicShell>
      <div
        className={`${styles.page} m55-exp-reading`}
        data-m55-experience-surface="PUBLIC_EDITORIAL"
      >
        <header className={styles.intro}>
          <h1 className={`${styles.title} m55-exp-display`}>
            人といると疲れるとき、負担が増える流れを整理する
          </h1>
          <p className={`${styles.copy} m55-exp-body`}>
            「人といると疲れる」は、一つの型に当てはまるとは限りません。人付き合いが苦手なのか、場面が合わなかったのか、合わせ続けたのか——すぐに決めつけず、まずはどんな状況でそう感じたかを分けて見ると、振り返りがしやすくなります。
          </p>
          <p className={`${styles.copy} m55-exp-body`}>
            このページは、性格やタイプのラベルを当てるためのものではありません。場面と、そのときに起きた流れを、自分用のメモとして整理する手がかりです。M55を使わなくても、ここまでの内容だけで振り返りはできます。
          </p>
        </header>

        <section className="m55-exp-section" aria-labelledby="people-fatigue-situations">
          <h2 id="people-fatigue-situations" className="m55-exp-title">
            まず、どんな場面で疲れるかを分けて見る
          </h2>
          <p className={`${styles.copy} m55-exp-body`}>
            疲れ方は人それぞれです。次のような場面で強く感じることがある、という例です。当てはまるものだけ拾って構いません。これらは診断ではなく、思い出すための例です。
          </p>
          <ul className={`${styles.list} m55-exp-body`}>
            {situationExamples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </section>

        <section className="m55-exp-section" aria-labelledby="people-fatigue-flow">
          <h2 id="people-fatigue-flow" className="m55-exp-title">
            負担が増える流れを5つに分ける
          </h2>
          <p className={`${styles.copy} m55-exp-body`}>
            次の5つは、振り返り用の並び方です。すべての疲れがこの順番で起きるわけではありません。抜けた段階があっても、入れ替わっても問題ありません。
          </p>
          {flowSteps.map((step) => (
            <div key={step.label}>
              <h3 className={styles.subhead}>{step.label}</h3>
              <p className={`${styles.copy} m55-exp-body`}>{step.body}</p>
            </div>
          ))}
        </section>

        <section className="m55-exp-section" aria-labelledby="people-fatigue-exercise">
          <h2 id="people-fatigue-exercise" className="m55-exp-title">
            3分で振り返る
          </h2>
          <div className={`${styles.exercise} m55-exp-card`}>
            <p className={`${styles.copy} m55-exp-body`}>
              紙やメモアプリで、短く書いてみてください。答えを送る機能はありません。自分用の整理です。
            </p>
            <ol className={`${styles.list} m55-exp-body`}>
              {reflectionPrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="m55-exp-section" aria-labelledby="people-fatigue-beyond-label">
          <h2 id="people-fatigue-beyond-label" className="m55-exp-title">
            「人が苦手」だけで終わらせない
          </h2>
          <p className={`${styles.copy} m55-exp-body`}>
            「自分は人付き合いが苦手なのか」という問いだけでは、どこで何が重くなるかが見えにくいことがあります。同じ人といる場面でも、会話の量、人数、合わせ続けた時間、断りにくさの度合いで、負担の出方は変わります。
          </p>
          <p className={`${styles.copy} m55-exp-body`}>
            役に立つ問いは、どの場面で、どの流れが、どの戻り方とセットで繰り返されているか、です。ここでも、あなたは○○だから疲れる、という決めつけはしません。
          </p>
        </section>

        <section className="m55-exp-section" aria-labelledby="people-fatigue-bridge">
          <h2 id="people-fatigue-bridge" className="m55-exp-title">
            自己理解につなげる
          </h2>
          <p className={`${styles.copy} m55-exp-body`}>
            人との場面だけでなく、反応や選び方のパターンを広く見たいときは、自己理解の整理方法も参考にできます。傾向を無料で眺める入口もあります。
          </p>
          <nav className={styles.links} aria-label="関連ページ">
            <Link href="/self-understanding" className={styles.link}>
              自己理解の整理方法を読む
            </Link>
            <Link href="/core" className={styles.link}>
              無料で自分の傾向を見る
            </Link>
          </nav>
        </section>
      </div>
    </PublicShell>
  );
}
