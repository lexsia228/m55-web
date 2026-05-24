/**
 * /core SSOT — formal contract (m55-core-2026-04).
 * Persisted snapshots must not be rebuilt on deploy when sealedInputs match.
 */

export type AxisKey =
  | 'socialEnergy'
  | 'stability'
  | 'openness'
  | 'cooperation'
  | 'structure';

export type AxisBand = 'very-high' | 'high' | 'mid' | 'mid-low' | 'low';

export type AxisDetail = {
  key: AxisKey;
  label: string;
  score: number;
  band: AxisBand;
  summary: string;
  strength: string;
  caution: string;
};

export type AffinityItem = {
  type: string;
  label: string;
  score: number;
};

export type CoreResult = {
  /** 天干 lane 0–9 — public label parity with paid DTR via TEN_STEM_DISPLAY */
  stemLaneIndex: number;
  coreType: string;
  coreLabel: string;
  coreSummary: string;
  coreAxisScores: Record<AxisKey, number>;
  axisDetails: AxisDetail[];
  composition: {
    dominantAxes: AxisKey[];
    secondaryAxes: AxisKey[];
  };
  affinities: AffinityItem[];
  strengths: string[];
  cautions: string[];
  workStyle: {
    summary: string;
    strengths: string[];
    cautions: string[];
  };
  relationships: {
    summary: string;
    strengths: string[];
    cautions: string[];
  };
  love: {
    summary: string;
    strengths: string[];
    cautions: string[];
  };
  engineVersion: string;
  lockedAt: string;
};

export type CorePageData = {
  profile: {
    nickname: string;
    birthDate: string;
  };
  coreResult: CoreResult;
};

/** Wrapper persisted in localStorage */
export type SealedCoreEnvelopeV3 = {
  schemaVersion: 3;
  sealedInputs: { birthDate: string; nickname: string };
  coreResult: CoreResult;
};
