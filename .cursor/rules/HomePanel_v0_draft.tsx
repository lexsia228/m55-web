/**
 * HomePanel_v0_draft.tsx
 * 
 * Draft reference for /home visual composition
 * Quiet Luxury / Soft Japanese Editorial aesthetic
 * Desktop-first responsive design
 * 
 * SECTIONS:
 * 1. Hero - centered title, label, description, CTA
 * 2. Summary Card - 3 rows with icons
 * 3. Navigation Cards - 2 matched cards
 * 4. Five Analysis Axes - horizontal grid
 * 5. Paid Report - premium upgrade card
 * 
 * NOTE: This is a draft reference only.
 * Do not use in production. Migrate sections one by one.
 */

import styles from "./HomePanel_v0_draft.module.css"

/* ============================================
   ICONS (inline SVG for draft independence)
   ============================================ */

function IconAxes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <rect x="6" y="4" width="20" height="24" rx="2" fill="#E8E4F0" stroke="#9B8AB8" strokeWidth="1.5" />
      <line x1="10" y1="10" x2="22" y2="10" stroke="#9B8AB8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="14" x2="18" y2="14" stroke="#C4B8D6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="18" x2="20" y2="18" stroke="#C4B8D6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ============================================
   SECTION 1: HERO
   ============================================ */
function HeroSection() {
  return (
    <section className={`${styles.section} ${styles.hero}`}>
      <div className={styles.heroInner}>
        <p className={styles.heroLabel}>統合パーソナル解析</p>
        <h1 className={styles.heroTitle}>
          あなたの潜在力を引き出す、
          <br />
          強みの見取り図
        </h1>
        <p className={styles.heroDesc}>
          5つの解析軸と10通りの資質から、あなたの核・傾向・活かし方を立体的に整理します。
        </p>
        <button className={styles.heroCta}>
          無料で自分の輪郭を見る
        </button>
      </div>
    </section>
  )
}

/* ============================================
   SECTION 2: SUMMARY CARD
   ============================================ */
function SummarySection() {
  const items = [
    { icon: <IconAxes />, title: "5つの解析軸", sub: "多角的な視点であなたを分析" },
    { icon: <IconTarget />, title: "10通りの資質", sub: "あなたの強みを言語化" },
    { icon: <IconBook />, title: "あなただけの見取り図", sub: "強みの活かし方を立体的に整理" },
  ]

  return (
    <section className={`${styles.section} ${styles.summary}`}>
      <div className={styles.summaryInner}>
        <div className={styles.summaryCard}>
          {items.map((item, i) => (
            <div key={i} className={styles.summaryRow}>
              <div className={styles.summaryIcon}>{item.icon}</div>
              <div className={styles.summaryContent}>
                <p className={styles.summaryTitle}>{item.title}</p>
                <p className={styles.summarySub}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================
   SECTION 3: NAVIGATION CARDS
   ============================================ */
function NavigationSection() {
  return (
    <section className={`${styles.section} ${styles.navigation}`}>
      <div className={styles.navigationInner}>
        <div className={styles.navigationGrid}>
          {/* Card 1: How to read M55 */}
          <div className={styles.navCard}>
            <div className={styles.navThumb}>
              <svg viewBox="0 0 48 48" width="36" height="36">
                <circle cx="24" cy="24" r="14" fill="none" stroke="#C4B8D6" strokeWidth="2.5" strokeDasharray="22 66" strokeDashoffset="0" />
                <circle cx="24" cy="24" r="14" fill="none" stroke="#8CA4B8" strokeWidth="2.5" strokeDasharray="18 70" strokeDashoffset="-22" />
                <circle cx="24" cy="24" r="14" fill="none" stroke="#D4B896" strokeWidth="2.5" strokeDasharray="14 74" strokeDashoffset="-40" />
                <circle cx="24" cy="24" r="8" fill="#F8F6FA" />
              </svg>
            </div>
            <div className={styles.navContent}>
              <p className={styles.navTitle}>M55の見方を知る</p>
              <p className={styles.navSub}>解析の読み解き方</p>
            </div>
            <div className={styles.navArrow}>
              <IconArrowRight />
            </div>
          </div>

          {/* Card 2: 10 traits */}
          <div className={styles.navCard}>
            <div className={styles.navThumb}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#C4B8D6', opacity: 0.8 }} />
                <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#8CA4B8', opacity: 0.6 }} />
                <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#D4B896', opacity: 0.7 }} />
                <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#8BA88C', opacity: 0.5 }} />
              </div>
            </div>
            <div className={styles.navContent}>
              <p className={styles.navTitle}>10通りの資質から読む</p>
              <p className={styles.navSub}>資質タイプの詳細</p>
            </div>
            <div className={styles.navArrow}>
              <IconArrowRight />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================
   SECTION 4: FIVE ANALYSIS AXES
   ============================================ */
function AxesSection() {
  const axes = [
    { name: "思考", desc: "考え方の傾向", color: "#C4A98C" },
    { name: "感情", desc: "感じ方のパターン", color: "#D4B896" },
    { name: "行動", desc: "動き方の特性", color: "#8BA88C" },
    { name: "関係", desc: "人との繋がり方", color: "#8CA4B8" },
    { name: "価値", desc: "大切にするもの", color: "#A898B8" },
  ]

  return (
    <section className={`${styles.section} ${styles.axes}`}>
      <div className={styles.axesInner}>
        <div className={styles.axesHeader}>
          <p className={styles.axesLabel}>Analysis Axes</p>
          <h2 className={styles.axesTitle}>5つの解析軸</h2>
        </div>
        <div className={styles.axesGrid}>
          {axes.map((axis, i) => (
            <div key={i} className={styles.axisCard}>
              <div
                className={styles.axisDot}
                style={{ backgroundColor: axis.color }}
              />
              <p className={styles.axisName}>{axis.name}</p>
              <p className={styles.axisDesc}>{axis.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================
   SECTION 5: PAID REPORT
   ============================================ */
function ReportSection() {
  return (
    <section className={`${styles.section} ${styles.report}`}>
      <div className={styles.reportInner}>
        <div className={styles.reportCard}>
          <div className={styles.reportContent}>
            <div className={styles.reportIcon}>
              <IconDocument />
            </div>
            <div className={styles.reportBody}>
              <p className={styles.reportLabel}>Premium Report</p>
              <h3 className={styles.reportTitle}>詳細レポートで深く読む</h3>
              <p className={styles.reportDesc}>
                あなたの資質をより深く掘り下げ、具体的な活かし方をご提案します。
              </p>
              <div className={styles.reportFooter}>
                <span className={styles.reportPrice}>¥1,000</span>
                <button className={styles.reportBtn}>詳細を見る</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================
   MAIN EXPORT
   ============================================ */
export function HomePanelDraft() {
  return (
    <div className={styles.container}>
      <HeroSection />
      <SummarySection />
      <NavigationSection />
      <AxesSection />
      <ReportSection />
    </div>
  )
}

export default HomePanelDraft
