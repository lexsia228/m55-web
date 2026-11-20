import { R8_A_STRIPE_LINK_STATES, type R8StripeLinkStateV1 } from './contract';

const LINK_STATE_SET: ReadonlySet<string> = new Set(R8_A_STRIPE_LINK_STATES);

export function parseR8StripeLinkStateV1(value: unknown): R8StripeLinkStateV1 | null {
  if (typeof value !== 'string' || !LINK_STATE_SET.has(value)) {
    return null;
  }
  return value as R8StripeLinkStateV1;
}