"use client";

import styles from "./M55HowItWorks.module.css";

export default function M55HowItWorks() {
  return (
    <div className={styles.page}>
      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 1 — Intro
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldIntro}>
        <h1 className={styles.pageTitle}>[PAGE_TITLE]</h1>
        <p className={styles.pageLead}>[PAGE_LEAD]</p>
        <p className={styles.pageSupport}>[PAGE_SUPPORT]</p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 2 — What you can see for free
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldFree}>
        <h2 className={styles.sectionTitle}>[FREE_SECTION_TITLE]</h2>
        <div className={styles.freeGrid}>
          <article className={styles.freeCard}>
            <h3 className={styles.freeItemTitle}>[FREE_ITEM_1_TITLE]</h3>
            <p className={styles.freeItemDesc}>[FREE_ITEM_1_DESC]</p>
          </article>
          <article className={styles.freeCard}>
            <h3 className={styles.freeItemTitle}>[FREE_ITEM_2_TITLE]</h3>
            <p className={styles.freeItemDesc}>[FREE_ITEM_2_DESC]</p>
          </article>
          <article className={styles.freeCard}>
            <h3 className={styles.freeItemTitle}>[FREE_ITEM_3_TITLE]</h3>
            <p className={styles.freeItemDesc}>[FREE_ITEM_3_DESC]</p>
          </article>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 3 — What Entry Report adds
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldPaid}>
        <h2 className={styles.sectionTitle}>[PAID_SECTION_TITLE]</h2>
        <p className={styles.paidIntro}>[PAID_SECTION_DESC]</p>
        <div className={styles.paidList}>
          <div className={styles.paidRow}>
            <span className={styles.paidRowMarker}>1</span>
            <div className={styles.paidRowContent}>
              <h3 className={styles.paidItemTitle}>[PAID_ITEM_1_TITLE]</h3>
              <p className={styles.paidItemDesc}>[PAID_ITEM_1_DESC]</p>
            </div>
          </div>
          <div className={styles.paidRow}>
            <span className={styles.paidRowMarker}>2</span>
            <div className={styles.paidRowContent}>
              <h3 className={styles.paidItemTitle}>[PAID_ITEM_2_TITLE]</h3>
              <p className={styles.paidItemDesc}>[PAID_ITEM_2_DESC]</p>
            </div>
          </div>
          <div className={styles.paidRow}>
            <span className={styles.paidRowMarker}>3</span>
            <div className={styles.paidRowContent}>
              <h3 className={styles.paidItemTitle}>[PAID_ITEM_3_TITLE]</h3>
              <p className={styles.paidItemDesc}>[PAID_ITEM_3_DESC]</p>
            </div>
          </div>
        </div>
        <div className={styles.paidCtaWrapper}>
          <button type="button" className={styles.paidCtaButton}>
            [ENTRY_REPORT_CTA]
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 4 — What M55 values
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldPhilosophy}>
        <h2 className={styles.sectionTitle}>[PHILOSOPHY_TITLE]</h2>
        <p className={styles.philosophyBody}>[PHILOSOPHY_BODY]</p>
        <p className={styles.philosophySupport}>[PHILOSOPHY_SUPPORT]</p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 5 — What the consultation room is for
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldRoom}>
        <h2 className={styles.sectionTitle}>[ROOM_TITLE]</h2>
        <div className={styles.roomCard}>
          <p className={styles.roomBody}>[ROOM_BODY]</p>
          <p className={styles.roomSupport}>[ROOM_SUPPORT]</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 6 — Final bridge
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldFinal}>
        <h2 className={styles.finalTitle}>[FINAL_BRIDGE_TITLE]</h2>
        <p className={styles.finalBody}>[FINAL_BRIDGE_BODY]</p>
        <button type="button" className={styles.finalPrimaryCta}>
          [FINAL_PRIMARY_CTA]
        </button>
        <p className={styles.finalNote}>[FINAL_NOTE]</p>
      </section>
    </div>
  );
}
