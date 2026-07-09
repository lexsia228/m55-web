import CoreCommercialConversionBlock from './CoreCommercialConversionBlock';

/**
 * /core CTA region — Phase1 delegates to commercial conversion block.
 * Kept as a stable import surface for CoreEssencePanel and copy-route tests.
 */
export default function CoreEntryReportCTASection() {
  return <CoreCommercialConversionBlock />;
}
