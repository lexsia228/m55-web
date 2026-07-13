import CoreFreeToPaidConversionBridge from './CoreFreeToPaidConversionBridge';

type Props = {
  focusThemeLabelJa?: string;
};

/**
 * Legacy export name — delegates to the unified conversion bridge.
 */
export default function CoreCommercialConversionBlock({ focusThemeLabelJa }: Props) {
  return <CoreFreeToPaidConversionBridge focusThemeLabelJa={focusThemeLabelJa} />;
}
