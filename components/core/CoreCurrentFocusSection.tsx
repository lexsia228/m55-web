import { AXIS_PUBLIC_LABEL } from '../../lib/m55/coreResult/axisMeta';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import styles from './CoreExperience.module.css';

/**
 * 変動レイヤーとして本質ラベルと視覚的に切り離す（コピーで明示）。
 */
export default function CoreCurrentFocusSection({ result }: { result: CoreResult }) {
  const sorted = [...result.axisDetails].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 2);

  return (
    <section
      className={styles.section}
      aria-labelledby="core-focus-title"
      style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 28 }}
    >
      <p className={styles.sectionEyebrow}>変動レイヤー</p>
      <h2 id="core-focus-title" className={styles.sectionTitle}>
        いま観測上の焦点
      </h2>
      <p className={styles.sectionLead}>
        ここは本質ラベルとは別の読み取り層です。解析軸のスコアから、いま輪郭に出やすい視点の目安を示します。
      </p>
      <ul className={styles.focusList}>
        {top.map((d) => (
          <li key={d.key}>
            「{AXIS_PUBLIC_LABEL[d.key]}」が相対的に手前に出やすい観測です（スコア {d.score}）。
          </li>
        ))}
      </ul>
    </section>
  );
}
