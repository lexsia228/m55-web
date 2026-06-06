import Image from 'next/image';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const TEN_QUALITIES_CARD_SRC = '/core/unrevealed-card.webp' as const;

export function FrameworkSection() {
  return (
    <section className={`${styles.shellWide} ${styles.foldAlt}`} aria-labelledby="how-m55-framework-title">
      <p className={styles.sectionKicker}>02 — 10通りの資質から読む</p>
      <h2 id="how-m55-framework-title" className={styles.visuallyHidden}>
        10通りの資質から読む
      </h2>

      <div className={styles.frameworkGrid}>
        <div className={styles.frameworkRow}>
          <div>
            <p className={styles.sectionLead}>最初に見えるのは、10通りの資質です。</p>
            <p className={styles.sectionLead}>
              ただし、これは全体を決める答えではなく、読み始めるための入口です。
            </p>
            <p className={styles.sectionLead}>
              M55の読みは、それだけで終わりません。内部では、M55独自のパーソナルアルゴリズムによって、より細かな組み合わせを重ねています。
            </p>
            <p className={styles.sectionLead}>
              そのため、同じ称号に見えても、受け取る内容は一人ずつ変わります。似た入口を持つ人がいても、見取り図や
              {TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works.frameworkSavedJa}
            </p>
          </div>
          <div className={styles.frameworkVisual}>
            <div className={styles.tenThumbSingle} aria-hidden>
              <div className={styles.tenThumbCell}>
                <Image
                  src={TEN_QUALITIES_CARD_SRC}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 44vw, 120px"
                  className={styles.tenThumbImg}
                />
              </div>
            </div>
            <p className={styles.visualCaption}>10通りの資質のビジュアル</p>
          </div>
        </div>
      </div>
    </section>
  );
}
