#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';

export interface ValidationIssue {
  file: string;
  featureIndex?: number;
  regionId?: string;
  code: string;
  message: string;
}

export interface ValidationReport {
  generatedAt: string;
  sourceDir: string;
  filesProcessed: number;
  featuresProcessed: number;
  uniqueRegionIds: number;
  invalidJsonFiles: number;
  invalidFeatureCollections: number;
  duplicateRegionIds: number;
  missingRequiredFields: number;
  invalidGeometries: number;
  issues: ValidationIssue[];
  isValid: boolean;
}

const REQUIRED_PROPERTIES = ['region_id', 'country_code', 'admin_level', 'name'] as const;

const REPO_ROOT = process.cwd();
const DEFAULT_REPORT_PATH = path.join(
  REPO_ROOT,
  'public',
  'data',
  'regions',
  'reports',
  'source-validation-v1.json'
);
const MAX_ISSUES = 500;

function getDefaultSourceDirCandidates(): string[] {
  return [process.env.REGION_SOURCE_DIR].filter((value): value is string => Boolean(value));
}

function getArgValue(flag: string): string | undefined {
  return getArgValueFromArgv(process.argv, flag);
}

export function getArgValueFromArgv(argv: string[], flag: string): string | undefined {
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

function addIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  if (issues.length >= MAX_ISSUES) {
    return;
  }

  issues.push(issue);
}

function getNormalizedRegionId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function propertyIsMissing(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  return false;
}

function hasAnyCoordinate(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  if (typeof value[0] === 'number') {
    return value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
  }

  return value.some((entry) => hasAnyCoordinate(entry));
}

function geometryIsNonEmpty(geometry: unknown): boolean {
  if (!geometry || typeof geometry !== 'object') {
    return false;
  }

  const maybeGeometry = geometry as {
    type?: string;
    coordinates?: unknown;
    geometries?: unknown[];
  };

  if (maybeGeometry.type === 'GeometryCollection') {
    return Array.isArray(maybeGeometry.geometries)
      ? maybeGeometry.geometries.some((item) => geometryIsNonEmpty(item))
      : false;
  }

  return hasAnyCoordinate(maybeGeometry.coordinates);
}

function ensureDirForFile(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function resolveDefaultSourceDir(): string {
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

export function validateRegionSource(
  sourceDir: string,
  reportPath: string = DEFAULT_REPORT_PATH
): ValidationReport {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  const files = fs
    .readdirSync(sourceDir)
    .filter((name) => name.endsWith('.geojson'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No .geojson files found in ${sourceDir}`);
  }

  const issues: ValidationIssue[] = [];
  const seenRegionIds = new Map<string, string>();
  let featuresProcessed = 0;
  let invalidJsonFiles = 0;
  let invalidFeatureCollections = 0;
  let duplicateRegionIds = 0;
  let missingRequiredFields = 0;
  let invalidGeometries = 0;

  for (const fileName of files) {
    const filePath = path.join(sourceDir, fileName);
    const raw = fs.readFileSync(filePath, 'utf8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      invalidJsonFiles += 1;
      addIssue(issues, {
        file: fileName,
        code: 'invalid_json',
        message: `Could not parse JSON: ${String(error)}`,
      });
      continue;
    }

    const collection = parsed as { type?: string; features?: unknown[] };

    if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      invalidFeatureCollections += 1;
      addIssue(issues, {
        file: fileName,
        code: 'invalid_feature_collection',
        message: 'File is not a valid GeoJSON FeatureCollection',
      });
      continue;
    }

    collection.features.forEach((featureRaw, featureIndex) => {
      const feature = featureRaw as { properties?: Record<string, unknown>; geometry?: unknown };
      const properties = feature.properties ?? {};
      featuresProcessed += 1;

      const missingProps = REQUIRED_PROPERTIES.filter((key) => {
        const value = properties[key];
        return propertyIsMissing(value);
      });

      if (missingProps.length > 0) {
        missingRequiredFields += 1;
        addIssue(issues, {
          file: fileName,
          featureIndex,
          code: 'missing_required_property',
          message: `Missing properties: ${missingProps.join(', ')}`,
        });
      }

      const regionIdValue = properties.region_id;
      const normalizedRegionId = getNormalizedRegionId(regionIdValue);

      if (regionIdValue !== undefined && regionIdValue !== null && normalizedRegionId === null) {
        missingRequiredFields += 1;
        addIssue(issues, {
          file: fileName,
          featureIndex,
          code: 'invalid_region_id',
          message: 'region_id must be a non-empty string',
        });
      }

      if (normalizedRegionId) {
        const firstSeenIn = seenRegionIds.get(normalizedRegionId);
        if (firstSeenIn) {
          duplicateRegionIds += 1;
          addIssue(issues, {
            file: fileName,
            featureIndex,
            regionId: normalizedRegionId,
            code: 'duplicate_region_id',
            message: `region_id already seen in ${firstSeenIn}`,
          });
        } else {
          seenRegionIds.set(normalizedRegionId, fileName);
        }
      }

      if (!geometryIsNonEmpty(feature.geometry)) {
        invalidGeometries += 1;
        addIssue(issues, {
          file: fileName,
          featureIndex,
          regionId: normalizedRegionId ?? undefined,
          code: 'invalid_geometry',
          message: 'Geometry is null or has empty coordinates',
        });
      }
    });
  }

  const report: ValidationReport = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    filesProcessed: files.length,
    featuresProcessed,
    uniqueRegionIds: seenRegionIds.size,
    invalidJsonFiles,
    invalidFeatureCollections,
    duplicateRegionIds,
    missingRequiredFields,
    invalidGeometries,
    issues,
    isValid:
      invalidJsonFiles === 0 &&
      invalidFeatureCollections === 0 &&
      duplicateRegionIds === 0 &&
      missingRequiredFields === 0 &&
      invalidGeometries === 0,
  };

  ensureDirForFile(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  return report;
}

function isExecutedAsScript(): boolean {
  const entryPoint = process.argv[1];
  return Boolean(entryPoint && /validateRegionSource\.(ts|js)$/.test(entryPoint));
}

export function main(): void {
  const sourceDir = getArgValue('--source') ?? resolveDefaultSourceDir();
  const reportPath = getArgValue('--report') ?? DEFAULT_REPORT_PATH;
  const report = validateRegionSource(sourceDir, reportPath);

  logger.info(`Validation report saved to ${reportPath}`);
  logger.info(
    [
      `files=${report.filesProcessed}`,
      `features=${report.featuresProcessed}`,
      `uniqueRegionIds=${report.uniqueRegionIds}`,
      `invalidJsonFiles=${report.invalidJsonFiles}`,
      `invalidFeatureCollections=${report.invalidFeatureCollections}`,
      `duplicates=${report.duplicateRegionIds}`,
      `missingRequiredFields=${report.missingRequiredFields}`,
      `invalidGeometries=${report.invalidGeometries}`,
      `valid=${report.isValid}`,
    ].join(' ')
  );

  if (!report.isValid) {
    process.exitCode = 1;
  }
}

if (isExecutedAsScript()) {
  main();
}
