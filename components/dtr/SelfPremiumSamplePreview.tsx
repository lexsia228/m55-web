'use client';

import { useState } from 'react';
import PremiumExperienceSurface from '../experience/PremiumExperienceSurface';
import {
  PREMIUM_VISUAL_AUTHORITY_KEY,
  PREMIUM_VISUAL_TOKENS,
} from '../../lib/m55/commercialUx/premiumExperience/premiumVisualAuthority';
import { SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE } from '../../lib/m55/selfPremiumSamplePreviewFixture';
import styles from './SelfPremiumSamplePreview.module.css';

export default function SelfPremiumSamplePreview() {
  const fixture = SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE;
  const [activeIndex, setActiveIndex] = useState(0);
  const chapter = fixture.chapters[activeIndex] ?? fixture.chapters[0]!;
  const tablistId = 'm55-self-premium-sample-tabs';

  return (
    <PremiumExperienceSurface
      stateId="premium.lp.sample_preview"
      variant="editorial_sheet"
      surface="publication"
      testId="m55-self-premium-sample-preview"
    >
      <aside
        className={styles.root}
        aria-label="プレミアムレポートの見本"
        data-m55-visual-authority={PREMIUM_VISUAL_AUTHORITY_KEY}
        style={{
          ['--sample-ink' as string]: PREMIUM_VISUAL_TOKENS.ink,
          ['--sample-ivory' as string]: PREMIUM_VISUAL_TOKENS.ivory,
          ['--sample-ivory-muted' as string]: PREMIUM_VISUAL_TOKENS.ivoryMuted,
          ['--sample-sheet' as string]: PREMIUM_VISUAL_TOKENS.inkSoft,
          ['--sample-sheet-border' as string]: PREMIUM_VISUAL_TOKENS.sheetBorder,
          ['--sample-copper' as string]: PREMIUM_VISUAL_TOKENS.copper,
          ['--sample-copper-rule' as string]: PREMIUM_VISUAL_TOKENS.copperRule,
          ['--sample-copper-soft' as string]: PREMIUM_VISUAL_TOKENS.copperSoft,
          ['--sample-serif' as string]: PREMIUM_VISUAL_TOKENS.serif,
          ['--sample-sans' as string]: PREMIUM_VISUAL_TOKENS.sans,
        }}
      >
        <article className={styles.sheet}>
          <p className={styles.label}>{fixture.labelJa}</p>
          <p className={styles.disclaimer}>{fixture.disclaimerJa}</p>
          <p className={styles.product}>{fixture.productTitleJa}</p>
          <div className={styles.layers}>
            <p className={styles.layerLine}>{fixture.layer1Ja}</p>
            <p className={styles.layerLine}>{fixture.layer2Ja}</p>
            <p className={styles.layerLine}>{fixture.layer3Ja}</p>
          </div>
          <div
            className={styles.tabs}
            role="tablist"
            id={tablistId}
            aria-label="見本の章"
          >
            {fixture.chapters.map((item, index) => {
              const selected = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`m55-self-premium-sample-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`m55-self-premium-sample-panel-${item.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`${styles.tab}${selected ? ` ${styles.tabActive}` : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  {item.roman} {item.titleJa}
                </button>
              );
            })}
          </div>
          <div
            role="tabpanel"
            id={`m55-self-premium-sample-panel-${chapter.id}`}
            aria-labelledby={`m55-self-premium-sample-tab-${chapter.id}`}
          >
            <h3 className={styles.chapterHeading}>
              {chapter.roman} {chapter.titleJa}
            </h3>
            <p className={styles.chapterTag}>{chapter.tocTagJa}</p>
            <div className={styles.passages}>
              {chapter.passagesJa.map((passage) => (
                <p key={`${chapter.id}-${passage.role}-${passage.textJa.slice(0, 12)}`} className={styles.passage}>
                  {passage.textJa}
                </p>
              ))}
            </div>
          </div>
          <p className={styles.revisit}>{fixture.revisitJa}</p>
        </article>
      </aside>
    </PremiumExperienceSurface>
  );
}
