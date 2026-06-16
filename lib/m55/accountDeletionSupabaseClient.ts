import { createClient } from '@supabase/supabase-js';
import {
  classifyFetchTransportRejection,
  type SafeFetchTransportObservation,
} from './accountDeletionClerkWebhookContract.ts';

export type AccountDeletionSupabaseObservationResult<T> = {
  result: T;
  transportObservation: SafeFetchTransportObservation | null;
  fetchRejectionCount: number;
};

export function createObservingFetch(
  recordFirstObservation: (observation: SafeFetchTransportObservation) => void,
  incrementRejectionCount: () => void,
): typeof fetch {
  const baseFetch = globalThis.fetch.bind(globalThis);
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await baseFetch(input, init);
    } catch (original) {
      incrementRejectionCount();
      try {
        recordFirstObservation(classifyFetchTransportRejection(original));
      } catch {
        // observer failure must never mask the original fetch rejection
      }
      throw original;
    }
  };
}

export async function withAccountDeletionSupabaseClientObservation<T>(
  operation: (client: unknown) => Promise<T>,
): Promise<AccountDeletionSupabaseObservationResult<T>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('ENV_MISSING:SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  let transportObservation: SafeFetchTransportObservation | null = null;
  let fetchRejectionCount = 0;

  const observingFetch = createObservingFetch(
    (observation) => {
      if (transportObservation === null) {
        transportObservation = observation;
      }
    },
    () => {
      fetchRejectionCount += 1;
    },
  );

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: observingFetch },
  });

  const result = await operation(client);
  return { result, transportObservation, fetchRejectionCount };
}
