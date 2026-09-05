import { resolveTraitIdentity } from '../commercialUx/traitIdentityCatalog';
import { buildCoreResultClient } from '../coreResult/buildCoreResult.client';

export type PairTraitPersonV1 = {
  readonly stemLaneIndex: number;
  readonly traitName: string;
  readonly identityLine: string;
  readonly imagePath: string;
  readonly accent: string;
};

export type PairTraitIdentityV1 = {
  readonly personA: PairTraitPersonV1;
  readonly personB: PairTraitPersonV1;
  readonly pairLabel: string;
};

function resolvePersonTraitFromBirthDate(birthDate: string): PairTraitPersonV1 {
  const core = buildCoreResultClient({
    nickname: '',
    birthDate,
    birthTime: '',
    country: '',
    birthplace: '',
  });
  const trait = resolveTraitIdentity(core.stemLaneIndex);
  if (!trait) {
    throw new Error('canonical trait identity missing for stem lane');
  }
  return {
    stemLaneIndex: core.stemLaneIndex,
    traitName: trait.traitName,
    identityLine: trait.identityLine,
    imagePath: trait.imagePath,
    accent: trait.accent,
  };
}

export function resolvePairTraitIdentityV1(
  personABirthDate: string,
  personBBirthDate: string,
): PairTraitIdentityV1 {
  const personA = resolvePersonTraitFromBirthDate(personABirthDate);
  const personB = resolvePersonTraitFromBirthDate(personBBirthDate);
  return {
    personA,
    personB,
    pairLabel: `${personA.traitName} × ${personB.traitName}`,
  };
}
