"use client";

import styles from "./M55TenViews.module.css";

/**
 * M55TenViews — "10の見方" informational page
 * 
 * Five-fold structure:
 * 1. Intro
 * 2. Ten views gallery
 * 3. Clarifying note
 * 4. Free-entry bridge
 * 5. Gentle paid-depth bridge
 */

const viewCards = [
  { name: "[VIEW_NAME_1]", tagline: "[VIEW_TAGLINE_1]", desc: "[VIEW_DESC_1]" },
  { name: "[VIEW_NAME_2]", tagline: "[VIEW_TAGLINE_2]", desc: "[VIEW_DESC_2]" },
  { name: "[VIEW_NAME_3]", tagline: "[VIEW_TAGLINE_3]", desc: "[VIEW_DESC_3]" },
  { name: "[VIEW_NAME_4]", tagline: "[VIEW_TAGLINE_4]", desc: "[VIEW_DESC_4]" },
  { name: "[VIEW_NAME_5]", tagline: "[VIEW_TAGLINE_5]", desc: "[VIEW_DESC_5]" },
  { name: "[VIEW_NAME_6]", tagline: "[VIEW_TAGLINE_6]", desc: "[VIEW_DESC_6]" },
  { name: "[VIEW_NAME_7]", tagline: "[VIEW_TAGLINE_7]", desc: "[VIEW_DESC_7]" },
  { name: "[VIEW_NAME_8]", tagline: "[VIEW_TAGLINE_8]", desc: "[VIEW_DESC_8]" },
  { name: "[VIEW_NAME_9]", tagline: "[VIEW_TAGLINE_9]", desc: "[VIEW_DESC_9]" },
  { name: "[VIEW_NAME_10]", tagline: "[VIEW_TAGLINE_10]", desc: "[VIEW_DESC_10]" },
];

export default function M55TenViews() {
  return (
    <div className={styles.page}>
      {/* ══════════════════════════════════════════════════════════════
          FOLD 1 — Intro
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.introFold}>
        <h1 className={styles.pageTitle}>[PAGE_TITLE]</h1>
        <p className={styles.pageLead}>[PAGE_LEAD]</p>
        <p className={styles.pageSupport}>[PAGE_SUPPORT]</p>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 2 — Ten views gallery
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.galleryFold}>
        <h2 className={styles.sectionTitle}>[GALLERY_TITLE]</h2>
        <div className={styles.cardGrid}>
          {viewCards.map((card, index) => (
            <article key={index} className={styles.viewCard}>
              <div className={styles.cardSymbol}>
                <span className={styles.symbolNumber}>{index + 1}</span>
              </div>
              <h3 className={styles.viewName}>{card.name}</h3>
              <p className={styles.viewTagline}>{card.tagline}</p>
              <p className={styles.viewDesc}>{card.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 3 — Clarifying note
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.clarifyFold}>
        <h2 className={styles.sectionTitle}>[CLARIFY_TITLE]</h2>
        <p className={styles.clarifyBody}>[CLARIFY_BODY]</p>
        <ul className={styles.clarifyList}>
          <li className={styles.clarifyPoint}>[CLARIFY_POINT_1]</li>
          <li className={styles.clarifyPoint}>[CLARIFY_POINT_2]</li>
          <li className={styles.clarifyPoint}>[CLARIFY_POINT_3]</li>
        </ul>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 4 — Free-entry bridge
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.freeBridgeFold}>
        <h2 className={styles.bridgeTitle}>[FREE_BRIDGE_TITLE]</h2>
        <p className={styles.bridgeBody}>[FREE_BRIDGE_BODY]</p>
        <button type="button" className={styles.primaryCta}>
          [FREE_BRIDGE_CTA]
        </button>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 5 — Gentle paid-depth bridge
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.depthBridgeFold}>
        <h2 className={styles.depthTitle}>[DEPTH_BRIDGE_TITLE]</h2>
        <p className={styles.depthBody}>[DEPTH_BRIDGE_BODY]</p>
        <p className={styles.depthSupport}>[DEPTH_BRIDGE_SUPPORT]</p>
      </section>
    </div>
  );
}
