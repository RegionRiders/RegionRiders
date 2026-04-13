#!/usr/bin/env tsx
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logger } from '@/lib/logger';

const REPO_ROOT = process.cwd();
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'public', 'data', 'regions', 'tiles', 'v1');
const DEFAULT_TMP_GPKG = path.join(
  REPO_ROOT,
  'public',
  'data',
  'regions',
  'tiles',
  '.tmp_regions_v1.gpkg'
);
const DEFAULT_NORMALIZED_GPKG = path.join(
  REPO_ROOT,
  'public',
  'data',
  'regions',
  'tiles',
  '.tmp_regions_v1_normalized.gpkg'
);
const DEFAULT_MIN_ZOOM = 3;
const DEFAULT_MAX_ZOOM = 14;
const TILE_WORK_ROOT = path.dirname(DEFAULT_OUTPUT_DIR);

function isPathWithinScope(resolvedPath: string, scopeRoot: string): boolean {
  return resolvedPath === scopeRoot || resolvedPath.startsWith(`${scopeRoot}${path.sep}`);
}

function getDefaultSourceDirCandidates(): string[] {
  return [process.env.REGION_SOURCE_DIR].filter((value): value is string => Boolean(value));
}

export interface BuildOptions {
  sourceDir: string;
  outputDir: string;
  tempGpkg: string;
  normalizedGpkg: string;
  minZoom: number;
  maxZoom: number;
  force: boolean;
}

function runCommand(command: string, args: string[]): void {
  execFileSync(command, args, { stdio: 'inherit' });
}

function assertCommandExists(command: string): void {
  try {
    runCommand('bash', ['-lc', `command -v ${command} >/dev/null 2>&1`]);
  } catch {
    throw new Error(`Required command not found in PATH: ${command}`);
  }
}

function parseIntArg(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }

  const trimmedValue = value.trim();

  if (!/^-?\d+$/.test(trimmedValue)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  const parsed = Number.parseInt(trimmedValue, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  return parsed;
}

function resolveDefaultSourceDir(): string {
  const sourceDirCandidates = getDefaultSourceDirCandidates();

  if (sourceDirCandidates.length === 0) {
    throw new Error(
      'No source directory configured. Pass --source <dir> or set REGION_SOURCE_DIR to a GeoJSON dataset directory.'
    );
  }

  const existingCandidate = sourceDirCandidates.find((candidate) => fs.existsSync(candidate));

  if (existingCandidate) {
    return existingCandidate;
  }

  throw new Error(
    'No configured source directory exists. Pass --source <dir> or set REGION_SOURCE_DIR to an existing GeoJSON dataset directory.'
  );
}

export function getBuildOptions(argv: string[] = process.argv): BuildOptions {
  const sourceDir = getArgValueFromArgv(argv, '--source') ?? resolveDefaultSourceDir();
  const outputDir = getArgValueFromArgv(argv, '--output') ?? DEFAULT_OUTPUT_DIR;
  const tempGpkg = getArgValueFromArgv(argv, '--temp') ?? DEFAULT_TMP_GPKG;
  const normalizedGpkg = getArgValueFromArgv(argv, '--normalized') ?? DEFAULT_NORMALIZED_GPKG;
  const minZoom = parseIntArg(getArgValueFromArgv(argv, '--minzoom'), DEFAULT_MIN_ZOOM, 'minzoom');
  const maxZoom = parseIntArg(getArgValueFromArgv(argv, '--maxzoom'), DEFAULT_MAX_ZOOM, 'maxzoom');
  const force = hasFlagInArgv(argv, '--force');

  if (minZoom > maxZoom) {
    throw new Error(`Invalid zoom range: minzoom (${minZoom}) must be <= maxzoom (${maxZoom})`);
  }

  return { sourceDir, outputDir, tempGpkg, normalizedGpkg, minZoom, maxZoom, force };
}

function getArgValueFromArgv(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  const value = argv[index + 1];

  if (value === undefined || value.startsWith('-')) {
    throw new Error(`Missing value for flag ${flag}`);
  }

  return value;
}

function hasFlagInArgv(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export function collectSourceFiles(sourceDir: string): string[] {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  const files = fs
    .readdirSync(sourceDir)
    .filter((name) => name.endsWith('.geojson'))
    .map((name) => path.join(sourceDir, name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No .geojson files found in ${sourceDir}`);
  }

  return files;
}

function removeIfExists(targetPath: string): void {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
}

function assertSafeDeletionTarget(targetPath: string, label: string): void {
  const trimmedPath = targetPath.trim();
  if (trimmedPath.length === 0) {
    throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
  }

  const resolvedPath = path.resolve(trimmedPath);
  const fileSystemRoot = path.parse(resolvedPath).root;
  const repoRoot = path.resolve(REPO_ROOT);
  const homeDir = path.resolve(os.homedir());
  const tempDir = path.resolve(os.tmpdir());
  const tileWorkRoot = path.resolve(TILE_WORK_ROOT);

  const blockedTargets = new Set([fileSystemRoot, repoRoot, path.resolve('.'), homeDir]);

  if (blockedTargets.has(resolvedPath)) {
    throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
  }

  const relativeToRepoRoot = path.relative(repoRoot, resolvedPath);
  if (relativeToRepoRoot === '' || relativeToRepoRoot === '.' || relativeToRepoRoot === '..') {
    throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
  }

  const isWithinTileWorkRoot = isPathWithinScope(resolvedPath, tileWorkRoot);
  const isWithinTempDir = isPathWithinScope(resolvedPath, tempDir);

  if (path.isAbsolute(trimmedPath)) {
    const absoluteSegments = resolvedPath.split(path.sep).filter((segment) => segment.length > 0);

    if (absoluteSegments.length < 3) {
      throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
    }

    if (label === '--output' && !isWithinTileWorkRoot && !isWithinTempDir) {
      throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
    }

    if (label !== '--output' && !isWithinTileWorkRoot && !isWithinTempDir) {
      throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
    }

    return;
  }

  const relativeSegments = relativeToRepoRoot
    .split(path.sep)
    .filter((segment) => segment !== '' && segment !== '.');

  if (
    trimmedPath === '..' ||
    trimmedPath.startsWith(`..${path.sep}`) ||
    relativeSegments.some((segment) => segment === '..')
  ) {
    throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
  }

  if (!path.isAbsolute(trimmedPath) && relativeSegments.length <= 1) {
    throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
  }

  if (label === '--output' && !isWithinTileWorkRoot && !isWithinTempDir) {
    throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
  }

  if (label !== '--output' && !isWithinTileWorkRoot && !isWithinTempDir) {
    throw new Error(`Refusing unsafe deletion target for ${label}: ${targetPath}`);
  }
}

function ensureParentDir(filePath: string): void {
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
}

export function runBuild(options: BuildOptions, sourceFiles: string[]): void {
  if (fs.existsSync(options.outputDir) && !options.force) {
    throw new Error(
      `Output directory already exists: ${options.outputDir}. Re-run with --force to overwrite.`
    );
  }

  assertSafeDeletionTarget(options.outputDir, '--output');
  assertSafeDeletionTarget(options.tempGpkg, '--temp');
  assertSafeDeletionTarget(options.normalizedGpkg, '--normalized');

  removeIfExists(options.outputDir);
  removeIfExists(options.tempGpkg);
  removeIfExists(options.normalizedGpkg);

  ensureParentDir(options.outputDir);
  ensureParentDir(options.tempGpkg);
  ensureParentDir(options.normalizedGpkg);

  const mergeArgs = [
    '-o',
    options.tempGpkg,
    '-f',
    'GPKG',
    '-single',
    '-nln',
    'regions',
    '-field_strategy',
    'Union',
    ...sourceFiles,
  ];

  try {
    runCommand('ogrmerge.py', mergeArgs);

    const normalizeArgs = [
      '-f',
      'GPKG',
      options.normalizedGpkg,
      options.tempGpkg,
      'regions',
      '-nln',
      'regions',
      '-nlt',
      'PROMOTE_TO_MULTI',
    ];

    runCommand('ogr2ogr', normalizeArgs);

    const tileArgs = [
      '-f',
      'MVT',
      options.outputDir,
      options.normalizedGpkg,
      'regions',
      '-nln',
      'regions',
      '-dsco',
      'FORMAT=DIRECTORY',
      '-dsco',
      `MINZOOM=${options.minZoom}`,
      '-dsco',
      `MAXZOOM=${options.maxZoom}`,
    ];

    runCommand('ogr2ogr', tileArgs);
  } catch (error) {
    removeIfExists(options.outputDir);
    throw error;
  } finally {
    removeIfExists(options.tempGpkg);
    removeIfExists(options.normalizedGpkg);
  }
}

function isExecutedAsScript(): boolean {
  const entryPoint = process.argv[1];
  return Boolean(entryPoint && /buildRegionTiles\.(ts|js)$/.test(entryPoint));
}

export function main(): void {
  assertCommandExists('ogrmerge.py');
  assertCommandExists('ogr2ogr');

  const options = getBuildOptions();
  const sourceFiles = collectSourceFiles(options.sourceDir);

  logger.info(`Building region tiles from ${sourceFiles.length} GeoJSON source files...`);
  runBuild(options, sourceFiles);
  logger.info(`Region tiles generated in ${options.outputDir}`);
}

if (isExecutedAsScript()) {
  main();
}
