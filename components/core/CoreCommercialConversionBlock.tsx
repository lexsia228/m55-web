import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import CoreFreeToPaidConversionBridge from './CoreFreeToPaidConversionBridge';

type Props = {
  depth: FreeDepthAnalysisV1;
};

/**
 * Legacy export name — delegates to the unified conversion bridge.
 */
export default function CoreCommercialConversionBlock({ depth }: Props) {
  return <CoreFreeToPaidConversionBridge depth={depth} />;
}
