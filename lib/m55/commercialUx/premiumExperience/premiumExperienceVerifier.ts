/**
 * Premium Experience SSOT verifier core — AST module resolution + route reachability + evidence.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import {
  PREMIUM_EXPERIENCE_MOUNT_CONTRACT,
  PREMIUM_SHARE_FREE_OWNER_FILE,
  PREMIUM_SHARE_PREMIUM_OWNER_FILE,
} from './premiumExperienceMountContract';
import { PREMIUM_EXPERIENCE_STATE_REGISTRY } from './premiumExperienceStateRegistry';
import {
  PREMIUM_FIXTURE_ROUTE_REACHABILITY,
  PREMIUM_NON_FIXTURE_STATE_IDS,
} from './premiumExperienceRouteReachability';
import { validatePremiumEvidenceOnDisk } from './premiumExperienceEvidenceValidation';
import {
  createPremiumCompilerHost,
  importsResolveTo,
  jsxUsesResolvedSymbol,
  parseImportBindings,
  parseJsxUsages,
  proveOwnerModuleResolution,
} from './premiumExperienceModuleResolution';
import { inspectPremiumOwnerFile, freeShareAccidentallyPremiumWrapped, hasPremiumSurfaceMount } from './premiumExperienceAstInspection';

export type VerifierFailure = { rule: string; message: string };

export type PremiumVerifierReport = {
  registered: number;
  imported: number;
  mounted: number;
  conditionallySelected: number;
  fixtureRequiredStateCount: number;
  fixtureReachableStateCount: number;
  nonFixtureStateCount: number;
  moduleResolutionResult: 'PASS' | 'FAIL';
  routeToOwnerReachability: 'PASS' | 'FAIL';
  pngCount: number;
  pdfCount: number;
  userFacingFourChapterCount: number;
  failures: VerifierFailure[];
};

const CANONICAL_MODULES = {
  PremiumExperienceSurface: 'components/experience/PremiumExperienceSurface.tsx',
  PremiumDecisionSurface: 'components/experience/PremiumDecisionSurface.tsx',
  CorePremiumResultShareCTA: 'components/core/CorePremiumResultShareCTA.tsx',
  SavedSnapshotNotice: 'components/dtr/SavedSnapshotNotice.tsx',
  DtrFullReader: 'components/dtr/DtrFullReader.tsx',
  ConsultRoom: 'components/dtr/ConsultRoom.tsx',
  ConsultReplyCard: 'components/dtr/ConsultReplyCard.tsx',
} as const;

const INTERNAL_FOUR_CHAPTER_ALLOWED = [
  'lib/m55/paidDtrProductCopy.ts',
  'lib/m55/contracts/m55CommercialFunnelContract.ts',
  'lib/m55/individualization',
  'lib/m55/consult',
  'lib/m55/dtrOpenAiHybridAiProvider.ts',
  'lib/m55/dtrProductLabels.ts',
  'components/dtr/DtrFullReader.tsx',
  'components/dtr/PremiumDrawerHub.tsx',
  'app/legal',
  'docs/',
  'lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceManifest.ts',
  'lib/m55/commercialUx/premiumExperience/premiumExperienceVerifier.ts',
  'lib/m55/commercialUx/premiumExperience/__fixtures__',
];

const GOVERNED_GLOBS = [
  'components/core',
  'components/dtr',
  'components/home',
  'components/share',
  'components/shell',
  'components/checkout',
  'components/experience',
  'app/home',
  'app/pricing',
  'app/how-m55-works',
  'app/dtr/lp',
  'app/support',
  'app/r',
  'app/dev/premium-share-preview',
  'lib/m55/commercialUx',
  'lib/m55/topFreeEntryPublicCopy.ts',
  'lib/m55/m55LogicPublicCopy.ts',
];

const FOUR_CHAPTER_PATTERNS = [/4章/g, /４章/g, /4\s*章/g, /第[1-4]章/g, /4章構成/g, /4章で/g, /4章を/g, /章を作る/g, /章レポート/g];

function fail(failures: VerifierFailure[], rule: string, message: string) {
  failures.push({ rule, message });
}

function walkFiles(root: string, dirRel: string, pred: (rel: string) => boolean, out: string[] = []): string[] {
  const abs = join(root, dirRel);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.git') continue;
    const rel = join(dirRel, name).split(sep).join('/');
    const st = statSync(join(root, rel));
    if (st.isDirectory()) walkFiles(root, rel, pred, out);
    else if (pred(rel)) out.push(rel);
  }
  return out;
}

function isInternalAllowed(rel: string): boolean {
  return INTERNAL_FOUR_CHAPTER_ALLOWED.some(
    (p) => rel === p || rel.startsWith(p) || rel.includes(p.replace(/\/$/, '')),
  );
}

function scanFourChapter(root: string): { count: number; hits: string[] } {
  let count = 0;
  const hits: string[] = [];
  for (const base of GOVERNED_GLOBS) {
    const abs = join(root, base);
    if (!existsSync(abs)) continue;
    const st = statSync(abs);
    const files = st.isDirectory()
      ? walkFiles(root, base, (r) => /\.(tsx?|css)$/.test(r))
      : [base];
    for (const rel of files) {
      if (isInternalAllowed(rel)) continue;
      if (rel.includes('.test.') || rel.includes('premiumExperienceAst')) continue;
      const src = readFileSync(join(root, rel), 'utf8');
      if (rel.includes('experienceCtaState.ts') && src.includes('M55_CTA_FORBIDDEN_PHRASES')) continue;
      for (const re of FOUR_CHAPTER_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(src)) !== null) {
          count += 1;
          hits.push(`${rel}:${m[0]}`);
        }
      }
    }
  }
  return { count, hits };
}

function verifyCanonicalModuleOwnership(root: string, failures: VerifierFailure[]) {
  const bridge = proveOwnerModuleResolution(
    root,
    'components/core/CoreFreeToPaidConversionBridge.tsx',
    'PremiumExperienceSurface',
    CANONICAL_MODULES.PremiumExperienceSurface,
  );
  if (!jsxUsesResolvedSymbol(bridge, 'PremiumExperienceSurface', CANONICAL_MODULES.PremiumExperienceSurface)) {
    fail(failures, 'module.resolution', 'bridge PremiumExperienceSurface JSX not bound to canonical module');
  }

  const prep = proveOwnerModuleResolution(
    root,
    'components/dtr/DtrPaidPurchasePrep.tsx',
    'PremiumDecisionSurface',
    CANONICAL_MODULES.PremiumDecisionSurface,
  );
  if (!jsxUsesResolvedSymbol(prep, 'PremiumDecisionSurface', CANONICAL_MODULES.PremiumDecisionSurface)) {
    fail(failures, 'module.resolution', 'purchase prep PremiumDecisionSurface not bound to canonical module');
  }

  const share = proveOwnerModuleResolution(
    root,
    PREMIUM_SHARE_PREMIUM_OWNER_FILE,
    'PremiumDecisionSurface',
    CANONICAL_MODULES.PremiumDecisionSurface,
  );
  if (!jsxUsesResolvedSymbol(share, 'PremiumDecisionSurface', CANONICAL_MODULES.PremiumDecisionSurface)) {
    fail(failures, 'module.resolution', 'premium share PremiumDecisionSurface not bound to canonical module');
  }

  const shareCta = proveOwnerModuleResolution(
    root,
    'app/dev/premium-share-preview/page.tsx',
    'CorePremiumResultShareCTA',
    CANONICAL_MODULES.CorePremiumResultShareCTA,
  );
  if (!jsxUsesResolvedSymbol(shareCta, 'CorePremiumResultShareCTA', CANONICAL_MODULES.CorePremiumResultShareCTA)) {
    fail(failures, 'module.resolution', 'premium share route CorePremiumResultShareCTA not bound to canonical module');
  }

  const readerImports = parseImportBindings(root, 'components/dtr/DtrFullReader.tsx', createPremiumCompilerHost(root).options);
  const savedImport = readerImports.find((i) => i.localName === 'SavedSnapshotNotice');
  if (!savedImport || !savedImport.resolvedPath.endsWith('SavedSnapshotNotice.tsx')) {
    fail(failures, 'module.resolution', 'DtrFullReader SavedSnapshotNotice import not resolved');
  }

  const notice = inspectPremiumOwnerFile(root, CANONICAL_MODULES.SavedSnapshotNotice);
  if (!notice.dataPremiumStates.some((s) => s.value === 'purchased.saved_reopen')) {
    fail(failures, 'module.resolution', 'SavedSnapshotNotice missing purchased.saved_reopen state');
  }

  const readerBody = inspectPremiumOwnerFile(root, CANONICAL_MODULES.DtrFullReader);
  if (!readerBody.dataPremiumStates.some((s) => s.value === 'purchased.report.body')) {
    fail(failures, 'module.resolution', 'DtrFullReader missing purchased.report.body state');
  }

  const consult = inspectPremiumOwnerFile(root, CANONICAL_MODULES.ConsultRoom);
  if (!consult.dataPremiumStates.some((s) => s.value === 'purchased.consult.input')) {
    fail(failures, 'module.resolution', 'ConsultRoom missing purchased.consult.input state');
  }

  const reply = inspectPremiumOwnerFile(root, CANONICAL_MODULES.ConsultReplyCard);
  if (!reply.dataPremiumStates.some((s) => s.value === 'purchased.consult.result')) {
    fail(failures, 'module.resolution', 'ConsultReplyCard missing purchased.consult.result state');
  }
}

function verifyRouteReachability(root: string, failures: VerifierFailure[]): number {
  let reachable = 0;
  for (const entry of PREMIUM_FIXTURE_ROUTE_REACHABILITY) {
    if (!existsSync(join(root, entry.routeModule))) {
      fail(failures, 'route.reachability', `${entry.stateId} route module missing ${entry.routeModule}`);
      continue;
    }
    let chainOk = true;
    for (const link of entry.importChain) {
      if (!importsResolveTo(root, link.fromModule, link.importName, link.toModule)) {
        fail(
          failures,
          'route.reachability',
          `${entry.stateId}: ${link.fromModule} → ${link.importName} must resolve to ${link.toModule}`,
        );
        chainOk = false;
      }
    }
    if (!chainOk) continue;

    const inspection = inspectPremiumOwnerFile(root, entry.ownerModule);
    if (entry.selectionState?.startsWith('premium.')) {
      if (!hasPremiumSurfaceMount(inspection, 'PremiumDecisionSurface', entry.selectionState) &&
          !hasPremiumSurfaceMount(inspection, 'PremiumExperienceSurface', entry.selectionState)) {
        fail(failures, 'route.reachability', `${entry.stateId} not mounted in ${entry.ownerModule}`);
        continue;
      }
    } else if (entry.selectionState) {
      if (!inspection.dataPremiumStates.some((s) => s.value === entry.selectionState)) {
        fail(failures, 'route.reachability', `${entry.stateId} data state missing in ${entry.ownerModule}`);
        continue;
      }
    }

    if (entry.selectionProp === 'devPreviewFixtureReady') {
      const previewClient = readFileSync(join(root, 'components/dtr/__preview__/DtrDrawerPreviewClient.tsx'), 'utf8');
      if (!previewClient.includes('devPreviewFixtureReady')) {
        fail(failures, 'route.reachability', `${entry.stateId} missing devPreviewFixtureReady injection`);
        continue;
      }
    }

    reachable += 1;
  }
  return reachable;
}

function verifyMountContract(root: string, failures: VerifierFailure[], report: PremiumVerifierReport) {
  for (const entry of PREMIUM_EXPERIENCE_MOUNT_CONTRACT) {
    const inspection = inspectPremiumOwnerFile(root, entry.ownerFile);
    const mount = entry.mount;
    if (mount.kind === 'premium_surface') {
      const canonical = CANONICAL_MODULES[mount.component];
      const proof = proveOwnerModuleResolution(root, entry.ownerFile, mount.component, canonical);
      if (!proof.imports.some((i) => i.localName === mount.component)) {
        fail(failures, 'mount.imported', `${entry.id} missing import ${mount.component}`);
      } else {
        report.imported += 1;
      }
      if (!jsxUsesResolvedSymbol(proof, mount.component, canonical)) {
        fail(failures, 'mount.jsx_binding', `${entry.id} JSX ${mount.component} not bound to ${canonical}`);
      }
      const hit = hasPremiumSurfaceMount(inspection, mount.component, mount.stateId);
      if (!hit) {
        fail(failures, 'mount.mounted', `${entry.id} missing canonical JSX mount ${mount.stateId}`);
      } else {
        report.mounted += 1;
        if (mount.conditionallySelected) report.conditionallySelected += 1;
      }
    } else if (mount.kind === 'data_premium_state') {
      if (!inspection.dataPremiumStates.some((m) => m.value === mount.value)) {
        fail(failures, 'mount.mounted', `${entry.id} missing data-m55-premium-state=${mount.value}`);
      } else {
        report.mounted += 1;
      }
    }
  }
}

export function runPremiumExperienceVerifier(root: string): PremiumVerifierReport {
  const failures: VerifierFailure[] = [];
  const report: PremiumVerifierReport = {
    registered: PREMIUM_EXPERIENCE_STATE_REGISTRY.length,
    imported: 0,
    mounted: 0,
    conditionallySelected: 0,
    fixtureRequiredStateCount: PREMIUM_FIXTURE_ROUTE_REACHABILITY.length,
    fixtureReachableStateCount: 0,
    nonFixtureStateCount: PREMIUM_NON_FIXTURE_STATE_IDS.length,
    moduleResolutionResult: 'PASS',
    routeToOwnerReachability: 'PASS',
    pngCount: 0,
    pdfCount: 0,
    userFacingFourChapterCount: 0,
    failures,
  };

  for (const id of PREMIUM_EXPERIENCE_STATE_REGISTRY.map((s) => s.id)) {
    if (!PREMIUM_EXPERIENCE_MOUNT_CONTRACT.some((c) => c.id === id)) {
      fail(failures, 'mount.registry', `registry state ${id} missing mount contract`);
    }
  }

  verifyMountContract(root, failures, report);
  verifyCanonicalModuleOwnership(root, failures);
  report.fixtureReachableStateCount = verifyRouteReachability(root, failures);

  if (freeShareAccidentallyPremiumWrapped(root, PREMIUM_SHARE_FREE_OWNER_FILE)) {
    fail(failures, 'share.isolation', 'Free share incorrectly wrapped as Premium');
  }

  const prodCore = readFileSync(join(root, 'app/dtr/core/page.tsx'), 'utf8');
  if (prodCore.includes('devPreviewFixtureReady')) {
    fail(failures, 'fixture.isolation', 'Production /dtr/core must not pass devPreviewFixtureReady');
  }

  const ledger = readFileSync(join(root, 'lib/m55/commercialUx/assetLedger/assetRouteConsumption.ts'), 'utf8');
  if (ledger.match(/'free\.core\.share':[^\n]*premium\.experience/)) {
    fail(failures, 'share.consumption', 'free.core.share must not consume premium visual authority');
  }

  const fourChapter = scanFourChapter(root);
  report.userFacingFourChapterCount = fourChapter.count;
  for (const hit of fourChapter.hits.slice(0, 20)) {
    fail(failures, 'copy.four_chapter', hit);
  }

  const evidence = validatePremiumEvidenceOnDisk(root);
  report.pngCount = evidence.pngCount;
  report.pdfCount = evidence.pdfCount;
  for (const f of evidence.failures) fail(failures, 'evidence', f);

  report.moduleResolutionResult = failures.some((f) => f.rule.startsWith('module.')) ? 'FAIL' : 'PASS';
  report.routeToOwnerReachability = failures.some((f) => f.rule.startsWith('route.')) ? 'FAIL' : 'PASS';

  return report;
}

export function assertPremiumExperienceVerifierPass(root: string): PremiumVerifierReport {
  const report = runPremiumExperienceVerifier(root);
  if (report.failures.length > 0) {
    const msg = report.failures.map((f) => `[${f.rule}] ${f.message}`).join('\n');
    throw new Error(msg);
  }
  return report;
}
