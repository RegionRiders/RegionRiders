#!/usr/bin/env tsx
import { execFileSync } from 'child_process';
import * as fs from 'fs';
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
const DEFAULT_SOURCE_DIR_CANDIDATES = [
  process.env.REGION_SOURCE_DIR,
  path.join(REPO_ROOT, 'public', 'data', 'rr_import', 'mobile_geojson_balanced'),
].filter((value): value is string => Boolean(value));

interface BuildOptions {
  sourceDir: string;
  outputDir: string;
  tempGpkg: string;
  normalizedGpkg: string;
  minZoom: number;
  maxZoom: number;
  force: boolean;
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
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

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  return parsed;
}

function resolveDefaultSourceDir(): string {
  const existingCandidate = DEFAULT_SOURCE_DIR_CANDIDATES.find((candidate) =>
    fs.existsSync(candidate)
  );

  if (existingCandidate) {
    return existingCandidate;
  }

  throw new Error(
    'No default source directory found. Pass --source <dir> or set REGION_SOURCE_DIR to a GeoJSON dataset directory.'
  );
}

function getBuildOptions(): BuildOptions {
  const sourceDir = getArgValue('--source') ?? resolveDefaultSourceDir();
  const outputDir = getArgValue('--output') ?? DEFAULT_OUTPUT_DIR;
  const tempGpkg = getArgValue('--temp') ?? DEFAULT_TMP_GPKG;
  const normalizedGpkg = getArgValue('--normalized') ?? DEFAULT_NORMALIZED_GPKG;
  const minZoom = parseIntArg(getArgValue('--minzoom'), DEFAULT_MIN_ZOOM, 'minzoom');
  const maxZoom = parseIntArg(getArgValue('--maxzoom'), DEFAULT_MAX_ZOOM, 'maxzoom');
  const force = hasFlag('--force');

  if (minZoom > maxZoom) {
    throw new Error(`Invalid zoom range: minzoom (${minZoom}) must be <= maxzoom (${maxZoom})`);
  }

  return { sourceDir, outputDir, tempGpkg, normalizedGpkg, minZoom, maxZoom, force };
}

function collectSourceFiles(sourceDir: string): string[] {
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

function ensureParentDir(filePath: string): void {
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
}

function runBuild(options: BuildOptions, sourceFiles: string[]): void {
  if (fs.existsSync(options.outputDir) && !options.force) {
    throw new Error(
      `Output directory already exists: ${options.outputDir}. Re-run with --force to overwrite.`
    );
  }

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

  removeIfExists(options.tempGpkg);
  removeIfExists(options.normalizedGpkg);
}

function main(): void {
  assertCommandExists('ogrmerge.py');
  assertCommandExists('ogr2ogr');

  const options = getBuildOptions();
  const sourceFiles = collectSourceFiles(options.sourceDir);

  logger.info(`Building region tiles from ${sourceFiles.length} GeoJSON source files...`);
  runBuild(options, sourceFiles);
  logger.info(`Region tiles generated in ${options.outputDir}`);
}

main();
