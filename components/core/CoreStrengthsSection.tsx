import styles from './CoreExperience.module.css';

export default function CoreStrengthsSection({ items }: { items: string[] }) {
  return (
    <section className={styles.section} aria-labelledby="core-str-title">
      <p className={styles.sectionEyebrow}>観測</p>
      <h2 id="core-str-title" className={styles.sectionTitle}>
        強み（伸びやすい出方）
      </h2>
      <p className={styles.sectionLead}>
        役職名や優劣ではなく、力が乗りやすい条件として読んでください。
      </p>
      <ul className={styles.focusList}>
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
