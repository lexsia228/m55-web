import {
  M55_METHOD_CANONICAL_COPY as Copy,
  M55_METHOD_PUBLIC_NAME,
  M55_METHOD_SECTIONS,
} from '../../lib/m55/method/m55MethodAuthority';
import styles from './M55MethodSections.module.css';

/**
 * The canonical detailed method explanation. This is the only place the full
 * account lives; every other placement is a compact reference plus a link here.
 * All copy comes from `m55MethodAuthority`.
 */
export default function M55MethodSections() {
  const sections = [...M55_METHOD_SECTIONS].sort((a, b) => a.order - b.order);
  return (
    <section
      className={styles.methodRoot}
      data-testid="m55-method-canonical"
      aria-labelledby="m55-method-canonical-title"
    >
      <p className={styles.rootEyebrow}>{M55_METHOD_PUBLIC_NAME}</p>
      <h2 id="m55-method-canonical-title" className={styles.rootTitle}>
        {Copy.homeHeadingJa}
      </h2>
      <p className={styles.rootLead}>{Copy.explanationJa}</p>

      <ol className={styles.sectionList}>
        {sections.map((section) => (
          <li
            key={section.id}
            className={styles.section}
            data-testid={`m55-method-section-${section.id}`}
          >
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionOrder} aria-hidden>
                {section.order}
              </span>
              {section.titleJa}
            </h3>
            {section.bodyJa.map((paragraph) => (
              <p key={paragraph} className={styles.sectionBody}>
                {paragraph}
              </p>
            ))}
            {section.itemsJa ? (
              <dl className={styles.inputList}>
                {section.itemsJa.map((item) => (
                  <div key={item.labelJa} className={styles.inputRow}>
                    <dt className={styles.inputLabel}>{item.labelJa}</dt>
                    <dd className={styles.inputDesc}>{item.descriptionJa}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
