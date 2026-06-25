import { redirect } from 'next/navigation';
import { LANE_B_CONSULT_REDIRECT_PATH } from '../../lib/m55/reply/laneBProductionFailClosed';

/** Lane B input page — redirect to Lane A consult entry (saved report reader). */
export default function ReplyPage() {
  redirect(LANE_B_CONSULT_REDIRECT_PATH);
}
