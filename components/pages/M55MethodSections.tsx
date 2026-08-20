import {
  M55_METHOD_CANONICAL_COPY as Copy,
  M55_METHOD_DETAIL_GROUP_HEADING_JA,
  M55_METHOD_DETAIL_GROUP_LEAD_JA,
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
  const firstMethodDetailId = sections.find((s) => s.group === 'method')?.id;
  return (
    <section
      className={styles.methodRoot}
      data-testid="m55-method-canonical"
      aria-labelledby="m55-method-canonical-title"
    >
      <p className={styles.rootEyebrow}>{M55_METHOD_PUBLIC_NAME}</p>
      <h1 id="m55-method-canonical-title" className={styles.rootTitle}>
        {Copy.homeHeadingJa}
      </h1>
      <p className={styles.rootLead}>{Copy.explanationJa}</p>

      <ol className={styles.sectionList}>
        {sections.map((section) => (
          <li
            key={section.id}
            className={
              section.id === firstMethodDetailId
                ? `${styles.section} ${styles.methodDetailStart}`
                : styles.section
            }
            data-testid={`m55-method-section-${section.id}`}
          >
            {section.id === firstMethodDetailId ? (
              <div className={styles.detailGroupHeader} data-testid="m55-method-detail-group">
                <p className={styles.detailGroupTitle}>{M55_METHOD_DETAIL_GROUP_HEADING_JA}</p>
                <p className={styles.detailGroupLead}>{M55_METHOD_DETAIL_GROUP_LEAD_JA}</p>
              </div>
            ) : null}
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
