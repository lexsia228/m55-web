'use client';

import Link from 'next/link';
import styles from './HomePanel.module.css';

export default function HomePanel() {
  return (
    <div className={styles.wrap}>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 1: HERO + INPUT GATE
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.heroSection}>

        {/* A. Hero text */}
        <div className={styles.heroText}>
          <p className={styles.heroEyebrow}>自己観測レポート</p>
          <h1 className={styles.heroTitle}>[HOME_HERO_TITLE]</h1>
          <p className={styles.heroDesc}>[HOME_HERO_DESC]</p>
        </div>

        {/* B. Explanatory strip — what this site is / what becomes visible / supporting line */}
        <div className={styles.siteStrip}>
          <p className={styles.siteStripLine1}>[WHAT_THIS_SITE_IS]</p>
          <p className={styles.siteStripLine2}>[WHAT_BECOMES_VISIBLE]</p>
          <p className={styles.siteStripLine3}>[HOME_SUPPORTING_LINE]</p>
        </div>

        {/* C. Input Gate card */}
        <div className={styles.inputGateCard}>
          <p className={styles.inputGateTitle}>[INPUT_GATE_TITLE]</p>
          <p className={styles.inputGateSubtitle}>[WHY_PRESS_THE_BUTTON]</p>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>ニックネーム</label>
            <div className={styles.fieldInput}>[NICKNAME_FIELD]</div>
          </div>

          <div className={styles.fieldGroupSpaced}>
            <label className={styles.fieldLabel}>生年月日</label>
            <div className={styles.fieldInput}>[BIRTHDATE_FIELD]</div>
          </div>

          <p className={styles.inputGateExplainer}>[INPUT_GATE_EXPLAINER]</p>

          <button type="button" className={styles.inputGateCta}>
            [INPUT_GATE_CTA]
          </button>

          {/* Preview hint row — what the user will receive */}
          <div className={styles.gateHintRow}>
            <span className={styles.gateHint}>本質</span>
            <span className={styles.gateHintSep}>·</span>
            <span className={styles.gateHint}>今日 / 今週</span>
            <span className={styles.gateHintSep}>·</span>
            <span className={styles.gateHint}>五行の比重</span>
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 2: INSTANT PREVIEW BOARD
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.previewSection}>
        <p className={styles.previewEyebrow}>あなたの本質</p>

        {/* Identity card */}
        <div className={styles.identityCard}>
          <div className={styles.identityTopRow}>
            <div className={styles.avatarChip}>
              <span className={styles.avatarSymbol}>[SYMBOL]</span>
            </div>
            <div className={styles.identityRight}>
              <p className={styles.publicTitle}>[PUBLIC_TITLE]</p>
              <p className={styles.displayOneLine}>[DISPLAY_ONE_LINE]</p>
            </div>
          </div>

          <p className={styles.essenceSummary}>[ESSENCE_SUMMARY_SHORT]</p>

          <div className={styles.keywords}>
            <span className={styles.keywordPill}>[KEYWORD_1]</span>
            <span className={styles.keywordPill}>[KEYWORD_2]</span>
            <span className={styles.keywordPill}>[KEYWORD_3]</span>
          </div>

          <div className={styles.titleSection}>
            <p className={styles.primaryTitle}>[PRIMARY_TITLE_SLOT]</p>
            <p className={styles.titleNote}>[TITLE_SYSTEM_NOTE]</p>
          </div>

          <div className={styles.supportNotes}>
            <p className={styles.supportNote}>[IDENTITY_SUPPORT_1]</p>
            <p className={styles.supportNote}>[IDENTITY_SUPPORT_2]</p>
          </div>

          <Link href="/core" className={styles.cardLink}>
            本質をさらに読む →
          </Link>
        </div>

        <p className={styles.freeSurfaceNote}>[FREE_SURFACE_NOTE]</p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 3: FREE-RESULT SAMPLE SHELF
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.shelfSection}>

        {/* A. Five-element ring card */}
        <div className={styles.elementCard}>
          <p className={styles.elementLabel}>五行の比重</p>

          <div className={styles.elementInnerRow}>
            {/* LEFT: Donut ring SVG — strokeDasharray segments only */}
            <svg
              viewBox="0 0 86 86"
              width={72}
              height={72}
              role="img"
              aria-label="五行比重チャート"
              className={styles.donutSvg}
            >
              {/* Background ring */}
              <circle
                cx={43} cy={43} r={30}
                fill="none"
                stroke="rgba(177,156,255,0.12)"
                strokeWidth={11}
              />
              {/* Wood — 38% */}
              <circle
                cx={43} cy={43} r={30} fill="none"
                stroke="#7cb87a" strokeWidth={11}
                strokeDasharray="69.1 188.5"
                transform="rotate(-90,43,43)"
              />
              {/* Fire — 22% */}
              <circle
                cx={43} cy={43} r={30} fill="none"
                stroke="#d4795c" strokeWidth={11}
                strokeDasharray="39.0 188.5"
                transform="rotate(46.8,43,43)"
              />
              {/* Earth — 18% */}
              <circle
                cx={43} cy={43} r={30} fill="none"
                stroke="#c4982a" strokeWidth={11}
                strokeDasharray="31.4 188.5"
                transform="rotate(126,43,43)"
              />
              {/* Metal — 12% */}
              <circle
                cx={43} cy={43} r={30} fill="none"
                stroke="#9090ac" strokeWidth={11}
                strokeDasharray="20.1 188.5"
                transform="rotate(190.8,43,43)"
              />
              {/* Water — 10% */}
              <circle
                cx={43} cy={43} r={30} fill="none"
                stroke="#5a8fc4" strokeWidth={11}
                strokeDasharray="16.3 188.5"
                transform="rotate(234,43,43)"
              />
              {/* Center character */}
              <text
                x={43} y={44}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={15}
                fontWeight={700}
                fill="#7cb87a"
              >
                [PRIMARY_ELEMENT_CHAR]
              </text>
            </svg>

            {/* RIGHT: Legend column */}
            <div className={styles.legendColumn}>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ background: '#7cb87a' }} />
                <span className={styles.legendChar} style={{ color: '#7cb87a' }}>[WOOD_CHAR]</span>
                <span className={styles.legendGenre}>[WOOD_GENRE]</span>
                <span className={styles.legendBadge}>[WOOD_BADGE]</span>
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ background: '#d4795c' }} />
                <span className={styles.legendChar} style={{ color: '#d4795c' }}>[FIRE_CHAR]</span>
                <span className={styles.legendGenre}>[FIRE_GENRE]</span>
                <span className={styles.legendBadge}>[FIRE_BADGE]</span>
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ background: '#c4982a' }} />
                <span className={styles.legendChar} style={{ color: '#c4982a' }}>[EARTH_CHAR]</span>
                <span className={styles.legendGenre}>[EARTH_GENRE]</span>
                <span className={styles.legendBadge}>[EARTH_BADGE]</span>
              </div>
              <div className={styles.legendRowMuted}>
                <span className={styles.legendDot} style={{ background: '#9090ac' }} />
                <span className={styles.legendChar} style={{ color: '#9090ac' }}>[METAL_CHAR]</span>
                <span className={styles.legendGenre}>[METAL_GENRE]</span>
                <span className={styles.legendBadge}>[METAL_BADGE]</span>
              </div>
              <div className={styles.legendRowMuted}>
                <span className={styles.legendDot} style={{ background: '#5a8fc4' }} />
                <span className={styles.legendChar} style={{ color: '#5a8fc4' }}>[WATER_CHAR]</span>
                <span className={styles.legendGenre}>[WATER_GENRE]</span>
                <span className={styles.legendBadge}>[WATER_BADGE]</span>
              </div>
            </div>
          </div>

          <p className={styles.chartDisclaimer}>[FIVE_ELEMENT_NOTE]</p>
          <p className={styles.chartDisclaimerSub}>[FIVE_ELEMENT_NOTE_2]</p>
        </div>

        {/* B. Current Focus card */}
        <div className={styles.focusCard}>
          <p className={styles.focusEyebrow}>今の焦点</p>
          <p className={styles.focusText}>[CURRENT_FOCUS_SUMMARY]</p>
        </div>

        {/* C. Today + Weekly horizontal shelf */}
        <div className={styles.shelfRow}>
          <div className={styles.shelfCard}>
            <p className={styles.shelfLabel}>今日</p>
            <p className={styles.shelfHeading}>[TODAY_HEADING]</p>
            <p className={styles.shelfSummary}>[TODAY_SUMMARY_SHORT]</p>
            <p className={styles.shelfSupport}>[TODAY_SUPPORT_LINE]</p>
            <Link href="/today" className={styles.shelfLink}>読む →</Link>
          </div>
          <div className={styles.shelfCard}>
            <p className={styles.shelfLabel}>今週</p>
            <p className={styles.shelfHeading}>[WEEKLY_HEADING]</p>
            <p className={styles.shelfKey}>[WEEKLY_KEY]</p>
            <p className={styles.shelfSupport}>[WEEKLY_SUPPORT_LINE]</p>
            <Link href="/weekly" className={styles.shelfLink}>読む →</Link>
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 4: SYSTEM RULE EXPLANATION
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.rulesSection}>
        <p className={styles.rulesTitle}>M55の仕組み</p>
        <ul className={styles.rulesList}>
          <li className={styles.ruleItem}>[SYSTEM_RULE_1]</li>
          <li className={styles.ruleItem}>[SYSTEM_RULE_2]</li>
          <li className={styles.ruleItem}>[SYSTEM_RULE_3]</li>
          <li className={styles.ruleItem}>[SYSTEM_RULE_4]</li>
          <li className={styles.ruleItem}>[SYSTEM_RULE_5]</li>
        </ul>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 5: ENTRY REPORT MONETIZATION LAYER
          One hero only — do not add a second product or second price.
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.reportSection}>

        {/* Section-level eyebrow — marks the transition to paid surface */}
        <p className={styles.reportSectionEyebrow}>[ENTRY_REPORT_LABEL]</p>

        <div className={styles.valueCard}>
          <p className={styles.valueEyebrow}>Entry Report</p>
          <p className={styles.valuePrice}>[ENTRY_REPORT_PRICE]</p>

          {/* Depth note before feature list — lead-in explaining why it is richer */}
          <p className={styles.depthNote}>[ENTRY_REPORT_DEPTH_NOTE]</p>

          <ul className={styles.featureList}>
            <li className={styles.featureItem}>[ENTRY_REPORT_FEATURE_1]</li>
            <li className={styles.featureItem}>[ENTRY_REPORT_FEATURE_2]</li>
            <li className={styles.featureItem}>[ENTRY_REPORT_FEATURE_3]</li>
          </ul>

          {/* Blurred chapter preview — boundary marker, not punishment */}
          <div className={styles.chapterPreview}>
            <p className={styles.chapterPreviewLabel}>収録内容プレビュー</p>
            <ul className={styles.chapterList}>
              <li className={styles.chapterRow}>
                <span className={styles.chapterDot} />
                <span className={styles.chapterTitleBlurred}>[CHAPTER_TITLE_1]</span>
              </li>
              <li className={styles.chapterRow}>
                <span className={styles.chapterDot} />
                <span className={styles.chapterTitleBlurred}>[CHAPTER_TITLE_2]</span>
              </li>
              <li className={styles.chapterRow}>
                <span className={styles.chapterDot} />
                <span className={styles.chapterTitleBlurred}>[CHAPTER_TITLE_3]</span>
              </li>
              <li className={styles.chapterRow}>
                <span className={styles.chapterDot} />
                <span className={styles.chapterTitleBlurred}>[CHAPTER_TITLE_4]</span>
              </li>
            </ul>
            <p className={styles.chapterMore}>＋他4章</p>
            <p className={styles.valueGapNote}>[ENTRY_REPORT_VALUE_GAP_NOTE]</p>
          </div>

          <Link href="/dtr/lp" className={styles.reportCta}>
            [ENTRY_REPORT_CTA]
          </Link>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 6: TRUST FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className={styles.trustFooter}>
        <div className={styles.legalLinks}>
          <Link href="/support" className={styles.legalLink}>サポート</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/refund" className={styles.legalLink}>返金</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/tokushoho" className={styles.legalLink}>特商法</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/terms" className={styles.legalLink}>利用規約</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/privacy" className={styles.legalLink}>プライバシー</Link>
        </div>
        <p className={styles.copyright}>© 2026 M55</p>
      </footer>

    </div>
  );
}
