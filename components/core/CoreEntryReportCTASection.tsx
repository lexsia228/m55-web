import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import CoreFreeToPaidConversionBridge from './CoreFreeToPaidConversionBridge';

type Props = {
  depth: FreeDepthAnalysisV1;
  traitName: string;
};

/**
 * /core CTA region — single free→paid conversion bridge.
 */
export default function CoreEntryReportCTASection({ depth, traitName }: Props) {
  return <CoreFreeToPaidConversionBridge depth={depth} traitName={traitName} />;
}
