import styles from './CoreExperience.module.css';

export default function CoreCautionsSection({ items }: { items: string[] }) {
  return (
    <section className={styles.section} aria-labelledby="core-caution-title">
      <p className={styles.sectionEyebrow}>観測</p>
      <h2 id="core-caution-title" className={styles.sectionTitle}>
        向いていない条件（注意点）
      </h2>
      <p className={styles.sectionLead}>
        弱みの断定ではなく、力が出にくい条件・崩れやすい条件の観測です。
      </p>
      <ul className={styles.focusList}>
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
