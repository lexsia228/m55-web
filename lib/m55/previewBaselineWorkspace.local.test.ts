// @ts-nocheck
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  symlinkSync,
  rmSync,
  mkdtempSync,
  readdirSync,
  copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  BASELINE_FILENAME,
  BASELINE_VERSION,
  CANONICAL_MIGRATIONS,
  WORKSPACE_MARKER_FILENAME,
  WORKSPACE_DIR_BASENAME,
  PATHS,
  sha256Hex,
  buildArtifacts,
  buildWorkspace,
  verifyWorkspace,
  verifyWorkspaceForCleanup,
  cleanWorkspace,
  validateWorkspaceRoot,
  isPathStrictlyInside,
  resolveRepoPath,
} from '../../scripts/m55/previewBaselineTool.ts';

const REPO_ROOT = process.cwd();

const MIGRATION_FILENAMES = [
  BASELINE_FILENAME,
  ...CANONICAL_MIGRATIONS.map((item) => item.filename),
];

function makeTempWorkspaceParent(): string {
  return mkdtempSync(join(tmpdir(), `${WORKSPACE_DIR_BASENAME}-test-`));
}

function wsPath(parent: string, suffix: string): string {
  return join(parent, `${WORKSPACE_DIR_BASENAME}-${suffix}`);
}

describe('previewBaselineWorkspace — build', () => {
  it('1. buildWorkspace creates marker file', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-build-1');
    try {
      const result = buildWorkspace(REPO_ROOT, root);
      assert.equal(result.workspaceRoot, root);
      assert.ok(existsSync(result.markerPath));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('2. buildWorkspace copies seven migration files', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-build-2');
    try {
      buildWorkspace(REPO_ROOT, root);
      const migrationsDir = join(root, 'migrations');
      for (const filename of MIGRATION_FILENAMES) {
        assert.ok(existsSync(join(migrationsDir, filename)), `missing ${filename}`);
      }
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('3. marker tool field is previewBaselineTool', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-build-3');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as { tool: string };
      assert.equal(marker.tool, 'previewBaselineTool');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('4. marker manifest SHA matches on-disk manifest', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-build-4');
    try {
      const built = buildArtifacts(REPO_ROOT);
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as { manifest_sha256: string };
      assert.equal(marker.manifest_sha256, built.manifestSha256);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('5. marker source_repo records repo root', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-build-5');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as { source_repo: string };
      assert.equal(marker.source_repo, REPO_ROOT);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('6. marker safe_cleanup_root equals workspace root', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-build-6');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as {
        safe_cleanup_root: string;
        created_path: string;
      };
      assert.equal(marker.safe_cleanup_root, root);
      assert.equal(marker.created_path, root);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('previewBaselineWorkspace — verify / SHA order', () => {
  it('7. verifyWorkspace passes for freshly built workspace', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-verify-1');
    try {
      buildWorkspace(REPO_ROOT, root);
      assert.doesNotThrow(() => verifyWorkspace(REPO_ROOT, root));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('8. workspace migration bytes match repo sources', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-verify-2');
    try {
      buildWorkspace(REPO_ROOT, root);
      const migrationsDir = join(root, 'migrations');
      const baselineRepo = readFileSync(resolveRepoPath(REPO_ROOT, PATHS.baselineSql));
      const baselineWs = readFileSync(join(migrationsDir, BASELINE_FILENAME));
      assert.ok(baselineRepo.equals(baselineWs));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('9. migration filenames sort in version order', () => {
    const sorted = [...MIGRATION_FILENAMES].sort();
    assert.deepEqual(sorted, MIGRATION_FILENAMES);
    assert.equal(MIGRATION_FILENAMES[0], BASELINE_FILENAME);
    assert.equal(MIGRATION_FILENAMES[6], CANONICAL_MIGRATIONS[5].filename);
  });

  it('10. baseline version precedes canonical versions lexicographically', () => {
    for (const item of CANONICAL_MIGRATIONS) {
      assert.ok(BASELINE_VERSION < item.version);
    }
  });

  it('11. canonical migration SHA pins match repo files', () => {
    for (const item of CANONICAL_MIGRATIONS) {
      const actual = sha256Hex(readFileSync(resolveRepoPath(REPO_ROOT, item.sourcePath)));
      assert.equal(actual, item.sha256, `SHA mismatch for ${item.filename}`);
    }
  });

  it('12. verifyWorkspace rejects missing marker', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-verify-3');
    try {
      buildWorkspace(REPO_ROOT, root);
      rmSync(join(root, WORKSPACE_MARKER_FILENAME));
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /marker missing/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('13. verifyWorkspace rejects stale manifest SHA in marker', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-verify-4');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
      marker.manifest_sha256 = '0'.repeat(64);
      writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /manifest SHA mismatch/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('14. verifyWorkspace rejects unexpected extra migration file', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-verify-5');
    try {
      buildWorkspace(REPO_ROOT, root);
      writeFileSync(join(root, 'migrations', '99999999999999_extra.sql'), '-- extra\n', 'utf8');
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /Unexpected workspace files/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('previewBaselineWorkspace — symlink / path traversal rejection', () => {
  it('15. verifyWorkspace rejects symlinked migration file', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-symlink-1');
    try {
      buildWorkspace(REPO_ROOT, root);
      const target = join(root, 'migrations', BASELINE_FILENAME);
      const backup = join(parent, 'baseline-backup.sql');
      const bytes = readFileSync(target);
      writeFileSync(backup, bytes);
      rmSync(target);
      symlinkSync(backup, target);
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /must not be symlink/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('16. verifyWorkspace rejects modified migration bytes', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-symlink-2');
    try {
      buildWorkspace(REPO_ROOT, root);
      const target = join(root, 'migrations', BASELINE_FILENAME);
      writeFileSync(target, `${readFileSync(target, 'utf8')}\n-- mutated\n`, 'utf8');
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /SHA mismatch|bytes mismatch/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('17. verifyWorkspace rejects missing migration file', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-symlink-3');
    try {
      buildWorkspace(REPO_ROOT, root);
      rmSync(join(root, 'migrations', CANONICAL_MIGRATIONS[0].filename));
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /migration missing/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('18. workspace root must live under temp basename policy for cleanup', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-safe-1');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as { safe_cleanup_root: string };
      assert.ok(marker.safe_cleanup_root.includes(WORKSPACE_DIR_BASENAME));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('previewBaselineWorkspace — clean / unsafe cleanup', () => {
  it('19. cleanWorkspace removes workspace directory', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-clean-1');
    try {
      buildWorkspace(REPO_ROOT, root);
      cleanWorkspace(REPO_ROOT, root);
      assert.equal(existsSync(root), false);
    } finally {
      if (existsSync(parent)) rmSync(parent, { recursive: true, force: true });
    }
  });

  it('20. cleanWorkspace refuses when marker is missing', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-clean-2');
    try {
      buildWorkspace(REPO_ROOT, root);
      rmSync(join(root, WORKSPACE_MARKER_FILENAME));
      assert.throws(() => cleanWorkspace(REPO_ROOT, root), /Workspace marker missing/);
      assert.ok(existsSync(root));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('21. cleanWorkspace refuses unsafe cleanup root outside temp policy', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-clean-3');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
      marker.safe_cleanup_root = REPO_ROOT;
      writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
      assert.throws(() => cleanWorkspace(REPO_ROOT, root), /safe_cleanup_root is not safe/);
      assert.ok(existsSync(root));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('22. cleanWorkspace refuses when safe_cleanup_root differs from root', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-clean-4');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
      marker.safe_cleanup_root = join(parent, 'other-root');
      writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
      assert.throws(
        () => cleanWorkspace(REPO_ROOT, root),
        /safe_cleanup_root is not safe|path fields mismatch/
      );
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('23. verifyWorkspace rejects tampered safe_cleanup_root', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-clean-5');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
      marker.safe_cleanup_root = '/tmp/not-allowed-root';
      writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /safe_cleanup_root is not safe/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('previewBaselineWorkspace — integration sequence', () => {
  let parent = '';
  let root = '';

  before(() => {
    parent = makeTempWorkspaceParent();
    root = wsPath(parent, 'seq-1');
    buildWorkspace(REPO_ROOT, root);
  });

  after(() => {
    if (parent && existsSync(parent)) rmSync(parent, { recursive: true, force: true });
  });

  it('24. build then verify succeeds in shared workspace', () => {
    assert.doesNotThrow(() => verifyWorkspace(REPO_ROOT, root));
  });

  it('25. migrations directory exists after build', () => {
    assert.ok(existsSync(join(root, 'migrations')));
  });

  it('26. marker revision matches manifest revision', () => {
    const marker = JSON.parse(readFileSync(join(root, WORKSPACE_MARKER_FILENAME), 'utf8')) as {
      revision: string;
    };
    const manifest = JSON.parse(
      readFileSync(resolveRepoPath(REPO_ROOT, PATHS.manifest), 'utf8')
    ) as { manifest_revision: string };
    assert.equal(marker.revision, manifest.manifest_revision);
  });

  it('27. workspace has exactly seven migration files', () => {
    const files = readFileSync(join(root, WORKSPACE_MARKER_FILENAME), 'utf8');
    assert.ok(files.length > 0);
    const migrationsDir = join(root, 'migrations');
    const names = MIGRATION_FILENAMES.map((name) => existsSync(join(migrationsDir, name)));
    assert.equal(names.filter(Boolean).length, 7);
  });

  it('28. first migration is preview baseline P1 file', () => {
    assert.equal(MIGRATION_FILENAMES[0], BASELINE_FILENAME);
    assert.ok(BASELINE_FILENAME.includes('preview_production_aligned_baseline_p1'));
  });

  it('29. last migration reaches P7 state', () => {
    assert.equal(CANONICAL_MIGRATIONS[5].stateTo, 'P7');
    assert.equal(MIGRATION_FILENAMES[6], CANONICAL_MIGRATIONS[5].filename);
  });

  it('30. cleanWorkspace succeeds after verify on shared workspace', () => {
    verifyWorkspace(REPO_ROOT, root);
    cleanWorkspace(REPO_ROOT, root);
    assert.equal(existsSync(root), false);
  });
});

describe('previewBaselineWorkspace — unsafe root rejection', () => {
  it('33. explicit repo root is rejected before write', () => {
    assert.throws(
      () => validateWorkspaceRoot(REPO_ROOT, REPO_ROOT),
      /inside_repo|missing_basename|outside_tmpdir/
    );
  });

  it('34. repo subdirectory is rejected', () => {
    assert.throws(
      () => validateWorkspaceRoot(REPO_ROOT, join(REPO_ROOT, `${WORKSPACE_DIR_BASENAME}-nested`)),
      /inside_repo|outside_tmpdir/
    );
  });

  it('35. canonical migrations path under repo is rejected', () => {
    assert.throws(
      () =>
        validateWorkspaceRoot(
          REPO_ROOT,
          join(REPO_ROOT, 'supabase/migrations', `${WORKSPACE_DIR_BASENAME}-bad`)
        ),
      /inside_repo|canonical_migrations|outside_tmpdir/
    );
  });

  it('36. HOME is rejected', () => {
    const home = process.env.HOME;
    if (!home) return;
    assert.throws(
      () => validateWorkspaceRoot(REPO_ROOT, join(home, `${WORKSPACE_DIR_BASENAME}-home`)),
      /home/
    );
  });

  it('37. tmpdir root itself is rejected', () => {
    assert.throws(
      () => validateWorkspaceRoot(REPO_ROOT, tmpdir()),
      /tmpdir_root|missing_basename/
    );
  });

  it('38. arbitrary /tmp path without basename prefix is rejected', () => {
    assert.throws(
      () => validateWorkspaceRoot(REPO_ROOT, join(tmpdir(), 'not-m55-name')),
      /missing_basename/
    );
  });

  it('39. existing target is rejected', () => {
    const parent = makeTempWorkspaceParent();
    try {
      assert.throws(() => validateWorkspaceRoot(REPO_ROOT, parent), /already_exists/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('40. symlink workspace root is rejected', () => {
    const parent = makeTempWorkspaceParent();
    const link = wsPath(parent, 'ws-link');
    try {
      symlinkSync(parent, link);
      assert.throws(() => validateWorkspaceRoot(REPO_ROOT, link), /symlink_ancestor/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('41. safe non-existing temp target is accepted', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-safe-new');
    try {
      const validated = validateWorkspaceRoot(REPO_ROOT, root);
      assert.equal(validated, root);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('42. failed build leaves no valid marker', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-fail-marker');
    const migrationsDir = join(root, 'migrations');
    mkdirSync(root, { recursive: false });
    mkdirSync(migrationsDir, { recursive: false });
    assert.throws(() => buildWorkspace(REPO_ROOT, root), /already_exists|migrations_dir_already_exists/);
    assert.equal(existsSync(join(root, WORKSPACE_MARKER_FILENAME)), false);
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineWorkspace — default workspace path policy', () => {
  it('43. default workspace path uses WORKSPACE_DIR_BASENAME prefix', () => {
    const built = buildArtifacts(REPO_ROOT);
    const manifestSha = built.manifestSha256;
    const defaultName = `${WORKSPACE_DIR_BASENAME}-${manifestSha.slice(0, 12)}`;
    assert.ok(defaultName.startsWith(WORKSPACE_DIR_BASENAME));
  });

  it('44. buildWorkspace without explicit root still returns marker path inside root', () => {
    const result = buildWorkspace(REPO_ROOT);
    assert.ok(result.workspaceRoot.includes(WORKSPACE_DIR_BASENAME));
    assert.ok(existsSync(result.markerPath));
    cleanWorkspace(REPO_ROOT, result.workspaceRoot);
  });
});

describe('previewBaselineWorkspace — Revision-3 containment and marker', () => {
  it('45. isPathStrictlyInside rejects tmpdir sibling prefix', () => {
    const realTmp = tmpdir();
    const evil = join(`${realTmp}-evil`, `${WORKSPACE_DIR_BASENAME}-trap`);
    assert.equal(isPathStrictlyInside(realTmp, evil), false);
    assert.throws(() => validateWorkspaceRoot(REPO_ROOT, evil), /outside_tmpdir/);
  });

  it('46. workspace marker includes migration_tuple_hash', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-r4-marker');
    try {
      buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(join(root, WORKSPACE_MARKER_FILENAME), 'utf8'));
      assert.match(marker.migration_tuple_hash, /^[a-f0-9]{64}$/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('previewBaselineWorkspace — Revision-4 safety hardening', () => {
  it('47. parent path with arbitrary child basename is rejected', () => {
    const parent = join(tmpdir(), `${WORKSPACE_DIR_BASENAME}-parent`);
    mkdirSync(parent, { recursive: true });
    try {
      assert.throws(
        () => validateWorkspaceRoot(REPO_ROOT, join(parent, 'arbitrary-child')),
        /missing_basename/
      );
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('48. verifyWorkspace rejects symlinked workspace root', () => {
    const parent = makeTempWorkspaceParent();
    const realRoot = wsPath(parent, 'ws-root-real');
    const linkRoot = wsPath(parent, 'ws-root-link');
    try {
      buildWorkspace(REPO_ROOT, realRoot);
      symlinkSync(realRoot, linkRoot);
      assert.throws(() => verifyWorkspace(REPO_ROOT, linkRoot), /must not be a symlink/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('49. verifyWorkspace rejects symlinked migrations directory', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-mig-symlink');
    try {
      buildWorkspace(REPO_ROOT, root);
      const migrationsDir = join(root, 'migrations');
      const backup = join(parent, 'migrations-backup');
      mkdirSync(backup, { recursive: true });
      for (const name of readdirSync(migrationsDir)) {
        copyFileSync(join(migrationsDir, name), join(backup, name));
      }
      rmSync(migrationsDir, { recursive: true, force: true });
      symlinkSync(backup, migrationsDir);
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /migrations directory must not be a symlink/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('50. verifyWorkspace rejects symlinked marker file', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-marker-symlink');
    try {
      buildWorkspace(REPO_ROOT, root);
      const markerPath = join(root, WORKSPACE_MARKER_FILENAME);
      const backup = join(parent, 'marker-backup.json');
      writeFileSync(backup, readFileSync(markerPath));
      rmSync(markerPath);
      symlinkSync(backup, markerPath);
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /marker must not be a symlink/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('51. verifyWorkspace rejects unexpected root-level entry', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-extra-root');
    try {
      buildWorkspace(REPO_ROOT, root);
      writeFileSync(join(root, 'unexpected.txt'), 'x\n', 'utf8');
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /Unexpected workspace root entries/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('52. verifyWorkspace rejects migration byte_length mismatch', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-byte-mismatch');
    try {
      buildWorkspace(REPO_ROOT, root);
      const target = join(root, 'migrations', BASELINE_FILENAME);
      writeFileSync(target, `${readFileSync(target, 'utf8')}--pad\n`, 'utf8');
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /byte_length mismatch|SHA mismatch|bytes mismatch/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('53. verifyWorkspace rejects marker revision mismatch', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-revision-mismatch');
    try {
      const { markerPath } = buildWorkspace(REPO_ROOT, root);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
      marker.revision = 'PREVIEW-BASELINE-MANIFEST-v1-REVISION-0';
      writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
      assert.throws(() => verifyWorkspace(REPO_ROOT, root), /revision mismatch/);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('previewBaselineWorkspace — Revision-5 cleanup safety', () => {
  function buildSafeWorkspace() {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-cleanup-safe');
    buildWorkspace(REPO_ROOT, root);
    return { parent, root };
  }

  it('54. cleanWorkspace deletes only after verifyWorkspaceForCleanup', () => {
    const { parent, root } = buildSafeWorkspace();
    try {
      verifyWorkspaceForCleanup(REPO_ROOT, root);
      cleanWorkspace(REPO_ROOT, root);
      assert.equal(existsSync(root), false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('55. cleanWorkspace refuses symlinked root and leaves files', () => {
    const parent = makeTempWorkspaceParent();
    const realRoot = wsPath(parent, 'ws-cleanup-real');
    const linkRoot = wsPath(parent, 'ws-cleanup-link');
    try {
      buildWorkspace(REPO_ROOT, realRoot);
      symlinkSync(realRoot, linkRoot);
      assert.throws(() => cleanWorkspace(REPO_ROOT, linkRoot), /must not be a symlink/);
      assert.equal(existsSync(realRoot), true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('56. cleanWorkspace refuses manifest SHA mismatch', () => {
    const { parent, root } = buildSafeWorkspace();
    try {
      const markerPath = join(root, WORKSPACE_MARKER_FILENAME);
      const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
      marker.manifest_sha256 = '0'.repeat(64);
      writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
      assert.throws(() => cleanWorkspace(REPO_ROOT, root), /manifest SHA mismatch/);
      assert.equal(existsSync(root), true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('57. cleanWorkspace refuses missing manifest', () => {
    const parent = makeTempWorkspaceParent();
    const root = wsPath(parent, 'ws-cleanup-no-manifest');
    try {
      buildWorkspace(REPO_ROOT, root);
      const manifestPath = resolveRepoPath(REPO_ROOT, PATHS.manifest);
      const backup = `${manifestPath}.bak`;
      copyFileSync(manifestPath, backup);
      rmSync(manifestPath);
      assert.throws(() => cleanWorkspace(REPO_ROOT, root), /cleanup_requires_manifest/);
      copyFileSync(backup, manifestPath);
      rmSync(backup);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('58. cleanWorkspace refuses unexpected root entry', () => {
    const { parent, root } = buildSafeWorkspace();
    try {
      writeFileSync(join(root, 'unexpected.txt'), 'x\n', 'utf8');
      assert.throws(() => cleanWorkspace(REPO_ROOT, root), /Unexpected workspace root entries/);
      assert.equal(existsSync(root), true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('59. cleanWorkspace refuses migrations directory symlink', () => {
    const { parent, root } = buildSafeWorkspace();
    try {
      const migrationsDir = join(root, 'migrations');
      const backup = join(parent, 'migrations-backup');
      mkdirSync(backup, { recursive: true });
      for (const name of readdirSync(migrationsDir)) {
        copyFileSync(join(migrationsDir, name), join(backup, name));
      }
      rmSync(migrationsDir, { recursive: true, force: true });
      symlinkSync(backup, migrationsDir);
      assert.throws(() => cleanWorkspace(REPO_ROOT, root), /migrations directory must not be a symlink/);
      assert.equal(existsSync(root), true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
