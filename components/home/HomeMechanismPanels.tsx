import styles from './HomePanel.module.css';

type MechanismCopy = {
  source1TitleJa: string;
  source1BodyJa: string;
  source2TitleJa: string;
  source2BodyJa: string;
  outputTitleJa: string;
  outputBodyJa: string;
};

export default function HomeMechanismPanels({ copy }: { copy: MechanismCopy }) {
  return (
    <div className={styles.mechanismPanels} data-testid="m55-home-mechanism-panels">
      <div className={styles.mechanismSourceRow}>
        <article className={styles.mechanismPanel}>
          <h3 className={styles.mechanismPanelTitle}>{copy.source1TitleJa}</h3>
          <p className={styles.mechanismPanelBody}>{copy.source1BodyJa}</p>
        </article>
        <article className={styles.mechanismPanel}>
          <h3 className={styles.mechanismPanelTitle}>{copy.source2TitleJa}</h3>
          <p className={styles.mechanismPanelBody}>{copy.source2BodyJa}</p>
        </article>
      </div>
      <div className={styles.mechanismConnector} aria-hidden />
      <article className={`${styles.mechanismPanel} ${styles.mechanismPanelOutput}`}>
        <h3 className={styles.mechanismPanelTitle}>{copy.outputTitleJa}</h3>
        <p className={styles.mechanismPanelBody}>{copy.outputBodyJa}</p>
      </article>
    </div>
  );
}
