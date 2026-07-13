import CoreFreeToPaidConversionBridge from './CoreFreeToPaidConversionBridge';

type Props = {
  focusThemeLabelJa?: string;
};

/**
 * /core CTA region — single free→paid conversion bridge.
 */
export default function CoreEntryReportCTASection({ focusThemeLabelJa }: Props) {
  return <CoreFreeToPaidConversionBridge focusThemeLabelJa={focusThemeLabelJa} />;
}
