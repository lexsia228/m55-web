import styles from '../how-it-works.module.css';

type Depth = 'free' | 'entry' | 'consultation';

const ACTIONS: { title: string; description: string; depth: Depth }[] = [
  {
    title: '自分を言葉にする',
    description: '漠然とした自己像に、言葉という輪郭を与える',
    depth: 'free',
  },
  {
    title: '同じ悩みの構造を見る',
    description: 'なぜ同じところで躓くのか、傾向から観察する',
    depth: 'free',
  },
  {
    title: '今週の過ごし方を整える',
    description: '自分の傾向に合わせた、無理のないペースを考える',
    depth: 'free',
  },
  {
    title: '自分を責めずに傾向を理解する',
    description: '「なぜできないのか」を、資質の視点から眺め直す',
    depth: 'free',
  },
  {
    title: 'Entry Reportで重なりを深める',
    description: '複数の資質がどう重なるか、章立ての文章で整理する',
    depth: 'entry',
  },
  {
    title: '相談室で自分の状況に引きつける',
    description: '購入したレポートの文脈のなかで、いまの状況を言葉にする',
    depth: 'consultation',
  },
];

const DEPTH_LABEL: Record<Depth, string> = {
  free: '無料',
  entry: 'Entry Report',
  consultation: '相談室',
};

const DEPTH_CLASS: Record<Depth, string> = {
  free: styles.depthFree,
  entry: styles.depthEntry,
  consultation: styles.depthRoom,
};

export function WhatYouCanDoSection() {
  return (
    <section className={`${styles.shellWide} ${styles.foldAlt}`} aria-labelledby="how-m55-actions-title">
      <p className={styles.sectionKicker}>04 — M55から逆算してできること</p>
      <div className={styles.visibleIntro}>
        <h2 id="how-m55-actions-title" className={styles.sectionTitle}>
          読み解きを、
          <br />
          日常に持ち帰る。
        </h2>
        <p className={styles.sectionLead}>
          M55の読み取りは、眺めて終わりではありません。
          <br />
          次のように、実生活での自己理解に活かすことができます。
        </p>
      </div>

      <div className={styles.actionList}>
        {ACTIONS.map((action) => (
          <div key={action.title} className={styles.actionRow}>
            <div className={styles.actionBody}>
              <div className={styles.actionTitleRow}>
                <p className={styles.actionTitle}>{action.title}</p>
                <span className={`${styles.depthPill} ${DEPTH_CLASS[action.depth]}`}>
                  {DEPTH_LABEL[action.depth]}
                </span>
              </div>
              <p className={styles.actionDesc}>{action.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.depthDiagram}>
        <p className={styles.depthDiagramKicker}>無料 → Entry Report → 相談室</p>
        <div className={styles.depthDiagramTrack}>
          <div className={styles.depthStep}>
            <div className={`${styles.depthCircle} ${styles.depthCircleSm}`}>無料</div>
            <p className={styles.depthStepCaption}>概要</p>
          </div>
          <div className={styles.depthArrow} aria-hidden />
          <div className={styles.depthStep}>
            <div className={`${styles.depthCircle} ${styles.depthCircleMd}`}>
              Entry
              <br />
              Report
            </div>
            <p className={styles.depthStepCaption}>深く読む</p>
          </div>
          <div className={styles.depthArrow} aria-hidden />
          <div className={styles.depthStep}>
            <div className={`${styles.depthCircle} ${styles.depthCircleLg}`}>相談室</div>
            <p className={styles.depthStepCaption}>補足</p>
          </div>
        </div>
      </div>
    </section>
  );
}
