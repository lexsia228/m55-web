/**
 * Negative fixture: a same-named decoy that is not the canonical Premium surface.
 */
export default function PremiumDecisionSurface(props: {
  stateId: string;
  children?: React.ReactNode;
}) {
  return <div data-decoy-state={props.stateId}>{props.children}</div>;
}
