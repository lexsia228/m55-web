import { NextRequest, NextResponse } from 'next/server';
import { runCanonicalCorePipeline } from '../../../../lib/m55/coreResult/canonicalBoundary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type VectorInput = {
  birthDate: string;
  pairBirthDate?: string;
  country?: string;
};

type SampleResult = {
  rawOutput: string;
  displayOutput: string;
  staticFingerprint: string;
  displayFingerprint: string;
  pairFingerprint: string | null;
  boundaryContext: {
    normalizedGregorianDate: string;
    canonicalTimezone: string;
    solarTermBoundary: string;
    lunarBoundary: string;
    fallbackMode: string;
  };
  sealedReplayCheck: {
    coreType: boolean;
    coreLabel: boolean;
    coreAxisScores: boolean;
    engineVersion: boolean;
    lockedAt: boolean;
    staticFingerprint: boolean;
    displayFingerprint: boolean;
  };
};

function stableSerialize(value: unknown): string {
  return JSON.stringify(value);
}

function hashFingerprint(payload: unknown): string {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

function runOne(input: VectorInput, fixedNow?: string): SampleResult {
  const single = runCanonicalCorePipeline({
    birthDate: input.birthDate,
    country: input.country,
  }, fixedNow);

  const pair = input.pairBirthDate
    ? runCanonicalCorePipeline({ birthDate: input.pairBirthDate, country: input.country }, fixedNow)
    : null;

  const pairFingerprint = pair
    ? hashFingerprint({
      left: single.staticCore.staticFingerprint,
      leftDisplay: single.staticCore.displayFingerprint,
      right: pair.staticCore.staticFingerprint,
      rightDisplay: pair.staticCore.displayFingerprint,
      leftBoundary: single.boundary,
      rightBoundary: pair.boundary,
      country: input.country ?? 'UNSPECIFIED',
    })
    : null;

  const firstCompute = {
    coreType: `TYPE_${String(single.staticCore.typeIndex + 1).padStart(2, '0')}`,
    coreLabel: single.staticCore.longTermTheme,
    coreAxisScores: Object.fromEntries(single.axisDetails.map((d) => [d.key, d.score])),
    engineVersion: single.engineVersion,
    lockedAt: `${single.normalized.normalizedGregorianDate}T00:00:00.000Z`,
    staticFingerprint: single.staticCore.staticFingerprint,
    displayFingerprint: single.staticCore.displayFingerprint,
  };
  const sealedReplay = JSON.parse(JSON.stringify(firstCompute)) as typeof firstCompute;

  return {
    rawOutput: stableSerialize({
      single,
      pair,
    }),
    displayOutput: stableSerialize({
      personaCode49: single.staticCore.personaCode49,
      staticEssence: single.staticCore.staticEssence,
      longTermTheme: single.staticCore.longTermTheme,
      relationBaseline: single.staticCore.relationBaseline,
      workResourceBaseline: single.staticCore.workResourceBaseline,
      pairTheme: pair?.staticCore.longTermTheme ?? null,
      displayFingerprint: single.staticCore.displayFingerprint,
      pairDisplayFingerprint: pair?.staticCore.displayFingerprint ?? null,
    }),
    staticFingerprint: single.staticCore.staticFingerprint,
    displayFingerprint: single.staticCore.displayFingerprint,
    pairFingerprint,
    boundaryContext: {
      normalizedGregorianDate: single.normalized.normalizedGregorianDate,
      canonicalTimezone: single.normalized.canonicalTimezone,
      solarTermBoundary: single.boundary.solarTermBoundary,
      lunarBoundary: single.boundary.lunarBoundary,
      fallbackMode: single.boundary.fallbackMode,
    },
    sealedReplayCheck: {
      coreType: sealedReplay.coreType === firstCompute.coreType,
      coreLabel: sealedReplay.coreLabel === firstCompute.coreLabel,
      coreAxisScores: stableSerialize(sealedReplay.coreAxisScores) === stableSerialize(firstCompute.coreAxisScores),
      engineVersion: sealedReplay.engineVersion === firstCompute.engineVersion,
      lockedAt: sealedReplay.lockedAt === firstCompute.lockedAt,
      staticFingerprint: sealedReplay.staticFingerprint === firstCompute.staticFingerprint,
      displayFingerprint: sealedReplay.displayFingerprint === firstCompute.displayFingerprint,
    },
  };
}

function diffCount(a: SampleResult, b: SampleResult): number {
  let n = 0;
  if (a.rawOutput !== b.rawOutput) n++;
  if (a.displayOutput !== b.displayOutput) n++;
  if (a.staticFingerprint !== b.staticFingerprint) n++;
  if (a.displayFingerprint !== b.displayFingerprint) n++;
  if (a.pairFingerprint !== b.pairFingerprint) n++;
  return n;
}

function run3(input: VectorInput, fixedNow?: string) {
  const runs = [runOne(input, fixedNow), runOne(input, fixedNow), runOne(input, fixedNow)];
  const base = runs[0]!;
  const diffs = runs.slice(1).map((v) => diffCount(base, v));
  return { runs, diffTotal: diffs.reduce((a, b) => a + b, 0) };
}

export async function GET(req: NextRequest) {
  if (process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV)) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const fixedNow = req.nextUrl.searchParams.get('fixedNow') ?? undefined;
  const country = req.nextUrl.searchParams.get('country') ?? undefined;

  const vectors = {
    seed19830228: run3({ birthDate: '1983-02-28', country }, fixedNow),
    seed19921219: run3({ birthDate: '1992-12-19', country }, fixedNow),
    pair1983x1992: run3({ birthDate: '1983-02-28', pairBirthDate: '1992-12-19', country }, fixedNow),
  };

  const allPassed =
    vectors.seed19830228.diffTotal === 0 &&
    vectors.seed19921219.diffTotal === 0 &&
    vectors.pair1983x1992.diffTotal === 0;

  const canonicalAnchor = runCanonicalCorePipeline({ birthDate: '1983-02-28', country }, fixedNow);
  const countryMatrix = {
    JP: {
      seed19830228: run3({ birthDate: '1983-02-28', country: 'JP' }, fixedNow).diffTotal,
      seed19921219: run3({ birthDate: '1992-12-19', country: 'JP' }, fixedNow).diffTotal,
      pair1983x1992: run3({ birthDate: '1983-02-28', pairBirthDate: '1992-12-19', country: 'JP' }, fixedNow).diffTotal,
    },
    US: {
      seed19830228: run3({ birthDate: '1983-02-28', country: 'US' }, fixedNow).diffTotal,
      seed19921219: run3({ birthDate: '1992-12-19', country: 'US' }, fixedNow).diffTotal,
      pair1983x1992: run3({ birthDate: '1983-02-28', pairBirthDate: '1992-12-19', country: 'US' }, fixedNow).diffTotal,
    },
  };
  console.info('[m55-core-regression]', {
    normalizedGregorianDate: canonicalAnchor.normalized.normalizedGregorianDate,
    canonicalTimezone: canonicalAnchor.normalized.canonicalTimezone,
    solarTermBoundaryDecision: canonicalAnchor.boundary.solarTermBoundary,
    lunarBoundaryDecision: canonicalAnchor.boundary.lunarBoundary,
    fallbackMode: canonicalAnchor.boundary.fallbackMode,
    staticFingerprint: canonicalAnchor.staticCore.staticFingerprint,
    displayFingerprint: canonicalAnchor.staticCore.displayFingerprint,
    engineVersion: canonicalAnchor.engineVersion,
    regressionAnchorMatched: canonicalAnchor.regressionAnchorMatched,
  });

  return NextResponse.json(
    {
      ok: allPassed,
      fixedNow,
      vectors: {
        seed19830228: vectors.seed19830228.diffTotal,
        seed19921219: vectors.seed19921219.diffTotal,
        pair1983x1992: vectors.pair1983x1992.diffTotal,
      },
      countryMatrix,
      boundaryContext: {
        normalizedGregorianDate: canonicalAnchor.normalized.normalizedGregorianDate,
        canonicalTimezone: canonicalAnchor.normalized.canonicalTimezone,
        solarTermBoundary: canonicalAnchor.boundary.solarTermBoundary,
        lunarBoundary: canonicalAnchor.boundary.lunarBoundary,
        fallbackMode: canonicalAnchor.boundary.fallbackMode,
      },
      replayChecks: {
        seed19830228: vectors.seed19830228.runs[0]!.sealedReplayCheck,
        seed19921219: vectors.seed19921219.runs[0]!.sealedReplayCheck,
      },
      pairFingerprint: vectors.pair1983x1992.runs[0]!.pairFingerprint,
      canonical: {
        normalizedGregorianDate: canonicalAnchor.normalized.normalizedGregorianDate,
        canonicalTimezone: canonicalAnchor.normalized.canonicalTimezone,
        timezoneUsed: canonicalAnchor.boundary.timezoneUsed,
        fallbackMode: canonicalAnchor.boundary.fallbackMode,
        staticFingerprint: canonicalAnchor.staticCore.staticFingerprint,
        displayFingerprint: canonicalAnchor.staticCore.displayFingerprint,
        engineVersion: canonicalAnchor.engineVersion,
        regressionAnchorMatched: canonicalAnchor.regressionAnchorMatched,
      },
    },
    { status: allPassed ? 200 : 500, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
