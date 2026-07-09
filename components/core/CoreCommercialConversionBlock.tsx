import Link from 'next/link';
import { PAID_DTR_SAVED_REPORT_PRICING } from '../../lib/m55/paidDtrProductCopy';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { STATIC_COMMERCIAL_CONVERSION } from './corePublicCopy';
import styles from './CoreExperience.module.css';

function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template,
  );
}

/**
 * Phase1 commercial conversion block for /core CTA region.
 * Does not touch CoreHero / checkout / fp-v1 wiring.
 */
export default function CoreCommercialConversionBlock() {
  const pricing = PAID_DTR_SAVED_REPORT_PRICING;
  const copy = STATIC_COMMERCIAL_CONVERSION;
  const href = TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref;

  const priceValue = fillTemplate(copy.priceValueTemplate, {
    planName: pricing.light.planNameJa,
    priceLabel: pricing.light.priceLabelJa,
  });
  const fullCompareNote = fillTemplate(copy.fullCompareNoteTemplate, {
    fullPlanName: pricing.full.planNameJa,
    fullPriceLabel: pricing.full.priceLabelJa,
    upgradePriceLabel: pricing.lightToFullUpgrade.priceLabelJa,
  });

  return (
    <section
      className={`${styles.commercialConversion} ${styles.coreReveal}`}
      aria-labelledby="core-commercial-conversion-title"
      data-core-reveal
    >
      <span className={styles.commercialOverline}>{copy.overline}</span>
      <h2 id="core-commercial-conversion-title" className={styles.commercialTitle}>
        {copy.title}
      </h2>

      <p className={styles.commercialIntro}>{copy.intro}</p>

      <h3 className={styles.commercialPreviewHeading}>{copy.previewHeading}</h3>
      <ul className={styles.commercialPreview}>
        {copy.previewRows.map((row) => (
          <li key={row.label} className={styles.commercialPreviewItem}>
            <span className={styles.commercialPreviewLabel}>{row.label}</span>
            <span className={styles.commercialPreviewTeaser}>{row.teaser}</span>
          </li>
        ))}
      </ul>

      <p className={styles.priceValue}>{priceValue}</p>
      <p className={styles.priceCompareNote}>{fullCompareNote}</p>

      <Link href={href} className={styles.conversionCta}>
        {copy.ctaLabel}
      </Link>

      <p className={styles.safetyNote}>{copy.safetyNote}</p>
    </section>
  );
}
